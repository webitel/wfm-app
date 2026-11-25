<template>
  <!-- [Claude] One day of one agent in Week / Month (Figma "PrimeVue Schedules Powered"): the
       background tells the day type, chips list the pauses of its shifts or the absence. -->
  <button
    :class="[
      `schedule-table-day-cell--${type}`,
      { 'schedule-table-day-cell--split': splitAt !== undefined },
    ]"
    :disabled="isDisabled"
    :title="shiftsTitle"
    class="schedule-table-day-cell"
    type="button"
    @click="emit('open', $event)"
  >
    <!-- [Claude] Chips are plain spans with the chip classes (schedule-table.css), not a
         component each: a Month has thousands of them. -->
    <span
      v-if="cell?.absence"
      :class="`schedule-table-chip--${ABSENCE_CHIP_COLORS[cell.absence] || ScheduleChipColor.Red}`"
      :title="absenceTitle"
      class="schedule-table-chip schedule-table-chip--sm schedule-table-chip--outlined schedule-table-day-cell__absence"
    >
      <span class="schedule-table-chip__title">{{ absenceTitle }}</span>
    </span>

    <!-- [Claude] Week: the day is split in two halves of the timeline, a pause goes to the
         half it starts in. Month: one column, no wrapper. -->
    <template v-else-if="splitAt !== undefined">
      <span
        v-for="(half, index) of halves"
        :key="index"
        class="schedule-table-day-cell__half"
      >
        <span
          v-for="pause of half"
          :key="pause.id"
          :class="`schedule-table-chip--${pause.color}`"
          :title="pause.title"
          class="schedule-table-chip schedule-table-chip--sm"
        >
          <span class="schedule-table-chip__title">{{ pause.title }}</span>
        </span>
      </span>
    </template>
    <template v-else>
      <span
        v-for="pause of pauses"
        :key="pause.id"
        :class="`schedule-table-chip--${pause.color}`"
        :title="pause.title"
        class="schedule-table-chip schedule-table-chip--sm"
      >
        <span class="schedule-table-chip__title">{{ pause.title }}</span>
      </span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
	ABSENCE_CHIP_COLORS,
	ABSENCE_KEYS,
	DayCellType,
	ScheduleChipColor,
} from '../../../../enums';
import type { CalendarCell } from '../../types';
import { pauseChipColor } from '../../utils/chips';
import { formatTimeInZone, zonedParts } from '../../utils/date';

const props = defineProps<{
	cell?: CalendarCell;
	timeZone: string;
	// [Claude] A weekend or a holiday: pink while nothing is planned on it.
	isOff?: boolean;
	// [Claude] Week: minutes from midnight where the second half of the day starts.
	splitAt?: number;
	disabled?: boolean;
	readonly?: boolean;
}>();

const emit = defineEmits<{
	open: [
		event: MouseEvent,
	];
}>();

const { t } = useI18n();

// [Claude] "Lunch 12:30": the cause and the start of every pause of the day's shifts.
const pauses = computed(() =>
	(props.cell?.shifts || [])
		.flatMap((shift) => shift.pauses)
		.toSorted((a, b) => a.startAt - b.startAt)
		.map((pause) => ({
			id: pause.id,
			startMinutes: zonedParts(pause.startAt, props.timeZone).minutes,
			color: pauseChipColor(pause),
			title: `${pause.cause?.name || t('scheduleTable.pause')} ${formatTimeInZone(pause.startAt, props.timeZone)}`,
		})),
);

const absenceTitle = computed(() =>
	props.cell?.absence
		? t(`scheduleTable.absence.${ABSENCE_KEYS[props.cell.absence]}`)
		: '',
);

// [Claude] Week only: Month draws the pauses in one column.
const halves = computed(() => {
	const { splitAt } = props;
	if (splitAt === undefined) return [];
	return [
		pauses.value.filter((p) => p.startMinutes < splitAt),
		pauses.value.filter((p) => p.startMinutes >= splitAt),
	];
});

// [Claude] The shift times are not drawn in Week / Month (Figma), so they go to the tooltip.
const shiftsTitle = computed(() =>
	(props.cell?.shifts || [])
		.map(
			(s) =>
				`${formatTimeInZone(s.startAt, props.timeZone)}–${formatTimeInZone(s.endAt, props.timeZone)}`,
		)
		.join(', '),
);

const type = computed<DayCellType>(() => {
	if (props.cell?.absence) return DayCellType.Absence;
	if (props.cell?.shifts.length) return DayCellType.Working;
	if (props.cell?.locked) return DayCellType.Locked;
	if (props.isOff) return DayCellType.Off;
	return DayCellType.Empty;
});

// [Claude] An empty day of a readonly schedule or a locked one takes no action; a filled
// [Claude] one still opens its menu (an absence can be changed next to another schedule's lock).
const isDisabled = computed(
	() =>
		props.disabled ||
		type.value === DayCellType.Locked ||
		(props.readonly &&
			(type.value === DayCellType.Empty || type.value === DayCellType.Off)),
);
</script>

<style scoped>
.schedule-table-day-cell {
  display: flex;
  gap: 4px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: var(--schedule-table-row-height);
  padding: 4px;
  overflow: hidden;
  border: 1px solid var(--schedule-table-cell-border);
  background: var(--schedule-table-cell-empty-background);
  cursor: pointer;
}

.schedule-table-day-cell:disabled {
  cursor: default;
}

/* [Claude] Month: the chips stack in one column right in the cell (Week has halves). */
.schedule-table-day-cell:not(.schedule-table-day-cell--split, .schedule-table-day-cell--absence) {
  flex-direction: column;
  gap: 1px;
}

.schedule-table-day-cell--working {
  border-color: var(--schedule-table-cell-filled-border);
  background: var(--schedule-table-cell-working-background);
}

.schedule-table-day-cell--absence {
  align-items: center;
  border-color: var(--schedule-table-cell-filled-border);
  background: var(--schedule-table-cell-absence-background);
}

.schedule-table-day-cell--locked {
  border-color: var(--schedule-table-cell-locked-border);
  background: var(--schedule-table-cell-locked-background);
}

.schedule-table-day-cell--off {
  border-color: var(--schedule-table-cell-filled-border);
  background: var(--schedule-table-cell-off-background);
}

/* [Claude] Figma: chips stack from the top of the half, 1px apart. */
.schedule-table-day-cell__half {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

/* [Claude] Figma: the absence chip is as wide as a half of a Week day. */
.schedule-table-day-cell__absence {
  flex: 0 1 auto;
  min-width: min(68px, 100%);
}
</style>
