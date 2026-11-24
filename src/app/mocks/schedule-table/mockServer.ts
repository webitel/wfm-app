import {
	WfmAbsenceType,
	WfmWorkingScheduleState,
} from '@webitel/api-services/gen/models';
import type { WfmHttpClient } from '../../api/wfm/wfmCalendarApi';
import type {
	Int64,
	WireAddWorkingScheduleAgentsRequest,
	WireAgentAbsences,
	WireAgentSchedule,
	WireAgentScheduleShift,
	WireAgentWorkingSchedule,
	WireCreateAgentsAbsencesRequest,
	WireCreateAgentsWorkingScheduleShiftsRequest,
	WireError,
	WireLookup,
	WireUpdateAgentWorkingScheduleShiftRequest,
	WireUpdateWorkingScheduleStateRequest,
	WireViolation,
	WireWorkingSchedule,
	WireWorkingScheduleLog,
	WireWorkingScheduleRequest,
} from '../../api/wfm/wire';
import {
	type CalendarShift,
	type DayKey,
	type LookupEntity,
} from '../../components/schedule-table/types';
import {
	addDays,
	daysBetween,
	dayToUtcMs,
	utcMsToDay,
	weekday,
	zonedParts,
	zonedTimeToUtcMs,
} from '../../components/schedule-table/utils/date';
import { ScheduleLogOperation } from '../../enums';
import {
	createShift,
	generateMockDb,
	type MockDb,
	type MockSchedule,
} from './generate';

// [Claude] In-memory backend of the WFM manual planning contract (webitel/protos#532) for the
// [Claude] calendar prototype. It answers the HTTP calls of wfmCalendarApi — same paths, query
// [Claude] and bodies as the real service — with wire JSON: snake_case, int64 as strings, enums
// [Claude] by name. Errors come as axios does them: `error.response = { status, data }`.

const LATENCY_MS = 200;

let db: MockDb | null = null;
const getDb = () => {
	if (!db) db = generateMockDb();
	return db;
};

// [Claude] For tests: start from fresh data.
export const resetMockDb = (agentsCount?: number) => {
	db = generateMockDb(agentsCount);
};

export const getMockDb = getDb;

class MockHttpError extends Error {
	response: {
		status: number;
		data: WireError;
	};

	constructor(status: number, id: string, violations: WireViolation[] = []) {
		super(id);
		this.response = {
			status,
			data: {
				id,
				code: status,
				status: String(status),
				detail: id,
				violations,
			},
		};
	}
}

/* [Claude] ------------------------------------------------- Wire helpers */

const int64 = (value: number) => String(value);
const dayToWire = (day: DayKey) => int64(dayToUtcMs(day));
const dayFromWire = (value?: Int64) => utcMsToDay(Number(value ?? 0));
const lookup = ({ id, name }: LookupEntity): WireLookup => ({
	id,
	name,
});

// [Claude] A known absence type of a request; UNSPECIFIED or garbage is refused.
const KNOWN_ABSENCE_TYPES: string[] = [
	WfmAbsenceType.AbsenceTypeDayoff,
	WfmAbsenceType.AbsenceTypeVacation,
	WfmAbsenceType.AbsenceTypeSickday,
];

const shiftToWire = (
	shift: CalendarShift,
	timeZone: string,
): WireAgentScheduleShift => ({
	id: shift.id,
	etag: shift.etag,
	start_at: int64(shift.startAt),
	end_at: int64(shift.endAt),
	working_date: dayToWire(workingDate(shift, timeZone)),
	source: 'SHIFT_SOURCE_MANUAL',
	pauses: shift.pauses.map((p) => ({
		id: p.id,
		start_at: int64(p.startAt),
		end_at: int64(p.endAt),
		cause: p.cause && lookup(p.cause),
	})),
	skills: shift.skills.map((s) => ({
		skill: lookup(s.skill),
		enabled: s.enabled,
	})),
});

const scheduleToWire = (s: MockSchedule): WireWorkingSchedule => ({
	id: s.id,
	name: s.name,
	state: s.state,
	team: lookup(s.team),
	calendar: {
		id: s.calendar.id,
		name: s.calendar.name,
	},
	start_date_at: dayToWire(s.from),
	end_date_at: dayToWire(s.to),
	start_time_at: int64(s.timeline.from),
	end_time_at: int64(s.timeline.to),
	extra_skills: s.extraSkills.map(lookup),
	block_outside_activity: s.blockOutsideActivity,
	total_agents: int64(s.agentIds.length),
	etag: s.etag,
});

/* [Claude] ------------------------------------------------------- Domain */

const nextId = () => {
	const d = getDb();
	d.seq += 1;
	return int64(d.seq);
};

const bumpEtag = (etag: string) => {
	const [id, version] = etag.split('-');
	return `${id}-${Number(version) + 1}`;
};

const workingDate = (shift: CalendarShift, timeZone: string) =>
	zonedParts(shift.startAt, timeZone).day;

const getAgent = (id: string) => {
	const agent = getDb().agents.find((a) => a.id === id);
	// [Claude] An agent out of reach is a 403, never a 404 (violation.proto).
	if (!agent) throw new MockHttpError(403, 'service.agent.access');
	return agent;
};

const getSchedule = (id: string) => {
	const schedule = getDb().schedules.get(id);
	if (!schedule) throw new MockHttpError(404, 'dbsql.query.no_rows');
	return schedule;
};

const assertWritable = (schedule: MockSchedule) => {
	if (schedule.state === WfmWorkingScheduleState.WorkingScheduleStateArchived) {
		throw new MockHttpError(400, 'storage.working_schedule.archived');
	}
};

const matchesQuery = (name: string, q?: string) =>
	!q || name.toLowerCase().includes(q.trim().toLowerCase());

const asList = (value: unknown): string[] =>
	value === undefined ? [] : ([] as unknown[]).concat(value).map(String);

// [Claude] DateRange is required on every read of a period.
const readDateRange = (params: Record<string, unknown>) => {
	const from = params['date.from'];
	const to = params['date.to'];
	if (!from || !to || Number(to) < Number(from)) {
		throw new MockHttpError(400, 'interceptor.validate');
	}
	return {
		from: dayFromWire(String(from)),
		to: dayFromWire(String(to)),
	};
};

// [Claude] Shifts of an agent on a day in every non-archived schedule: what an absence removes.
const shiftsOnDay = (agentId: string, date: DayKey) => {
	const result: {
		schedule: MockSchedule;
		shift: CalendarShift;
	}[] = [];
	getDb().schedules.forEach((schedule) => {
		if (schedule.state === WfmWorkingScheduleState.WorkingScheduleStateArchived)
			return;
		(schedule.shifts.get(agentId) || []).forEach((shift) => {
			if (workingDate(shift, schedule.calendar.timeZone) === date) {
				result.push({
					schedule,
					shift,
				});
			}
		});
	});
	return result;
};

// [Claude] The agent has shifts on this date in another active schedule.
const isLocked = (agentId: string, date: DayKey, scheduleId: string) =>
	shiftsOnDay(agentId, date).some(
		({ schedule }) =>
			schedule.id !== scheduleId &&
			schedule.state === WfmWorkingScheduleState.WorkingScheduleStateActive,
	);

const overlaps = (a: CalendarShift, b: CalendarShift) =>
	a.startAt < b.endAt && b.startAt < a.endAt;

// [Claude] Overlap with any other shift of the agent, in any non-archived schedule.
const findOverlap = (
	agentId: string,
	shift: CalendarShift,
	ignoreId?: string,
) => {
	for (const schedule of getDb().schedules.values()) {
		if (schedule.state === WfmWorkingScheduleState.WorkingScheduleStateArchived)
			continue;
		const other = (schedule.shifts.get(agentId) || []).find(
			(s) => s.id !== ignoreId && overlaps(s, shift),
		);
		if (other)
			return {
				schedule,
				shift: other,
			};
	}
	return null;
};

const findShift = (schedule: MockSchedule, shiftId: string) => {
	for (const [agentId, list] of schedule.shifts) {
		const shift = list.find((s) => s.id === shiftId);
		if (shift)
			return {
				agentId,
				shift,
				list,
			};
	}
	throw new MockHttpError(404, 'dbsql.query.no_rows');
};

const paginate = <T>(list: T[], params: Record<string, unknown>) => {
	const size = Number(params.size) || list.length || 1;
	const page = Number(params.page) || 1;
	const items = list.slice((page - 1) * size, page * size);
	return {
		items,
		next: page * size < list.length,
	};
};

/* [Claude] ------------------------------------------------------- Agents */

// [Claude] GET /wfm/agents/absences
const searchAgentsAbsences = (params: Record<string, unknown>) => {
	const d = getDb();
	const range = readDateRange(params);
	const teamId = asList(params.team_id);
	const supervisorId = asList(params.supervisor_id);
	const skillId = asList(params.skill_id);
	const agents = d.agents
		.filter((a) => matchesQuery(a.name, params.q as string))
		.filter((a) => !teamId.length || teamId.includes(a.team.id))
		.filter(
			(a) => !supervisorId.length || supervisorId.includes(a.supervisor.id),
		)
		.filter(
			(a) => !skillId.length || a.skills.some((s) => skillId.includes(s.id)),
		)
		.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
	const days = daysBetween(range.from, range.to);
	const { items, next } = paginate(agents, params);
	return {
		// [Claude] An agent without absences in the period comes without "absences".
		items: items.map((agent): WireAgentAbsences => {
			const absences = days
				.map((date) => d.absences.get(`${agent.id}:${date}`))
				.filter(Boolean)
				.map((a) => ({
					id: a.id,
					type_id: a.type,
					absent_at: dayToWire(a.date),
				}));
			return absences.length
				? {
						agent: lookup(agent),
						absences,
					}
				: {
						agent: lookup(agent),
					};
		}),
		next,
		total: int64(agents.length),
	};
};

// [Claude] POST /wfm/agents/absences: one absence per day, a new one replaces the old.
// [Claude] Shifts on those days go only after the user confirms them (delete_shifts).
const createAgentsAbsences = (body: WireCreateAgentsAbsencesRequest) => {
	const d = getDb();
	if (!body?.items?.length || !body?.agent_ids?.length) {
		throw new MockHttpError(400, 'interceptor.validate');
	}
	const writes: {
		agentId: string;
		date: DayKey;
		type: WfmAbsenceType;
	}[] = [];
	body.agent_ids.forEach((agentId) => {
		getAgent(agentId);
		body.items.forEach((item) => {
			const type = item.type_id;
			if (!KNOWN_ABSENCE_TYPES.includes(type))
				throw new MockHttpError(400, 'interceptor.validate');
			daysBetween(
				dayFromWire(item.date_from),
				dayFromWire(item.date_to),
			).forEach((date) => {
				writes.push({
					agentId,
					date,
					type,
				});
			});
		});
	});

	const toDelete: WireViolation[] = [];
	const deleteActions: (() => void)[] = [];
	writes.forEach(({ agentId, date }) => {
		const agent = getAgent(agentId);
		shiftsOnDay(agentId, date).forEach(({ schedule, shift }) => {
			toDelete.push({
				agent: lookup(agent),
				date: dayToWire(date),
				reason: 'storage.absence.shift',
				schedule: {
					id: schedule.id,
					name: schedule.name,
				},
				start_at: int64(shift.startAt),
				end_at: int64(shift.endAt),
			});
			deleteActions.push(() => {
				schedule.shifts.set(
					agentId,
					schedule.shifts.get(agentId).filter((s) => s.id !== shift.id),
				);
			});
		});
	});

	if (toDelete.length && !body.delete_shifts) {
		throw new MockHttpError(400, 'storage.absence.shifts_to_delete', toDelete);
	}

	deleteActions.forEach((run) => {
		run();
	});
	const written = new Map<string, WireAgentAbsences>();
	writes.forEach(({ agentId, date, type }) => {
		const key = `${agentId}:${date}`;
		const absence = {
			id: d.absences.get(key)?.id || nextId(),
			agentId,
			date,
			type,
		};
		d.absences.set(key, absence);
		if (!written.has(agentId)) {
			written.set(agentId, {
				agent: lookup(getAgent(agentId)),
				absences: [],
			});
		}
		written.get(agentId).absences.push({
			id: absence.id,
			type_id: type,
			absent_at: dayToWire(date),
		});
	});
	return {
		items: [
			...written.values(),
		],
		deleted_shifts: toDelete,
	};
};

// [Claude] DELETE /wfm/agents/{agent_id}/absences/{id}
const deleteAgentAbsence = (agentId: string, absenceId: string) => {
	const d = getDb();
	getAgent(agentId);
	const entry = [
		...d.absences.entries(),
	].find(([, a]) => a.agentId === agentId && a.id === absenceId);
	if (!entry) throw new MockHttpError(404, 'dbsql.query.no_rows');
	d.absences.delete(entry[0]);
	return {
		id: absenceId,
	};
};

/* [Claude] ---------------------------------------------------- Schedules */

// [Claude] GET /wfm/agents/working_schedules/{working_schedule_id}
const searchAgentsWorkingSchedule = (
	scheduleId: string,
	params: Record<string, unknown>,
) => {
	const d = getDb();
	const schedule = getSchedule(scheduleId);
	const range = readDateRange(params);
	const tz = schedule.calendar.timeZone;
	const days = daysBetween(range.from, range.to);
	const teamId = asList(params.team_id);
	const supervisorId = asList(params.supervisor_id);
	const skillId = asList(params.skill_id);
	const agents = schedule.agentIds
		.map((id) => d.agents.find((a) => a.id === id))
		.filter((agent) => matchesQuery(agent.name, params.q as string))
		.filter((a) => !teamId.length || teamId.includes(a.team.id))
		.filter(
			(a) => !supervisorId.length || supervisorId.includes(a.supervisor.id),
		)
		.filter(
			(a) => !skillId.length || a.skills.some((s) => skillId.includes(s.id)),
		)
		.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
	const { items, next } = paginate(agents, params);

	return {
		holidays: d.holidays
			.filter((h) => h.date >= range.from && h.date <= range.to)
			.map((h) => ({
				date: dayToWire(h.date),
				name: h.name,
			})),
		items: items.map((agent): WireAgentWorkingSchedule => {
			const shifts = schedule.shifts.get(agent.id) || [];
			const cells: WireAgentSchedule[] = [];
			days.forEach((date) => {
				const absence = d.absences.get(`${agent.id}:${date}`);
				const dayShifts = shifts.filter((s) => workingDate(s, tz) === date);
				const locked = isLocked(agent.id, date, scheduleId);
				if (!absence && !dayShifts.length && !locked) return;
				const cell: WireAgentSchedule = {
					date: dayToWire(date),
				};
				if (locked) cell.locked = true;
				if (absence) {
					cell.absence = absence.type;
					cell.absence_id = absence.id;
				}
				if (dayShifts.length)
					cell.shifts = dayShifts.map((s) => shiftToWire(s, tz));
				cells.push(cell);
			});
			return {
				agent: lookup(agent),
				schedule: cells,
			};
		}),
		total: int64(agents.length),
		next,
		calendar: {
			time_zone: tz,
			week: Object.fromEntries(
				Object.entries(schedule.calendar.week).map(([day, ranges]) => [
					day,
					ranges.length
						? {
								ranges,
							}
						: {},
				]),
			),
		},
	};
};

// [Claude] POST /wfm/agents/working_schedules/{working_schedule_id}: the Add shifts modal.
const createAgentsWorkingScheduleShifts = (
	scheduleId: string,
	body: WireCreateAgentsWorkingScheduleShiftsRequest,
) => {
	const d = getDb();
	const schedule = getSchedule(scheduleId);
	assertWritable(schedule);
	if (!body?.agents?.length || !body?.date?.from || !body?.date?.to) {
		throw new MockHttpError(400, 'interceptor.validate');
	}
	const tz = schedule.calendar.timeZone;
	const from = dayFromWire(body.date.from);
	const to = dayFromWire(body.date.to);
	const skipped: WireViolation[] = [];
	const refused: WireViolation[] = [];
	const created: {
		agentId: string;
		shift: CalendarShift;
	}[] = [];
	const skills = (body.skills || []).map((s) => ({
		skill: {
			id: s.skill.id,
			name: s.skill.name ?? '',
		},
		enabled: !!s.enabled,
	}));

	body.agents.forEach(({ id: agentId }) => {
		const agent = lookup(getAgent(agentId));
		if (!schedule.agentIds.includes(agentId)) {
			refused.push({
				agent,
				reason: 'storage.shift.agent_not_in_schedule',
			});
			return;
		}
		daysBetween(from, to).forEach((date) => {
			const ranges = body.days[String(weekday(date))]?.ranges;
			if (!ranges?.length) return;
			if (date < schedule.from || date > schedule.to) {
				refused.push({
					agent,
					date: dayToWire(date),
					reason: 'storage.shift.outside_schedule',
				});
				return;
			}
			if (d.absences.has(`${agentId}:${date}`)) {
				skipped.push({
					agent,
					date: dayToWire(date),
					reason: 'storage.shift.absence',
				});
				return;
			}
			if (isLocked(agentId, date, scheduleId)) {
				const other = shiftsOnDay(agentId, date).find(
					({ schedule: s }) => s.id !== scheduleId,
				);
				skipped.push({
					agent,
					date: dayToWire(date),
					reason: 'storage.shift.locked_date',
					schedule: other && {
						id: other.schedule.id,
						name: other.schedule.name,
					},
				});
				return;
			}
			ranges.forEach((range) => {
				// [Claude] A pause belongs to the range that contains it.
				const pauses = (body.pauses || [])
					.filter((p) =>
						range.end > range.start
							? p.start >= range.start && p.start < range.end
							: p.start >= range.start || p.start < range.end,
					)
					.map((p) => ({
						start: p.start,
						duration: p.duration,
						cause: p.cause?.id
							? {
									id: p.cause.id,
									name: p.cause.name ?? '',
								}
							: undefined,
					}));
				const shift = createShift(
					d,
					date,
					range.start,
					range.end,
					tz,
					pauses,
					skills,
				);
				const clash =
					findOverlap(agentId, shift) ||
					created.find(
						(c) => c.agentId === agentId && overlaps(c.shift, shift),
					);
				if (clash) {
					refused.push({
						agent,
						date: dayToWire(date),
						reason: 'storage.shift.overlap',
						start_at: int64(shift.startAt),
						end_at: int64(shift.endAt),
					});
					return;
				}
				created.push({
					agentId,
					shift,
				});
			});
		});
	});

	if (refused.length) {
		throw new MockHttpError(400, 'storage.shift.refused', refused);
	}
	const byAgent = new Map<string, WireAgentWorkingSchedule>();
	created.forEach(({ agentId, shift }) => {
		schedule.shifts.set(agentId, [
			...(schedule.shifts.get(agentId) || []),
			shift,
		]);
		if (!byAgent.has(agentId)) {
			byAgent.set(agentId, {
				agent: lookup(getAgent(agentId)),
				schedule: [],
			});
		}
		byAgent.get(agentId).schedule.push({
			date: dayToWire(workingDate(shift, tz)),
			shifts: [
				shiftToWire(shift, tz),
			],
		});
	});
	return {
		items: [
			...byAgent.values(),
		],
		skipped,
	};
};

// [Claude] PUT /wfm/agents/working_schedules/{working_schedule_id}/shifts/{shift.id}
const updateAgentWorkingScheduleShift = (
	scheduleId: string,
	shiftId: string,
	body: WireUpdateAgentWorkingScheduleShiftRequest,
) => {
	const d = getDb();
	const schedule = getSchedule(scheduleId);
	assertWritable(schedule);
	const { agentId, shift } = findShift(schedule, shiftId);
	const wire = body?.shift;
	if (!wire?.etag) throw new MockHttpError(400, 'interceptor.validate');
	if (shift.etag !== wire.etag) {
		throw new MockHttpError(409, 'storage.shift.version_conflict');
	}
	const next: CalendarShift = {
		...shift,
		startAt: Number(wire.start_at),
		endAt: Number(wire.end_at),
		pauses: (wire.pauses || []).map((p) => ({
			id: nextId(),
			startAt: Number(p.start_at),
			endAt: Number(p.end_at),
			cause: p.cause?.id
				? {
						id: p.cause.id,
						name: p.cause.name ?? '',
					}
				: undefined,
		})),
		skills: (wire.skills || []).map((s) => ({
			skill: {
				id: s.skill.id,
				name: s.skill.name ?? '',
			},
			enabled: !!s.enabled,
		})),
	};
	if (
		!(next.endAt > next.startAt) ||
		next.pauses.some((p) => p.startAt < next.startAt || p.endAt > next.endAt)
	) {
		throw new MockHttpError(400, 'interceptor.validate');
	}
	const tz = schedule.calendar.timeZone;
	const date = workingDate(next, tz);
	const agent = lookup(getAgent(agentId));
	const violations: WireViolation[] = [];
	if (date < schedule.from || date > schedule.to) {
		violations.push({
			agent,
			date: dayToWire(date),
			reason: 'storage.shift.outside_schedule',
		});
	}
	if (d.absences.has(`${agentId}:${date}`)) {
		violations.push({
			agent,
			date: dayToWire(date),
			reason: 'storage.shift.absence',
		});
	}
	if (isLocked(agentId, date, scheduleId)) {
		violations.push({
			agent,
			date: dayToWire(date),
			reason: 'storage.shift.locked_date',
		});
	}
	if (findOverlap(agentId, next, shift.id)) {
		violations.push({
			agent,
			date: dayToWire(date),
			reason: 'storage.shift.overlap',
			start_at: int64(next.startAt),
			end_at: int64(next.endAt),
		});
	}
	if (violations.length) {
		throw new MockHttpError(400, 'storage.shift.refused', violations);
	}
	Object.assign(shift, next, {
		etag: bumpEtag(shift.etag),
	});
	return {
		shift: shiftToWire(shift, tz),
	};
};

// [Claude] DELETE /wfm/agents/working_schedules/{working_schedule_id}/shifts/{id}?etag=
const deleteAgentWorkingScheduleShift = (
	scheduleId: string,
	shiftId: string,
	params: Record<string, unknown>,
) => {
	const schedule = getSchedule(scheduleId);
	assertWritable(schedule);
	const { agentId, shift, list } = findShift(schedule, shiftId);
	if (!params.etag) throw new MockHttpError(400, 'interceptor.validate');
	if (shift.etag !== params.etag) {
		throw new MockHttpError(409, 'storage.shift.version_conflict');
	}
	schedule.shifts.set(
		agentId,
		list.filter((s) => s.id !== shiftId),
	);
	return {
		id: shiftId,
	};
};

/* [Claude] ----------------------------------------------------- Forecast */

// [Claude] Demand curve of a contact centre day: peaks at 10–12 and 14–16.
const DEMAND = [
	0,
	0,
	0,
	0,
	0,
	0,
	0.1,
	0.3,
	0.6,
	0.85,
	1,
	1,
	0.8,
	0.7,
	0.9,
	1,
	0.85,
	0.6,
	0.4,
	0.25,
	0.15,
	0.1,
	0,
	0,
];

// [Claude] GET /wfm/lookups/working_schedules/{id}/forecast
const readWorkingScheduleForecast = (
	scheduleId: string,
	params: Record<string, unknown>,
) => {
	const schedule = getSchedule(scheduleId);
	const range = readDateRange(params);
	const tz = schedule.calendar.timeZone;
	const scale = Math.max(1, Math.round(schedule.agentIds.length * 0.6));
	const items: {
		date: Int64;
		start_at: Int64;
		agents: number;
	}[] = [];
	daysBetween(range.from, range.to).forEach((day) => {
		const weekend = !schedule.calendar.week[weekday(day)]?.length;
		DEMAND.forEach((factor, hour) => {
			const agents = Math.round(scale * factor * (weekend ? 0.3 : 1));
			if (!agents) return;
			items.push({
				date: dayToWire(day),
				start_at: int64(zonedTimeToUtcMs(day, hour * 60, tz)),
				agents,
			});
		});
	});
	return {
		items,
	};
};

const SLOT_MS = 15 * 60_000;

// [Claude] GET /wfm/lookups/working_schedules/{id}/planned: agents on shift and not on a pause;
// [Claude] a pause takes the agent away from a slot only when it covers the whole slot.
const readWorkingSchedulePlanned = (
	scheduleId: string,
	params: Record<string, unknown>,
) => {
	const schedule = getSchedule(scheduleId);
	const range = readDateRange(params);
	const tz = schedule.calendar.timeZone;
	const rangeStart = zonedTimeToUtcMs(range.from, 0, tz);
	const rangeEnd = zonedTimeToUtcMs(addDays(range.to, 1), 0, tz);
	const slotCounts = new Map<number, number>();
	const dayCounts = new Map<DayKey, number>();

	schedule.shifts.forEach((shifts) => {
		const workedDays = new Set<DayKey>();
		shifts.forEach((shift) => {
			const day = workingDate(shift, tz);
			if (day >= range.from && day <= range.to) workedDays.add(day);
			const from = Math.max(
				rangeStart,
				Math.floor(shift.startAt / SLOT_MS) * SLOT_MS,
			);
			const to = Math.min(rangeEnd, shift.endAt);
			for (let slot = from; slot < to; slot += SLOT_MS) {
				const slotEnd = slot + SLOT_MS;
				const onShift = shift.startAt < slotEnd && shift.endAt > slot;
				const onPause = shift.pauses.some(
					(p) => p.startAt <= slot && p.endAt >= slotEnd,
				);
				if (onShift && !onPause) {
					slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1);
				}
			}
		});
		workedDays.forEach((day) => {
			dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
		});
	});

	return {
		slots: [
			...slotCounts,
		]
			.sort(([a], [b]) => a - b)
			.map(([startAt, agents]) => ({
				start_at: int64(startAt),
				agents,
			})),
		days: [
			...dayCounts,
		].map(([day, agents]) => ({
			date: dayToWire(day),
			agents,
		})),
	};
};

/* [Claude] ------------------------------- Prototype-only (not in protos#532) */

// [Claude] The user of the prototype: every history record is theirs.
const MOCK_USER: WireLookup = {
	id: '1000',
	name: 'Admin',
};

// [Claude] The order a schedule goes through (WFM overview): draft -> pending -> active.
const NEXT_STATE: Partial<
	Record<WfmWorkingScheduleState, WfmWorkingScheduleState>
> = {
	[WfmWorkingScheduleState.WorkingScheduleStateDraft]:
		WfmWorkingScheduleState.WorkingScheduleStatePending,
	[WfmWorkingScheduleState.WorkingScheduleStatePending]:
		WfmWorkingScheduleState.WorkingScheduleStateActive,
};

const log = (
	schedule: MockSchedule,
	operation: ScheduleLogOperation,
	agent?: LookupEntity,
) => {
	schedule.history.push({
		id: nextId(),
		createdAt: Date.now(),
		operation,
		agent,
	});
};

const changed = (schedule: MockSchedule) => {
	schedule.etag = bumpEtag(schedule.etag);
	return {
		item: scheduleToWire(schedule),
	};
};

// [Claude] POST /wfm/lookups/working_schedules/{id}/agents
const addWorkingScheduleAgents = (
	scheduleId: string,
	body: WireAddWorkingScheduleAgentsRequest,
) => {
	const schedule = getSchedule(scheduleId);
	assertWritable(schedule);
	if (!body?.agent_ids?.length) {
		throw new MockHttpError(400, 'interceptor.validate');
	}
	body.agent_ids
		.filter((id) => !schedule.agentIds.includes(id))
		.forEach((id) => {
			const agent = getAgent(id);
			schedule.agentIds.push(id);
			log(schedule, ScheduleLogOperation.AgentsAdded, agent);
		});
	return changed(schedule);
};

// [Claude] DELETE /wfm/lookups/working_schedules/{id}/agents?agent_id=
const deleteWorkingScheduleAgents = (
	scheduleId: string,
	params: Record<string, unknown>,
) => {
	const schedule = getSchedule(scheduleId);
	assertWritable(schedule);
	const ids = asList(params.agent_id);
	if (!ids.length) throw new MockHttpError(400, 'interceptor.validate');
	ids
		.filter((id) => schedule.agentIds.includes(id))
		.forEach((id) => {
			schedule.agentIds = schedule.agentIds.filter((a) => a !== id);
			schedule.shifts.delete(id);
			log(schedule, ScheduleLogOperation.AgentsDeleted, getAgent(id));
		});
	return changed(schedule);
};

// [Claude] PUT /wfm/lookups/working_schedules/{id}/state
const updateWorkingScheduleState = (
	scheduleId: string,
	body: WireUpdateWorkingScheduleStateRequest,
) => {
	const schedule = getSchedule(scheduleId);
	assertWritable(schedule);
	if (body?.etag !== schedule.etag) {
		throw new MockHttpError(409, 'storage.working_schedule.version_conflict');
	}
	if (NEXT_STATE[schedule.state] !== body.state) {
		throw new MockHttpError(400, 'storage.working_schedule.state');
	}
	schedule.state = body.state;
	log(schedule, ScheduleLogOperation.StateChanged);
	return changed(schedule);
};

// [Claude] POST /wfm/lookups/working_schedules/{id}/plan: a shift by the calendar on every
// [Claude] free working day of every agent; days with an absence, a shift or a lock stay.
const planWorkingSchedule = (scheduleId: string) => {
	const d = getDb();
	const schedule = getSchedule(scheduleId);
	assertWritable(schedule);
	const tz = schedule.calendar.timeZone;
	schedule.agentIds.forEach((agentId) => {
		const list = schedule.shifts.get(agentId) || [];
		daysBetween(schedule.from, schedule.to).forEach((day) => {
			const ranges = schedule.calendar.week[weekday(day)] || [];
			if (!ranges.length) return;
			if (d.absences.has(`${agentId}:${day}`)) return;
			if (isLocked(agentId, day, scheduleId)) return;
			if (list.some((s) => workingDate(s, tz) === day)) return;
			ranges.forEach((range) => {
				list.push(createShift(d, day, range.start, range.end, tz));
			});
		});
		schedule.shifts.set(agentId, list);
	});
	log(schedule, ScheduleLogOperation.Planned);
	return changed(schedule);
};

// [Claude] DELETE /wfm/agents/working_schedules/{id}/shifts?agent_id=&date.from=&date.to=
const deleteAgentsWorkingScheduleShifts = (
	scheduleId: string,
	params: Record<string, unknown>,
) => {
	const schedule = getSchedule(scheduleId);
	assertWritable(schedule);
	const range = readDateRange(params);
	const tz = schedule.calendar.timeZone;
	const ids = asList(params.agent_id);
	let deleted = 0;
	(ids.length ? ids : schedule.agentIds).forEach((agentId) => {
		const list = schedule.shifts.get(agentId) || [];
		const kept = list.filter((s) => {
			const day = workingDate(s, tz);
			return day < range.from || day > range.to;
		});
		if (kept.length === list.length) return;
		deleted += list.length - kept.length;
		schedule.shifts.set(agentId, kept);
		log(schedule, ScheduleLogOperation.ShiftsCleared, getAgent(agentId));
	});
	return {
		deleted: int64(deleted),
	};
};

/* [Claude] ---------------------------------------------------- Schedules */

// [Claude] GET /wfm/lookups/working_schedules?q=&sort=&page=&size=
const searchWorkingSchedules = (params: Record<string, unknown>) => {
	const sort = String(params.sort || '');
	const field = sort.replace(/^[+-]/, '') as 'name' | 'state';
	const direction = sort.startsWith('-') ? -1 : 1;
	const list = [
		...getDb().schedules.values(),
	]
		.filter((s) => matchesQuery(s.name, params.q as string | undefined))
		.sort((a, b) =>
			field === 'name' || field === 'state'
				? a[field].localeCompare(b[field]) * direction
				: 0,
		);
	const { items, next } = paginate(list, params);
	return {
		items: items.map(scheduleToWire),
		next,
	};
};

// [Claude] The header fields the Create / Edit dialog sends; required ones checked as the
// [Claude] backend would.
const scheduleFieldsFromWire = (item: WireWorkingSchedule = {}) => {
	const calendar = getDb().calendars.find((c) => c.id === item.calendar?.id);
	if (
		!item.name?.trim() ||
		!item.team?.id ||
		!calendar ||
		!item.start_date_at ||
		!item.end_date_at
	) {
		throw new MockHttpError(400, 'app.working_schedule.invalid');
	}
	const hasTimeline =
		item.start_time_at !== undefined || item.end_time_at !== undefined;
	return {
		name: item.name.trim(),
		team: {
			id: item.team.id,
			name: item.team.name ?? '',
		},
		calendar,
		from: dayFromWire(item.start_date_at),
		to: dayFromWire(item.end_date_at),
		timeline: hasTimeline
			? {
					from: Number(item.start_time_at ?? 0),
					to: Number(item.end_time_at ?? 0) || 1440,
				}
			: {
					from: 0,
					to: 1440,
				},
		extraSkills: (item.extra_skills || []).map((s) => ({
			id: s.id ?? '',
			name: s.name ?? '',
		})),
		blockOutsideActivity: !!item.block_outside_activity,
	};
};

// [Claude] POST /wfm/lookups/working_schedules: a new schedule is a draft with no agents.
const createWorkingSchedule = (body: WireWorkingScheduleRequest) => {
	const id = nextId();
	const schedule: MockSchedule = {
		id,
		state: WfmWorkingScheduleState.WorkingScheduleStateDraft,
		...scheduleFieldsFromWire(body.item),
		agentIds: [],
		etag: `${id}-1`,
		shifts: new Map(),
		history: [],
	};
	getDb().schedules.set(id, schedule);
	return {
		item: scheduleToWire(schedule),
	};
};

// [Claude] PUT /wfm/lookups/working_schedules/{id}
const updateWorkingSchedule = (
	id: string,
	body: WireWorkingScheduleRequest,
) => {
	const schedule = getSchedule(id);
	assertWritable(schedule);
	Object.assign(schedule, scheduleFieldsFromWire(body.item), {
		etag: bumpEtag(schedule.etag),
	});
	return {
		item: scheduleToWire(schedule),
	};
};

// [Claude] DELETE /wfm/lookups/working_schedules/{id}
const deleteWorkingSchedule = (id: string) => {
	getSchedule(id);
	getDb().schedules.delete(id);
	return {};
};

// [Claude] GET /wfm/lookups/working_schedules/{id}/history: newest first.
const searchWorkingScheduleHistory = (scheduleId: string) => ({
	items: [
		...getSchedule(scheduleId).history,
	]
		.reverse()
		.map(
			(record): WireWorkingScheduleLog => ({
				id: record.id,
				created_at: int64(record.createdAt),
				created_by: MOCK_USER,
				operation: record.operation,
				agent: record.agent && lookup(record.agent),
			}),
		),
	next: false,
});

/* [Claude] ------------------------------------------------------ Routing */

type Handler = (
	match: string[],
	params: Record<string, unknown>,
	body: unknown,
) => unknown;

const ROUTES: [
	string,
	RegExp,
	Handler,
][] = [
	[
		'POST',
		/^\/wfm\/lookups\/working_schedules\/(\d+)\/agents$/,
		([id], _, body) =>
			addWorkingScheduleAgents(id, body as WireAddWorkingScheduleAgentsRequest),
	],
	[
		'DELETE',
		/^\/wfm\/lookups\/working_schedules\/(\d+)\/agents$/,
		([id], params) => deleteWorkingScheduleAgents(id, params),
	],
	[
		'PUT',
		/^\/wfm\/lookups\/working_schedules\/(\d+)\/state$/,
		([id], _, body) =>
			updateWorkingScheduleState(
				id,
				body as WireUpdateWorkingScheduleStateRequest,
			),
	],
	[
		'POST',
		/^\/wfm\/lookups\/working_schedules\/(\d+)\/plan$/,
		([id]) => planWorkingSchedule(id),
	],
	[
		'DELETE',
		/^\/wfm\/agents\/working_schedules\/(\d+)\/shifts$/,
		([id], params) => deleteAgentsWorkingScheduleShifts(id, params),
	],
	[
		'GET',
		/^\/wfm\/lookups\/working_schedules\/(\d+)\/history$/,
		([id]) => searchWorkingScheduleHistory(id),
	],
	[
		'GET',
		/^\/wfm\/agents\/absences$/,
		(_, params) => searchAgentsAbsences(params),
	],
	[
		'POST',
		/^\/wfm\/agents\/absences$/,
		(_, __, body) =>
			createAgentsAbsences(body as WireCreateAgentsAbsencesRequest),
	],
	[
		'DELETE',
		/^\/wfm\/agents\/(\d+)\/absences\/(\d+)$/,
		([agentId, id]) => deleteAgentAbsence(agentId, id),
	],
	[
		'GET',
		/^\/wfm\/agents\/working_schedules\/(\d+)$/,
		([id], params) => searchAgentsWorkingSchedule(id, params),
	],
	[
		'POST',
		/^\/wfm\/agents\/working_schedules\/(\d+)$/,
		([id], _, body) =>
			createAgentsWorkingScheduleShifts(
				id,
				body as WireCreateAgentsWorkingScheduleShiftsRequest,
			),
	],
	[
		'PUT',
		/^\/wfm\/agents\/working_schedules\/(\d+)\/shifts\/(\d+)$/,
		([id, shiftId], _, body) =>
			updateAgentWorkingScheduleShift(
				id,
				shiftId,
				body as WireUpdateAgentWorkingScheduleShiftRequest,
			),
	],
	[
		'DELETE',
		/^\/wfm\/agents\/working_schedules\/(\d+)\/shifts\/(\d+)$/,
		([id, shiftId], params) =>
			deleteAgentWorkingScheduleShift(id, shiftId, params),
	],
	[
		'GET',
		/^\/wfm\/lookups\/working_schedules$/,
		(_, params) => searchWorkingSchedules(params),
	],
	[
		'POST',
		/^\/wfm\/lookups\/working_schedules$/,
		(_, __, body) => createWorkingSchedule(body as WireWorkingScheduleRequest),
	],
	[
		'PUT',
		/^\/wfm\/lookups\/working_schedules\/(\d+)$/,
		([id], _, body) =>
			updateWorkingSchedule(id, body as WireWorkingScheduleRequest),
	],
	[
		'DELETE',
		/^\/wfm\/lookups\/working_schedules\/(\d+)$/,
		([id]) => deleteWorkingSchedule(id),
	],
	[
		'GET',
		/^\/wfm\/lookups\/working_schedules\/(\d+)$/,
		([id]) => ({
			item: scheduleToWire(getSchedule(id)),
		}),
	],
	[
		'GET',
		/^\/wfm\/lookups\/working_schedules\/(\d+)\/forecast$/,
		([id], params) => readWorkingScheduleForecast(id, params),
	],
	[
		'GET',
		/^\/wfm\/lookups\/working_schedules\/(\d+)\/planned$/,
		([id], params) => readWorkingSchedulePlanned(id, params),
	],
];

const handle = <T>(
	method: string,
	url: string,
	params: Record<string, unknown> = {},
	body?: unknown,
): Promise<{
	data: T;
}> =>
	new Promise((resolve, reject) => {
		setTimeout(() => {
			try {
				const route = ROUTES.find(([m, re]) => m === method && re.test(url));
				if (!route) throw new MockHttpError(404, 'mock.route.not_found');
				const match = url.match(route[1]).slice(1);
				// [Claude] A deep copy each way, as over the network: no shared mock state.
				const data = route[2](match, params, structuredClone(body));
				resolve({
					data: structuredClone(data) as T,
				});
			} catch (error) {
				reject(error);
			}
		}, LATENCY_MS);
	});

export const mockWfmHttpClient: WfmHttpClient = {
	get: (url, config) => handle('GET', url, config?.params),
	post: (url, body) => handle('POST', url, {}, body),
	put: (url, body) => handle('PUT', url, {}, body),
	delete: (url, config) => handle('DELETE', url, config?.params),
};
