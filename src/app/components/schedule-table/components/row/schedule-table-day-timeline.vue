<template>
  <!-- [Claude] Day view row (Figma "PrimeVue Schedules Powered"): a green band per shift and
       a chip per pause on the time axis; an absence or another schedule's lock tints the row.
       Rendered in QCalendarResource's #resource-intervals, over the hour cells. -->
  <div
    :class="{
      'schedule-table-day-timeline--absence': absence,
      'schedule-table-day-timeline--locked': locked && !shifts.length && !absence,
      'schedule-table-day-timeline--disabled': isLaneDisabled,
    }"
    class="schedule-table-day-timeline"
    @click="onLaneClick"
  >
    <schedule-table-chip
      v-if="absence"
      :color="ABSENCE_CHIP_COLORS[absence] || ScheduleChipColor.Red"
      :title="t(`scheduleTable.absence.${ABSENCE_KEYS[absence]}`)"
      class="schedule-table-day-timeline__absence"
      is-outlined
      size="md"
    />

    <template v-else>
      <button
        v-for="shift of shifts"
        :key="shift.id"
        :style="{
          ...placeOf(shift),
          backgroundPositionX: `${-xOf(shift.startAt)}px`,
          backgroundSize: `${hourWidth}px 100%`,
        }"
        :title="`${formatTimeInZone(shift.startAt, timeZone)} - ${formatTimeInZone(shift.endAt, timeZone)}`"
        class="schedule-table-day-timeline__shift"
        type="button"
        @click.stop="emit('open-shift', $event, shift)"
      />

      <button
        v-for="pause of pauses"
        :key="pause.id"
        :style="pause.place"
        class="schedule-table-day-timeline__pause"
        type="button"
        @click.stop="emit('open-pause', $event, pause.shift, pause.pause)"
      >
        <schedule-table-chip
          :color="pause.color"
          :subtitle="pause.subtitle"
          :title="pause.title"
          size="md"
        />
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { WfmAbsenceType } from '@webitel/api-services/gen/models';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
	ABSENCE_CHIP_COLORS,
	ABSENCE_KEYS,
	ScheduleChipColor,
} from '../../../../enums';
import type { CalendarPause, CalendarShift } from '../../types';
import { pauseChipColor } from '../../utils/chips';
import { formatTimeInZone } from '../../utils/date';
import ScheduleTableChip from './schedule-table-chip.vue';

const props = defineProps<{
	shifts: CalendarShift[];
	absence?: WfmAbsenceType;
	locked?: boolean;
	readonly?: boolean;
	// [Claude] The first hour of the timeline (epoch ms), the number of hours and px of one.
	startAt: number;
	hoursCount: number;
	hourWidth: number;
	timeZone: string;
}>();

const emit = defineEmits<{
	'open-empty': [
		event: MouseEvent,
	];
	'open-absence': [
		event: MouseEvent,
	];
	'open-shift': [
		event: MouseEvent,
		shift: CalendarShift,
	];
	'open-pause': [
		event: MouseEvent,
		shift: CalendarShift,
		pause: CalendarPause,
	];
}>();

const { t } = useI18n();

const MINUTE_MS = 60_000;
const MINUTES_IN_HOUR = 60;
// [Claude] px a pause chip keeps clear of its edges, so neighbours do not touch.
const CHIP_INSET = 2;
// [Claude] Narrower chips show the cause only, as Figma "Break".
const CHIP_TWO_LINES_MIN_WIDTH = 64;
// [Claude] px of a moment on the row.
const xOf = (at: number) =>
	((at - props.startAt) / MINUTE_MS / MINUTES_IN_HOUR) * props.hourWidth;

const placeOf = ({ startAt, endAt }: { startAt: number; endAt: number }) => ({
	left: `${xOf(startAt)}px`,
	width: `${xOf(endAt) - xOf(startAt)}px`,
});

const pauses = computed(() =>
	props.shifts.flatMap((shift) =>
		shift.pauses.map((pause) => {
			const width = Math.max(
				xOf(pause.endAt) - xOf(pause.startAt) - 2 * CHIP_INSET,
				CHIP_INSET * 4,
			);
			return {
				id: pause.id,
				shift,
				pause,
				color: pauseChipColor(pause),
				title: pause.cause?.name || t('scheduleTable.pause'),
				subtitle:
					width >= CHIP_TWO_LINES_MIN_WIDTH
						? `${formatTimeInZone(pause.startAt, props.timeZone)} - ${formatTimeInZone(pause.endAt, props.timeZone)}`
						: undefined,
				place: {
					left: `${xOf(pause.startAt) + CHIP_INSET}px`,
					width: `${width}px`,
				},
			};
		}),
	),
);

// [Claude] An empty row takes no action when the schedule is read-only or the day is locked.
const isLaneDisabled = computed(
	() =>
		!props.absence && !props.shifts.length && (props.readonly || props.locked),
);

// [Claude] A click on the row outside shifts and pauses: the absence or an empty slot.
const onLaneClick = (event: MouseEvent) => {
	if (props.absence) emit('open-absence', event);
	else if (!isLaneDisabled.value) emit('open-empty', event);
};
</script>

<style scoped>
.schedule-table-day-timeline {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

.schedule-table-day-timeline--disabled {
  cursor: default;
}

.schedule-table-day-timeline button {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.schedule-table-day-timeline--absence {
  background: var(--schedule-table-cell-absence-background);
}

.schedule-table-day-timeline--locked {
  background: var(--schedule-table-cell-locked-background);
}

/* [Claude] Figma Day: the hours of a shift are green cells split by a light line. */
.schedule-table-day-timeline .schedule-table-day-timeline__shift {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: var(--schedule-table-cell-working-background);
  background-image: linear-gradient(
    to right,
    var(--schedule-table-cell-filled-border) 1px,
    transparent 1px
  );
}

.schedule-table-day-timeline .schedule-table-day-timeline__pause {
  position: absolute;
  top: 50%;
  z-index: 1;
  display: flex;
  transform: translateY(-50%);
}

.schedule-table-day-timeline__pause .schedule-table-chip {
  flex: 1;
}

.schedule-table-day-timeline__absence {
  position: absolute;
  top: 50%;
  left: 4px;
  transform: translateY(-50%);
}
</style>
