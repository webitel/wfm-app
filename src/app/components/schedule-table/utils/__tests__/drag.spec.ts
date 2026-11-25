import { describe, expect, it } from 'vitest';
import type { CalendarShift } from '../../types';
import { DragMode, dragPause, dragShift } from '../drag';

const H = 3_600_000;
const M = 60_000;

const shift = (over: Partial<CalendarShift> = {}): CalendarShift => ({
	id: 's1',
	etag: 'e',
	startAt: 9 * H,
	endAt: 17 * H,
	pauses: [
		{
			id: 'p1',
			startAt: 13 * H,
			endAt: 14 * H,
		},
	],
	skills: [],
	...over,
});

const range = {
	neighbours: [],
	min: 0,
	max: 24 * H,
};

describe('dragShift', () => {
	it('moves the shift with its pauses, snapped to 15 min', () => {
		const r = dragShift({
			...range,
			shift: shift(),
			mode: DragMode.Move,
			deltaMs: H + 7 * M,
		});
		expect([
			r.startAt,
			r.endAt,
		]).toEqual([
			10 * H + 0,
			18 * H,
		]);
		expect(r.pauses[0].startAt).toBe(14 * H);
	});

	it('stops at the timeline end and at a neighbour shift', () => {
		expect(
			dragShift({
				...range,
				shift: shift(),
				mode: DragMode.Move,
				deltaMs: 20 * H,
			}).endAt,
		).toBe(24 * H);
		expect(
			dragShift({
				...range,
				neighbours: [
					shift({
						id: 's2',
						startAt: 18 * H,
						endAt: 20 * H,
					}),
				],
				shift: shift(),
				mode: DragMode.End,
				deltaMs: 5 * H,
			}).endAt,
		).toBe(18 * H);
	});

	it('resize cuts pauses and drops the ones left outside', () => {
		const cut = dragShift({
			...range,
			shift: shift(),
			mode: DragMode.End,
			deltaMs: -3.5 * H,
		});
		expect(cut.endAt).toBe(13.5 * H);
		expect(cut.pauses[0]).toMatchObject({
			startAt: 13 * H,
			endAt: 13.5 * H,
		});
		expect(
			dragShift({
				...range,
				shift: shift(),
				mode: DragMode.End,
				deltaMs: -5 * H,
			}).pauses,
		).toEqual([]);
	});

	it('keeps at least one step', () => {
		const r = dragShift({
			...range,
			shift: shift(),
			mode: DragMode.Start,
			deltaMs: 10 * H,
		});
		expect(r.endAt - r.startAt).toBe(15 * M);
	});
});

describe('dragPause', () => {
	it('moves the pause inside the shift only', () => {
		const r = dragPause({
			shift: shift(),
			pauseId: 'p1',
			mode: DragMode.Move,
			deltaMs: 10 * H,
		});
		expect(r.pauses[0]).toMatchObject({
			startAt: 16 * H,
			endAt: 17 * H,
		});
	});

	it('resizes one edge up to the neighbour pause', () => {
		const s = shift({
			pauses: [
				{
					id: 'p1',
					startAt: 11 * H,
					endAt: 11.25 * H,
				},
				{
					id: 'p2',
					startAt: 13 * H,
					endAt: 14 * H,
				},
			],
		});
		expect(
			dragPause({
				shift: s,
				pauseId: 'p1',
				mode: DragMode.End,
				deltaMs: 5 * H,
			}).pauses[0].endAt,
		).toBe(13 * H);
	});
});
