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

    <div class="schedule-table__grid">
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
        :resources="resources"
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
        :resources="resources"
        :selected="selected"
        :time-zone="timeZone"
        :timeline="timeline"
        @delete-agent="deleteAgent"
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
import { computed, ref, useTemplateRef } from 'vue';
import { useUserinfoStore } from '../../../modules/userinfo/store/userinfoStore';
import { CalendarView, CellActionType } from '../../enums';
import ScheduleTableToolbar from './components/header/schedule-table-toolbar.vue';
import ScheduleTableMenu from './components/schedule-table-menu.vue';
import ScheduleTableTotal from './components/schedule-table-total.vue';
import ScheduleTableDayView from './components/view/schedule-table-day-view.vue';
import ScheduleTablePeriodView from './components/view/schedule-table-period-view.vue';
import { useCellMenu } from './composables/useCellMenu';
import type {
	CalendarBounds,
	CalendarForecast,
	CalendarRow,
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
</script>
