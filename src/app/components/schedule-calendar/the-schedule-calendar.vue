<template>
  <!-- [Claude] Agents × days calendar on DayPilot Lite Scheduler, shared by Agents (absences,
       EP_02) and the Schedule page (shifts + absences + forecast + Day drag, EP_05). -->
  <section
    :class="{ 'schedule-calendar--readonly': isReadonly }"
    class="schedule-calendar"
  >
    <calendar-toolbar
      :bounds="bounds"
      :date="date"
      :is-day-view-enabled="isDayViewEnabled"
      :range="range"
      :view="view"
      @update:date="date = $event"
      @update:view="changeView"
    />

    <div
      ref="body"
      class="schedule-calendar__body"
    >
      <!-- [Claude] DayPilot styles its own root; the frame keeps it out of the flow. -->
      <div class="schedule-calendar__frame">
        <div ref="host" />
      </div>
      <wt-loader
        v-if="isLoading"
        class="schedule-calendar__loader"
      />
    </div>

    <calendar-menu
      ref="menu"
      @select="selectMenuItem"
    />
  </section>
</template>

<script setup lang="ts">
import './schedule-calendar.css';

import { DayPilot } from '@daypilot/daypilot-lite-javascript';
import { useEventListener, useResizeObserver } from '@vueuse/core';
import {
	computed,
	h,
	onBeforeUnmount,
	onMounted,
	reactive,
	useTemplateRef,
	watch,
} from 'vue';
import { useI18n } from 'vue-i18n';

import type {
	AgentDay,
	AgentRow,
	Holiday,
	Lookup,
	Shift,
	ShiftPause,
} from '../../api/wfm/types';
import { useWfmErrors } from '../../composables/useWfmErrors';
import {
	ABSENCE_ICON,
	ABSENCE_LOCALE,
	ABSENCE_TYPES,
	CalendarView,
	CellActionType,
} from '../../enums';
import {
	clampDay,
	type DayKey,
	dayToMs,
	formatTime,
	isWeekend,
	MINUTES_IN_DAY,
	MS_IN_MINUTE,
	minutesToTime,
	msToWall,
	wallOf,
	wallStringToMs,
} from '../../utils/day';
import CalendarAgent from './components/calendar-agent.vue';
import CalendarDayCell from './components/calendar-day-cell.vue';
import CalendarForecast from './components/calendar-forecast.vue';
import CalendarForecastLabel from './components/calendar-forecast-label.vue';
import CalendarMenu from './components/calendar-menu.vue';
import CalendarShift from './components/calendar-shift.vue';
import CalendarToolbar from './components/calendar-toolbar.vue';
import { useDpVueNodes } from './composables/useDpVueNodes';
import type {
	CalendarEventTags,
	CalendarForecast as CalendarForecastData,
	CellAction,
	CellMenuItem,
	DayBounds,
	Timeline,
} from './types';
import {
	dayEvents,
	dayTimeline,
	FORECAST_ROW_ID,
	forecastEvents,
	hasContent,
	isOutside,
	periodEvents,
} from './utils/dpData';
import { periodOf } from './utils/period';
import { dragShift } from './utils/shiftDrag';

const props = withDefaults(
	defineProps<{
		rows: AgentRow[];
		holidays?: Holiday[];
		// [Claude] The schedule dates: arrows and cells stop there.
		bounds?: DayBounds | null;
		// [Claude] The schedule time scale of the Day view; null = 24 hours.
		timeline?: Timeline | null;
		// [Claude] Shifts and dates are in it: the schedule calendar's zone, or the user's.
		timeZone: string;
		// [Claude] The Forecast row is shown when its data is given (Schedule page).
		forecast?: CalendarForecastData | null;
		// [Claude] The Shift item of the cell menu (Schedule page).
		isShiftsEnabled?: boolean;
		isDayViewEnabled?: boolean;
		// [Claude] Archived schedule: look, don't touch (US_05.21).
		isReadonly?: boolean;
		// [Claude] The confirmation mark next to agents: an active schedule (US_05.05).
		isConfirmedShown?: boolean;
		isAgentDeletable?: boolean;
		isLoading?: boolean;
	}>(),
	{
		holidays: () => [],
		bounds: null,
		timeline: null,
		forecast: null,
	},
);

const view = defineModel<CalendarView>('view', {
	default: CalendarView.Week,
});
const date = defineModel<DayKey>('date', {
	required: true,
});
const selected = defineModel<string[]>('selected', {
	default: () => [],
});
// [Claude] A period of its own (Agents filters From / To) instead of the week or month.
const range = defineModel<DayBounds | null>('range', {
	default: null,
});

const emit = defineEmits<{
	action: [
		action: CellAction,
	];
}>();

const { t, locale } = useI18n();
const { notify } = useWfmErrors();

const isDayView = computed(
	() => view.value === CalendarView.Day && !range.value,
);
const period = computed(() => periodOf(view.value, date.value, range.value));
const timelineRange = computed(() => dayTimeline(props.timeline));
const timelineHours = computed(
	() => (timelineRange.value.to - timelineRange.value.from) / 60,
);
const rowsById = computed(
	() =>
		new Map(
			props.rows.map((row) => [
				row.agent.id,
				row,
			]),
		),
);
const holidayByDate = computed(
	() =>
		new Map(
			props.holidays.map((holiday) => [
				holiday.date,
				holiday.name,
			]),
		),
);

// [Claude] What the mounted heads read; they re-render on its changes without DayPilot.
const state = reactive({
	selected: [] as string[],
	isReadonly: false,
	isConfirmedShown: false,
	isAgentDeletable: false,
	isForecastCollapsed: false,
});

watch(
	() => [
		selected.value,
		props.isReadonly,
		props.isConfirmedShown,
		props.isAgentDeletable,
	],
	() => {
		Object.assign(state, {
			selected: selected.value,
			isReadonly: !!props.isReadonly,
			isConfirmedShown: !!props.isConfirmedShown,
			isAgentDeletable: !!props.isAgentDeletable,
		});
	},
	{
		immediate: true,
	},
);

const toggleSelected = (id: string, value: boolean) => {
	selected.value = value
		? [
				...selected.value,
				id,
			]
		: selected.value.filter((item) => item !== id);
};

/* [Claude] ----------------------------------------------------------- Forecast */

const SLOT_MINUTES = 15;
const SLOTS_IN_HOUR = 4;

const forecastData = computed(() => {
	const maxByDay = new Map<DayKey, number>();
	const byHour = new Map<string, number>();
	for (const hour of props.forecast?.hours || []) {
		maxByDay.set(
			hour.date,
			Math.max(maxByDay.get(hour.date) || 0, hour.agents),
		);
		byHour.set(
			msToWall(hour.startAt, props.timeZone).slice(0, 16),
			hour.agents,
		);
	}
	const plannedByDay = new Map(
		(props.forecast?.plannedDays || []).map((day) => [
			day.date,
			day.agents,
		]),
	);
	const plannedBySlot = new Map(
		(props.forecast?.plannedSlots || []).map((slot) => [
			msToWall(slot.startAt, props.timeZone).slice(0, 16),
			slot.agents,
		]),
	);
	const values = isDayView.value
		? [
				...byHour.values(),
				...plannedBySlot.values(),
			]
		: [
				...maxByDay.values(),
				...plannedByDay.values(),
			];
	return {
		maxByDay,
		byHour,
		plannedByDay,
		plannedBySlot,
		max: Math.max(1, ...values),
	};
});

// [Claude] The four 15-minute fact values of an hour (wall 'YYYY-MM-DDTHH:mm').
const hourSlots = (day: DayKey, hourStart: number): number[] =>
	Array.from(
		{
			length: SLOTS_IN_HOUR,
		},
		(_, index) =>
			forecastData.value.plannedBySlot.get(
				wallOf(day, hourStart + index * SLOT_MINUTES).slice(0, 16),
			) || 0,
	);

/* [Claude] ----------------------------------------------------- DayPilot content */

const { mount, unmount } = useDpVueNodes();

const rowHead = (id: string) => {
	if (id === FORECAST_ROW_ID) {
		return mount(
			h(CalendarForecastLabel, {
				state,
				onToggle: () => {
					state.isForecastCollapsed = !state.isForecastCollapsed;
				},
			}),
		);
	}
	const row = rowsById.value.get(id);
	if (!row) return null;
	return mount(
		h(CalendarAgent, {
			agent: row.agent,
			state,
			onSelect: toggleSelected,
			onDelete: (agent: Lookup) =>
				emit('action', {
					type: CellActionType.DeleteAgent,
					agent,
					date: date.value,
				}),
		}),
	);
};

const eventBody = (tags: CalendarEventTags) => {
	if ((tags.kind === 'day' || tags.kind === 'day-line') && tags.day) {
		return mount(
			h(CalendarDayCell, {
				day: tags.day,
				timeZone: props.timeZone,
				isCompact: period.value.days > 7,
				repeat: tags.kind === 'day-line' ? timelineHours.value : 1,
			}),
		);
	}
	if (tags.kind === 'shift' && tags.shift) {
		const shift = tags.shift;
		const row = tags.agentId ? rowsById.value.get(tags.agentId) : undefined;
		return mount(
			h(CalendarShift, {
				shift,
				timeZone: props.timeZone,
				isReadonly: !!props.isReadonly,
				handleWidth: RESIZE_MARGIN_PX,
				onDeletePause: (pause: ShiftPause) =>
					row &&
					emit('action', {
						type: CellActionType.DeletePause,
						agent: row.agent,
						date: tags.date,
						shift,
						pause,
					}),
				// [Claude] A pause dragged inside the shift: the shift is saved with its new pauses.
				onChangePauses: (pauses: ShiftPause[]) =>
					row &&
					emit('action', {
						type: CellActionType.MoveShift,
						agent: row.agent,
						date: tags.date,
						shift: {
							...shift,
							pauses,
						},
					}),
			}),
		);
	}
	const { maxByDay, plannedByDay, byHour, max } = forecastData.value;
	if (tags.kind === 'forecast-day') {
		return mount(
			h(CalendarForecast, {
				forecast: maxByDay.get(tags.date) || 0,
				planned: [
					plannedByDay.get(tags.date) || 0,
				],
				max,
				isHour: false,
			}),
		);
	}
	const hourStart = tags.hourStart || 0;
	return mount(
		h(CalendarForecast, {
			forecast: byHour.get(wallOf(tags.date, hourStart).slice(0, 16)) || 0,
			planned: hourSlots(tags.date, hourStart),
			max,
			isHour: true,
		}),
	);
};

/* [Claude] ------------------------------------------------------- Data → config */

const resources = computed<DayPilot.ResourceData[]>(() => [
	...(props.forecast
		? [
				{
					id: FORECAST_ROW_ID,
					name: t('wfmCalendar.forecast'),
				},
			]
		: []),
	...props.rows.map((row) => ({
		id: row.agent.id,
		name: row.agent.name,
	})),
]);

const events = computed<DayPilot.EventData[]>(() => {
	const rows = isDayView.value
		? dayEvents(
				props.rows,
				period.value.from,
				timelineRange.value,
				props.timeZone,
				props.bounds,
			)
		: periodEvents(props.rows, period.value, props.bounds);
	const forecast =
		props.forecast && !state.isForecastCollapsed
			? forecastEvents(period.value, isDayView.value, timelineRange.value)
			: [];
	return [
		...forecast,
		...rows,
	];
});

// [Claude] DayPilot has no stretching cells: the width is shared out by hand.
const ROW_HEADER_WIDTH_PX = 260;
const MIN_DAY_WIDTH_PX = 32;
// [Claude] 24 hours fit a laptop screen: the whole shift and both its edges stay in view for dragging.
const MIN_HOUR_WIDTH_PX = 40;
const RESIZE_MARGIN_PX = 12;
const SCROLLBAR_PX = 18;
const HEADER_HEIGHT_PX = 32;
const FRAME_PX = 4;
const MIN_GRID_HEIGHT_PX = 160;

const size = reactive({
	width: 0,
	height: 0,
});

const cellWidth = computed(() => {
	const free = size.width - ROW_HEADER_WIDTH_PX - SCROLLBAR_PX;
	if (isDayView.value) {
		const hourWidth = Math.max(
			MIN_HOUR_WIDTH_PX,
			Math.floor(free / timelineHours.value),
		);
		return Math.floor(hourWidth / SLOTS_IN_HOUR);
	}
	return Math.max(MIN_DAY_WIDTH_PX, Math.floor(free / period.value.days));
});

// [Claude] Lite starts a view at midnight and shows whole days: the Day view covers the day (two
// [Claude] when the timeline crosses midnight), greys the hours outside the timeline and scrolls
// [Claude] to its start.
const dayViewDays = computed(() =>
	Math.ceil(timelineRange.value.to / MINUTES_IN_DAY),
);

const viewConfig = (): DayPilot.SchedulerConfig => {
	if (isDayView.value) {
		return {
			scale: 'CellDuration',
			cellDuration: SLOT_MINUTES,
			startDate: new DayPilot.Date(`${period.value.from}T00:00:00`),
			days: dayViewDays.value,
			timeHeaders: [
				{
					groupBy: 'Day',
				},
				{
					groupBy: 'Hour',
				},
			],
			cellWidth: cellWidth.value,
			eventMoveHandling: props.isReadonly ? 'Disabled' : 'Update',
			eventResizeHandling: props.isReadonly ? 'Disabled' : 'Update',
			// [Claude] DayPilot's 5 px edge is too thin to hit; the handles drawn in calendar-shift match it.
			eventResizeMargin: RESIZE_MARGIN_PX,
		};
	}
	return {
		scale: 'Day',
		startDate: new DayPilot.Date(`${period.value.from}T00:00:00`),
		days: period.value.days,
		timeHeaders: [
			{
				groupBy: 'Day',
			},
		],
		cellWidth: cellWidth.value,
		eventMoveHandling: 'Disabled',
		eventResizeHandling: 'Disabled',
	};
};

const dpLocale = computed(() =>
	locale.value.startsWith('uk') ? 'uk-ua' : 'en-us',
);

/* [Claude] ------------------------------------------------------------- Heads */

const dayOf = (value: DayPilot.Date) => value.toString('yyyy-MM-dd');

// [Claude] Day heads: weekend red, holiday pink with its name (US_02.01, US_05.08); a date opens
// [Claude] the Day view (onTimeHeaderClick). Hours in Day are "HH:00".
const timeHeader = (args: DayPilot.SchedulerBeforeTimeHeaderRenderArgs) => {
	const { header } = args;
	if (isDayView.value && header.level === 1) {
		header.html = minutesToTime(header.start.getHours() * 60);
		return;
	}
	const day = dayOf(header.start);
	const holiday = holidayByDate.value.get(day);
	const weekday = new Intl.DateTimeFormat(locale.value, {
		weekday: 'short',
		timeZone: 'UTC',
	}).format(dayToMs(day));
	const number = Number(day.slice(8));
	header.html = period.value.days > 7 ? String(number) : `${weekday} ${number}`;
	header.toolTip = holiday || '';
	header.cssClass = [
		'wfm-head',
		isWeekend(day) && 'wfm-head--weekend',
		holiday && 'wfm-head--holiday',
		props.isDayViewEnabled && !isDayView.value && 'wfm-head--link',
	]
		.filter(Boolean)
		.join(' ');
};

// [Claude] Minutes of a Day-view cell from midnight of the shown day.
const minutesOf = (value: DayPilot.Date) =>
	Math.round(
		(wallStringToMs(value.toString(), 'UTC') - dayToMs(period.value.from)) /
			MS_IN_MINUTE,
	);

// [Claude] Cells: days outside the schedule and hours outside the timeline are grey, empty
// [Claude] agent-days show "+" on hover.
const cellRender = (args: DayPilot.SchedulerBeforeCellRenderArgs) => {
	const { cell } = args;
	const isOffTimeline =
		isDayView.value &&
		(minutesOf(cell.start) < timelineRange.value.from ||
			minutesOf(cell.start) >= timelineRange.value.to);
	const day = isDayView.value ? period.value.from : dayOf(cell.start);
	if (isOffTimeline || isOutside(day, props.bounds)) {
		cell.properties.cssClass = 'wfm-cell--outside';
		return;
	}
	const row = rowsById.value.get(String(cell.resource));
	if (!row || props.isReadonly) return;
	if (!hasContent(row.days[day])) cell.properties.cssClass = 'wfm-cell--empty';
};

/* [Claude] -------------------------------------------------------------- Menu */

const menu = useTemplateRef<InstanceType<typeof CalendarMenu>>('menu');
let menuContext: {
	agent: Lookup;
	date: DayKey;
	day: AgentDay;
} | null = null;

const absenceItem = (
	action: CellActionType,
	absence: (typeof ABSENCE_TYPES)[number],
): CellMenuItem => ({
	action,
	icon: ABSENCE_ICON[absence],
	text: t(ABSENCE_LOCALE[absence]),
	absence,
});

const shiftTime = (shift: Shift) =>
	`${formatTime(shift.startAt, props.timeZone)}–${formatTime(shift.endAt, props.timeZone)}`;

// [Claude] What a cell offers (US_02.05–02.07, US_05.14–05.19): empty → shift (Schedules, not
// [Claude] locked) + absences; absence → the other two types + delete; shift in Week / Month →
// [Claude] edit + delete; shift in Day → edit only (no delete from Day).
const menuItems = (day: AgentDay): CellMenuItem[] => {
	if (day.absence) {
		return [
			...ABSENCE_TYPES.filter((type) => type !== day.absence).map((type) =>
				absenceItem(CellActionType.ChangeAbsence, type),
			),
			{
				action: CellActionType.DeleteAbsence,
				icon: 'bucket',
				text: t('wfmCalendar.deleteAbsence'),
			},
		];
	}
	if (day.shifts.length) {
		return day.shifts.flatMap((shift) => [
			{
				action: CellActionType.EditShift,
				icon: 'edit',
				text: `${t('wfmCalendar.editShift')} ${shiftTime(shift)}`,
				shift,
			},
			...(isDayView.value
				? []
				: [
						{
							action: CellActionType.DeleteShift,
							icon: 'bucket',
							text: `${t('wfmCalendar.deleteShift')} ${shiftTime(shift)}`,
							shift,
						},
					]),
		]);
	}
	return [
		...(props.isShiftsEnabled && !day.isLocked
			? [
					{
						action: CellActionType.AddShift,
						icon: 'plus',
						text: t('wfmCalendar.addShift'),
					},
				]
			: []),
		...ABSENCE_TYPES.map((type) =>
			absenceItem(CellActionType.AddAbsence, type),
		),
	];
};

const openMenu = (
	point: {
		x: number;
		y: number;
	},
	agentId: string,
	day: DayKey,
) => {
	const row = rowsById.value.get(agentId);
	if (!row || props.isReadonly || isOutside(day, props.bounds)) return;
	const agentDay = row.days[day] || {
		date: day,
		isLocked: false,
		shifts: [],
	};
	menuContext = {
		agent: row.agent,
		date: day,
		day: agentDay,
	};
	const title = `${row.agent.name}, ${new Intl.DateTimeFormat(locale.value, {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC',
	}).format(dayToMs(day))}`;
	menu.value?.open(point, menuItems(agentDay), title);
};

const selectMenuItem = (item: CellMenuItem) => {
	if (!menuContext) return;
	emit('action', {
		type: item.action,
		agent: menuContext.agent,
		date: menuContext.date,
		absence: item.absence,
		absenceId: menuContext.day.absenceId,
		shift: item.shift,
	});
};

// [Claude] A slot selection has no mouse event: the last pointer position places the menu.
const pointer = {
	x: 0,
	y: 0,
};

/* [Claude] -------------------------------------------------------- Drag (Day) */

// [Claude] A shift moves or resizes within its agent and working day; the rest is refused at once.
const dragTo = (
	args: DayPilot.SchedulerEventMoveArgs | DayPilot.SchedulerEventResizeArgs,
	isMove: boolean,
) => {
	const tags = args.e.data.tags as CalendarEventTags;
	if (tags.kind !== 'shift' || !tags.shift || !tags.agentId) {
		args.preventDefault();
		return;
	}
	const row = rowsById.value.get(tags.agentId);
	const newResource =
		'newResource' in args ? args.newResource : args.e.resource();
	const result = dragShift({
		shift: tags.shift,
		startAt: wallStringToMs(args.newStart.toString(), props.timeZone),
		endAt: wallStringToMs(args.newEnd.toString(), props.timeZone),
		isMove,
		isSameRow: String(newResource) === tags.agentId,
		others: Object.values(row?.days || {}).flatMap((day) => day.shifts),
		timeZone: props.timeZone,
	});
	if ('refusal' in result) {
		args.preventDefault();
		notify('error', t(`wfmCalendar.move.${result.refusal}`));
		return;
	}
	if (!row) {
		args.preventDefault();
		return;
	}
	if (result.cutPauses) {
		notify(
			'info',
			t('wfmCalendar.move.pausesCut', {
				count: result.cutPauses,
			}),
		);
	}
	emit('action', {
		type: CellActionType.MoveShift,
		agent: row.agent,
		date: tags.date,
		shift: result.shift,
	});
};

/* [Claude] ---------------------------------------------------------- Scheduler */

const host = useTemplateRef<HTMLElement>('host');
const body = useTemplateRef<HTMLElement>('body');
let scheduler: DayPilot.Scheduler | null = null;

const config = (): DayPilot.SchedulerConfig => ({
	...viewConfig(),
	locale: dpLocale.value,
	heightSpec: 'Fixed',
	// [Claude] `height` is the grid without the time header rows (two in Day) and borders.
	height: Math.max(
		MIN_GRID_HEIGHT_PX,
		size.height - HEADER_HEIGHT_PX * (isDayView.value ? 2 : 1) - FRAME_PX,
	),
	rowHeaderWidth: ROW_HEADER_WIDTH_PX,
	eventHeight: 40,
	rowMarginTop: 2,
	rowMarginBottom: 2,
	headerHeight: HEADER_HEIGHT_PX,
	durationBarVisible: false,
	eventBorderRadius: 4,
	snapToGrid: true,
	beforeCellRenderCaching: false,
	eventClickHandling: 'Enabled',
	eventDeleteHandling: 'Disabled',
	eventRightClickHandling: 'Disabled',
	timeRangeSelectedHandling: props.isReadonly ? 'Disabled' : 'Enabled',
	timeRangeClickHandling: 'Disabled',
	timeHeaderClickHandling: 'Enabled',
	resources: resources.value,
	events: events.value,
	onBeforeTimeHeaderRender: timeHeader,
	onBeforeCellRender: cellRender,
	onBeforeRowHeaderDomAdd: (args) => {
		args.element = rowHead(String(args.row.id));
	},
	onBeforeRowHeaderDomRemove: (args) => unmount(args.element),
	onBeforeEventDomAdd: (args) => {
		args.element = eventBody(args.e.data.tags as CalendarEventTags);
	},
	onBeforeEventDomRemove: (args) => unmount(args.element),
	onEventClick: (args) => {
		const tags = args.e.data.tags as CalendarEventTags;
		if (!tags.agentId) return;
		openMenu(
			{
				x: args.originalEvent.clientX,
				y: args.originalEvent.clientY,
			},
			tags.agentId,
			tags.date,
		);
	},
	// [Claude] In Lite a click on a slot arrives as a one-cell selection: it opens the menu of the
	// [Claude] day it starts on, and the selection is cleared.
	onTimeRangeSelected: (args) => {
		scheduler?.clearSelection();
		openMenu(pointer, String(args.resource), dayOf(args.start));
	},
	onTimeHeaderClick: (args) => {
		if (!props.isDayViewEnabled || isDayView.value || args.header.level) return;
		date.value = clampDay(dayOf(args.header.start), props.bounds);
		range.value = null;
		view.value = CalendarView.Day;
	},
	onEventMove: (args) => dragTo(args, true),
	onEventResize: (args) => dragTo(args, false),
});

// [Claude] Scrolls the Day view to the timeline start once per shown day / timeline.
let scrolledTo = '';
const scrollToTimeline = () => {
	if (!isDayView.value) scrolledTo = '';
	if (!scheduler || !isDayView.value) return;
	const start = wallOf(period.value.from, timelineRange.value.from);
	if (start === scrolledTo) return;
	scrolledTo = start;
	scheduler.scrollTo(start);
};

const refresh = () => {
	scheduler?.update(config());
	scrollToTimeline();
};

onMounted(() => {
	if (!host.value || !body.value) return;
	size.width = body.value.clientWidth;
	size.height = body.value.clientHeight;
	scheduler = new DayPilot.Scheduler(host.value, config());
	scheduler.init();
	scrollToTimeline();
});

onBeforeUnmount(() => {
	scheduler?.dispose();
	scheduler = null;
});

useResizeObserver(body, ([entry]) => {
	size.width = entry.contentRect.width;
	size.height = entry.contentRect.height;
});

useEventListener(host, 'pointerdown', (event: PointerEvent) => {
	pointer.x = event.clientX;
	pointer.y = event.clientY;
});

watch(
	() => [
		resources.value,
		events.value,
		cellWidth.value,
		size.height,
		dpLocale.value,
		props.holidays,
		props.bounds,
		props.isReadonly,
		isDayView.value,
		period.value.from,
		period.value.days,
		timelineRange.value,
	],
	refresh,
);

/* [Claude] ------------------------------------------------------- Navigation */

// [Claude] Week / Month / Day drop the own period and open around its start.
const changeView = (next: CalendarView) => {
	date.value = clampDay(range.value?.from || date.value, props.bounds);
	range.value = null;
	view.value = next;
};
</script>
