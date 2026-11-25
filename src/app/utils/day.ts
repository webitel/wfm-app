// [Claude] Day keys ('YYYY-MM-DD') and wall-clock helpers shared by the WFM API layer and the
// [Claude] schedule calendar. A day key is a calendar date with no zone; the wire sends it as
// [Claude] 00:00 UTC of that day in epoch ms (DateRange in webitel/protos wfm/filter.proto).
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export type DayKey = string;

export const MS_IN_DAY = 86_400_000;
export const MS_IN_MINUTE = 60_000;
export const MINUTES_IN_DAY = 1440;

export const dayToMs = (day: DayKey): number => {
	const [year, month, date] = day.split('-').map(Number);
	return Date.UTC(year, month - 1, date);
};

export const msToDay = (ms: number | string): DayKey =>
	new Date(Number(ms)).toISOString().slice(0, 10);

export const addDays = (day: DayKey, count: number): DayKey =>
	msToDay(dayToMs(day) + count * MS_IN_DAY);

// [Claude] Whole days from `from` to `to`; negative when `to` is earlier.
export const diffDays = (to: DayKey, from: DayKey): number =>
	Math.round((dayToMs(to) - dayToMs(from)) / MS_IN_DAY);

// [Claude] 0 = Sunday … 6 = Saturday, as the weekly template keys on the wire.
export const dayOfWeek = (day: DayKey): number =>
	new Date(dayToMs(day)).getUTCDay();

export const isWeekend = (day: DayKey): boolean => {
	const weekday = dayOfWeek(day);
	return weekday === 0 || weekday === 6;
};

// [Claude] Weeks start on Monday (Figma and the spec show Mon–Sun).
export const startOfWeek = (day: DayKey): DayKey =>
	addDays(day, -((dayOfWeek(day) + 6) % 7));

export const startOfMonth = (day: DayKey): DayKey => `${day.slice(0, 7)}-01`;

export const daysInMonth = (day: DayKey): number => {
	const [year, month] = day.split('-').map(Number);
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

export const addMonths = (day: DayKey, count: number): DayKey => {
	const [year, month] = day.split('-').map(Number);
	return msToDay(Date.UTC(year, month - 1 + count, 1));
};

export const daysBetween = (from: DayKey, to: DayKey): DayKey[] => {
	const days: DayKey[] = [];
	for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
	return days;
};

export const clampDay = (
	day: DayKey,
	bounds?: {
		from: DayKey;
		to: DayKey;
	} | null,
): DayKey => {
	if (!bounds) return day;
	if (day < bounds.from) return bounds.from;
	if (day > bounds.to) return bounds.to;
	return day;
};

export const todayIn = (timeZone: string): DayKey =>
	formatInTimeZone(Date.now(), timeZone, 'yyyy-MM-dd');

export const minutesToTime = (minutes: number): string => {
	const rest = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
	return `${String(Math.floor(rest / 60)).padStart(2, '0')}:${String(rest % 60).padStart(2, '0')}`;
};

// [Claude] Floating wall-clock 'YYYY-MM-DDTHH:mm:00' of minutes from midnight of the day;
// [Claude] minutes may pass 1440 (the next day).
export const wallOf = (day: DayKey, minutes: number): string => {
	const nextDays = Math.floor(minutes / MINUTES_IN_DAY);
	return `${addDays(day, nextDays)}T${minutesToTime(minutes)}:00`;
};

// [Claude] The instant a floating 'YYYY-MM-DDTHH:mm:ss' has in the zone.
export const wallStringToMs = (wall: string, timeZone: string): number =>
	fromZonedTime(wall, timeZone).getTime();

// [Claude] The instant a wall-clock time of a day has in the zone.
export const wallToMs = (
	day: DayKey,
	minutes: number,
	timeZone: string,
): number => wallStringToMs(wallOf(day, minutes), timeZone);

// [Claude] Floating local date-time for the calendar, which works in wall-clock time.
export const msToWall = (ms: number, timeZone: string): string =>
	formatInTimeZone(ms, timeZone, "yyyy-MM-dd'T'HH:mm:ss");

export const formatTime = (ms: number, timeZone: string): string =>
	formatInTimeZone(ms, timeZone, 'HH:mm');

// [Claude] Minutes from midnight of `day` in the zone; past 1440 for the next day.
export const msToMinutes = (
	ms: number,
	day: DayKey,
	timeZone: string,
): number => Math.round((ms - wallToMs(day, 0, timeZone)) / MS_IN_MINUTE);
