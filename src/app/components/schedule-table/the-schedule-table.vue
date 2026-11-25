<template>
  <section
    :class="{ 'schedule-table--loading': loading }"
    class="schedule-table"
  >
    <schedule-table-toolbar
      v-model:date="date"
      v-model:range="range"
      :bounds="bounds"
      :is-day-view="!!isDayView"
      :view="view"
      @update:view="changeView"
    />

    <!-- [Claude] scroll does not bubble: caught on the way down from QCalendar's scroll area. -->
    <div
      ref="grid"
      class="schedule-table__grid"
      @scroll.capture="onGridScroll"
    >
      <!-- [Claude] The wrapper keeps the state all views share (date, view, forecast toggle,
           selection) and the toolbar, menu and total; a view lays out its grid and rows. -->
      <schedule-table-period-view
        v-if="view !== CalendarView.Day"
        v-model:is-forecast-collapsed="isForecastCollapsed"
        :bounds="bounds"
        :date="date"
        :forecast="forecast"
        :holidays="holidays"
        :is-day-view="!!isDayView"
        :is-schedule-row="shifts"
        :range="range"
        :readonly="readonly"
        :resources="windowed"
        :selected="selected"
        :time-zone="timeZone"
        :timeline="timeline"
        :view="view"
        @delete-agent="deleteAgent"
        @open-cell="cellMenu.openCellMenu"
        @open-day="openDay"
        @select="toggleSelected"
      />

      <schedule-table-day-view
        v-else
        v-model:date="date"
        v-model:is-forecast-collapsed="isForecastCollapsed"
        :forecast="forecast"
        :is-schedule-row="shifts"
        :readonly="readonly"
        :resources="windowed"
        :selected="selected"
        :time-zone="timeZone"
        :timeline="timeline"
        @delete-agent="deleteAgent"
        @drag-shift="dragShift"
        @open-cell="cellMenu.openCellMenu"
        @open-pause="cellMenu.openPauseMenu"
        @open-shift="cellMenu.openShiftMenu"
        @select="toggleSelected"
      />

      <wt-loader
        v-if="loading"
        class="schedule-table__loader"
      />
    </div>

    <!-- [Claude] QCalendar has no footer slot, so the total sits below the grid. -->
    <schedule-table-total
      v-if="total !== undefined"
      :is-confirmation-visible="shifts"
      :rows="rows"
      :total="total"
    />

    <schedule-table-menu
      ref="menu"
      @select="cellMenu.select"
    />
  </section>
</template>

<script setup lang="ts">
// [Claude] Agents × days table shared by Agents (absences) and Schedules (shifts), WFM-72;
// [Claude] look of Figma "PrimeVue Schedules Powered" (resources timeline).
// [Claude] Week / Month: schedule-table-period-view (QCalendarScheduler);
// [Claude] Day: schedule-table-day-view (QCalendarResource).
import '@quasar/quasar-ui-qcalendar/QCalendarVariables.min.css';
import './schedule-table.css';

import { storeToRefs } from 'pinia';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useUserinfoStore } from '../../../modules/userinfo/store/userinfoStore';
import { CalendarView, CellActionType } from '../../enums';
import ScheduleTableToolbar from './components/header/schedule-table-toolbar.vue';
import ScheduleTableMenu from './components/schedule-table-menu.vue';
import ScheduleTableTotal from './components/schedule-table-total.vue';
import ScheduleTableDayView from './components/view/schedule-table-day-view.vue';
import ScheduleTablePeriodView from './components/view/schedule-table-period-view.vue';
import { useCellMenu } from './composables/useCellMenu';
import { useRowWindow } from './composables/useRowWindow';
import type {
	CalendarBounds,
	CalendarForecast,
	CalendarRow,
	CalendarShift,
	CalendarTimeline,
	CellAction,
	DayKey,
	Holiday,
	ScheduleTableResource,
} from './types';
import { clampDay, type DayRange } from './utils/date';

const props = withDefaults(
	defineProps<{
		rows: CalendarRow[];
		holidays?: Holiday[];
		// [Claude] The schedule dates: arrows and cells stop there.
		bounds?: CalendarBounds;
		// [Claude] Parts of the table a page switches on: the Shift item of the cell menu and
		// [Claude] the Day view (Schedules).
		shifts?: boolean;
		isDayView?: boolean;
		// [Claude] The schedule's calendar time zone: shifts and working dates are in it.
		// [Claude] Unset (Agents) = the user's time zone.
		timeZone?: string;
		timeline?: CalendarTimeline;
		// [Claude] The Forecast row is shown when its data is given (Schedules).
		forecast?: CalendarForecast;
		// [Claude] Archived schedule: look, don't touch.
		readonly?: boolean;
		loading?: boolean;
		// [Claude] Agents matching the filters, on all pages; no footer when undefined.
		total?: number;
		// [Claude] More agents on the server: the table asks for them near the end of the scroll.
		hasMore?: boolean;
	}>(),
	{
		holidays: () => [],
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
const range = defineModel<DayRange | null>('range', {
	default: null,
});

const emit = defineEmits<{
	action: [
		action: CellAction,
	];
	'load-more': [];
}>();

const { timezone: userTimeZone } = storeToRefs(useUserinfoStore());

// [Claude] The user's time zone from the settings (ui-sdk); the browser's until it loads.
const timeZone = computed(
	() =>
		props.timeZone ||
		userTimeZone.value ||
		Intl.DateTimeFormat().resolvedOptions().timeZone,
);

const isForecastCollapsed = ref(false);

// [Claude] --schedule-table-row-height: an agent row before it is measured.
const ROW_HEIGHT = 48;

const resources = computed<ScheduleTableResource[]>(() => {
	const agents = props.rows.map((row) => ({
		id: row.agent.id,
		row,
	}));
	return props.forecast
		? [
				{
					// [Claude] QCalendar needs a key for every resource; agent ids are numbers, so no clash.
					id: 'forecast',
					isForecast: true,
				},
				...agents,
			]
		: agents;
});

/* [Claude] ----------------------------------------------------------- Navigation */

// [Claude] Week / Month / Day drop the own period and open around its start.
const changeView = (next: CalendarView) => {
	date.value = clampDay(range.value?.from || date.value, props.bounds);
	range.value = null;
	view.value = next;
};

// [Claude] A click on a date in Week / Month opens the Day view of that date (US_05.08).
const openDay = (day: DayKey) => {
	date.value = day;
	view.value = CalendarView.Day;
};

/* [Claude] -------------------------------------------------------------- Selection */

const toggleSelected = (id: string, value: boolean) => {
	selected.value = value
		? [
				...selected.value,
				id,
			]
		: selected.value.filter((s) => s !== id);
};

/* [Claude] ------------------------------------------------------------- Infinite scroll */

// [Claude] The next page is asked for when less than a screen is left below.
const isNearEnd = (el: Element) =>
	el.scrollHeight - el.scrollTop - el.clientHeight < el.clientHeight;

const onGridScroll = (event: Event) => {
	rowWindow.onScroll();
	if (props.hasMore && !props.loading && isNearEnd(event.target as Element))
		emit('load-more');
};

const grid = useTemplateRef<HTMLElement>('grid');

/* [Claude] ------------------------------------------------------- Row virtualization */

// [Claude] Only the agent rows near the viewport are drawn (QCalendar draws all it gets).
const rowWindow = useRowWindow({
	resources,
	scroller: grid,
	rowHeight: ROW_HEIGHT,
	resetKey: () => [
		view.value,
		date.value,
		range.value,
	],
});
const { windowed } = rowWindow;

// [Claude] A page that does not fill the screen gives no scroll: ask for the next one at once.
watch(
	() => [
		props.rows.length,
		props.hasMore,
		props.loading,
		view.value,
	],
	async () => {
		if (!props.hasMore || props.loading) return;
		await nextTick();
		// [Claude] QCalendarScheduler / QCalendarResource scroll in their own __scroll-area.
		const scrollers = [
			grid.value,
			...(grid.value?.querySelectorAll('[class*="__scroll-area"]') || []),
		].filter(
			(el): el is HTMLElement => !!el && el.scrollHeight > el.clientHeight,
		);
		if (!scrollers.length || scrollers.some(isNearEnd)) emit('load-more');
	},
	{
		flush: 'post',
	},
);

/* [Claude] ------------------------------------------------------------------- Menu */

const cellMenu = useCellMenu({
	menu: useTemplateRef<InstanceType<typeof ScheduleTableMenu>>('menu'),
	view,
	date,
	timeZone,
	readonly: () => props.readonly,
	shifts: () => props.shifts,
	onAction: (action) => emit('action', action),
});

// [Claude] The trash of an agent row: the page asks and takes the agent out of the schedule.
const deleteAgent = (row: CalendarRow) => {
	emit('action', {
		type: CellActionType.DeleteAgent,
		agent: row.agent,
		date: date.value,
	});
};

// [Claude] A shift or its pause dragged in the Day view: the page saves the new times.
const dragShift = (row: CalendarRow, shift: CalendarShift) => {
	emit('action', {
		type: CellActionType.DragShift,
		agent: row.agent,
		date: date.value,
		shift,
	});
};
</script>
