// [Claude] Drag and drop in the Day view: a whole shift or one of its pauses is moved (keeps
// [Claude] its length) or resized by one edge. Times snap to the step (15 min), a part lasts
// [Claude] at least one step and stays in its room: a shift between the timeline ends and its
// [Claude] neighbour shifts, a pause inside its shift between its neighbour pauses.
import type { CalendarPause, CalendarShift } from '../types';

export const DragMode = {
	Move: 'move',
	Start: 'start',
	End: 'end',
} as const;

export type DragMode = (typeof DragMode)[keyof typeof DragMode];

const MINUTE_MS = 60_000;
export const DRAG_STEP_MS = 15 * MINUTE_MS;

const snap = (ms: number, step: number) => Math.round(ms / step) * step;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

interface Span {
	startAt: number;
	endAt: number;
}

// [Claude] New edges of a span dragged by deltaMs inside [min, max].
const dragSpan = (
	{ startAt, endAt }: Span,
	mode: DragMode,
	deltaMs: number,
	min: number,
	max: number,
	step: number,
): Span => {
	const delta = snap(deltaMs, step);
	if (mode === DragMode.Move) {
		const length = endAt - startAt;
		const start = clamp(startAt + delta, min, max - length);
		return {
			startAt: start,
			endAt: start + length,
		};
	}
	if (mode === DragMode.Start) {
		return {
			startAt: clamp(startAt + delta, min, endAt - step),
			endAt,
		};
	}
	return {
		startAt,
		endAt: clamp(endAt + delta, startAt + step, max),
	};
};

// [Claude] Moving a shift moves its pauses with it; resizing cuts the pauses to the new
// [Claude] edges and drops the ones left outside.
export const dragShift = ({
	shift,
	neighbours,
	mode,
	deltaMs,
	min,
	max,
	step = DRAG_STEP_MS,
}: {
	shift: CalendarShift;
	// [Claude] The other shifts of the same row: the shift does not run into them.
	neighbours: CalendarShift[];
	mode: DragMode;
	deltaMs: number;
	// [Claude] The timeline ends (epoch ms).
	min: number;
	max: number;
	step?: number;
}): CalendarShift => {
	const before = neighbours
		.filter((s) => s.endAt <= shift.startAt)
		.reduce((at, s) => Math.max(at, s.endAt), min);
	const after = neighbours
		.filter((s) => s.startAt >= shift.endAt)
		.reduce((at, s) => Math.min(at, s.startAt), max);
	// [Claude] A shift already sticking out of the timeline may keep its place.
	const { startAt, endAt } = dragSpan(
		shift,
		mode,
		deltaMs,
		Math.min(before, shift.startAt),
		Math.max(after, shift.endAt),
		step,
	);
	const offset = startAt - shift.startAt;
	const pauses: CalendarPause[] =
		mode === DragMode.Move
			? shift.pauses.map((p) => ({
					...p,
					startAt: p.startAt + offset,
					endAt: p.endAt + offset,
				}))
			: shift.pauses
					.map((p) => ({
						...p,
						startAt: Math.max(p.startAt, startAt),
						endAt: Math.min(p.endAt, endAt),
					}))
					.filter((p) => p.endAt > p.startAt);
	return {
		...shift,
		startAt,
		endAt,
		pauses,
	};
};

export const dragPause = ({
	shift,
	pauseId,
	mode,
	deltaMs,
	step = DRAG_STEP_MS,
}: {
	shift: CalendarShift;
	pauseId: string;
	mode: DragMode;
	deltaMs: number;
	step?: number;
}): CalendarShift => {
	const pause = shift.pauses.find((p) => p.id === pauseId);
	if (!pause) return shift;
	const others = shift.pauses.filter((p) => p.id !== pauseId);
	const min = others
		.filter((p) => p.endAt <= pause.startAt)
		.reduce((at, p) => Math.max(at, p.endAt), shift.startAt);
	const max = others
		.filter((p) => p.startAt >= pause.endAt)
		.reduce((at, p) => Math.min(at, p.startAt), shift.endAt);
	const span = dragSpan(pause, mode, deltaMs, min, max, step);
	return {
		...shift,
		pauses: shift.pauses.map((p) =>
			p.id === pauseId
				? {
						...p,
						...span,
					}
				: p,
		),
	};
};

export const isSameTimes = (a: CalendarShift, b: CalendarShift) =>
	a.startAt === b.startAt &&
	a.endAt === b.endAt &&
	a.pauses.length === b.pauses.length &&
	a.pauses.every(
		(p, i) =>
			p.startAt === b.pauses[i].startAt && p.endAt === b.pauses[i].endAt,
	);
