<template>
  <!-- [Claude] Day view: agents × hours of one day on QCalendarResource. -->
  <q-calendar-resource
    :cell-width="HOUR_WIDTH"
    :interval-header-height="HEAD_HEIGHT"
    :interval-count="intervals.count"
    :interval-minutes="INTERVAL_MINUTES"
    :interval-start="intervals.start"
    :model-resources="resources"
    :model-value="date"
    :resource-min-height="0"
    no-active-date
  >
    <template #head-resources>
      <span class="schedule-table__resources-title">{{ t('scheduleTable.resources') }}</span>
    </template>

    <!-- [Claude] Figma Day head: "October 2026" and "6 Tue" written once over the first hour
         (they run over the next ones), then "7:00 AM" per hour. -->
    <template #interval-label="{ scope }">
      <div class="schedule-table-day-view__head">
        <div class="schedule-table-day-view__head-row schedule-table-day-view__head-row--wide">
          <span v-if="isFirstInterval(scope.timestamp)">{{ formatMonthYear(date, locale) }}</span>
        </div>
        <div class="schedule-table-day-view__head-row schedule-table-day-view__head-row--wide">
          <span v-if="isFirstInterval(scope.timestamp)">{{ formatDayWithWeekday(date, locale) }}</span>
        </div>
        <div class="schedule-table-day-view__head-row schedule-table-day-view__head-row--hour">
          {{ formatHour(scope.timestamp.hour * 60, locale) }}
        </div>
      </div>
    </template>

    <!-- [Claude] Left column of a row: the Forecast toggle or the agent card. -->
    <template #resource-label="{ scope }">
      <schedule-table-resource-label
        v-if="!scope.resource.isSpacer"
        :data-row-id="scope.resource.row?.agent.id"
        v-model:is-collapsed="isForecastCollapsed"
        :is-schedule-row="isScheduleRow"
        :is-selected="!!scope.resource.row && selected.includes(scope.resource.row.agent.id)"
        :readonly="readonly"
        :resource="scope.resource as ScheduleTableResource"
        @delete-agent="emit('delete-agent', $event)"
        @update:is-selected="emit('select', scope.resource.row.agent.id, $event)"
      />
    </template>

    <template #resource-intervals="{ scope }">
      <template v-if="scope.resource.isSpacer" />
      <template v-else-if="scope.resource.isForecast">
        <schedule-table-forecast-hours
          v-if="!isForecastCollapsed"
          :cell-width="HOUR_WIDTH"
          :date="date"
          :forecast-hours="forecast?.hours || []"
          :interval-minutes="INTERVAL_MINUTES"
          :planned-slots="forecast?.plannedSlots || []"
          :time-zone="timeZone"
          :timeline="resolvedTimeline"
        />
      </template>
      <schedule-table-day-timeline
        v-else
        :absence="scope.resource.row.cells[date]?.absence"
        :hour-width="HOUR_WIDTH"
        :hours-count="hoursCount"
        :locked="scope.resource.row.cells[date]?.locked"
        :readonly="readonly"
        :shifts="dayShifts(scope.resource.row)"
        :start-at="timelineStartAt"
        :time-zone="timeZone"
        @drag-shift="emit('drag-shift', scope.resource.row, $event)"
        @open-absence="emit('open-cell', $event, scope.resource.row, date)"
        @open-empty="emit('open-cell', $event, scope.resource.row, date)"
        @open-pause="(event, shift, pause) => emit('open-pause', event, scope.resource.row, shift, pause)"
        @open-shift="(event, shift) => emit('open-shift', event, scope.resource.row, shift)"
      />
    </template>
  </q-calendar-resource>
</template>

<script setup lang="ts">
import '@quasar/quasar-ui-qcalendar/QCalendarResource.min.css';

import { QCalendarResource } from '@quasar/quasar-ui-qcalendar';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type {
	CalendarForecast,
	CalendarPause,
	CalendarRow,
	CalendarShift,
	CalendarTimeline,
	DayKey,
	ScheduleTableResource,
} from '../../types';
import {
	addDays,
	formatDayWithWeekday,
	formatHour,
	formatMonthYear,
	zonedParts,
	zonedTimeToUtcMs,
} from '../../utils/date';
import ScheduleTableForecastHours from '../forecast/schedule-table-forecast-hours.vue';
import ScheduleTableDayTimeline from '../row/schedule-table-day-timeline.vue';
import ScheduleTableResourceLabel from '../row/schedule-table-resource-label.vue';

const props = defineProps<{
	resources: ScheduleTableResource[];
	// [Claude] Schedules: the agent rows get the confirmation mark and the trash.
	isScheduleRow?: boolean;
	timeline?: CalendarTimeline;
	forecast?: CalendarForecast;
	// [Claude] Ids of the checked agents.
	selected: string[];
	readonly?: boolean;
	timeZone: string;
}>();

const date = defineModel<DayKey>('date', {
	required: true,
});

const isForecastCollapsed = defineModel<boolean>('isForecastCollapsed', {
	default: false,
});

const emit = defineEmits<{
	// [Claude] An agent's checkbox: the wrapper keeps the selection.
	select: [
		id: string,
		isSelected: boolean,
	];
	'open-cell': [
		event: MouseEvent,
		row: CalendarRow,
		day: DayKey,
	];
	'open-shift': [
		event: MouseEvent,
		row: CalendarRow,
		shift: CalendarShift,
	];
	'open-pause': [
		event: MouseEvent,
		row: CalendarRow,
		shift: CalendarShift,
		pause: CalendarPause,
	];
	'delete-agent': [
		row: CalendarRow,
	];
	'drag-shift': [
		row: CalendarRow,
		shift: CalendarShift,
	];
}>();

const { t, locale } = useI18n();

const MINUTES_IN_DAY = 1440;
// [Claude] Figma Day: one 96px column per hour.
const INTERVAL_MINUTES = 60;
const HOUR_WIDTH = 96;
// [Claude] Head: month 18px + day 18px + hours 16px (Figma Day).
const HEAD_HEIGHT = 52;

// [Claude] Both ends unset = 24 hours (US_05.03).
const resolvedTimeline = computed<CalendarTimeline>(
	() =>
		props.timeline || {
			from: 0,
			to: MINUTES_IN_DAY,
		},
);

// [Claude] QCalendarResource renders one day, so a timeline that crosses midnight
// [Claude] is cut at 24:00 here — a known limit of the prototype.
const intervals = computed(() => {
	const { from, to } = resolvedTimeline.value;
	const start = Math.floor(from / INTERVAL_MINUTES);
	const end =
		to > from
			? Math.ceil(to / INTERVAL_MINUTES)
			: MINUTES_IN_DAY / INTERVAL_MINUTES;
	return {
		start,
		count: end - start,
	};
});

// [Claude] The timeline rows start with the first interval column, in the schedule's zone.
const timelineStartAt = computed(() =>
	zonedTimeToUtcMs(
		date.value,
		intervals.value.start * INTERVAL_MINUTES,
		props.timeZone,
	),
);
// [Claude] The month and day labels are written in the first column only.
const isFirstInterval = (timestamp: { hour: number; minute: number }) =>
	timestamp.hour * 60 + timestamp.minute ===
	intervals.value.start * INTERVAL_MINUTES;

const hoursCount = computed(() =>
	Math.ceil((intervals.value.count * INTERVAL_MINUTES) / 60),
);

// [Claude] Shifts of the day plus last night's shift that runs into it.
const dayShifts = (row: CalendarRow) => [
	...(row.cells[addDays(date.value, -1)]?.shifts || []).filter(
		(s) => zonedParts(s.endAt, props.timeZone).day === date.value,
	),
	...(row.cells[date.value]?.shifts || []),
];
</script>

<style scoped>
.schedule-table-day-view__head {
  display: flex;
  flex-direction: column;
  width: 100%;
  color: var(--schedule-table-head-color);
  white-space: nowrap;
}

.schedule-table-day-view__head-row {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: 18px;
  padding-left: 8px;
  border-bottom: 1px solid var(--schedule-table-head-border);
  font-size: 14px;
  font-weight: 600;
}

/* [Claude] One cell over all hours: the label of the first runs over the others. */
.schedule-table-day-view__head-row--wide {
  position: relative;
  z-index: 1;
  overflow: visible;
}

.schedule-table-day-view__head-row--hour {
  height: 16px;
  border-right: 1px solid var(--schedule-table-head-border);
  font-size: 12px;
  font-weight: 400;
}
</style>
