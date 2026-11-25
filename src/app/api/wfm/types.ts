// [Claude] WFM manual planning, webitel/protos PR 532 (wfm/agent_absence.proto,
// [Claude] wfm/agent_working_schedule.proto, wfm/working_schedule.proto, wfm/violation.proto).
// [Claude] Wire* types are the JSON on the wire: snake_case, int64 as strings, enums by name,
// [Claude] dates as 00:00 UTC of the day in epoch ms. The rest is the app model: camelCase,
// [Claude] day keys, numbers.
import type { DayKey } from '../../utils/day';

export enum AbsenceType {
	DayOff = 'ABSENCE_TYPE_DAYOFF',
	Vacation = 'ABSENCE_TYPE_VACATION',
	SickDay = 'ABSENCE_TYPE_SICKDAY',
}

export enum ScheduleState {
	Draft = 'WORKING_SCHEDULE_STATE_DRAFT',
	Pending = 'WORKING_SCHEDULE_STATE_PENDING',
	Active = 'WORKING_SCHEDULE_STATE_ACTIVE',
	Archived = 'WORKING_SCHEDULE_STATE_ARCHIVED',
}

/* [Claude] ------------------------------------------------------------------ Wire */

export type WireInt64 = string | number;

export interface WireLookup {
	id?: WireInt64;
	name?: string;
}

export interface WireAbsence {
	id?: WireInt64;
	type_id?: AbsenceType;
	absent_at?: WireInt64;
}

export interface WireAgentAbsences {
	agent?: WireLookup;
	absences?: WireAbsence[];
}

export interface WireDeletedShift {
	id?: WireInt64;
	agent?: WireLookup;
	schedule?: WireLookup;
	date?: WireInt64;
	start_at?: WireInt64;
	end_at?: WireInt64;
}

export interface WireShiftPause {
	id?: WireInt64;
	start_at?: WireInt64;
	end_at?: WireInt64;
	cause?: WireLookup;
}

export interface WireShiftSkill {
	skill?: WireLookup;
	enabled?: boolean;
}

export interface WireShift {
	id?: WireInt64;
	start_at?: WireInt64;
	end_at?: WireInt64;
	pauses?: WireShiftPause[];
	skills?: WireShiftSkill[];
	working_date?: WireInt64;
	etag?: string;
}

export interface WireAgentSchedule {
	date?: WireInt64;
	locked?: boolean;
	absence?: AbsenceType | 'ABSENCE_TYPE_UNSPECIFIED';
	absence_id?: WireInt64;
	shifts?: WireShift[];
}

export interface WireAgentWorkingSchedule {
	agent?: WireLookup;
	schedule?: WireAgentSchedule[];
}

export interface WireHoliday {
	date?: WireInt64;
	name?: string;
}

export interface WireScheduleCalendar {
	time_zone?: string;
	week?: Record<
		string,
		{
			ranges?: {
				start?: number;
				end?: number;
			}[];
		}
	>;
}

export interface WireWorkingSchedule {
	id?: WireInt64;
	name?: string;
	state?: ScheduleState | 'WORKING_SCHEDULE_STATE_UNSPECIFIED';
	team?: WireLookup;
	calendar?: WireLookup;
	start_date_at?: WireInt64;
	end_date_at?: WireInt64;
	start_time_at?: WireInt64;
	end_time_at?: WireInt64;
	extra_skills?: WireLookup[];
	block_outside_activity?: boolean;
	agents?: WireLookup[];
	total_agents?: WireInt64;
	etag?: string;
}

export interface WireViolation {
	agent?: WireLookup;
	date?: WireInt64;
	reason?: string;
	schedule?: WireLookup;
	shift_id?: WireInt64;
	start_at?: WireInt64;
	end_at?: WireInt64;
}

export interface WireError {
	id?: string;
	code?: number;
	status?: string;
	detail?: string;
}

/* [Claude] ----------------------------------------------------------------- Model */

export interface Lookup {
	id: string;
	name: string;
}

export interface Absence {
	id: string;
	type: AbsenceType;
	date: DayKey;
}

export interface AgentAbsences {
	agent: Lookup;
	absences: Absence[];
}

export interface DeletedShift {
	id: string;
	agent?: Lookup;
	schedule?: Lookup;
	date?: DayKey;
	startAt?: number;
	endAt?: number;
}

export interface ShiftPause {
	id?: string;
	startAt: number; // [Claude] epoch ms
	endAt: number;
	cause?: Lookup;
}

export interface ShiftSkill {
	skill: Lookup;
	enabled: boolean;
}

export interface Shift {
	id: string;
	etag: string;
	startAt: number; // [Claude] epoch ms; the shift ends right before endAt
	endAt: number;
	workingDate: DayKey;
	pauses: ShiftPause[];
	skills: ShiftSkill[];
}

// [Claude] One day of an agent: an absence or shifts, not both (AgentSchedule).
export interface AgentDay {
	date: DayKey;
	// [Claude] The agent works in another active schedule on this date.
	isLocked: boolean;
	absence?: AbsenceType;
	absenceId?: string;
	shifts: Shift[];
}

// [Claude] A row of the calendar: an agent and the days that have something.
export interface AgentRow {
	agent: Lookup;
	days: Record<DayKey, AgentDay>;
}

export interface Holiday {
	date: DayKey;
	name: string;
}

export interface MinutesRange {
	start: number; // [Claude] minutes from midnight
	end: number;
}

export interface ScheduleCalendar {
	timeZone: string;
	// [Claude] 0 = Sunday … 6 = Saturday; a day without ranges is a day off.
	week: Record<number, MinutesRange[]>;
}

export interface WorkingSchedule {
	id: string;
	name: string;
	state: ScheduleState;
	team: Lookup | null;
	calendar: Lookup | null;
	startDate: DayKey | null;
	endDate: DayKey | null;
	// [Claude] The time scale, minutes from midnight; both null = 24 hours.
	timelineFrom: number | null;
	timelineTo: number | null;
	extraSkills: Lookup[];
	isBlockOutsideActivity: boolean;
	totalAgents: number;
	agents: Lookup[];
	etag: string;
}

export interface ForecastHour {
	date: DayKey;
	startAt: number;
	agents: number;
}

export interface PlannedSlot {
	startAt: number;
	agents: number;
}

export interface PlannedDay {
	date: DayKey;
	agents: number;
}

export interface Violation {
	agent?: Lookup;
	date?: DayKey;
	reason: string;
	schedule?: Lookup;
	shiftId?: string;
	startAt?: number;
	endAt?: number;
}

export interface Page<T> {
	items: T[];
	next: boolean;
	total?: number;
}

// [Claude] Filters of the agents list (Agents and the Schedule page).
export interface AgentsFilters {
	q?: string;
	teamIds?: string[];
	supervisorIds?: string[];
	skillIds?: string[];
}

// [Claude] Weekly template of Add shifts (CreateAgentsWorkingScheduleShiftsRequest).
export interface ShiftTemplate {
	from: DayKey;
	to: DayKey;
	agents: Lookup[];
	// [Claude] 0 = Sunday … 6 = Saturday; a missing day gets no shifts.
	days: Record<number, MinutesRange[]>;
	pauses: {
		start: number; // [Claude] minutes from midnight
		duration: number; // [Claude] minutes
		cause?: Lookup;
	}[];
	skills: ShiftSkill[];
}
