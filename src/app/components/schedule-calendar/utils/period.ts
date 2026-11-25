import { CalendarView } from '../../../enums';
import {
	addDays,
	addMonths,
	clampDay,
	type DayKey,
	daysInMonth,
	diffDays,
	startOfMonth,
	startOfWeek,
} from '../../../utils/day';
import type { DayBounds } from '../types';

export interface Period {
	from: DayKey;
	to: DayKey;
	days: number;
}

// [Claude] The days a view shows around `date`; an own range (Agents From / To) wins.
export const periodOf = (
	view: CalendarView,
	date: DayKey,
	range?: DayBounds | null,
): Period => {
	if (range) {
		return {
			from: range.from,
			to: range.to,
			days: diffDays(range.to, range.from) + 1,
		};
	}
	if (view === CalendarView.Day) {
		return {
			from: date,
			to: date,
			days: 1,
		};
	}
	if (view === CalendarView.Month) {
		const from = startOfMonth(date);
		const days = daysInMonth(from);
		return {
			from,
			to: addDays(from, days - 1),
			days,
		};
	}
	const from = startOfWeek(date);
	return {
		from,
		to: addDays(from, 6),
		days: 7,
	};
};

// [Claude] Step of the arrows: 1 day, 7 days or a month (US_02.01, US_05.08–05.10).
export const stepDate = (
	view: CalendarView,
	date: DayKey,
	direction: 1 | -1,
): DayKey => {
	if (view === CalendarView.Day) return addDays(date, direction);
	if (view === CalendarView.Month) return addMonths(date, direction);
	return addDays(date, 7 * direction);
};

// [Claude] An arrow is off when the next period lies wholly outside the schedule dates.
export const canStep = (
	view: CalendarView,
	date: DayKey,
	direction: 1 | -1,
	bounds?: DayBounds | null,
): boolean => {
	if (!bounds) return true;
	const next = periodOf(view, stepDate(view, date, direction));
	return direction > 0 ? next.from <= bounds.to : next.to >= bounds.from;
};

// [Claude] The date to show after a step: kept inside the schedule dates.
export const stepWithin = (
	view: CalendarView,
	date: DayKey,
	direction: 1 | -1,
	bounds?: DayBounds | null,
): DayKey => clampDay(stepDate(view, date, direction), bounds);
