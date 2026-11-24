<template>
  <!-- [Claude] Figma "Forecast Bar Item Group": forecast and planned side by side,
       the number above, the bar fills the rest of the cell. -->
  <div class="schedule-table-forecast-day">
    <div class="schedule-table-forecast-day__bar-wrapper">
      <span class="schedule-table-forecast-day__value">{{ forecast }}</span>
      <div class="schedule-table-forecast-day__bar schedule-table-forecast-day__bar--forecast" />
    </div>
    <div class="schedule-table-forecast-day__bar-wrapper">
      <span class="schedule-table-forecast-day__value">{{ planned }}</span>
      <div
        :class="`schedule-table-forecast--${forecastLevel(planned, forecast)}`"
        class="schedule-table-forecast-day__bar"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { forecastLevel } from '../../utils/forecast';

// [Claude] No data for the day shows zeros.
withDefaults(
	defineProps<{
		forecast?: number;
		planned?: number;
	}>(),
	{
		forecast: 0,
		planned: 0,
	},
);
</script>

<style scoped>
.schedule-table-forecast-day {
  display: flex;
  gap: 2px;
  height: 100%;
  min-height: var(--schedule-table-row-height);
}

.schedule-table-forecast-day__bar-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

/* [Claude] Figma --wfm-forecast-item-ts: Montserrat Medium 10/16. */
.schedule-table-forecast-day__value {
  font-size: 10px;
  font-weight: 500;
  line-height: 16px;
  color: var(--text-main-color);
}

.schedule-table-forecast-day__bar {
  flex: 1;
  width: 100%;
}

.schedule-table-forecast-day__bar--forecast {
  background: var(--schedule-table-forecast-color);
}
</style>
