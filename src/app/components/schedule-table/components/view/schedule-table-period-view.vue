<template>
  <!-- [Claude] Week, Month or an own period: agents × days on QCalendarScheduler. -->
  <q-calendar-scheduler
    :disabled-after="bounds ? addDays(bounds.to, 1) : undefined"
    :disabled-before="bounds ? addDays(bounds.from, -1) : undefined"
    :max-days="range ? visibleDays.length : undefined"
    :model-resources="resources"
    :model-value="range ? range.from : date"
    :resource-min-height="0"
    :view="range ? 'day' : view"
    :weekdays="Object.values(Weekday)"
    @click-head-day="onHeadDayClick"
  >
    <template #head-day="{ scope }">
      <schedule-table-column-header
        :date="scope.timestamp.date"
        :first-day="visibleDays[0]"
        :halves="halves"
        :holidays="holidays"
        :is-clickable="isDayView && !scope.disabled"
        :is-compact="isCompact"
        :last-day="visibleDays[visibleDays.length - 1]"
      />
    </template>

    <template #head-resources>
      <span class="schedule-table__resources-title">{{ t('scheduleTable.resources') }}</span>
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

    <template #day="{ scope }">
      <template v-if="scope.resource.isSpacer" />
      <template v-else-if="scope.resource.isForecast">
        <schedule-table-forecast-day
          v-if="!isForecastCollapsed"
          v-bind="forecastDays.get(scope.timestamp.date)"
        />
      </template>
      <schedule-table-day-cell
        v-else
        :cell="scope.resource.row.cells[scope.timestamp.date]"
        :disabled="scope.disabled"
        :is-off="offDays.has(scope.timestamp.date)"
        :readonly="readonly"
        :split-at="halves?.[1]"
        :time-zone="timeZone"
        @open="emit('open-cell', $event, scope.resource.row, scope.timestamp.date)"
      />
    </template>
  </q-calendar-scheduler>
</template>

<script setup lang="ts">
import '@quasar/quasar-ui-qcalendar/QCalendarScheduler.min.css';

import { QCalendarScheduler } from '@quasar/quasar-ui-qcalendar';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { CalendarView, Weekday } from '../../../../enums';
import type {
	CalendarBounds,
	CalendarForecast,
	CalendarRow,
	CalendarTimeline,
	DayKey,
	ForecastDay,
	Holiday,
	ScheduleTableResource,
} from '../../types';
import {
	addDays,
	type DayRange,
	daysBetween,
	isWeekend,
	rangeForView,
} from '../../utils/date';
import ScheduleTableForecastDay from '../forecast/schedule-table-forecast-day.vue';
import ScheduleTableColumnHeader from '../header/schedule-table-column-header.vue';
import ScheduleTableDayCell from '../row/schedule-table-day-cell.vue';
import ScheduleTableResourceLabel from '../row/schedule-table-resource-label.vue';

const props = defineProps<{
	resources: ScheduleTableResource[];
	view: CalendarView;
	date: DayKey;
	// [Claude] An own period instead of the week or month.
	range?: DayRange | null;
	// [Claude] The schedule dates: days outside are disabled.
	bounds?: CalendarBounds;
	// [Claude] A click on a date opens the Day view.
	isDayView: boolean;
	// [Claude] Schedules: the agent rows get the confirmation mark and the trash.
	isScheduleRow?: boolean;
	// [Claude] The schedule's working hours: a Week splits each day in two halves of it.
	timeline?: CalendarTimeline;
	holidays: Holiday[];
	forecast?: CalendarForecast;
	// [Claude] Ids of the checked agents.
	selected: string[];
	readonly?: boolean;
	timeZone: string;
}>();

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
	'open-day': [
		day: DayKey,
	];
	'delete-agent': [
		row: CalendarRow,
	];
}>();

const { t } = useI18n();

const MINUTES_IN_HOUR = 60;

// [Claude] Days shown: the own period, or the week / month around the date.
const visibleDays = computed(() => {
	const { from, to } = props.range || rangeForView(props.view, props.date);
	return daysBetween(from, to);
});

// [Claude] More than a week: narrow columns with the weekday over the number (Figma Month).
const isCompact = computed(
	() => visibleDays.value.length > Object.values(Weekday).length,
);

// [Claude] Figma Week "7 AM | 1 PM": the timeline from its start and from its middle hour.
const halves = computed<
	| [
			number,
			number,
	  ]
	| undefined
>(() => {
	if (!props.timeline || isCompact.value) return undefined;
	const { from, to } = props.timeline;
	const end = to > from ? to : 24 * MINUTES_IN_HOUR;
	const middle =
		Math.round((from + end) / 2 / MINUTES_IN_HOUR) * MINUTES_IN_HOUR;
	return [
		from,
		middle,
	];
});

// [Claude] Weekends and holidays: pink days while nothing is planned on them.
const offDays = computed(
	() =>
		new Set(
			visibleDays.value.filter(
				(day) => isWeekend(day) || props.holidays.some((h) => h.date === day),
			),
		),
);

// [Claude] Forecast and planned agents per day in one pass. The day's forecast is its
// [Claude] busiest hour: that many agents must come to work, a sum would be agent-hours.
const forecastDays = computed(() => {
	const days = new Map<DayKey, ForecastDay>();
	const dayOf = (day: DayKey) => {
		const forecastDay = days.get(day) || {
			forecast: 0,
			planned: 0,
		};
		days.set(day, forecastDay);
		return forecastDay;
	};
	props.forecast?.hours.forEach((hour) => {
		const forecastDay = dayOf(hour.date);
		forecastDay.forecast = Math.max(forecastDay.forecast, hour.agents);
	});
	props.forecast?.plannedDays.forEach((plannedDay) => {
		dayOf(plannedDay.date).planned = plannedDay.agents;
	});
	return days;
});

// [Claude] A click on a date opens the Day view of that date (US_05.08).
const onHeadDayClick = ({ scope }) => {
	if (!props.isDayView || scope?.timestamp?.disabled) return;
	emit('open-day', scope.timestamp.date);
};
</script>
