import {
	addDays as dfAddDays,
	addMonths as dfAddMonths,
	endOfMonth as dfEndOfMonth,
	isWeekend as dfIsWeekend,
	startOfMonth as dfStartOfMonth,
	startOfWeek as dfStartOfWeek,
	eachDayOfInterval,
	format,
	getDay,
	parseISO,
} from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import { CalendarView, StepDirection, Weekday } from '../../../enums';
import { type DayKey } from '../types';

// [Claude] A WFM date is a day, not an instant: 00:00 UTC of that day in epoch ms
// [Claude] (see DateRange in wfm/filter.proto). QCalendar works with 'YYYY-MM-DD' strings.
// [Claude] Day math is done by date-fns on local dates parsed from those strings, so the
// [Claude] browser zone and daylight saving never shift a day; only the conversion to and
// [Claude] from the contract's UTC midnight goes through UTC.

const DAY_FORMAT = 'yyyy-MM-dd';

// [Claude] 'YYYY-MM-DD' <-> a local Date at midnight of that day.
const toDate = (day: DayKey) => parseISO(day);
const toDay = (date: Date): DayKey => format(date, DAY_FORMAT);

export const dayToUtcMs = (day: DayKey): number =>
	fromZonedTime(day, 'UTC').getTime();

export const utcMsToDay = (ms: number): DayKey =>
	formatInTimeZone(ms, 'UTC', DAY_FORMAT);

// [Claude] Today as the user sees it on the wall clock.
export const todayKey = (now = new Date()): DayKey => toDay(now);

export const addDays = (day: DayKey, days: number): DayKey =>
	toDay(dfAddDays(toDate(day), days));

// [Claude] The first day of the month `months` away: what a month step lands on.
export const addMonths = (day: DayKey, months: number): DayKey =>
	toDay(dfStartOfMonth(dfAddMonths(toDate(day), months)));

// [Claude] 0 = Sunday … 6 = Saturday, as in the Add shifts template.
export const weekday = (day: DayKey): number => getDay(toDate(day));

export const startOfWeek = (day: DayKey): DayKey =>
	toDay(
		dfStartOfWeek(toDate(day), {
			weekStartsOn: Weekday.Monday,
		}),
	);

export const startOfMonth = (day: DayKey): DayKey =>
	toDay(dfStartOfMonth(toDate(day)));

export const endOfMonth = (day: DayKey): DayKey =>
	toDay(dfEndOfMonth(toDate(day)));

export const daysBetween = (from: DayKey, to: DayKey): DayKey[] =>
	from > to
		? []
		: eachDayOfInterval({
				start: toDate(from),
				end: toDate(to),
			}).map(toDay);

export const isWeekend = (day: DayKey) => dfIsWeekend(toDate(day));

// [Claude] Day of the month without a leading zero, "1" … "31", as in the table head.
export const dayOfMonth = (day: DayKey) => format(toDate(day), 'd');

// [Claude] "October 2026": the month row of the table head, localized by Intl.
export const formatMonthYear = (day: DayKey, locale: string) =>
	toDate(day).toLocaleDateString(locale, {
		month: 'long',
		year: 'numeric',
	});

// [Claude] "6 Tue": the day row of the Week and Day heads.
export const formatDayWithWeekday = (day: DayKey, locale: string) =>
	`${dayOfMonth(day)} ${weekdayShortName(day, locale)}`;

// [Claude] An hour of the head in the UI language's clock: "7:00 AM" / "07:00".
export const formatHour = (minutes: number, locale: string) =>
	new Date(2000, 0, 1, Math.floor(minutes / 60)).toLocaleTimeString(locale, {
		hour: 'numeric',
		minute: '2-digit',
	});

// [Claude] An hour without minutes for the narrow Week halves: "7 AM" / "07".
export const formatHourShort = (minutes: number, locale: string) =>
	new Date(2000, 0, 1, Math.floor(minutes / 60)).toLocaleTimeString(locale, {
		hour: 'numeric',
	});

// [Claude] Short weekday name in the UI language, "Mon" / "пн", localized by Intl.
export const weekdayShortName = (day: DayKey, locale: string) =>
	toDate(day).toLocaleDateString(locale, {
		weekday: 'short',
	});

// [Claude] "01 November 2026": the mockups' order for every UI language (Intl alone would
// [Claude] give "November 01, 2026" in English); the month name is localized by Intl.
export const formatDayLong = (day: DayKey, locale: string) => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat(locale, {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
		})
			.formatToParts(toDate(day))
			.map((p) => [
				p.type,
				p.value,
			]),
	);
	return `${parts.day} ${parts.month} ${parts.year}`;
};

export interface DayRange {
	from: DayKey;
	to: DayKey;
}

// [Claude] The visible period of a view: what the calendar renders and what we request.
export const rangeForView = (view: CalendarView, day: DayKey): DayRange => {
	if (view === CalendarView.Day)
		return {
			from: day,
			to: day,
		};
	if (view === CalendarView.Week) {
		const from = startOfWeek(day);
		return {
			from,
			to: addDays(from, 6),
		};
	}
	return {
		from: startOfMonth(day),
		to: endOfMonth(day),
	};
};

// [Claude] DateRange for the API: both ends included, UTC midnight ms.
export const toDateRange = ({ from, to }: DayRange) => ({
	from: dayToUtcMs(from),
	to: dayToUtcMs(to),
});

// [Claude] -1 back, 1 forward: what a step adds to a date.
const stepSign = (direction: StepDirection) =>
	direction === StepDirection.Next ? 1 : -1;

export const stepView = (
	view: CalendarView,
	day: DayKey,
	direction: StepDirection,
): DayKey => {
	const sign = stepSign(direction);
	if (view === CalendarView.Day) return addDays(day, sign);
	if (view === CalendarView.Week) return addDays(day, 7 * sign);
	return addMonths(day, sign);
};

// [Claude] An own period moved by its own length: 10–21 Nov → 22 Nov – 3 Dec.
export const shiftRange = (
	{ from, to }: DayRange,
	direction: StepDirection,
): DayRange => {
	const shift = daysBetween(from, to).length * stepSign(direction);
	return {
		from: addDays(from, shift),
		to: addDays(to, shift),
	};
};

export const clampDay = (day: DayKey, bounds?: DayRange): DayKey => {
	if (!bounds) return day;
	if (day < bounds.from) return bounds.from;
	if (day > bounds.to) return bounds.to;
	return day;
};

// [Claude] Wall-clock day and minutes from midnight of an instant in a time zone.
export const zonedParts = (ms: number, timeZone: string) => {
	const [day, hours, minutes] = formatInTimeZone(
		ms,
		timeZone,
		`${DAY_FORMAT} H m`,
	).split(' ');
	return {
		day: day as DayKey,
		minutes: Number(hours) * 60 + Number(minutes),
	};
};

const pad = (n: number) => String(n).padStart(2, '0');

// [Claude] Minutes from midnight as HH:mm; 1440 and more wrap to the next day's time.
export const formatMinutes = (minutes: number) =>
	`${pad(Math.floor((minutes % 1440) / 60))}:${pad(minutes % 60)}`;

export const formatTimeInZone = (ms: number, timeZone: string) =>
	formatInTimeZone(ms, timeZone, 'HH:mm');

// [Claude] The instant of a wall-clock time on a day in a zone (a shift start, a pause).
export const zonedTimeToUtcMs = (
	day: DayKey,
	minutes: number,
	timeZone: string,
): number => {
	const wholeDays = Math.floor(minutes / 1440);
	const rest = minutes - wholeDays * 1440;
	return fromZonedTime(
		`${addDays(day, wholeDays)}T${formatMinutes(rest)}:00`,
		timeZone,
	).getTime();
};
