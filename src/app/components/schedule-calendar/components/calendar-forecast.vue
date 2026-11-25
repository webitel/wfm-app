<template>
  <!-- [Claude] A cell of the Forecast row (US_05.11). Week / Month: a grey forecast bar (agents needed
       at the busiest hour) next to the fact bar (agents with a shift). Day: the forecast of the hour
       on top and four 15-minute fact bars. Fact colour: red ≤25 %, yellow ≤50 %, green above. -->
  <div class="calendar-forecast">
    <span
      v-if="isHour"
      v-tooltip="t('wfmCalendar.forecast')"
      class="calendar-forecast__number typo-caption"
    >{{ forecast }}</span>
    <div class="calendar-forecast__bars">
      <span
        v-if="!isHour"
        v-tooltip="`${t('wfmCalendar.forecast')}: ${forecast}`"
        :style="barStyle(forecast)"
        class="calendar-forecast__bar calendar-forecast__bar--forecast"
      />
      <span
        v-for="(value, index) of planned"
        :key="index"
        v-tooltip="`${t('wfmCalendar.planned')}: ${value}`"
        :class="`calendar-forecast__bar--${forecastLevel(value, forecast)}`"
        :style="barStyle(value)"
        class="calendar-forecast__bar"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { forecastLevel } from '../utils/forecast';

const props = defineProps<{
	// [Claude] Agents needed: the busiest hour of the day, or the hour.
	forecast: number;
	// [Claude] Agents planned: one value for a day, four 15-minute slots for an hour.
	planned: number[];
	// [Claude] The tallest value of the shown period: bars are scaled to it.
	max: number;
	// [Claude] An hour of the Day view (four slots) instead of a day.
	isHour: boolean;
}>();

const { t } = useI18n();

const MIN_BAR_PERCENT = 6;

const barStyle = (value: number) => ({
	height: `${Math.max(MIN_BAR_PERCENT, (value / Math.max(props.max, 1)) * 100)}%`,
});
</script>

<style scoped>
.calendar-forecast {
	display: flex;
	flex-direction: column;
	padding: 2px;
	width: 100%;
	height: 100%;
}

.calendar-forecast__number {
	line-height: 1;
	text-align: center;
}

.calendar-forecast__bars {
	display: flex;
	flex: 1;
	align-items: flex-end;
	gap: 2px;
	min-height: 0;
}

.calendar-forecast__bar {
	flex: 1;
	border-radius: 2px 2px 0 0;
}

.calendar-forecast__bar--forecast,
.calendar-forecast__bar--none {
	background: var(--wfm-calendar-forecast-bg);
}

.calendar-forecast__bar--low {
	background: var(--wfm-calendar-fact-low-bg);
}

.calendar-forecast__bar--medium {
	background: var(--wfm-calendar-fact-medium-bg);
}

.calendar-forecast__bar--high {
	background: var(--wfm-calendar-fact-high-bg);
}
</style>
