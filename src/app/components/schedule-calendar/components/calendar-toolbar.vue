<template>
  <!-- [Claude] ‹ period › and the Day / Week / Month switch (US_02.01–02.02, US_05.08–05.10).
       Arrows step 1 / 7 days or a month and stop at the schedule dates. -->
  <header class="calendar-toolbar">
    <div class="calendar-toolbar__nav">
      <wt-icon-btn
        :disabled="!canStep(view, date, -1, bounds)"
        icon="arrow-left"
        @click="step(-1)"
      />
      <span class="calendar-toolbar__title typo-subtitle-1">{{ title }}</span>
      <wt-icon-btn
        :disabled="!canStep(view, date, 1, bounds)"
        icon="arrow-right"
        @click="step(1)"
      />
    </div>

    <div class="calendar-toolbar__views">
      <wt-button
        v-for="option of views"
        :key="option"
        :color="option === view && !range ? 'primary' : 'secondary'"
        size="sm"
        @click="emit('update:view', option)"
      >
        {{ t(`wfmCalendar.view.${option}`) }}
      </wt-button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { CalendarView } from '../../../enums';
import { type DayKey, dayToMs } from '../../../utils/day';
import type { DayBounds } from '../types';
import { canStep, periodOf, stepWithin } from '../utils/period';

const props = defineProps<{
	view: CalendarView;
	date: DayKey;
	range?: DayBounds | null;
	bounds?: DayBounds | null;
	isDayViewEnabled?: boolean;
}>();

const emit = defineEmits<{
	'update:date': [
		date: DayKey,
	];
	'update:view': [
		view: CalendarView,
	];
}>();

const { t, locale } = useI18n();

const views = computed(() =>
	[
		CalendarView.Day,
		CalendarView.Week,
		CalendarView.Month,
	].filter((view) => view !== CalendarView.Day || props.isDayViewEnabled),
);

const format = (day: DayKey, options: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat(locale.value, {
		...options,
		timeZone: 'UTC',
	}).format(dayToMs(day));

const title = computed(() => {
	const period = periodOf(props.view, props.date, props.range);
	if (!props.range && props.view === CalendarView.Month) {
		return format(period.from, {
			month: 'long',
			year: 'numeric',
		});
	}
	if (!props.range && props.view === CalendarView.Day) {
		return format(period.from, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	}
	const options: Intl.DateTimeFormatOptions = {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	};
	return `${format(period.from, options)} – ${format(period.to, options)}`;
});

const step = (direction: 1 | -1) =>
	emit(
		'update:date',
		stepWithin(props.view, props.date, direction, props.bounds),
	);
</script>

<style scoped>
.calendar-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-sm);
}

.calendar-toolbar__nav,
.calendar-toolbar__views {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.calendar-toolbar__title {
	min-width: 200px;
	text-align: center;
}
</style>
