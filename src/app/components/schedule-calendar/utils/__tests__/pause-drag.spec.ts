import { describe, expect, it } from 'vitest';

import type { Shift } from '../../../../api/wfm/types';
import { MS_IN_MINUTE } from '../../../../utils/day';
import { dragPause, PauseDragMode } from '../pauseDrag';

const min = (value: number) => value * MS_IN_MINUTE;

// [Claude] 09:00–18:00 with a break 10:00–10:15 and a lunch 13:00–14:00 (minutes from 0).
const shift: Shift = {
	id: 's1',
	etag: 'v1',
	startAt: min(540),
	endAt: min(1080),
	workingDate: '2026-12-01',
	skills: [],
	pauses: [
		{
			startAt: min(780),
			endAt: min(840),
		},
		{
			startAt: min(600),
			endAt: min(615),
		},
	],
};

const lunch = (mode: PauseDragMode, deltaMinutes: number) =>
	dragPause({
		shift,
		index: 0,
		mode,
		deltaMs: min(deltaMinutes),
	})[0];

describe('dragPause', () => {
	it('moves a pause by whole steps and keeps its length', () => {
		expect(lunch(PauseDragMode.Move, 67)).toEqual({
			startAt: min(840),
			endAt: min(900),
		});
	});

	it('stops at the neighbour and at the shift end', () => {
		expect(lunch(PauseDragMode.Move, -300).startAt).toBe(min(615));
		expect(lunch(PauseDragMode.Move, 600).endAt).toBe(min(1080));
	});

	it('resizes one edge, never shorter than a step', () => {
		expect(lunch(PauseDragMode.End, 30).endAt).toBe(min(870));
		expect(lunch(PauseDragMode.Start, 120)).toEqual({
			startAt: min(825),
			endAt: min(840),
		});
	});
});
