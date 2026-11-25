<template>
  <!-- [Claude] Head of one day in Week / Month (Figma "PrimeVue Schedules Powered"): the month
       row ("October 2026", written once where the month starts), the day row ("6 Tue" in a
       week, "Thu" in a month) and the bottom row (the halves "7 AM | 1 PM" or the day number). -->
  <div
    :class="{
      'schedule-table-column-header--off': isOff,
      'schedule-table-column-header--compact': isCompact,
      'schedule-table-column-header--clickable': isClickable,
    }"
    :title="holiday?.name"
    class="schedule-table-column-header"
  >
    <div
      :class="{ 'schedule-table-column-header__month--end': isMonthEnd }"
      class="schedule-table-column-header__month"
    >
      <span v-if="isMonthStart">{{ formatMonthYear(date, locale) }}</span>
    </div>

    <div class="schedule-table-column-header__day">
      {{ isCompact ? weekdayShortName(date, locale) : formatDayWithWeekday(date, locale) }}
    </div>

    <div
      v-if="isCompact"
      class="schedule-table-column-header__sub schedule-table-column-header__sub--center"
    >
      {{ dayOfMonth(date) }}
    </div>
    <div
      v-else-if="halves"
      class="schedule-table-column-header__sub"
    >
      <span
        v-for="half of halves"
        :key="half"
        class="schedule-table-column-header__half"
      >{{ formatHourShort(half, locale) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { DayKey, Holiday } from '../../types';
import {
	addDays,
	dayOfMonth,
	formatDayWithWeekday,
	formatHourShort,
	formatMonthYear,
	isWeekend,
	weekdayShortName,
} from '../../utils/date';

const props = withDefaults(
	defineProps<{
		date: DayKey;
		// [Claude] The first and the last shown days: the month row is written from the first.
		firstDay: DayKey;
		lastDay: DayKey;
		holidays?: Holiday[];
		// [Claude] Month: narrow columns with the weekday over the number.
		isCompact?: boolean;
		// [Claude] Week of a schedule: minutes from midnight where the two halves start.
		halves?: [
			number,
			number,
		];
		isClickable?: boolean;
	}>(),
	{
		holidays: () => [],
	},
);

const { locale } = useI18n();

const holiday = computed(() =>
	props.holidays.find((h) => h.date === props.date),
);

const isOff = computed(() => isWeekend(props.date) || !!holiday.value);

const isMonthStart = computed(
	() => props.date === props.firstDay || props.date.endsWith('-01'),
);

const isMonthEnd = computed(
	() => props.date === props.lastDay || addDays(props.date, 1).endsWith('-01'),
);
</script>

<style scoped>
.schedule-table-column-header {
  display: flex;
  flex-direction: column;
  width: 100%;
  color: var(--schedule-table-head-color);
  white-space: nowrap;
}

.schedule-table-column-header > div {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--schedule-table-head-border);
}

/* [Claude] The month row is one cell per month: no lines between its days, and the name
   runs over the next columns. */
.schedule-table-column-header__month {
  position: relative;
  z-index: 1;
  height: 18px;
  padding-left: 8px;
  overflow: visible;
  font-size: 14px;
  font-weight: 600;
}

.schedule-table-column-header__month--end {
  border-right: 1px solid var(--schedule-table-head-border);
}

.schedule-table-column-header__day,
.schedule-table-column-header__sub {
  border-right: 1px solid var(--schedule-table-head-border);
}

.schedule-table-column-header__day {
  height: 18px;
  padding-left: 8px;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
}

.schedule-table-column-header__sub {
  height: 16px;
  font-size: 10px;
}

.schedule-table-column-header__sub--center,
.schedule-table-column-header--compact .schedule-table-column-header__day {
  justify-content: center;
  padding-left: 0;
}

.schedule-table-column-header--compact .schedule-table-column-header__day {
  height: 16px;
  font-size: 10px;
  font-weight: 400;
}

.schedule-table-column-header__half {
  flex: 1 1 0;
  padding-left: 8px;
}

.schedule-table-column-header__half + .schedule-table-column-header--compact .schedule-table-column-header__day {
  height: 16px;
  font-size: 10px;
  font-weight: 400;
}

.schedule-table-column-header__half {
  border-left: 1px solid var(--schedule-table-head-border);
}

.schedule-table-column-header--off .schedule-table-column-header__day,
.schedule-table-column-header--off .schedule-table-column-header__sub {
  background: var(--schedule-table-head-off-background);
}

.schedule-table-column-header--clickable .schedule-table-column-header__day {
  cursor: pointer;
}
</style>
