// [Claude] Rules of dragging a shift in the Day view: the shift stays with its agent and its
// [Claude] working day, keeps at most 24 hours and does not overlap the agent's other shifts.
// [Claude] Pauses move with the shift; a resize cuts them to the new time and drops the ones left
// [Claude] outside it, so a shift can always be made shorter.
// [Claude] The server checks the same (UpdateAgentWorkingScheduleShift); this answers at once.
import type { Shift } from '../../../api/wfm/types';
import { MS_IN_DAY, wallToMs } from '../../../utils/day';

export enum ShiftDragRefusal {
	OtherRow = 'otherRow',
	Overlap = 'overlap',
	Time = 'time',
}

export type ShiftDragResult =
	| {
			shift: Shift;
			// [Claude] Pauses a resize dropped or cut.
			cutPauses: number;
	  }
	| {
			refusal: ShiftDragRefusal;
	  };

export const dragShift = ({
	shift,
	startAt,
	endAt,
	isMove,
	isSameRow,
	others,
	timeZone,
}: {
	shift: Shift;
	startAt: number;
	endAt: number;
	// [Claude] Move shifts the pauses too; a resize keeps them where they are.
	isMove: boolean;
	isSameRow: boolean;
	// [Claude] The agent's other shifts around that day.
	others: Shift[];
	timeZone: string;
}): ShiftDragResult => {
	if (!isSameRow) {
		return {
			refusal: ShiftDragRefusal.OtherRow,
		};
	}
	// [Claude] A shift belongs to the day it starts on (working date).
	const dayStart = wallToMs(shift.workingDate, 0, timeZone);
	const nextDayStart = wallToMs(shift.workingDate, 1440, timeZone);
	if (
		endAt <= startAt ||
		endAt - startAt > MS_IN_DAY ||
		startAt < dayStart ||
		startAt >= nextDayStart
	) {
		return {
			refusal: ShiftDragRefusal.Time,
		};
	}
	if (
		others.some(
			(other) =>
				other.id !== shift.id && other.startAt < endAt && startAt < other.endAt,
		)
	) {
		return {
			refusal: ShiftDragRefusal.Overlap,
		};
	}
	const delta = isMove ? startAt - shift.startAt : 0;
	const clipped = shift.pauses.map((pause) => {
		const moved = {
			...pause,
			startAt: pause.startAt + delta,
			endAt: pause.endAt + delta,
		};
		const kept = {
			...moved,
			startAt: Math.max(moved.startAt, startAt),
			endAt: Math.min(moved.endAt, endAt),
		};
		return {
			pause: kept,
			isCut: kept.startAt !== moved.startAt || kept.endAt !== moved.endAt,
		};
	});
	return {
		shift: {
			...shift,
			startAt,
			endAt,
			pauses: clipped
				.map(({ pause }) => pause)
				.filter((pause) => pause.endAt > pause.startAt),
		},
		cutPauses: clipped.filter(({ isCut }) => isCut).length,
	};
};
