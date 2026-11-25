// [Claude] Agent rows and the forecast → DayPilot resources and events. DayPilot dates have no
// [Claude] zone, so timed events are wall-clock strings in the calendar's zone (msToWall).
import type { DayPilot } from '@daypilot/daypilot-lite-javascript';

import type { AgentDay, AgentRow } from '../../../api/wfm/types';
import {
	addDays,
	type DayKey,
	daysBetween,
	MINUTES_IN_DAY,
	msToWall,
	wallOf,
} from '../../../utils/day';
import type { CalendarEventTags, DayBounds, Timeline } from '../types';
import type { Period } from './period';

export const FORECAST_ROW_ID = 'forecast';

export const FULL_DAY: Timeline = {
	from: 0,
	to: MINUTES_IN_DAY,
};

// [Claude] The Day view range; an end at or before the start crosses midnight.
export const dayTimeline = (timeline?: Timeline | null): Timeline => {
	if (!timeline) return FULL_DAY;
	return {
		from: timeline.from,
		to:
			timeline.to <= timeline.from ? timeline.to + MINUTES_IN_DAY : timeline.to,
	};
};

// [Claude] A day with something on it gets an event; an empty one is a plain cell with "+".
export const hasContent = (day?: AgentDay): day is AgentDay =>
	!!day && (!!day.absence || !!day.shifts.length || day.isLocked);

export const isOutside = (day: DayKey, bounds?: DayBounds | null) =>
	!!bounds && (day < bounds.from || day > bounds.to);

const event = (
	id: string,
	start: string,
	end: string,
	resource: string,
	tags: CalendarEventTags,
): DayPilot.EventData & {
	moveDisabled: boolean;
	resizeDisabled: boolean;
} => ({
	id,
	start,
	end,
	resource,
	text: '',
	cssClass: `wfm-event wfm-event--${tags.kind}`,
	// [Claude] Only a shift of the Day view is dragged; DayPilot leaves the rest alone.
	moveDisabled: tags.kind !== 'shift',
	resizeDisabled: tags.kind !== 'shift',
	tags,
});

// [Claude] Week / Month: one all-day event per agent-day that has an absence, shifts or a lock.
export const periodEvents = (
	rows: AgentRow[],
	period: Period,
	bounds?: DayBounds | null,
): DayPilot.EventData[] => {
	const days = daysBetween(period.from, period.to).filter(
		(date) => !isOutside(date, bounds),
	);
	return rows.flatMap((row) =>
		days
			.filter((date) => hasContent(row.days[date]))
			.map((date) =>
				event(
					`${row.agent.id}:${date}`,
					`${date}T00:00:00`,
					`${addDays(date, 1)}T00:00:00`,
					row.agent.id,
					{
						kind: 'day',
						agentId: row.agent.id,
						date,
						day: row.days[date],
					},
				),
			),
	);
};

// [Claude] Day: each shift is an event placed by its time (pauses are drawn inside it);
// [Claude] an absence or a lock covers the whole timeline.
export const dayEvents = (
	rows: AgentRow[],
	date: DayKey,
	timeline: Timeline,
	timeZone: string,
	bounds?: DayBounds | null,
): DayPilot.EventData[] => {
	if (isOutside(date, bounds)) return [];
	return rows.flatMap((row) => {
		const day = row.days[date];
		if (!hasContent(day)) return [];
		if (day.shifts.length && !day.absence) {
			return day.shifts.map((shift) =>
				event(
					`${row.agent.id}:${shift.id}`,
					msToWall(shift.startAt, timeZone),
					msToWall(shift.endAt, timeZone),
					row.agent.id,
					{
						kind: 'shift',
						agentId: row.agent.id,
						date,
						day,
						shift,
					},
				),
			);
		}
		return [
			event(
				`${row.agent.id}:${date}`,
				wallOf(date, timeline.from),
				wallOf(date, timeline.to),
				row.agent.id,
				{
					kind: 'day-line',
					agentId: row.agent.id,
					date,
					day,
				},
			),
		];
	});
};

// [Claude] The Forecast row: per day in Week / Month, per hour in Day.
export const forecastEvents = (
	period: Period,
	isDayView: boolean,
	timeline: Timeline,
): DayPilot.EventData[] => {
	if (!isDayView) {
		return daysBetween(period.from, period.to).map((date) =>
			event(
				`${FORECAST_ROW_ID}:${date}`,
				`${date}T00:00:00`,
				`${addDays(date, 1)}T00:00:00`,
				FORECAST_ROW_ID,
				{
					kind: 'forecast-day',
					date,
				},
			),
		);
	}
	const hours: DayPilot.EventData[] = [];
	for (let minute = timeline.from; minute < timeline.to; minute += 60) {
		hours.push(
			event(
				`${FORECAST_ROW_ID}:${minute}`,
				wallOf(period.from, minute),
				wallOf(period.from, minute + 60),
				FORECAST_ROW_ID,
				{
					kind: 'forecast-hour',
					date: period.from,
					hourStart: minute,
				},
			),
		);
	}
	return hours;
};
