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
      <!-- [Claude] Drag the shift to move it, its edges to resize it; a press without a move
           is a click and opens the shift menu. -->
      <button
        v-for="shift of shownShifts"
        :key="shift.id"
        :class="{ 'schedule-table-day-timeline__shift--draggable': !readonly }"
        :style="{
          ...placeOf(shift),
          backgroundPositionX: `${-xOf(shift.startAt)}px`,
          backgroundSize: `${hourWidth}px 100%`,
        }"
        :title="`${formatTimeInZone(shift.startAt, timeZone)} - ${formatTimeInZone(shift.endAt, timeZone)}`"
        class="schedule-table-day-timeline__shift"
        type="button"
        @click.stop="onPartClick(() => emit('open-shift', $event, shift))"
        @pointerdown="startDrag($event, shift.id, DragMode.Move)"
      >
        <template v-if="!readonly">
          <span
            class="schedule-table-day-timeline__handle schedule-table-day-timeline__handle--start"
            @pointerdown.stop="startDrag($event, shift.id, DragMode.Start)"
          />
          <span
            class="schedule-table-day-timeline__handle schedule-table-day-timeline__handle--end"
            @pointerdown.stop="startDrag($event, shift.id, DragMode.End)"
          />
        </template>
      </button>

      <button
        v-for="pause of pauses"
        :key="pause.id"
        :class="{ 'schedule-table-day-timeline__pause--draggable': !readonly }"
        :style="pause.place"
        class="schedule-table-day-timeline__pause"
        type="button"
        @click.stop="onPartClick(() => emit('open-pause', $event, pause.shift, pause.pause))"
        @pointerdown="startDrag($event, pause.shift.id, DragMode.Move, pause.id)"
      >
        <template v-if="!readonly">
          <span
            class="schedule-table-day-timeline__handle schedule-table-day-timeline__handle--start"
            @pointerdown.stop="startDrag($event, pause.shift.id, DragMode.Start, pause.id)"
          />
          <span
            class="schedule-table-day-timeline__handle schedule-table-day-timeline__handle--end"
            @pointerdown.stop="startDrag($event, pause.shift.id, DragMode.End, pause.id)"
          />
        </template>
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
	ABSENCE_CHIP_COLORS,
	ABSENCE_KEYS,
	ScheduleChipColor,
} from '../../../../enums';
import type { CalendarPause, CalendarShift } from '../../types';
import { pauseChipColor } from '../../utils/chips';
import { formatTimeInZone } from '../../utils/date';
import { DragMode, dragPause, dragShift, isSameTimes } from '../../utils/drag';
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
	// [Claude] A shift or one of its pauses was dragged: the shift with its new times.
	'drag-shift': [
		shift: CalendarShift,
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

/* [Claude] ------------------------------------------------------------ Drag and drop */

const HOUR_MS = MINUTES_IN_HOUR * MINUTE_MS;
// [Claude] px the pointer must go before a press becomes a drag (less = a click).
const DRAG_THRESHOLD = 3;

interface DragState {
	origin: CalendarShift;
	pauseId?: string;
	mode: DragMode;
	startX: number;
	isMoved: boolean;
}

let drag: DragState | null = null;
// [Claude] The click that ends a drag must not open a menu.
let isClickSwallowed = false;
// [Claude] The shift as it is being dragged, and after the drop until the page reloads it.
const draft = ref<CalendarShift | null>(null);

const shownShifts = computed(() =>
	props.shifts.map((shift) =>
		draft.value?.id === shift.id ? draft.value : shift,
	),
);

const onPointerMove = (event: PointerEvent) => {
	if (!drag) return;
	const dx = event.clientX - drag.startX;
	if (!drag.isMoved && Math.abs(dx) < DRAG_THRESHOLD) return;
	drag.isMoved = true;
	const deltaMs = (dx / props.hourWidth) * HOUR_MS;
	draft.value = drag.pauseId
		? dragPause({
				shift: drag.origin,
				pauseId: drag.pauseId,
				mode: drag.mode,
				deltaMs,
			})
		: dragShift({
				shift: drag.origin,
				neighbours: props.shifts.filter((s) => s.id !== drag?.origin.id),
				mode: drag.mode,
				deltaMs,
				min: props.startAt,
				max: props.startAt + props.hoursCount * HOUR_MS,
			});
};

const stopListening = () => {
	window.removeEventListener('pointermove', onPointerMove);
	window.removeEventListener('pointerup', onPointerUp);
	window.removeEventListener('pointercancel', cancelDrag);
	window.removeEventListener('keydown', onKeydown);
};

// [Claude] The click comes right after pointerup, so the swallow flag lives one task.
const swallowClick = () => {
	isClickSwallowed = true;
	setTimeout(() => {
		isClickSwallowed = false;
	});
};

function onPointerUp() {
	stopListening();
	const state = drag;
	drag = null;
	if (!state?.isMoved) return;
	swallowClick();
	if (draft.value && !isSameTimes(draft.value, state.origin)) {
		emit('drag-shift', draft.value);
	} else {
		draft.value = null;
	}
}

function cancelDrag() {
	stopListening();
	if (drag?.isMoved) swallowClick();
	drag = null;
	draft.value = null;
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') cancelDrag();
}

const startDrag = (
	event: PointerEvent,
	shiftId: string,
	mode: DragMode,
	pauseId?: string,
) => {
	if (props.readonly || event.button !== 0 || drag) return;
	const origin = props.shifts.find((s) => s.id === shiftId);
	if (!origin) return;
	drag = {
		origin,
		pauseId,
		mode,
		startX: event.clientX,
		isMoved: false,
	};
	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('pointerup', onPointerUp);
	window.addEventListener('pointercancel', cancelDrag);
	window.addEventListener('keydown', onKeydown);
};

const onPartClick = (open: () => void) => {
	if (!isClickSwallowed) open();
};

// [Claude] The page reloads the row after a drop (saved or not): the fresh shift object
// [Claude] replaces the held draft.
watch(
	() => props.shifts.find((s) => s.id === draft.value?.id),
	() => {
		if (!drag) draft.value = null;
	},
);

onBeforeUnmount(stopListening);

const pauses = computed(() =>
	shownShifts.value.flatMap((shift) =>
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
	if (isClickSwallowed) return;
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

.schedule-table-day-timeline .schedule-table-day-timeline__shift--draggable,
.schedule-table-day-timeline .schedule-table-day-timeline__pause--draggable {
  cursor: move;
  touch-action: none;
  user-select: none;
}

/* [Claude] Edges to resize a shift or a pause: shown on hover, wide enough to grab. */
.schedule-table-day-timeline__handle {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: 6px;
  cursor: ew-resize;
  touch-action: none;
}

.schedule-table-day-timeline__handle--start {
  left: 0;
}

.schedule-table-day-timeline__handle--end {
  right: 0;
}

.schedule-table-day-timeline__shift:hover > .schedule-table-day-timeline__handle,
.schedule-table-day-timeline__pause:hover > .schedule-table-day-timeline__handle {
  background: var(--schedule-table-drag-handle);
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
