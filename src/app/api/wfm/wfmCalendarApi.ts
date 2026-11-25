import {
	WfmAbsenceType,
	WfmWorkingScheduleState,
} from '@webitel/api-services/gen/models';
import {
	type CalendarCell,
	type CalendarPause,
	type CalendarRow,
	type CalendarShift,
	type CalendarShiftSkill,
	type DayKey,
	type ForecastHour,
	type Holiday,
	type LookupEntity,
	type PlannedDay,
	type PlannedSlot,
	type ScheduleCalendar,
	type Violation,
	WfmApiError,
} from '../../components/schedule-table/types';
import {
	type DayRange,
	dayToUtcMs,
	utcMsToDay,
} from '../../components/schedule-table/utils/date';
import { mockWfmHttpClient } from '../../mocks/schedule-table/mockServer';
import type {
	Int64,
	WireAbsenceType,
	WireAddWorkingScheduleAgentsRequest,
	WireAgentAbsences,
	WireAgentSchedule,
	WireAgentScheduleShift,
	WireAgentWorkingSchedule,
	WireCreateAgentsAbsencesRequest,
	WireCreateAgentsAbsencesResponse,
	WireCreateAgentsWorkingScheduleShiftsRequest,
	WireCreateAgentsWorkingScheduleShiftsResponse,
	WireDeleteAgentAbsenceResponse,
	WireDeleteAgentsWorkingScheduleShiftsResponse,
	WireDeleteAgentWorkingScheduleShiftResponse,
	WireError,
	WireLookup,
	WireReadWorkingScheduleForecastResponse,
	WireReadWorkingSchedulePlannedResponse,
	WireReadWorkingScheduleResponse,
	WireScheduleCalendar,
	WireSearchAgentsAbsencesResponse,
	WireSearchAgentsWorkingScheduleResponse,
	WireSearchWorkingScheduleHistoryResponse,
	WireSearchWorkingScheduleResponse,
	WireUpdateAgentWorkingScheduleShiftRequest,
	WireUpdateAgentWorkingScheduleShiftResponse,
	WireUpdateWorkingScheduleStateRequest,
	WireViolation,
	WireWorkingSchedule,
	WireWorkingScheduleRequest,
	WireWorkingScheduleResponse,
	WireWorkingScheduleState,
} from './wire';

// [Claude] WFM manual planning API of the calendar (webitel/protos#532): builds the requests of
// [Claude] the contract — paths, `date.from` / `date.to` query, snake_case bodies — and maps the
// [Claude] wire JSON to the calendar model. The HTTP client is the only thing to swap for the
// [Claude] real backend: an axios instance (e.g. from @webitel/api-services) fits WfmHttpClient.

/* [Claude] ------------------------------------------------------- Client */

type Params = Record<string, string | number | boolean | string[] | undefined>;

export interface WfmHttpClient {
	get<T>(
		url: string,
		config?: {
			params?: Params;
		},
	): Promise<{
		data: T;
	}>;
	post<T>(
		url: string,
		body?: unknown,
	): Promise<{
		data: T;
	}>;
	put<T>(
		url: string,
		body?: unknown,
	): Promise<{
		data: T;
	}>;
	delete<T>(
		url: string,
		config?: {
			params?: Params;
		},
	): Promise<{
		data: T;
	}>;
}

let http: WfmHttpClient = mockWfmHttpClient;

export const setWfmHttpClient = (client: WfmHttpClient) => {
	http = client;
};

// [Claude] An axios-like error with the WFM error body becomes a WfmApiError.
const toApiError = (error: unknown): unknown => {
	const response = (
		error as {
			response?: {
				status?: number;
				data?: WireError;
			};
		}
	)?.response;
	if (!response?.data?.id) return error;
	return new WfmApiError(
		response.data.id,
		response.status ?? response.data.code ?? 0,
		(response.data.violations || []).map(violationFromWire),
	);
};

const call = async <T>(
	request: () => Promise<{
		data: T;
	}>,
): Promise<T> => {
	try {
		const { data } = await request();
		return data ?? ({} as T);
	} catch (error) {
		throw toApiError(error);
	}
};

/* [Claude] ------------------------------------------------------ Mapping */

const int = (value?: Int64 | number) => Number(value ?? 0);
const int64 = (value: number | string) => String(value);
const dayOf = (value?: Int64) => utcMsToDay(int(value));
const dayToWire = (day: DayKey) => int64(dayToUtcMs(day));

const dateParams = ({ from, to }: DayRange): Params => ({
	'date.from': dayToWire(from),
	'date.to': dayToWire(to),
});

const lookupFromWire = (lookup?: WireLookup): LookupEntity | undefined =>
	lookup?.id
		? {
				id: lookup.id,
				name: lookup.name ?? '',
			}
		: undefined;

const lookupToWire = ({ id, name }: LookupEntity): WireLookup => ({
	id,
	name,
});

// [Claude] Absence types and states are the lib's enums, the same strings as on the wire:
// [Claude] only UNSPECIFIED (proto zero value) means "none".
const absenceFromWire = (type?: WireAbsenceType): WfmAbsenceType | undefined =>
	type && type !== WfmAbsenceType.AbsenceTypeUnspecified ? type : undefined;

const stateFromWire = (state?: WireWorkingScheduleState) =>
	state && state !== WfmWorkingScheduleState.WorkingScheduleStateUnspecified
		? state
		: WfmWorkingScheduleState.WorkingScheduleStateDraft;

const violationFromWire = (v: WireViolation): Violation => ({
	agent: lookupFromWire(v.agent),
	date: v.date ? dayOf(v.date) : undefined,
	reason: v.reason ?? '',
	schedule: lookupFromWire(v.schedule),
	startAt: v.start_at ? int(v.start_at) : undefined,
	endAt: v.end_at ? int(v.end_at) : undefined,
});

const shiftFromWire = (shift: WireAgentScheduleShift): CalendarShift => ({
	id: shift.id ?? '',
	etag: shift.etag ?? '',
	startAt: int(shift.start_at),
	endAt: int(shift.end_at),
	workingDate: shift.working_date ? dayOf(shift.working_date) : undefined,
	pauses: (shift.pauses || []).map(
		(p): CalendarPause => ({
			id: p.id ?? '',
			startAt: int(p.start_at),
			endAt: int(p.end_at),
			cause: lookupFromWire(p.cause),
		}),
	),
	skills: (shift.skills || [])
		.filter((s) => s.skill?.id)
		.map(
			(s): CalendarShiftSkill => ({
				skill: lookupFromWire(s.skill),
				enabled: !!s.enabled,
			}),
		),
});

const cellFromWire = (cell: WireAgentSchedule): CalendarCell => ({
	date: dayOf(cell.date),
	absence: absenceFromWire(cell.absence),
	absenceId: cell.absence_id,
	locked: !!cell.locked,
	shifts: (cell.shifts || []).map(shiftFromWire),
});

const rowFromAgentWorkingSchedule = (
	item: WireAgentWorkingSchedule,
): CalendarRow => {
	const cells: Record<DayKey, CalendarCell> = {};
	(item.schedule || []).forEach((wire) => {
		const cell = cellFromWire(wire);
		cells[cell.date] = cell;
	});
	return {
		agent: lookupFromWire(item.agent),
		cells,
	};
};

const rowFromAgentAbsences = (item: WireAgentAbsences): CalendarRow => {
	const cells: Record<DayKey, CalendarCell> = {};
	(item.absences || []).forEach((absence) => {
		const date = dayOf(absence.absent_at);
		cells[date] = {
			date,
			absence: absenceFromWire(absence.type_id),
			absenceId: absence.id,
			shifts: [],
		};
	});
	return {
		agent: lookupFromWire(item.agent),
		cells,
	};
};

const calendarFromWire = (
	calendar?: WireScheduleCalendar,
): ScheduleCalendar => ({
	timeZone: calendar?.time_zone || 'UTC',
	week: Object.fromEntries(
		Object.entries(calendar?.week || {}).map(([day, value]) => [
			Number(day),
			(value.ranges || []).map((r) => ({
				start: r.start ?? 0,
				end: r.end ?? 0,
			})),
		]),
	),
});

export interface ScheduleHeader {
	id: string;
	name: string;
	state: WfmWorkingScheduleState;
	team?: LookupEntity;
	calendar?: LookupEntity;
	from: DayKey;
	to: DayKey;
	// [Claude] Minutes from midnight; undefined = 24 hours.
	timeline?: {
		from: number;
		to: number;
	};
	extraSkills: LookupEntity[];
	blockOutsideActivity: boolean;
	etag: string;
	totalAgents: number;
}

// [Claude] What the Create / Edit schedule dialog sends.
export type ScheduleDraft = Pick<
	ScheduleHeader,
	'name' | 'from' | 'to' | 'timeline' | 'extraSkills' | 'blockOutsideActivity'
> & {
	team: LookupEntity;
	calendar: LookupEntity;
};

const scheduleFromWire = (item: WireWorkingSchedule = {}): ScheduleHeader => {
	const hasTimeline =
		item.start_time_at !== undefined || item.end_time_at !== undefined;
	return {
		id: item.id ?? '',
		name: item.name ?? '',
		state: stateFromWire(item.state),
		team: lookupFromWire(item.team),
		calendar: lookupFromWire(item.calendar),
		from: dayOf(item.start_date_at),
		to: dayOf(item.end_date_at),
		timeline: hasTimeline
			? {
					from: int(item.start_time_at),
					to: int(item.end_time_at) || 1440,
				}
			: undefined,
		extraSkills: (item.extra_skills || []).flatMap(
			(skill) => lookupFromWire(skill) || [],
		),
		blockOutsideActivity: !!item.block_outside_activity,
		etag: item.etag ?? '',
		totalAgents: int(item.total_agents),
	};
};

const scheduleDraftToWire = (draft: ScheduleDraft): WireWorkingSchedule => ({
	name: draft.name,
	team: lookupToWire(draft.team),
	calendar: lookupToWire(draft.calendar),
	start_date_at: dayToWire(draft.from),
	end_date_at: dayToWire(draft.to),
	// [Claude] No timeline = 24 hours: both ends stay unset.
	...(draft.timeline && {
		start_time_at: int64(draft.timeline.from),
		end_time_at: int64(draft.timeline.to),
	}),
	extra_skills: draft.extraSkills.map(lookupToWire),
	block_outside_activity: draft.blockOutsideActivity,
});

/* [Claude] ------------------------------------------------------- Agents */

export interface SearchAgentsAbsencesParams {
	date: DayRange;
	q?: string;
	teamId?: string[];
	supervisorId?: string[];
	skillId?: string[];
	page?: number;
	size?: number;
}

// [Claude] SearchAgentsAbsences: every agent the user can access, with or without absences.
export const searchAgentsAbsences = async (
	params: SearchAgentsAbsencesParams,
) => {
	const data = await call(() =>
		http.get<WireSearchAgentsAbsencesResponse>('/wfm/agents/absences', {
			params: {
				...dateParams(params.date),
				q: params.q || undefined,
				team_id: params.teamId,
				supervisor_id: params.supervisorId,
				skill_id: params.skillId,
				page: params.page,
				size: params.size,
			},
		}),
	);
	return {
		items: (data.items || []).map(rowFromAgentAbsences),
		total: int(data.total),
		next: !!data.next,
	};
};

export interface AbsenceItem {
	type: WfmAbsenceType;
	from: DayKey;
	to: DayKey;
}

export interface CreateAgentsAbsencesParams {
	agentIds: string[];
	items: AbsenceItem[];
	deleteShifts?: boolean;
}

// [Claude] CreateAgentsAbsences: one day of one agent is the same call with one item.
// [Claude] Without deleteShifts it may refuse with storage.absence.shifts_to_delete.
export const createAgentsAbsences = async (
	params: CreateAgentsAbsencesParams,
) => {
	const body: WireCreateAgentsAbsencesRequest = {
		items: params.items.map((item) => ({
			type_id: item.type,
			date_from: dayToWire(item.from),
			date_to: dayToWire(item.to),
		})),
		agent_ids: params.agentIds,
		delete_shifts: !!params.deleteShifts,
	};
	const data = await call(() =>
		http.post<WireCreateAgentsAbsencesResponse>('/wfm/agents/absences', body),
	);
	return {
		deletedShifts: (data.deleted_shifts || []).map(violationFromWire),
	};
};

export const deleteAgentAbsence = async (
	agentId: string,
	absenceId: string,
) => {
	const data = await call(() =>
		http.delete<WireDeleteAgentAbsenceResponse>(
			`/wfm/agents/${agentId}/absences/${absenceId}`,
		),
	);
	return {
		id: data.id,
	};
};

/* [Claude] ---------------------------------------------------- Schedules */

export interface SearchWorkingSchedulesParams {
	page?: number;
	size?: number;
	search?: string;
	// [Claude] `+name` / `-name`, as ui-datalist encodes it.
	sort?: string;
}

export const searchWorkingSchedules = async ({
	page,
	size,
	search,
	sort,
}: SearchWorkingSchedulesParams = {}) => {
	const data = await call(() =>
		http.get<WireSearchWorkingScheduleResponse>(
			'/wfm/lookups/working_schedules',
			{
				params: {
					page,
					size,
					q: search || undefined,
					sort,
				},
			},
		),
	);
	return {
		items: (data.items || []).map(scheduleFromWire),
		next: !!data.next,
	};
};

export const createWorkingSchedule = async (draft: ScheduleDraft) => {
	const data = await call(() =>
		http.post<WireWorkingScheduleResponse>('/wfm/lookups/working_schedules', {
			item: scheduleDraftToWire(draft),
		} satisfies WireWorkingScheduleRequest),
	);
	return scheduleFromWire(data.item);
};

export const updateWorkingSchedule = async (
	id: string,
	draft: ScheduleDraft,
) => {
	const data = await call(() =>
		http.put<WireWorkingScheduleResponse>(
			`/wfm/lookups/working_schedules/${id}`,
			{
				item: scheduleDraftToWire(draft),
			} satisfies WireWorkingScheduleRequest,
		),
	);
	return scheduleFromWire(data.item);
};

export const deleteWorkingSchedule = async (id: string) => {
	await call(() => http.delete(`/wfm/lookups/working_schedules/${id}`));
};

export const readWorkingSchedule = async (id: string) => {
	const data = await call(() =>
		http.get<WireReadWorkingScheduleResponse>(
			`/wfm/lookups/working_schedules/${id}`,
		),
	);
	return scheduleFromWire(data.item);
};

export interface SearchAgentsWorkingScheduleResult {
	items: CalendarRow[];
	holidays: Holiday[];
	calendar: ScheduleCalendar;
	total: number;
	next: boolean;
}

export const searchAgentsWorkingSchedule = async (
	scheduleId: string,
	params: {
		date: DayRange;
		q?: string;
		teamId?: string[];
		supervisorId?: string[];
		skillId?: string[];
		page?: number;
		size?: number;
	},
): Promise<SearchAgentsWorkingScheduleResult> => {
	const data = await call(() =>
		http.get<WireSearchAgentsWorkingScheduleResponse>(
			`/wfm/agents/working_schedules/${scheduleId}`,
			{
				params: {
					...dateParams(params.date),
					q: params.q || undefined,
					// [Claude] Prototype-only: the filters of the schedule page, as in SearchAgentsAbsences.
					team_id: params.teamId,
					supervisor_id: params.supervisorId,
					skill_id: params.skillId,
					page: params.page,
					size: params.size,
				},
			},
		),
	);
	return {
		items: (data.items || []).map(rowFromAgentWorkingSchedule),
		holidays: (data.holidays || []).map((h) => ({
			date: dayOf(h.date),
			name: h.name ?? '',
		})),
		calendar: calendarFromWire(data.calendar),
		total: int(data.total),
		next: !!data.next,
	};
};

export interface ShiftTemplateRange {
	start: number;
	end: number;
}

export interface CreateShiftsParams {
	date: DayRange;
	agents: LookupEntity[];
	// [Claude] 0 = Sunday … 6 = Saturday; a day missing from the map gets no shifts.
	days: Record<number, ShiftTemplateRange[]>;
	pauses: {
		start: number;
		duration: number;
		cause?: LookupEntity;
	}[];
	skills: CalendarShiftSkill[];
}

const skillsToWire = (skills: CalendarShiftSkill[]) =>
	skills.map((s) => ({
		skill: lookupToWire(s.skill),
		enabled: s.enabled,
	}));

// [Claude] CreateAgentsWorkingScheduleShifts: the Add shifts modal.
export const createAgentsWorkingScheduleShifts = async (
	scheduleId: string,
	params: CreateShiftsParams,
) => {
	const body: WireCreateAgentsWorkingScheduleShiftsRequest = {
		date: {
			from: dayToWire(params.date.from),
			to: dayToWire(params.date.to),
		},
		agents: params.agents.map(lookupToWire),
		days: Object.fromEntries(
			Object.entries(params.days).map(([day, ranges]) => [
				day,
				{
					ranges: ranges.map(({ start, end }) => ({
						start,
						end,
					})),
				},
			]),
		),
		pauses: params.pauses.map((p) => ({
			start: p.start,
			duration: p.duration,
			cause: p.cause && lookupToWire(p.cause),
		})),
		skills: skillsToWire(params.skills),
	};
	const data = await call(() =>
		http.post<WireCreateAgentsWorkingScheduleShiftsResponse>(
			`/wfm/agents/working_schedules/${scheduleId}`,
			body,
		),
	);
	return {
		items: (data.items || []).map(rowFromAgentWorkingSchedule),
		skipped: (data.skipped || []).map(violationFromWire),
	};
};

export interface UpdateShiftParams {
	id: string;
	etag: string;
	startAt: number;
	endAt: number;
	pauses: {
		startAt: number;
		endAt: number;
		cause?: LookupEntity;
	}[];
	skills: CalendarShiftSkill[];
}

// [Claude] UpdateAgentWorkingScheduleShift: the whole shift with its etag; pauses and skills
// [Claude] replace the old ones, so deleting a pause is this call without it.
export const updateAgentWorkingScheduleShift = async (
	scheduleId: string,
	params: UpdateShiftParams,
) => {
	const body: WireUpdateAgentWorkingScheduleShiftRequest = {
		shift: {
			id: params.id,
			etag: params.etag,
			start_at: int64(params.startAt),
			end_at: int64(params.endAt),
			pauses: params.pauses.map((p) => ({
				start_at: int64(p.startAt),
				end_at: int64(p.endAt),
				cause: p.cause && lookupToWire(p.cause),
			})),
			skills: skillsToWire(params.skills),
		},
	};
	const data = await call(() =>
		http.put<WireUpdateAgentWorkingScheduleShiftResponse>(
			`/wfm/agents/working_schedules/${scheduleId}/shifts/${params.id}`,
			body,
		),
	);
	return {
		shift: shiftFromWire(data.shift || {}),
	};
};

export const deleteAgentWorkingScheduleShift = async (
	scheduleId: string,
	shiftId: string,
	etag: string,
) => {
	const data = await call(() =>
		http.delete<WireDeleteAgentWorkingScheduleShiftResponse>(
			`/wfm/agents/working_schedules/${scheduleId}/shifts/${shiftId}`,
			{
				params: {
					etag,
				},
			},
		),
	);
	return {
		id: data.id,
	};
};

/* [Claude] ----------------------------------------------------- Forecast */

export const readWorkingScheduleForecast = async (
	scheduleId: string,
	date: DayRange,
): Promise<ForecastHour[]> => {
	const data = await call(() =>
		http.get<WireReadWorkingScheduleForecastResponse>(
			`/wfm/lookups/working_schedules/${scheduleId}/forecast`,
			{
				params: dateParams(date),
			},
		),
	);
	return (data.items || []).map((h) => ({
		date: dayOf(h.date),
		startAt: int(h.start_at),
		agents: h.agents ?? 0,
	}));
};

export const readWorkingSchedulePlanned = async (
	scheduleId: string,
	date: DayRange,
): Promise<{
	days: PlannedDay[];
	slots: PlannedSlot[];
}> => {
	const data = await call(() =>
		http.get<WireReadWorkingSchedulePlannedResponse>(
			`/wfm/lookups/working_schedules/${scheduleId}/planned`,
			{
				params: dateParams(date),
			},
		),
	);
	return {
		days: (data.days || []).map((d) => ({
			date: dayOf(d.date),
			agents: d.agents ?? 0,
		})),
		slots: (data.slots || []).map((s) => ({
			startAt: int(s.start_at),
			agents: s.agents ?? 0,
		})),
	};
};

/* [Claude] ------------------------------------- Prototype-only (not in protos#532) */
// [Claude] The schedule page's action bar (Figma "Action bar/WFM"). See wire.ts.

const schedulePath = (scheduleId: string) =>
	`/wfm/lookups/working_schedules/${scheduleId}`;

// [Claude] Add agents: the Add agents modal.
export const addWorkingScheduleAgents = async (
	scheduleId: string,
	agentIds: string[],
) => {
	const body: WireAddWorkingScheduleAgentsRequest = {
		agent_ids: agentIds,
	};
	const data = await call(() =>
		http.post<WireWorkingScheduleResponse>(
			`${schedulePath(scheduleId)}/agents`,
			body,
		),
	);
	return scheduleFromWire(data.item);
};

// [Claude] Delete agents from the schedule together with their shifts (EP_05).
export const deleteWorkingScheduleAgents = async (
	scheduleId: string,
	agentIds: string[],
) => {
	const data = await call(() =>
		http.delete<WireWorkingScheduleResponse>(
			`${schedulePath(scheduleId)}/agents`,
			{
				params: {
					agent_id: agentIds,
				},
			},
		),
	);
	return scheduleFromWire(data.item);
};

// [Claude] Next state of the schedule: draft -> pending -> active (WFM overview).
export const updateWorkingScheduleState = async (
	scheduleId: string,
	state: WfmWorkingScheduleState,
	etag: string,
) => {
	const body: WireUpdateWorkingScheduleStateRequest = {
		state,
		etag,
	};
	const data = await call(() =>
		http.put<WireWorkingScheduleResponse>(
			`${schedulePath(scheduleId)}/state`,
			body,
		),
	);
	return scheduleFromWire(data.item);
};

// [Claude] Plan: automatic planning of shifts (EP_04). The mock fills free working days at once.
export const planWorkingSchedule = async (scheduleId: string) => {
	const data = await call(() =>
		http.post<WireWorkingScheduleResponse>(`${schedulePath(scheduleId)}/plan`),
	);
	return scheduleFromWire(data.item);
};

// [Claude] Clear: deletes the shifts of the agents in the period; absences stay.
export const deleteAgentsWorkingScheduleShifts = async (
	scheduleId: string,
	params: {
		agentIds: string[];
		date: DayRange;
	},
) => {
	const data = await call(() =>
		http.delete<WireDeleteAgentsWorkingScheduleShiftsResponse>(
			`/wfm/agents/working_schedules/${scheduleId}/shifts`,
			{
				params: {
					...dateParams(params.date),
					agent_id: params.agentIds,
				},
			},
		),
	);
	return {
		deleted: int(data.deleted),
	};
};

export interface ScheduleLog {
	id: string;
	createdAt: number;
	createdBy?: LookupEntity;
	operation: string;
	agent?: LookupEntity;
}

// [Claude] History of the schedule: who changed what and when (EP_11).
export const searchWorkingScheduleHistory = async (
	scheduleId: string,
): Promise<ScheduleLog[]> => {
	const data = await call(() =>
		http.get<WireSearchWorkingScheduleHistoryResponse>(
			`${schedulePath(scheduleId)}/history`,
		),
	);
	return (data.items || []).map((log) => ({
		id: log.id ?? '',
		createdAt: int(log.created_at),
		createdBy: lookupFromWire(log.created_by),
		operation: log.operation ?? '',
		agent: lookupFromWire(log.agent),
	}));
};
