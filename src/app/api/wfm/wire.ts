// [Claude] Wire ↔ model converters of the WFM API (see ./types).
import { type DayKey, dayToMs, msToDay } from '../../utils/day';
import {
	type Absence,
	AbsenceType,
	type AgentAbsences,
	type AgentDay,
	type AgentRow,
	type DeletedShift,
	type ForecastHour,
	type Holiday,
	type Lookup,
	type MinutesRange,
	type PlannedDay,
	type PlannedSlot,
	type ScheduleCalendar,
	ScheduleState,
	type Shift,
	type ShiftPause,
	type ShiftSkill,
	type Violation,
	type WireAbsence,
	type WireAgentAbsences,
	type WireAgentWorkingSchedule,
	type WireDeletedShift,
	type WireHoliday,
	type WireInt64,
	type WireLookup,
	type WireScheduleCalendar,
	type WireShift,
	type WireShiftPause,
	type WireShiftSkill,
	type WireViolation,
	type WireWorkingSchedule,
	type WorkingSchedule,
} from './types';

const ABSENCE_TYPES = Object.values(AbsenceType) as string[];
const SCHEDULE_STATES = Object.values(ScheduleState) as string[];

const num = (value?: WireInt64): number => Number(value ?? 0);
const str = (value?: WireInt64): string =>
	value === undefined || value === null ? '' : String(value);
const optionalNum = (value?: WireInt64): number | undefined =>
	value === undefined || value === null || value === ''
		? undefined
		: num(value);

export const toWireDay = (day: DayKey): string => String(dayToMs(day));
export const fromWireDay = (value?: WireInt64): DayKey => msToDay(num(value));

export const fromWireLookup = (lookup?: WireLookup): Lookup => ({
	id: str(lookup?.id),
	name: lookup?.name || '',
});

export const toWireLookup = (lookup: Lookup): WireLookup => ({
	id: lookup.id,
	name: lookup.name,
});

export const optionalLookup = (lookup?: WireLookup): Lookup | undefined =>
	lookup?.id ? fromWireLookup(lookup) : undefined;

const absenceType = (value?: string): AbsenceType | undefined =>
	value && ABSENCE_TYPES.includes(value) ? (value as AbsenceType) : undefined;

export const fromWireAbsence = (absence: WireAbsence): Absence => ({
	id: str(absence.id),
	type: absenceType(absence.type_id) || AbsenceType.DayOff,
	date: fromWireDay(absence.absent_at),
});

export const fromWireAgentAbsences = (
	item: WireAgentAbsences,
): AgentAbsences => ({
	agent: fromWireLookup(item.agent),
	absences: (item.absences || []).map(fromWireAbsence),
});

export const fromWireDeletedShift = (
	shift: WireDeletedShift,
): DeletedShift => ({
	id: str(shift.id),
	agent: optionalLookup(shift.agent),
	schedule: optionalLookup(shift.schedule),
	date: shift.date ? fromWireDay(shift.date) : undefined,
	startAt: optionalNum(shift.start_at),
	endAt: optionalNum(shift.end_at),
});

const fromWirePause = (pause: WireShiftPause): ShiftPause => ({
	id: str(pause.id) || undefined,
	startAt: num(pause.start_at),
	endAt: num(pause.end_at),
	cause: optionalLookup(pause.cause),
});

const fromWireSkill = (skill: WireShiftSkill): ShiftSkill => ({
	skill: fromWireLookup(skill.skill),
	enabled: !!skill.enabled,
});

export const fromWireShift = (shift: WireShift): Shift => ({
	id: str(shift.id),
	etag: shift.etag || '',
	startAt: num(shift.start_at),
	endAt: num(shift.end_at),
	workingDate: fromWireDay(shift.working_date),
	pauses: (shift.pauses || []).map(fromWirePause),
	skills: (shift.skills || []).map(fromWireSkill),
});

export const toWireShift = (shift: Shift): WireShift => ({
	id: shift.id,
	etag: shift.etag,
	start_at: String(shift.startAt),
	end_at: String(shift.endAt),
	pauses: shift.pauses.map((pause) => ({
		start_at: String(pause.startAt),
		end_at: String(pause.endAt),
		...(pause.cause && {
			cause: toWireLookup(pause.cause),
		}),
	})),
	skills: shift.skills.map((skill) => ({
		skill: toWireLookup(skill.skill),
		enabled: skill.enabled,
	})),
});

export const fromWireAgentWorkingSchedule = (
	item: WireAgentWorkingSchedule,
): AgentRow => {
	const days: Record<DayKey, AgentDay> = {};
	for (const day of item.schedule || []) {
		const date = fromWireDay(day.date);
		days[date] = {
			date,
			isLocked: !!day.locked,
			absence: absenceType(day.absence),
			absenceId: str(day.absence_id) || undefined,
			shifts: (day.shifts || []).map(fromWireShift),
		};
	}
	return {
		agent: fromWireLookup(item.agent),
		days,
	};
};

export const fromWireHoliday = (holiday: WireHoliday): Holiday => ({
	date: fromWireDay(holiday.date),
	name: holiday.name || '',
});

export const fromWireCalendar = (
	calendar?: WireScheduleCalendar,
): ScheduleCalendar => {
	const week: Record<number, MinutesRange[]> = {};
	for (const [day, value] of Object.entries(calendar?.week || {})) {
		week[Number(day)] = (value.ranges || []).map((range) => ({
			start: range.start || 0,
			end: range.end || 0,
		}));
	}
	return {
		timeZone:
			calendar?.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone,
		week,
	};
};

export const fromWireSchedule = (
	item: WireWorkingSchedule,
): WorkingSchedule => {
	// [Claude] Both absent = 24 hours.
	const hasTimeline =
		item.start_time_at !== undefined || item.end_time_at !== undefined;
	return {
		id: str(item.id),
		name: item.name || '',
		state:
			item.state && SCHEDULE_STATES.includes(item.state)
				? (item.state as ScheduleState)
				: ScheduleState.Draft,
		team: optionalLookup(item.team) || null,
		calendar: optionalLookup(item.calendar) || null,
		startDate: item.start_date_at ? fromWireDay(item.start_date_at) : null,
		endDate: item.end_date_at ? fromWireDay(item.end_date_at) : null,
		timelineFrom: hasTimeline ? num(item.start_time_at) : null,
		timelineTo: hasTimeline ? num(item.end_time_at) : null,
		extraSkills: (item.extra_skills || []).map(fromWireLookup),
		isBlockOutsideActivity: !!item.block_outside_activity,
		totalAgents: num(item.total_agents),
		agents: (item.agents || []).map(fromWireLookup),
		etag: item.etag || '',
	};
};

export const toWireSchedule = (
	item: Partial<WorkingSchedule>,
): WireWorkingSchedule => ({
	...(item.id && {
		id: item.id,
	}),
	...(item.etag && {
		etag: item.etag,
	}),
	name: item.name,
	team: item.team ? toWireLookup(item.team) : undefined,
	calendar: item.calendar ? toWireLookup(item.calendar) : undefined,
	start_date_at: item.startDate ? toWireDay(item.startDate) : undefined,
	end_date_at: item.endDate ? toWireDay(item.endDate) : undefined,
	...(item.timelineFrom !== null &&
		item.timelineFrom !== undefined && {
			start_time_at: String(item.timelineFrom),
		}),
	...(item.timelineTo !== null &&
		item.timelineTo !== undefined && {
			end_time_at: String(item.timelineTo),
		}),
	extra_skills: (item.extraSkills || []).map(toWireLookup),
	block_outside_activity: item.isBlockOutsideActivity,
});

export const fromWireViolation = (violation: WireViolation): Violation => ({
	agent: optionalLookup(violation.agent),
	date: violation.date ? fromWireDay(violation.date) : undefined,
	reason: violation.reason || '',
	schedule: optionalLookup(violation.schedule),
	shiftId: str(violation.shift_id) || undefined,
	startAt: optionalNum(violation.start_at),
	endAt: optionalNum(violation.end_at),
});

export const fromWireForecastHour = (hour: {
	date?: WireInt64;
	start_at?: WireInt64;
	agents?: number;
}): ForecastHour => ({
	date: fromWireDay(hour.date),
	startAt: num(hour.start_at),
	agents: hour.agents || 0,
});

export const fromWirePlannedSlot = (slot: {
	start_at?: WireInt64;
	agents?: number;
}): PlannedSlot => ({
	startAt: num(slot.start_at),
	agents: slot.agents || 0,
});

export const fromWirePlannedDay = (day: {
	date?: WireInt64;
	agents?: number;
}): PlannedDay => ({
	date: fromWireDay(day.date),
	agents: day.agents || 0,
});
