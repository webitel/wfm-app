<template>
  <!-- [Claude] Scheduler controls over the grid (Figma "PrimeVue Schedules Powered"): the
       period arrows and Today on the left, the view name with its arrows on the right. -->
  <div class="schedule-table-toolbar">
    <div class="schedule-table-toolbar__group">
      <wt-icon-btn
        :disabled="!canStep(StepDirection.Prev)"
        icon="arrow-left"
        size="sm"
        @click="move(StepDirection.Prev)"
      />
      <wt-icon-btn
        :disabled="!canStep(StepDirection.Next)"
        icon="arrow-right"
        size="sm"
        @click="move(StepDirection.Next)"
      />
      <wt-button
        :color="ButtonColor.INFO"
        :variant="ButtonVariant.TEXT"
        size="sm"
        @click="goToday"
      >
        {{ t('scheduleTable.today') }}
      </wt-button>
    </div>

    <div class="schedule-table-toolbar__group">
      <span class="schedule-table-toolbar__view">{{ viewLabel }}</span>
      <wt-icon-btn
        :disabled="!views[viewIndex - 1]"
        icon="arrow-left"
        size="sm"
        @click="emit('update:view', views[viewIndex - 1])"
      />
      <wt-icon-btn
        :disabled="!views[viewIndex + 1]"
        icon="arrow-right"
        size="sm"
        @click="emit('update:view', views[viewIndex + 1])"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ButtonColor, ButtonVariant } from '@webitel/ui-sdk/enums';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarView, StepDirection } from '../../../../enums';
import type { CalendarBounds, DayKey } from '../../types';
import {
	clampDay,
	type DayRange,
	formatDayLong,
	rangeForView,
	shiftRange,
	stepView,
	todayKey,
} from '../../utils/date';

const props = defineProps<{
	view: CalendarView;
	// [Claude] Schedules have the Day view, Agents only Week and Month.
	isDayView?: boolean;
	bounds?: CalendarBounds;
}>();

const date = defineModel<DayKey>('date', {
	required: true,
});

// [Claude] An own period (Agents filters From / To) instead of the week or month.
const range = defineModel<DayRange | null>('range', {
	default: null,
});

const emit = defineEmits<{
	'update:view': [
		view: CalendarView,
	];
}>();

const { t, locale } = useI18n();

// [Claude] The view arrows walk Day → Week → Month and stop at the ends.
const views = computed(() =>
	Object.values(CalendarView).filter(
		(view) => view !== CalendarView.Day || props.isDayView,
	),
);
const viewIndex = computed(() => views.value.indexOf(props.view));

// [Claude] "Resources Timeline Week"; an own period shows its dates instead.
const viewLabel = computed(() =>
	range.value
		? `${formatDayLong(range.value.from, locale.value)} - ${formatDayLong(range.value.to, locale.value)}`
		: t(`scheduleTable.timeline.${props.view}`),
);

// [Claude] Arrows stop at the schedule dates (US_05.08): a step is allowed while the next
// [Claude] period still overlaps them.
const canStep = (direction: StepDirection) => {
	if (range.value || !props.bounds) return true;
	const next = rangeForView(
		props.view,
		stepView(props.view, date.value, direction),
	);
	return next.from <= props.bounds.to && next.to >= props.bounds.from;
};

// [Claude] An own period moves by its own length; the week or month stays inside the schedule.
const move = (direction: StepDirection) => {
	if (range.value) {
		range.value = shiftRange(range.value, direction);
		return;
	}
	date.value = clampDay(
		stepView(props.view, date.value, direction),
		props.bounds,
	);
};

// [Claude] Today drops the own period; a schedule opens at its nearest date.
const goToday = () => {
	range.value = null;
	date.value = clampDay(todayKey(), props.bounds);
};
</script>

<style scoped>
.schedule-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-xs);
  padding: var(--spacing-2xs);
  border-bottom: 1px solid var(--schedule-table-head-border);
}

.schedule-table-toolbar__group {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

/* [Claude] Figma: SemiBold 14px, the head grey. */
.schedule-table-toolbar__view {
  overflow: hidden;
  padding: 0 var(--spacing-2xs);
  color: var(--schedule-table-head-color);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
