import { describe, expect, it } from 'vitest';

import { CalendarView, StepDirection, Weekday } from '../../../../enums';
import {
	addDays,
	addMonths,
	clampDay,
	dayOfMonth,
	daysBetween,
	dayToUtcMs,
	formatDayLong,
	formatTimeInZone,
	rangeForView,
	shiftRange,
	startOfWeek,
	stepView,
	toDateRange,
	utcMsToDay,
	weekday,
	weekdayShortName,
	zonedParts,
	zonedTimeToUtcMs,
} from '../date';

describe('schedule-table date utils', () => {
	it('converts a day to UTC midnight and back', () => {
		expect(dayToUtcMs('2026-11-18')).toBe(Date.UTC(2026, 10, 18));
		expect(utcMsToDay(Date.UTC(2026, 10, 18))).toBe('2026-11-18');
	});

	it('adds days and months across boundaries', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-01');
	});

	it('starts weeks on Monday', () => {
		expect(Object.values(Weekday)).toEqual([
			1,
			2,
			3,
			4,
			5,
			6,
			0,
		]);
		expect(weekday('2026-11-18')).toBe(3);
		expect(startOfWeek('2026-11-18')).toBe('2026-11-16');
		expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
	});

	it('gives the visible range of each view', () => {
		expect(rangeForView(CalendarView.Day, '2026-11-18')).toEqual({
			from: '2026-11-18',
			to: '2026-11-18',
		});
		expect(rangeForView(CalendarView.Week, '2026-11-18')).toEqual({
			from: '2026-11-16',
			to: '2026-11-22',
		});
		expect(rangeForView(CalendarView.Month, '2026-02-10')).toEqual({
			from: '2026-02-01',
			to: '2026-02-28',
		});
		expect(
			toDateRange({
				from: '2026-11-16',
				to: '2026-11-22',
			}),
		).toEqual({
			from: Date.UTC(2026, 10, 16),
			to: Date.UTC(2026, 10, 22),
		});
	});

	it('steps and clamps', () => {
		expect(stepView(CalendarView.Week, '2026-11-18', StepDirection.Next)).toBe(
			'2026-11-25',
		);
		expect(stepView(CalendarView.Month, '2026-11-18', StepDirection.Prev)).toBe(
			'2026-10-01',
		);
		expect(
			clampDay('2026-12-05', {
				from: '2026-11-01',
				to: '2026-11-30',
			}),
		).toBe('2026-11-30');
		expect(daysBetween('2026-11-29', '2026-12-02')).toHaveLength(4);
		expect(dayOfMonth('2026-11-01')).toBe('1');
		expect(dayOfMonth('2026-11-30')).toBe('30');
		expect(weekdayShortName('2026-11-16', 'en')).toBe('Mon');
		expect(weekdayShortName('2026-11-22', 'en')).toBe('Sun');
		expect(formatDayLong('2026-11-01', 'en')).toBe('01 November 2026');
		expect(daysBetween('2026-12-02', '2026-11-29')).toEqual([]);
		expect(
			shiftRange(
				{
					from: '2026-11-10',
					to: '2026-11-21',
				},
				StepDirection.Next,
			),
		).toEqual({
			from: '2026-11-22',
			to: '2026-12-03',
		});
	});

	// [Claude] date-fns works on local dates: a short or long day of the browser zone
	// [Claude] (8 Mar / 1 Nov 2026 in New York, 29 Mar / 25 Oct in Kyiv) must not skip or repeat a day.
	it('keeps day math whole across the daylight saving days of any browser zone', () => {
		expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
		expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
		expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
		expect(daysBetween('2026-03-27', '2026-03-31')).toEqual([
			'2026-03-27',
			'2026-03-28',
			'2026-03-29',
			'2026-03-30',
			'2026-03-31',
		]);
		expect(rangeForView(CalendarView.Week, '2026-10-25')).toEqual({
			from: '2026-10-19',
			to: '2026-10-25',
		});
		expect(dayToUtcMs('2026-03-29')).toBe(Date.UTC(2026, 2, 29));
	});

	it('reads and builds wall-clock times in a zone, across DST', () => {
		const ms = zonedTimeToUtcMs('2026-11-18', 9 * 60, 'Europe/Kyiv');
		expect(ms).toBe(Date.UTC(2026, 10, 18, 7));
		expect(formatTimeInZone(ms, 'Europe/Kyiv')).toBe('09:00');
		// [Claude] Summer time in Kyiv is UTC+3.
		expect(zonedTimeToUtcMs('2026-07-01', 9 * 60, 'Europe/Kyiv')).toBe(
			Date.UTC(2026, 6, 1, 6),
		);
		expect(zonedParts(Date.UTC(2026, 10, 18, 22, 30), 'Europe/Kyiv')).toEqual({
			day: '2026-11-19',
			minutes: 30,
		});
	});
});
