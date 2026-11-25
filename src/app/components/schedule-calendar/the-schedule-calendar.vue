<template>
  <!-- [Claude] Agents × days calendar on DayPilot Lite Scheduler, shared by Agents (absences,
       EP_02) and the Schedule page (shifts + absences + forecast + Day drag, EP_05). Everything
       inside the grid is DayPilot's own (HTML strings, areas, its menu), no Vue components;
       the look comes from schedule-calendar.css over its default theme. -->
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
  </section>
</template>

<script setup lang="ts">
import './schedule-calendar.css';

import { DayPilot } from '@daypilot/daypilot-lite-javascript';
import { useEventListener, useResizeObserver } from '@vueuse/core';
import {
	computed,
	onBeforeUnmount,
	onMounted,
	reactive,
	ref,
	useTemplateRef,
	watch,
} from 'vue';
import { useI18n } from 'vue-i18n';

import {
	AbsenceType,
	type AgentDay,
	AgentRow,
	type Holiday,
	type Lookup,
	type Shift,
	type ShiftPause,
} from '../../api/wfm/types';
import { useWfmErrors } from '../../composables/useWfmErrors';
import {
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
import CalendarToolbar from './components/calendar-toolbar.vue';
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
import { forecastLevel } from './utils/forecast';
import { absenceIcon, approvedIcon, escapeHtml, initials } from './utils/html';
import { dragPause, PauseDragMode } from './utils/pauseDrag';
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

const isForecastCollapsed = ref(false);

const toggleSelected = (id: string) => {
	selected.value = selected.value.includes(id)
		? selected.value.filter((item) => item !== id)
		: [
				...selected.value,
				id,
			];
};

/* [Claude] ----------------------------------------------------------- Forecast */

const SLOT_MINUTES = 15;
const SLOTS_IN_HOUR = 4;
const SLOT_MS = SLOT_MINUTES * MS_IN_MINUTE;

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
	return {
		maxByDay,
		byHour,
		plannedByDay,
		plannedBySlot,
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

// [Claude] A bar of the Forecast row (Figma "Forecast Bar"): its value above, the bar below at
// [Claude] full height, grey for the forecast, a fact coloured against it (US_05.11).
const bar = (value: number, level: string, tip: string) =>
	`<span class="wfm-forecast__item" title="${escapeHtml(tip)}"><span class="wfm-forecast__value">${value}</span><span class="wfm-forecast__bar wfm-forecast__bar--${level}"></span></span>`;

// [Claude] Week / Month: the forecast bar (busiest hour) next to the fact bar. Day: the
// [Claude] forecast of the hour on top and four 15-minute fact bars.
const forecastHtml = (tags: CalendarEventTags) => {
	const { maxByDay, plannedByDay, byHour } = forecastData.value;
	const forecastTip = t('wfmCalendar.forecast');
	const plannedTip = t('wfmCalendar.planned');
	if (tags.kind === 'forecast-day') {
		const forecast = maxByDay.get(tags.date) || 0;
		const planned = plannedByDay.get(tags.date) || 0;
		return `<div class="wfm-forecast"><div class="wfm-forecast__bars">${bar(
			forecast,
			'forecast',
			`${forecastTip}: ${forecast}`,
		)}${bar(planned, forecastLevel(planned, forecast), `${plannedTip}: ${planned}`)}</div></div>`;
	}
	const hourStart = tags.hourStart || 0;
	const forecast = byHour.get(wallOf(tags.date, hourStart).slice(0, 16)) || 0;
	const bars = hourSlots(tags.date, hourStart)
		.map((planned) =>
			bar(
				planned,
				forecastLevel(planned, forecast),
				`${plannedTip}: ${planned}`,
			),
		)
		.join('');
	return `<div class="wfm-forecast"><span class="wfm-forecast__number" title="${escapeHtml(forecastTip)}">${forecast}</span><div class="wfm-forecast__bars">${bars}</div></div>`;
};

/* [Claude] ------------------------------------------------------- Sizes */

// [Claude] DayPilot has no stretching cells: the width is shared out by hand.
// [Claude] Figma: checkbox 24 + agent card 294 + gap.
const ROW_HEADER_WIDTH_PX = 320;
const MIN_DAY_WIDTH_PX = 32;
// [Claude] 24 hours fit a laptop screen: the whole shift and both its edges stay in view for dragging.
const MIN_HOUR_WIDTH_PX = 40;
const RESIZE_MARGIN_PX = 12;
const SCROLLBAR_PX = 18;
// [Claude] Figma: one 24 px row of day / hour chips, rows of 40 px.
const HEADER_HEIGHT_PX = 26;
const FRAME_PX = 4;
const MIN_GRID_HEIGHT_PX = 160;
const EVENT_HEIGHT_PX = 40;
// [Claude] Areas: a pause box inside its shift, buttons of a row head.
const PAUSE_INSET_PX = 3;
const DELETE_SIZE_PX = 16;
const ROW_BUTTON_PX = 24;
const ROW_PADDING_PX = 8;

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

// [Claude] Day view: ms of time per px, the scale pauses are placed and dragged by.
const msPerPx = computed(() => SLOT_MS / cellWidth.value);

/* [Claude] ------------------------------------------------------- Rows */

// [Claude] A row head button: a square area at a slot from the right edge.
const rowButton = (
	slot: number,
	area: DayPilot.AreaData,
): DayPilot.AreaData => ({
	right: ROW_PADDING_PX + slot * ROW_BUTTON_PX,
	top: 0,
	bottom: 0,
	width: ROW_BUTTON_PX,
	verticalAlignment: 'center',
	horizontalAlignment: 'center',
	...area,
});

// [Claude] Row head (Figma "Schedule Page Row"): the checkbox on the left, then the agent card
// [Claude] (avatar, name) as HTML; the confirmation mark and the delete button (on hover) are
// [Claude] areas on the right.
const CHECKBOX_PX = 24;

const agentAreas = (agent: Lookup): DayPilot.AreaData[] => {
	const areas: DayPilot.AreaData[] = [
		{
			left: 0,
			top: 0,
			bottom: 0,
			width: CHECKBOX_PX,
			verticalAlignment: 'center',
			horizontalAlignment: 'center',
			cssClass: [
				'wfm-check',
				selected.value.includes(agent.id) && 'wfm-check--on',
				props.isReadonly && 'wfm-check--disabled',
			]
				.filter(Boolean)
				.join(' '),
			onClick: () => {
				if (!props.isReadonly) toggleSelected(agent.id);
			},
		},
	];
	if (props.isConfirmedShown) {
		areas.push(
			rowButton(0, {
				html: approvedIcon(),
				toolTip: t('wfmCalendar.confirmed'),
			}),
		);
	}
	if (props.isAgentDeletable && !props.isReadonly) {
		areas.push(
			rowButton(1, {
				cssClass: 'wfm-button wfm-button--delete',
				visibility: 'Hover',
				onClick: () =>
					emit('action', {
						type: CellActionType.DeleteAgent,
						agent,
						date: date.value,
					}),
			}),
		);
	}
	return areas;
};

const agentHtml = (agent: Lookup) =>
	`<div class="wfm-agent wfm-agent--card"><span class="wfm-agent__avatar">${escapeHtml(
		initials(agent.name),
	)}</span><span class="wfm-agent__name" title="${escapeHtml(agent.name)}">${escapeHtml(
		agent.name,
	)}</span></div>`;

const resources = computed<DayPilot.ResourceData[]>(() => [
	...(props.forecast
		? [
				{
					id: FORECAST_ROW_ID,
					name: t('wfmCalendar.forecast'),
					html: `<div class="wfm-agent wfm-agent--forecast">${escapeHtml(
						t('wfmCalendar.forecast'),
					)}</div>`,
					cssClass: 'wfm-row--forecast',
					areas: [
						rowButton(0, {
							cssClass: `wfm-button wfm-button--chevron${isForecastCollapsed.value ? '' : ' wfm-button--open'}`,
							onClick: () => {
								isForecastCollapsed.value = !isForecastCollapsed.value;
							},
						}),
					],
				},
			]
		: []),
	...props.rows.map((row) => ({
		id: row.agent.id,
		name: row.agent.name,
		html: agentHtml(row.agent),
		areas: agentAreas(row.agent),
	})),
]);

/* [Claude] ------------------------------------------------------- Events */

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
		props.forecast && !isForecastCollapsed.value
			? forecastEvents(period.value, isDayView.value, timelineRange.value)
			: [];
	return [
		...forecast,
		...rows,
	];
});

const shiftTime = (shift: Shift | ShiftPause) =>
	`${formatTime(shift.startAt, props.timeZone)}–${formatTime(shift.endAt, props.timeZone)}`;

// [Claude] Month cells are narrow: whole hours as "9–18".
const compactTime = (ms: number) => {
	const time = formatTime(ms, props.timeZone);
	return time.endsWith(':00') ? String(Number(time.slice(0, 2))) : time;
};

// [Claude] Figma colours an absence by its type: day-off and sick leave pink, vacation blue.
const ABSENCE_CLASS: Record<AbsenceType, string> = {
	[AbsenceType.DayOff]: 'day-off',
	[AbsenceType.SickDay]: 'sick',
	[AbsenceType.Vacation]: 'vacation',
};

const dayState = (day: AgentDay) => {
	if (day.absence) return `absence wfm-event--${ABSENCE_CLASS[day.absence]}`;
	if (day.shifts.length) return 'shift';
	return 'locked';
};

// [Claude] An agent-day (US_02.01, US_05.08, US_05.10): the absence icon (one per hour of the
// [Claude] timeline in Day), the shift times, or a lock when another schedule holds the day.
const dayHtml = (day: AgentDay, repeat: number) => {
	if (day.absence) {
		const tip = escapeHtml(t(ABSENCE_LOCALE[day.absence]));
		const part = `<span class="wfm-day__part" title="${tip}">${absenceIcon(day.absence)}</span>`;
		return `<div class="wfm-day">${part.repeat(repeat)}</div>`;
	}
	if (day.shifts.length) {
		const times = day.shifts
			.map(
				(shift) =>
					`<span>${
						period.value.days > 7
							? `${compactTime(shift.startAt)}–${compactTime(shift.endAt)}`
							: `${formatTime(shift.startAt, props.timeZone)} - ${formatTime(shift.endAt, props.timeZone)}`
					}</span>`,
			)
			.join('');
		return `<div class="wfm-day wfm-day--shifts">${times}</div>`;
	}
	return `<div class="wfm-day" title="${escapeHtml(t('wfmCalendar.locked'))}"><span class="wfm-lock"></span></div>`;
};

const pauseName = (pause: ShiftPause) =>
	pause.cause?.name || t('wfmCalendar.pause');

// [Claude] Pauses are areas placed by their time inside the shift: orange quarters (Figma), the
// [Claude] name and time in the tooltip. action "None" keeps
// [Claude] DayPilot from moving the shift when a pause is grabbed; the pause drag is ours and
// [Claude] finds the pause by its index class.
const PAUSE_CLASS = 'wfm-pause';
const PAUSE_INDEX_CLASS = 'wfm-pause-index-';

const pauseAreas = (tags: CalendarEventTags, shift: Shift) =>
	shift.pauses.flatMap((pause, index): DayPilot.AreaData[] => {
		const left = (pause.startAt - shift.startAt) / msPerPx.value;
		const width = (pause.endAt - pause.startAt) / msPerPx.value;
		const box: DayPilot.AreaData = {
			left,
			width,
			top: 0,
			bottom: 0,
			toolTip: `${pauseName(pause)} ${shiftTime(pause)}`,
			cssClass: `${PAUSE_CLASS} ${PAUSE_INDEX_CLASS}${index}`,
			action: 'None',
		};
		if (props.isReadonly)
			return [
				box,
			];
		return [
			box,
			{
				left: left + width - DELETE_SIZE_PX - PAUSE_INSET_PX,
				top: PAUSE_INSET_PX * 2,
				width: DELETE_SIZE_PX,
				height: DELETE_SIZE_PX,
				cssClass: 'wfm-button wfm-button--close',
				visibility: 'Hover',
				action: 'None',
				onClick: () => {
					const row = tags.agentId
						? rowsById.value.get(tags.agentId)
						: undefined;
					if (!row) return;
					emit('action', {
						type: CellActionType.DeletePause,
						agent: row.agent,
						date: tags.date,
						shift,
						pause,
					});
				},
			},
		];
	});

// [Claude] HTML, class and areas of each event, from its tags; the look is in the CSS file.
const eventRender = (args: DayPilot.SchedulerBeforeEventRenderArgs) => {
	const { data } = args;
	const tags = data.tags as CalendarEventTags;
	data.cssClass = `wfm-event wfm-event--${tags.kind}`;
	if ((tags.kind === 'day' || tags.kind === 'day-line') && tags.day) {
		data.cssClass += ` wfm-event--${dayState(tags.day)}`;
		data.html = dayHtml(
			tags.day,
			tags.kind === 'day-line' ? timelineHours.value : 1,
		);
		return;
	}
	if (tags.kind === 'shift' && tags.shift) {
		data.html = '';
		data.toolTip = shiftTime(tags.shift);
		data.areas = pauseAreas(tags, tags.shift);
		return;
	}
	data.html = forecastHtml(tags);
};

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
			// [Claude] Hours only: the day is in the toolbar (Figma).
			timeHeaders: [
				{
					groupBy: 'Hour',
				},
			],
			cellWidth: cellWidth.value,
			eventMoveHandling: props.isReadonly ? 'Disabled' : 'Update',
			eventResizeHandling: props.isReadonly ? 'Disabled' : 'Update',
			// [Claude] DayPilot's 5 px edge is too thin to hit; the CSS shows it on hover.
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

// [Claude] Day heads are chips (Figma): "Mon 01" (Month: "01"), weekend and holiday coloured,
// [Claude] the holiday name as a tooltip (US_02.01, US_05.08); a date opens the Day view
// [Claude] (onTimeHeaderClick). Hours in Day are "HH:00".
const timeHeader = (args: DayPilot.SchedulerBeforeTimeHeaderRenderArgs) => {
	const { header } = args;
	if (isDayView.value) {
		header.text = minutesToTime(header.start.getHours() * 60);
		header.cssClass = 'wfm-head wfm-head--hour';
		return;
	}
	const day = dayOf(header.start);
	const holiday = holidayByDate.value.get(day);
	const weekday = new Intl.DateTimeFormat(locale.value, {
		weekday: 'short',
		timeZone: 'UTC',
	}).format(dayToMs(day));
	const number = `<b class="wfm-head__number">${day.slice(8)}</b>`;
	header.html =
		period.value.days > 7
			? number
			: `<span class="wfm-head__weekday">${escapeHtml(weekday)}</span>${number}`;
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

// [Claude] Cells: days outside the schedule and hours outside the timeline are grey, weekend
// [Claude] columns tinted, empty agent-days show the "+" square.
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
	const isWeekendColumn = !isDayView.value && isWeekend(day);
	if (isWeekendColumn) cell.properties.cssClass = 'wfm-cell--weekend';
	const row = rowsById.value.get(String(cell.resource));
	if (!row || props.isReadonly) return;
	if (!hasContent(row.days[day])) {
		cell.properties.cssClass = [
			'wfm-cell--empty',
			isWeekendColumn && 'wfm-cell--weekend',
		]
			.filter(Boolean)
			.join(' ');
	}
};

/* [Claude] -------------------------------------------------------------- Menu */

// [Claude] DayPilot's own menu, shown at the mouse; its look is in the CSS file.
const menu = new DayPilot.Menu({
	showMenuTitle: true,
});

const absenceItem = (
	action: CellActionType,
	absence: (typeof ABSENCE_TYPES)[number],
): CellMenuItem => ({
	action,
	text: t(ABSENCE_LOCALE[absence]),
	absence,
});

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
				text: t('wfmCalendar.deleteAbsence'),
			},
		];
	}
	if (day.shifts.length) {
		return day.shifts.flatMap((shift) => [
			{
				action: CellActionType.EditShift,
				text: `${t('wfmCalendar.editShift')} ${shiftTime(shift)}`,
				shift,
			},
			...(isDayView.value
				? []
				: [
						{
							action: CellActionType.DeleteShift,
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
						text: t('wfmCalendar.addShift'),
					},
				]
			: []),
		...ABSENCE_TYPES.map((type) =>
			absenceItem(CellActionType.AddAbsence, type),
		),
	];
};

// [Claude] An item: the absence icon or a CSS one by action, then its text.
const MENU_ICON_CLASS: Partial<Record<CellActionType, string>> = {
	[CellActionType.AddShift]: 'wfm-button--add',
	[CellActionType.EditShift]: 'wfm-button--edit',
	[CellActionType.DeleteShift]: 'wfm-button--delete',
	[CellActionType.DeleteAbsence]: 'wfm-button--delete',
};

const menuItemHtml = (item: CellMenuItem) => {
	const icon = item.absence
		? absenceIcon(item.absence)
		: `<span class="wfm-button ${MENU_ICON_CLASS[item.action] || ''}"></span>`;
	return `<span class="wfm-menu-item">${icon}<span>${escapeHtml(item.text)}</span></span>`;
};

const openMenu = (agentId: string, day: DayKey) => {
	const row = rowsById.value.get(agentId);
	if (!row || props.isReadonly || isOutside(day, props.bounds)) return;
	const agentDay = row.days[day] || {
		date: day,
		isLocked: false,
		shifts: [],
	};
	const items = menuItems(agentDay);
	if (!items.length) return;
	menu.menuTitle = `${row.agent.name}, ${new Intl.DateTimeFormat(locale.value, {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC',
	}).format(dayToMs(day))}`;
	menu.items = items.map((item) => ({
		html: menuItemHtml(item),
		onClick: () =>
			emit('action', {
				type: item.action,
				agent: row.agent,
				date: day,
				absence: item.absence,
				absenceId: agentDay.absenceId,
				shift: item.shift,
			}),
	}));
	menu.show();
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

// [Claude] Pause drag: DayPilot has no events inside events, so a pause area is moved here.
// [Claude] The area box follows the pointer; on release the shift is saved with its pauses.
const PAUSE_EDGE_PX = 8;
const CLICK_PX = 3;
const eventByDiv = new WeakMap<Element, DayPilot.Event>();

const eventOf = (element: Element) => {
	for (let at = element.parentElement; at; at = at.parentElement) {
		const found = eventByDiv.get(at);
		if (found) return found;
	}
	return null;
};

const startPauseDrag = (event: PointerEvent, box: HTMLElement) => {
	const dpEvent = eventOf(box);
	const tags = dpEvent?.data.tags as CalendarEventTags | undefined;
	const index = Number(
		[
			...box.classList,
		]
			.find((name) => name.startsWith(PAUSE_INDEX_CLASS))
			?.slice(PAUSE_INDEX_CLASS.length),
	);
	const shift = tags?.shift;
	if (!tags || !shift || Number.isNaN(index)) return;
	const { left, right } = box.getBoundingClientRect();
	let mode = PauseDragMode.Move;
	if (event.clientX - left <= PAUSE_EDGE_PX) mode = PauseDragMode.Start;
	else if (right - event.clientX <= PAUSE_EDGE_PX) mode = PauseDragMode.End;
	const startX = event.clientX;
	let pauses = shift.pauses;

	const onMove = (move: PointerEvent) => {
		pauses = dragPause({
			shift,
			index,
			mode,
			deltaMs: (move.clientX - startX) * msPerPx.value,
		});
		const pause = pauses[index];
		box.style.left = `${(pause.startAt - shift.startAt) / msPerPx.value}px`;
		box.style.width = `${(pause.endAt - pause.startAt) / msPerPx.value}px`;
	};
	const onUp = (up: PointerEvent) => {
		window.removeEventListener('pointermove', onMove);
		const before = shift.pauses[index];
		const after = pauses[index];
		const row = rowsById.value.get(tags.agentId || '');
		if (
			!row ||
			Math.abs(up.clientX - startX) < CLICK_PX ||
			(before.startAt === after.startAt && before.endAt === after.endAt)
		) {
			scheduler?.update();
			return;
		}
		emit('action', {
			type: CellActionType.MoveShift,
			agent: row.agent,
			date: tags.date,
			shift: {
				...shift,
				pauses,
			},
		});
	};
	window.addEventListener('pointermove', onMove);
	window.addEventListener('pointerup', onUp, {
		once: true,
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
	// [Claude] `height` is the grid without the time header row and borders.
	height: Math.max(
		MIN_GRID_HEIGHT_PX,
		size.height - HEADER_HEIGHT_PX - FRAME_PX,
	),
	rowHeaderWidth: ROW_HEADER_WIDTH_PX,
	eventHeight: EVENT_HEIGHT_PX,
	headerHeight: HEADER_HEIGHT_PX,
	durationBarVisible: false,
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
	onBeforeEventRender: eventRender,
	onAfterEventRender: (args) => {
		eventByDiv.set(args.div, args.e);
	},
	onEventClick: (args) => {
		const tags = args.e.data.tags as CalendarEventTags;
		if (tags.agentId) openMenu(tags.agentId, tags.date);
	},
	// [Claude] In Lite a click on a slot arrives as a one-cell selection: it opens the menu of the
	// [Claude] day it starts on, and the selection is cleared.
	onTimeRangeSelected: (args) => {
		scheduler?.clearSelection();
		openMenu(String(args.resource), dayOf(args.start));
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

// [Claude] The CSS splits a Day shift into 15-minute chips of this width (Figma "Quarter").
const setQuarterWidth = () => {
	host.value?.style.setProperty('--wfm-quarter', `${cellWidth.value}px`);
};

const refresh = () => {
	setQuarterWidth();
	scheduler?.update(config());
	scrollToTimeline();
};

onMounted(() => {
	if (!host.value || !body.value) return;
	size.width = body.value.clientWidth;
	size.height = body.value.clientHeight;
	scheduler = new DayPilot.Scheduler(host.value, config());
	setQuarterWidth();
	scheduler.init();
	scrollToTimeline();
});

onBeforeUnmount(() => {
	menu.hide();
	scheduler?.dispose();
	scheduler = null;
});

useResizeObserver(body, ([entry]) => {
	size.width = entry.contentRect.width;
	size.height = entry.contentRect.height;
});

useEventListener(host, 'pointerdown', (event: PointerEvent) => {
	if (props.isReadonly || event.button !== 0) return;
	const box = (event.target as HTMLElement).closest<HTMLElement>(
		`.${PAUSE_CLASS}`,
	);
	if (box) startPauseDrag(event, box);
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
