// [Claude] Dragging a pause ("period", Figma PrimeVue schedule) inside its shift in the Day view:
// [Claude] move keeps its length, resize moves one edge. The pause stays inside the shift, does not
// [Claude] run into its neighbours, lasts at least one step, and snaps to the step (15 min).
import type { Shift, ShiftPause } from '../../../api/wfm/types';
import { MS_IN_MINUTE } from '../../../utils/day';

export enum PauseDragMode {
	Move = 'move',
	Start = 'start',
	End = 'end',
}

export const PAUSE_STEP_MS = 15 * MS_IN_MINUTE;

const snap = (ms: number, step: number) => Math.round(ms / step) * step;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export const dragPause = ({
	shift,
	index,
	mode,
	deltaMs,
	step = PAUSE_STEP_MS,
}: {
	shift: Shift;
	index: number;
	mode: PauseDragMode;
	deltaMs: number;
	step?: number;
}): ShiftPause[] => {
	const sorted = shift.pauses
		.map((pause, position) => ({
			pause,
			position,
		}))
		.sort((a, b) => a.pause.startAt - b.pause.startAt);
	const order = sorted.findIndex(({ position }) => position === index);
	const pause = shift.pauses[index];
	// [Claude] The free room around the pause: the shift edges or the neighbours.
	const min = sorted[order - 1]?.pause.endAt ?? shift.startAt;
	const max = sorted[order + 1]?.pause.startAt ?? shift.endAt;
	const delta = snap(deltaMs, step);
	let { startAt, endAt } = pause;
	if (mode === PauseDragMode.Move) {
		const length = endAt - startAt;
		startAt = clamp(startAt + delta, min, max - length);
		endAt = startAt + length;
	}
	if (mode === PauseDragMode.Start) {
		startAt = clamp(startAt + delta, min, endAt - step);
	}
	if (mode === PauseDragMode.End) {
		endAt = clamp(endAt + delta, startAt + step, max);
	}
	return shift.pauses.map((item, position) =>
		position === index
			? {
					...item,
					startAt,
					endAt,
				}
			: item,
	);
};
