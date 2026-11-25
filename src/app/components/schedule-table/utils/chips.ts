import { ScheduleChipColor } from '../../../enums';
import type { CalendarPause } from '../types';

// [Claude] Pause chips take one of four colours by their cause, so a cause keeps its colour
// [Claude] everywhere (Lunch is always the same). Pauses without a cause are orange.
const PAUSE_COLORS = [
	ScheduleChipColor.Orange,
	ScheduleChipColor.Teal,
	ScheduleChipColor.Blue,
	ScheduleChipColor.Purple,
];

const hashOf = (text: string) =>
	[
		...text,
	].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);

export const pauseChipColor = (pause: CalendarPause): ScheduleChipColor =>
	pause.cause
		? PAUSE_COLORS[hashOf(pause.cause.id) % PAUSE_COLORS.length]
		: ScheduleChipColor.Orange;
