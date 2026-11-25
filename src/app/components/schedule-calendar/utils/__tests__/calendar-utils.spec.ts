import { describe, expect, it } from 'vitest';

import type { AgentRow, Shift } from '../../../../api/wfm/types';
import { CalendarView } from '../../../../enums';
import { wallToMs } from '../../../../utils/day';
import { dayEvents, dayTimeline, periodEvents } from '../dpData';
import { ForecastLevel, forecastLevel } from '../forecast';
import { canStep, periodOf, stepWithin } from '../period';
import { dragShift, ShiftDragRefusal } from '../shiftDrag';

const KYIV = 'Europe/Kyiv';
const DAY = '2026-12-02';
const at = (minutes: number) => wallToMs(DAY, minutes, KYIV);

const shift = (id: string, start: number, end: number): Shift => ({
	id,
	etag: 'v1',
	startAt: at(start),
	endAt: at(end),
	workingDate: DAY,
	pauses: [],
	skills: [],
});

describe('periodOf', () => {
	it('week, month, day and an own range', () => {
		expect(periodOf(CalendarView.Week, '2026-11-26')).toEqual({
			from: '2026-11-23',
			to: '2026-11-29',
			days: 7,
		});
		expect(periodOf(CalendarView.Month, '2026-02-10').days).toBe(28);
		expect(periodOf(CalendarView.Day, '2026-11-26').days).toBe(1);
		expect(
			periodOf(CalendarView.Week, '2026-11-26', {
				from: '2026-11-01',
				to: '2026-11-10',
			}).days,
		).toBe(10);
	});

	it('arrows stop at the schedule dates', () => {
		const bounds = {
			from: '2026-11-24',
			to: '2026-12-31',
		};
		expect(canStep(CalendarView.Week, '2026-11-24', -1, bounds)).toBe(false);
		expect(canStep(CalendarView.Week, '2026-12-28', 1, bounds)).toBe(false);
		expect(canStep(CalendarView.Week, '2026-11-24', 1, bounds)).toBe(true);
		expect(stepWithin(CalendarView.Month, '2026-12-15', 1, bounds)).toBe(
			'2026-12-31',
		);
	});
});

describe('forecastLevel (US_05.11)', () => {
	it('red ≤25 %, yellow ≤50 %, green above', () => {
		expect(forecastLevel(1, 4)).toBe(ForecastLevel.Low);
		expect(forecastLevel(2, 4)).toBe(ForecastLevel.Medium);
		expect(forecastLevel(3, 4)).toBe(ForecastLevel.High);
		expect(forecastLevel(3, 0)).toBe(ForecastLevel.None);
	});
});

describe('DayPilot data', () => {
	const row: AgentRow = {
		agent: {
			id: '1',
			name: 'Anna',
		},
		days: {
			[DAY]: {
				date: DAY,
				isLocked: false,
				shifts: [
					shift('s1', 540, 1080),
				],
			},
		},
	};

	it('Week: events only for days with something, none outside the schedule', () => {
		const events = periodEvents(
			[
				row,
			],
			periodOf(CalendarView.Week, DAY),
			{
				from: '2026-12-03',
				to: '2026-12-31',
			},
		);
		expect(events).toHaveLength(0);
		expect(
			periodEvents(
				[
					row,
				],
				periodOf(CalendarView.Week, DAY),
			),
		).toHaveLength(1);
	});

	it('Day: a shift is a wall-clock event in the calendar zone', () => {
		const [event] = dayEvents(
			[
				row,
			],
			DAY,
			dayTimeline(null),
			KYIV,
		);
		expect(event.start).toBe(`${DAY}T09:00:00`);
		expect(event.end).toBe(`${DAY}T18:00:00`);
	});

	it('a timeline that crosses midnight ends on the next day', () => {
		expect(
			dayTimeline({
				from: 1320,
				to: 360,
			}),
		).toEqual({
			from: 1320,
			to: 1800,
		});
	});
});

describe('dragShift (Day view drag)', () => {
	const base = {
		...shift('s1', 540, 1080),
		pauses: [
			{
				startAt: at(780),
				endAt: at(840),
			},
		],
	};
	const drag = (start: number, end: number, extra = {}) =>
		dragShift({
			shift: base,
			startAt: at(start),
			endAt: at(end),
			isMove: true,
			isSameRow: true,
			others: [
				base,
				shift('s2', 1140, 1320),
			],
			timeZone: KYIV,
			...extra,
		});

	it('moves the shift and its pauses', () => {
		const result = drag(600, 1140 - 1);
		expect('shift' in result && result.shift.pauses[0].startAt).toBe(at(840));
	});

	it('refuses another agent, an overlap and a day change', () => {
		expect(
			drag(600, 1100, {
				isSameRow: false,
			}),
		).toEqual({
			refusal: ShiftDragRefusal.OtherRow,
		});
		expect(drag(660, 1200)).toEqual({
			refusal: ShiftDragRefusal.Overlap,
		});
		expect(drag(1500, 1700)).toEqual({
			refusal: ShiftDragRefusal.Time,
		});
	});

	it('a resize cuts the pauses to the new time and drops the ones outside', () => {
		const shorter = drag(540, 810, {
			isMove: false,
		});
		expect('shift' in shorter && shorter.shift.pauses).toEqual([
			{
				startAt: at(780),
				endAt: at(810),
			},
		]);
		expect('cutPauses' in shorter && shorter.cutPauses).toBe(1);
		const beforeLunch = drag(540, 720, {
			isMove: false,
		});
		expect('shift' in beforeLunch && beforeLunch.shift.pauses).toEqual([]);
	});
});
