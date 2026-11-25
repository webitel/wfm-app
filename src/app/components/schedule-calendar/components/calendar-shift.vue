<template>
  <!-- [Claude] A shift in the Day view (US_05.09, Figma "PrimeVue Schedules Powered"): green working
       time with its pauses ("periods") as chips placed by their time. The shift is moved and resized
       by DayPilot (edges = handles); a pause is moved and resized here, inside the shift. -->
  <div
    ref="root"
    :class="{ 'calendar-shift--editable': !isReadonly }"
    :style="{ '--calendar-shift-handle-width': `${handleWidth}px` }"
    class="calendar-shift"
  >
    <!-- [Claude] Resize handles over the edges DayPilot resizes from (eventResizeMargin); mouse events
         bubble to DayPilot, the handles only show where and the resize cursor. -->
    <template v-if="!isReadonly">
      <span class="calendar-shift__handle calendar-shift__handle--start" />
      <span class="calendar-shift__handle calendar-shift__handle--end" />
    </template>
    <span class="calendar-shift__time typo-caption">
      {{ formatTime(shift.startAt, timeZone) }}–{{ formatTime(shift.endAt, timeZone) }}
    </span>

    <!-- [Claude] Mouse / touch downs stop here, so DayPilot does not start moving the whole shift. -->
    <div
      v-for="(pause, index) of shown"
      :key="pause.id || index"
      :class="[
        `calendar-shift__pause--${pauseColor(pause)}`,
        { 'calendar-shift__pause--dragged': drag?.index === index },
      ]"
      :style="pauseStyle(pause)"
      :title="`${pauseName(pause)} ${pauseTime(pause)}`"
      class="calendar-shift__pause"
      @click.stop
      @mousedown.stop
      @pointerdown.stop="startDrag($event, index)"
      @touchstart.stop
    >
      <template v-if="!isReadonly">
        <!-- [Claude] Edges reach past the chip, so grabbing near its border resizes it
             instead of moving the whole shift. -->
        <span
          :data-mode="PauseDragMode.Start"
          class="calendar-shift__pause-edge calendar-shift__pause-edge--start"
        />
        <span
          :data-mode="PauseDragMode.End"
          class="calendar-shift__pause-edge calendar-shift__pause-edge--end"
        />
      </template>
      <span class="calendar-shift__pause-text">
        <span class="calendar-shift__pause-name typo-caption">{{ pauseName(pause) }}</span>
        <span class="calendar-shift__pause-time typo-caption">{{ pauseTime(pause) }}</span>
      </span>
      <wt-icon-btn
        v-if="!isReadonly && !drag"
        class="calendar-shift__pause-delete"
        icon="close"
        size="sm"
        @click.stop="emit('delete-pause', shift.pauses[index])"
        @pointerdown.stop
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Shift, ShiftPause } from '../../../api/wfm/types';
import { formatTime } from '../../../utils/day';
import { dragPause, PauseDragMode } from '../utils/pauseDrag';

const props = defineProps<{
	shift: Shift;
	timeZone: string;
	isReadonly: boolean;
	// [Claude] Width of the edge where DayPilot starts a resize (eventResizeMargin).
	handleWidth: number;
}>();

const emit = defineEmits<{
	'delete-pause': [
		pause: ShiftPause,
	];
	// [Claude] A pause was moved or resized: the shift's pauses after it.
	'change-pauses': [
		pauses: ShiftPause[],
	];
}>();

const { t } = useI18n();

const root = useTemplateRef<HTMLElement>('root');

// [Claude] Chip colours by cause, as in Figma (Lunch orange, Break teal, Training purple, Meeting
// [Claude] blue); an unknown cause gets a stable colour from its name, no cause is "Pause" yellow.
const COLORS = [
	'orange',
	'teal',
	'purple',
	'blue',
] as const;
const KNOWN: Record<string, (typeof COLORS)[number]> = {
	lunch: 'orange',
	break: 'teal',
	training: 'purple',
	meeting: 'blue',
};

const pauseName = (pause: ShiftPause) =>
	pause.cause?.name || t('wfmCalendar.pause');
const pauseTime = (pause: ShiftPause) =>
	`${formatTime(pause.startAt, props.timeZone)}–${formatTime(pause.endAt, props.timeZone)}`;
const pauseColor = (pause: ShiftPause) => {
	const name = pause.cause?.name?.toLowerCase();
	if (!name) return 'yellow';
	const known = Object.entries(KNOWN).find(([key]) => name.includes(key));
	if (known) return known[1];
	const hash = [
		...name,
	].reduce((sum, char) => sum + char.charCodeAt(0), 0);
	return COLORS[hash % COLORS.length];
};

const pauseStyle = (pause: ShiftPause) => {
	const length = props.shift.endAt - props.shift.startAt;
	return {
		left: `${((pause.startAt - props.shift.startAt) / length) * 100}%`,
		width: `${((pause.endAt - pause.startAt) / length) * 100}%`,
	};
};

/* [Claude] ------------------------------------------------------------ Pause drag */

// [Claude] Pixels from a chip edge that resize it instead of moving it.
const EDGE_PX = 8;
// [Claude] Less than this is a click, not a drag.
const CLICK_PX = 3;

const drag = ref<{
	index: number;
	mode: PauseDragMode;
	startX: number;
	msPerPx: number;
	pauses: ShiftPause[];
} | null>(null);

// [Claude] While dragging, the chips show the dragged pauses; otherwise the saved ones.
const shown = computed(() => drag.value?.pauses || props.shift.pauses);

const modeAt = (event: PointerEvent, chip: HTMLElement) => {
	const { left, right } = chip.getBoundingClientRect();
	if (event.clientX - left <= EDGE_PX) return PauseDragMode.Start;
	if (right - event.clientX <= EDGE_PX) return PauseDragMode.End;
	return PauseDragMode.Move;
};

const startDrag = (event: PointerEvent, index: number) => {
	if (props.isReadonly || event.button !== 0 || !root.value) return;
	const width = root.value.getBoundingClientRect().width;
	drag.value = {
		index,
		mode:
			((event.target as HTMLElement).dataset.mode as PauseDragMode) ||
			modeAt(event, event.currentTarget as HTMLElement),
		startX: event.clientX,
		msPerPx: (props.shift.endAt - props.shift.startAt) / width,
		pauses: props.shift.pauses,
	};
	window.addEventListener('pointermove', onMove);
	window.addEventListener('pointerup', onUp, {
		once: true,
	});
};

const onMove = (event: PointerEvent) => {
	if (!drag.value) return;
	drag.value.pauses = dragPause({
		shift: props.shift,
		index: drag.value.index,
		mode: drag.value.mode,
		deltaMs: (event.clientX - drag.value.startX) * drag.value.msPerPx,
	});
};

const onUp = (event: PointerEvent) => {
	window.removeEventListener('pointermove', onMove);
	const state = drag.value;
	drag.value = null;
	if (!state || Math.abs(event.clientX - state.startX) < CLICK_PX) return;
	const before = props.shift.pauses[state.index];
	const after = state.pauses[state.index];
	if (before.startAt === after.startAt && before.endAt === after.endAt) return;
	emit('change-pauses', state.pauses);
};
</script>

<style scoped>
.calendar-shift {
	position: relative;
	border-radius: var(--border-radius);
	background: var(--wfm-calendar-shift-bg);
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.calendar-shift--editable {
	cursor: move;
}

.calendar-shift__handle {
	position: absolute;
	top: 0;
	bottom: 0;
	z-index: 3;
	opacity: 0;
	transition: var(--transition);
	background: var(--wfm-calendar-fact-high-bg);
	width: var(--calendar-shift-handle-width);
}

.calendar-shift__handle--start {
	left: 0;
	cursor: w-resize;
	border-radius: var(--border-radius) 0 0 var(--border-radius);
}

.calendar-shift__handle--end {
	right: 0;
	cursor: e-resize;
	border-radius: 0 var(--border-radius) var(--border-radius) 0;
}

.calendar-shift:hover .calendar-shift__handle {
	opacity: 1;
}

.calendar-shift__time {
	position: relative;
	z-index: 1;
	padding: 0 var(--spacing-2xs) 0 calc(var(--calendar-shift-handle-width) + 2px);
	pointer-events: none;
	white-space: nowrap;
}

/* [Claude] A pause chip: coloured left bar, name and time (Figma). */
.calendar-shift__pause {
	--pause-bar: var(--p-yellow-500, #eab308);
	--pause-bg: var(--p-yellow-100, #fef9c3);

	display: flex;
	position: absolute;
	top: 3px;
	bottom: 3px;
	align-items: center;
	z-index: 2;
	box-sizing: border-box;
	border-left: 3px solid var(--pause-bar);
	border-radius: 4px;
	background: var(--pause-bg);
	padding: 0 2px 0 4px;
	min-width: 6px;
	cursor: grab;
	user-select: none;
}

.calendar-shift--editable .calendar-shift__pause {
	touch-action: none;
}

.calendar-shift__pause--dragged {
	box-shadow: var(--elevation-10);
	cursor: grabbing;
}

.calendar-shift__pause--orange {
	--pause-bar: var(--p-orange-500, #f97316);
	--pause-bg: var(--p-orange-100, #ffedd5);
}

.calendar-shift__pause--teal {
	--pause-bar: var(--p-teal-600, #0d9488);
	--pause-bg: var(--p-teal-50, #f0fdfa);
}

.calendar-shift__pause--purple {
	--pause-bar: var(--p-purple-500, #a855f7);
	--pause-bg: var(--p-purple-100, #f3e8ff);
}

.calendar-shift__pause--blue {
	--pause-bar: var(--p-blue-600, #2563eb);
	--pause-bg: var(--p-blue-50, #eff6ff);
}

.calendar-shift__pause-edge {
	position: absolute;
	top: 0;
	bottom: 0;
	z-index: 1;
	width: 14px;
}

.calendar-shift__pause-edge--start {
	left: -9px;
	cursor: w-resize;
}

.calendar-shift__pause-edge--end {
	right: -8px;
	cursor: e-resize;
}

.calendar-shift__pause-text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	line-height: 1.15;
	pointer-events: none;
}

.calendar-shift__pause-name,
.calendar-shift__pause-time {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.calendar-shift__pause-time {
	opacity: 0.75;
}

.calendar-shift__pause-delete {
	display: none;
	flex-shrink: 0;
	/* [Claude] Clear of the right edge, which resizes the pause. */
	margin-right: 6px;
}

.calendar-shift__pause:hover .calendar-shift__pause-delete {
	display: block;
}
</style>
