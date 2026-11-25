import { describe, expect, it } from 'vitest';

import {
	addDays,
	addMonths,
	dayOfWeek,
	daysInMonth,
	dayToMs,
	diffDays,
	formatTime,
	msToDay,
	msToMinutes,
	msToWall,
	startOfWeek,
	wallStringToMs,
	wallToMs,
} from '../day';

const KYIV = 'Europe/Kyiv';

describe('day keys', () => {
	it('day key ↔ 00:00 UTC ms (wire DateRange)', () => {
		expect(dayToMs('2026-11-24')).toBe(Date.UTC(2026, 10, 24));
		expect(msToDay(Date.UTC(2026, 10, 24))).toBe('2026-11-24');
		expect(msToDay(String(Date.UTC(2026, 10, 24)))).toBe('2026-11-24');
	});

	it('steps days and months', () => {
		expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
		expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
		expect(diffDays('2026-12-01', '2026-11-24')).toBe(7);
		expect(daysInMonth('2028-02-10')).toBe(29);
	});

	it('weeks start on Monday, weekday keys 0 = Sunday', () => {
		expect(dayOfWeek('2026-11-29')).toBe(0);
		expect(startOfWeek('2026-11-29')).toBe('2026-11-23');
		expect(startOfWeek('2026-11-23')).toBe('2026-11-23');
	});
});

describe('wall clock in a zone', () => {
	it('minutes of a day → instant and back', () => {
		const ms = wallToMs('2026-11-24', 540, KYIV);
		expect(formatTime(ms, KYIV)).toBe('09:00');
		expect(msToWall(ms, KYIV)).toBe('2026-11-24T09:00:00');
		expect(msToMinutes(ms, '2026-11-24', KYIV)).toBe(540);
		expect(wallStringToMs('2026-11-24T09:00:00', KYIV)).toBe(ms);
	});

	it('minutes past midnight fall on the next day', () => {
		expect(msToWall(wallToMs('2026-11-24', 1800, KYIV), KYIV)).toBe(
			'2026-11-25T06:00:00',
		);
	});

	it('keeps the wall-clock hour across a DST change', () => {
		const before = wallToMs('2026-10-24', 540, KYIV);
		const after = wallToMs('2026-10-26', 540, KYIV);
		expect(formatTime(after, KYIV)).toBe('09:00');
		expect(after - before).toBe(2 * 86_400_000 + 3_600_000);
	});
});
