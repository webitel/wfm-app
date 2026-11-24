// [Claude] JSON on the wire of the WFM manual planning contract, webitel/protos#532 (WFM-134),
// [Claude] as grpc-gateway sends it: snake_case fields, int64 as strings, enums by name,
// [Claude] map keys as strings, zero values omitted. Matches the orval models in
// [Claude] @webitel/api-services/gen-wire once they are regenerated from that contract.

import type {
	WfmAbsenceType,
	WfmWorkingScheduleState,
} from '@webitel/api-services/gen/models';

export type Int64 = string;

export interface WireLookup {
	id?: Int64;
	name?: string;
}

// [Claude] filter.proto: both ends included, 00:00 UTC of the day in epoch ms.
export interface WireDateRange {
	from?: Int64;
	to?: Int64;
}

// [Claude] Enums of the contract that @webitel/api-services already generates: reuse them.
export type WireAbsenceType = WfmAbsenceType;

export type WireShiftSource =
	| 'SHIFT_SOURCE_UNSPECIFIED'
	| 'SHIFT_SOURCE_MANUAL'
	| 'SHIFT_SOURCE_PLANNER';

export type WireWorkingScheduleState = WfmWorkingScheduleState;

/* [Claude] ---------------------------------------------- violation.proto */

export interface WireViolation {
	agent?: WireLookup;
	date?: Int64;
	reason?: string;
	schedule?: WireLookup;
	start_at?: Int64;
	end_at?: Int64;
}

// [Claude] Error body of WFM: told apart by id, not by HTTP status.
export interface WireError {
	id?: string;
	code?: number;
	status?: string;
	detail?: string;
	violations?: WireViolation[];
}

/* [Claude] ------------------------------------------ agent_absence.proto */

export interface WireAbsence {
	id?: Int64;
	type_id?: WireAbsenceType;
	absent_at?: Int64;
}

export interface WireAgentAbsences {
	agent?: WireLookup;
	absences?: WireAbsence[];
}

// [Claude] GET /wfm/agents/absences, query: date.from, date.to, team_id, supervisor_id,
// [Claude] skill_id, q, page, size, sort.
export interface WireSearchAgentsAbsencesResponse {
	items?: WireAgentAbsences[];
	next?: boolean;
	total?: Int64;
}

// [Claude] POST /wfm/agents/absences
export interface WireCreateAgentsAbsencesRequest {
	items: {
		type_id: WireAbsenceType;
		date_from: Int64;
		date_to: Int64;
	}[];
	agent_ids: Int64[];
	delete_shifts?: boolean;
}

export interface WireCreateAgentsAbsencesResponse {
	items?: WireAgentAbsences[];
	deleted_shifts?: WireViolation[];
}

// [Claude] DELETE /wfm/agents/{agent_id}/absences/{id}
export interface WireDeleteAgentAbsenceResponse {
	id?: Int64;
}

/* [Claude] --------------------------------- agent_working_schedule.proto */

export interface WireAgentScheduleShiftPause {
	id?: Int64;
	start_at?: Int64;
	end_at?: Int64;
	cause?: WireLookup;
}

export interface WireAgentScheduleShiftSkill {
	skill?: WireLookup;
	enabled?: boolean;
}

export interface WireAgentScheduleShift {
	id?: Int64;
	start_at?: Int64;
	end_at?: Int64;
	pauses?: WireAgentScheduleShiftPause[];
	skills?: WireAgentScheduleShiftSkill[];
	working_date?: Int64;
	etag?: string;
	source?: WireShiftSource;
	planner_run_id?: Int64;
}

export interface WireAgentSchedule {
	date?: Int64;
	locked?: boolean;
	absence?: WireAbsenceType;
	absence_id?: Int64;
	shifts?: WireAgentScheduleShift[];
}

export interface WireAgentWorkingSchedule {
	agent?: WireLookup;
	schedule?: WireAgentSchedule[];
}

export interface WireHoliday {
	date?: Int64;
	name?: string;
}

export interface WireScheduleCalendar {
	time_zone?: string;
	// [Claude] Key: day of week, "0" = Sunday … "6" = Saturday; no ranges = day off.
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

// [Claude] GET /wfm/agents/working_schedules/{working_schedule_id}, query: date.from, date.to,
// [Claude] supervisor_id, team_id, skill_id, q, page, size.
export interface WireSearchAgentsWorkingScheduleResponse {
	holidays?: WireHoliday[];
	items?: WireAgentWorkingSchedule[];
	total?: Int64;
	next?: boolean;
	calendar?: WireScheduleCalendar;
}

// [Claude] POST /wfm/agents/working_schedules/{working_schedule_id}
export interface WireCreateAgentsWorkingScheduleShiftsRequest {
	date: WireDateRange;
	agents: WireLookup[];
	// [Claude] Key: day of week as in ScheduleCalendar.week.
	days: Record<
		string,
		{
			ranges: {
				start: number;
				end: number;
			}[];
		}
	>;
	pauses?: {
		start: number;
		duration: number;
		cause?: WireLookup;
	}[];
	skills?: WireAgentScheduleShiftSkill[];
}

export interface WireCreateAgentsWorkingScheduleShiftsResponse {
	items?: WireAgentWorkingSchedule[];
	skipped?: WireViolation[];
}

// [Claude] PUT /wfm/agents/working_schedules/{working_schedule_id}/shifts/{shift.id}
export interface WireUpdateAgentWorkingScheduleShiftRequest {
	shift: WireAgentScheduleShift;
}

export interface WireUpdateAgentWorkingScheduleShiftResponse {
	shift?: WireAgentScheduleShift;
}

// [Claude] DELETE /wfm/agents/working_schedules/{working_schedule_id}/shifts/{id}?etag=
export interface WireDeleteAgentWorkingScheduleShiftResponse {
	id?: Int64;
}

/* [Claude] --------------------------------------- working_schedule.proto */

export interface WireWorkingSchedule {
	id?: Int64;
	name?: string;
	state?: WireWorkingScheduleState;
	team?: WireLookup;
	calendar?: WireLookup;
	start_date_at?: Int64;
	end_date_at?: Int64;
	// [Claude] Timeline of the table, minutes from midnight; both unset = 24 hours.
	start_time_at?: Int64;
	end_time_at?: Int64;
	extra_skills?: WireLookup[];
	block_outside_activity?: boolean;
	total_agents?: Int64;
	etag?: string;
}

// [Claude] GET /wfm/lookups/working_schedules/{id}
export interface WireReadWorkingScheduleResponse {
	item?: WireWorkingSchedule;
}

// [Claude] GET /wfm/lookups/working_schedules
export interface WireSearchWorkingScheduleResponse {
	items?: WireWorkingSchedule[];
	next?: boolean;
}

// [Claude] GET /wfm/lookups/working_schedules/{id}/forecast?date.from=&date.to=
export interface WireReadWorkingScheduleForecastResponse {
	items?: {
		date?: Int64;
		start_at?: Int64;
		agents?: number;
	}[];
}

// [Claude] GET /wfm/lookups/working_schedules/{id}/planned?date.from=&date.to=
export interface WireReadWorkingSchedulePlannedResponse {
	slots?: {
		start_at?: Int64;
		agents?: number;
	}[];
	days?: {
		date?: Int64;
		agents?: number;
	}[];
}

/* [Claude] ------------------------------- Prototype-only (not in protos#532) */
// [Claude] Calls of the schedule page's action bar (Figma "Action bar/WFM") that the contract
// [Claude] does not have yet. Shapes follow its style; replace them once the backend adds them.

// [Claude] POST /wfm/lookups/working_schedules/{id}/agents
export interface WireAddWorkingScheduleAgentsRequest {
	agent_ids: Int64[];
}

// [Claude] Response of the agents, state and plan calls: the schedule after the change.
export interface WireWorkingScheduleResponse {
	item?: WireWorkingSchedule;
}

// [Claude] POST /wfm/lookups/working_schedules, PUT /wfm/lookups/working_schedules/{id}
export interface WireWorkingScheduleRequest {
	item?: WireWorkingSchedule;
}

// [Claude] PUT /wfm/lookups/working_schedules/{id}/state
export interface WireUpdateWorkingScheduleStateRequest {
	state: WireWorkingScheduleState;
	etag: string;
}

// [Claude] DELETE /wfm/agents/working_schedules/{id}/shifts?agent_id=&date.from=&date.to=
export interface WireDeleteAgentsWorkingScheduleShiftsResponse {
	deleted?: Int64;
}

export interface WireWorkingScheduleLog {
	id?: Int64;
	created_at?: Int64;
	created_by?: WireLookup;
	operation?: string;
	agent?: WireLookup;
}

// [Claude] GET /wfm/lookups/working_schedules/{id}/history
export interface WireSearchWorkingScheduleHistoryResponse {
	items?: WireWorkingScheduleLog[];
	next?: boolean;
}
