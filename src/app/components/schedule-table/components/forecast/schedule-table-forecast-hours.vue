<template>
  <!-- [Claude] Day view Forecast row, Figma "Forecast Bar Item Group" per hour: the forecast
       of the hour on top, then four 15-minute items of planned agents (on shift and not on
       a pause), US_05.11 — a number above a bar coloured by its level. -->
  <div class="schedule-table-forecast-hours">
    <div
      v-for="hour of hours"
      :key="hour.startAt"
      :style="{ left: `${hour.left}px`, width: `${hour.width}px` }"
      class="schedule-table-forecast-hours__hour"
    >
      <span class="schedule-table-forecast-hours__forecast typo-body-2">{{ hour.forecast }}</span>
      <div class="schedule-table-forecast-hours__slots">
        <div
          v-for="slot of hour.slots"
          :key="slot.startAt"
          class="schedule-table-forecast-hours__slot"
        >
          <span class="schedule-table-forecast-hours__value">{{ slot.agents }}</span>
          <div
            :class="`schedule-table-forecast--${forecastLevel(slot.agents, hour.forecast)}`"
            class="schedule-table-forecast-hours__fill"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type {
	CalendarTimeline,
	DayKey,
	ForecastHour,
	PlannedSlot,
} from '../../types';
import { zonedTimeToUtcMs } from '../../utils/date';
import { forecastLevel } from '../../utils/forecast';

const props = defineProps<{
	date: DayKey;
	forecastHours: ForecastHour[];
	plannedSlots: PlannedSlot[];
	timeZone: string;
	timeline: CalendarTimeline;
	cellWidth: number;
	intervalMinutes: number;
}>();

const HOUR_MS = 60 * 60_000;
const SLOT_MS = 15 * 60_000;

const windowMinutes = computed(() => {
	const { from, to } = props.timeline;
	return to > from ? to - from : to + 1440 - from;
});

const hours = computed(() => {
	const start = zonedTimeToUtcMs(
		props.date,
		props.timeline.from,
		props.timeZone,
	);
	const pxPerMinute = props.cellWidth / props.intervalMinutes;
	const forecastByStart = new Map(
		props.forecastHours.map((h) => [
			h.startAt,
			h.agents,
		]),
	);
	const plannedByStart = new Map(
		props.plannedSlots.map((s) => [
			s.startAt,
			s.agents,
		]),
	);
	return Array.from(
		{
			length: Math.ceil(windowMinutes.value / 60),
		},
		(_, i) => {
			const startAt = start + i * HOUR_MS;
			return {
				startAt,
				left: i * 60 * pxPerMinute,
				width: 60 * pxPerMinute,
				forecast: forecastByStart.get(startAt) || 0,
				slots: Array.from(
					{
						length: 4,
					},
					(_, j) => {
						const slotStart = startAt + j * SLOT_MS;
						return {
							startAt: slotStart,
							agents: plannedByStart.get(slotStart) || 0,
						};
					},
				),
			};
		},
	);
});
</script>

<style scoped>
.schedule-table-forecast-hours {
  position: absolute;
  inset: 0;
}

.schedule-table-forecast-hours__hour {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  padding-right: 2px;
}

.schedule-table-forecast-hours__forecast {
  text-align: center;
  color: var(--text-main-color);
}

.schedule-table-forecast-hours__slots {
  display: flex;
  flex: 1;
  gap: 1px;
}

.schedule-table-forecast-hours__slot {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

/* [Claude] Figma --wfm-forecast-item-ts: Montserrat Medium 10/16. */
.schedule-table-forecast-hours__value {
  font-size: 10px;
  font-weight: 500;
  line-height: 16px;
  color: var(--text-main-color);
}

.schedule-table-forecast-hours__fill {
  flex: 1;
  width: 100%;
}
</style>
