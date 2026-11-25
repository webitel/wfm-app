// [Claude] Mock HTTP server of the WFM API (VITE_WFM_MOCK=true): an axios adapter that answers
// [Claude] the routes of webitel/protos PR 532 in their wire shape, with the refusals the
// [Claude] contract describes (shifts_to_delete, refused, unplanned_days, activation_refused …).
import axios, {
	AxiosError,
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from 'axios';

import {
	type DayKey,
	dayOfWeek,
	daysBetween,
	MINUTES_IN_DAY,
	wallToMs,
} from '../../../utils/day';
import {
	AbsenceType,
	type Lookup,
	ScheduleState,
	type WireLookup,
	type WireShift,
	type WireViolation,
} from '../types';
import { fromWireDay, toWireDay } from '../wire';
import {
	db,
	findAgent,
	findCalendar,
	forecastAgents,
	lookupName,
	type MockSchedule,
	type MockShift,
	newId,
	teamAgentIds,
} from './mockDb';

const LATENCY_MS = 150;
const SLOT_MS = 15 * 60_000;

class MockRefusal {
	constructor(
		public status: number,
		public id: string,
		public text: string,
		public violations: WireViolation[] = [],
	) {}
}

const refuse = (
	status: number,
	id: string,
	text: string,
	violations?: WireViolation[],
): never => {
	throw new MockRefusal(status, id, text, violations);
};

const agentLookup = (id: string): Lookup => ({
	id,
	name: findAgent(id)?.name || '',
});

const lookup = (item?: Lookup | null): WireLookup | undefined =>
	item
		? {
				id: item.id,
				name: item.name,
			}
		: undefined;

const scheduleLookup = (schedule: MockSchedule): WireLookup => ({
	id: schedule.id,
	name: schedule.name,
});

const findSchedule = (id: string) =>
	db.schedules.find((item) => item.id === id) ||
	refuse(404, 'dbsql.query.no_rows', 'schedule not found');

const assertNotArchived = (schedule: MockSchedule) => {
	if (schedule.state === ScheduleState.Archived) {
		refuse(
			400,
			'storage.working_schedule.archived',
			'the schedule is archived',
		);
	}
};

const assertEtag = (version: number, etag: unknown, id: string) => {
	if (String(etag) !== `v${version}`) {
		refuse(409, id, 'changed since the read, read it again');
	}
};

const asList = (value: unknown): string[] =>
	value === undefined ? [] : ([] as unknown[]).concat(value).map(String);

const dateRange = (params: Record<string, unknown>) => ({
	from: fromWireDay(params['date.from'] as string),
	to: fromWireDay(params['date.to'] as string),
});

const pauseFromWire = (pause: {
	start_at?: string | number;
	end_at?: string | number;
	cause?: WireLookup;
}) => ({
	id: newId(),
	startAt: Number(pause.start_at),
	endAt: Number(pause.end_at),
	cause: pause.cause?.id
		? {
				id: String(pause.cause.id),
				name: pause.cause.name || '',
			}
		: undefined,
});

/* [Claude] ------------------------------------------------------------ Serializers */

const toWireScheduleItem = (schedule: MockSchedule) => {
	const calendar = findCalendar(schedule.calendarId);
	return {
		id: schedule.id,
		name: schedule.name,
		state: schedule.state,
		team: lookup(lookupName('teams', schedule.teamId)),
		calendar: calendar
			? {
					id: calendar.id,
					name: calendar.name,
				}
			: undefined,
		start_date_at: toWireDay(schedule.startDate),
		end_date_at: toWireDay(schedule.endDate),
		...(schedule.timelineFrom !== null && {
			start_time_at: String(schedule.timelineFrom),
			end_time_at: String(schedule.timelineTo),
		}),
		extra_skills: schedule.extraSkillIds.map((id) =>
			lookup(lookupName('skills', id)),
		),
		block_outside_activity: schedule.isBlockOutsideActivity,
		agents: schedule.agentIds.map((id) => lookup(agentLookup(id))),
		total_agents: String(schedule.agentIds.length),
		etag: `v${schedule.version}`,
	};
};

const toWireShiftItem = (shift: MockShift): WireShift => ({
	id: shift.id,
	start_at: String(shift.startAt),
	end_at: String(shift.endAt),
	working_date: toWireDay(shift.workingDate),
	etag: `v${shift.version}`,
	pauses: shift.pauses.map((pause) => ({
		id: pause.id,
		start_at: String(pause.startAt),
		end_at: String(pause.endAt),
		cause: lookup(pause.cause),
	})),
	skills: shift.skills.map((skill) => ({
		skill: lookup(skill.skill),
		enabled: skill.enabled,
	})),
});

/* [Claude] ------------------------------------------------------------------ Rules */

const absenceOf = (agentId: string, date: DayKey) =>
	db.absences.find((item) => item.agentId === agentId && item.date === date);

// [Claude] The active schedule (other than this one) where the agent has a shift on the date.
const lockingSchedule = (
	agentId: string,
	date: DayKey,
	scheduleId: string,
): MockSchedule | undefined =>
	db.schedules.find(
		(schedule) =>
			schedule.id !== scheduleId &&
			schedule.state === ScheduleState.Active &&
			db.shifts.some(
				(shift) =>
					shift.scheduleId === schedule.id &&
					shift.agentId === agentId &&
					shift.workingDate === date,
			),
	);

const isLive = (scheduleId: string) =>
	db.schedules.find((item) => item.id === scheduleId)?.state !==
	ScheduleState.Archived;

// [Claude] Shifts an absence on the date would delete: draft, pending or active schedules.
const shiftsToDelete = (agentId: string, date: DayKey) =>
	db.shifts.filter(
		(shift) =>
			shift.agentId === agentId &&
			shift.workingDate === date &&
			isLive(shift.scheduleId),
	);

const deletedShift = (shift: MockShift) => {
	const schedule = db.schedules.find((item) => item.id === shift.scheduleId);
	return {
		id: shift.id,
		agent: lookup(agentLookup(shift.agentId)),
		schedule: schedule ? scheduleLookup(schedule) : undefined,
		date: toWireDay(shift.workingDate),
		start_at: String(shift.startAt),
		end_at: String(shift.endAt),
	};
};

// [Claude] Writes absences for (agent, day) pairs, refusing or deleting shifts on those days.
const writeAbsences = (
	pairs: {
		agentId: string;
		date: DayKey;
		type: AbsenceType;
	}[],
	isDeleteShifts: boolean,
) => {
	const blocking = pairs.flatMap(({ agentId, date }) =>
		shiftsToDelete(agentId, date),
	);
	if (blocking.length && !isDeleteShifts) {
		refuse(
			400,
			'storage.absence.shifts_to_delete',
			'the agent has shifts on these days',
			blocking.map((shift) => ({
				...deletedShift(shift),
				reason: 'storage.absence.shift',
				shift_id: shift.id,
			})),
		);
	}
	db.shifts = db.shifts.filter((shift) => !blocking.includes(shift));
	const written = pairs.map(({ agentId, date, type }) => {
		const existing = absenceOf(agentId, date);
		if (existing) {
			existing.type = type;
			return existing;
		}
		const absence = {
			id: newId(),
			agentId,
			date,
			type,
		};
		db.absences.push(absence);
		return absence;
	});
	return {
		written,
		deleted_shifts: blocking.map(deletedShift),
	};
};

const overlaps = (a: MockShift, b: Pick<MockShift, 'startAt' | 'endAt'>) =>
	a.startAt < b.endAt && b.startAt < a.endAt;

/* [Claude] ----------------------------------------------------------------- Routes */

type Handler = (
	match: string[],
	params: Record<string, unknown>,
	body: Record<string, unknown>,
) => unknown;

const routes: [
	string,
	RegExp,
	Handler,
][] = [];
const on = (method: string, path: string, handler: Handler) => {
	routes.push([
		method,
		new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`),
		handler,
	]);
};

const matchesFilters = (
	agent: NonNullable<ReturnType<typeof findAgent>>,
	params: Record<string, unknown>,
) => {
	const q = String(params.q || '').toLowerCase();
	const teams = asList(params.team_id);
	const supervisors = asList(params.supervisor_id);
	const skills = asList(params.skill_id);
	return (
		agent.name.toLowerCase().includes(q) &&
		(!teams.length || teams.includes(agent.teamId)) &&
		(!supervisors.length || supervisors.includes(agent.supervisorId)) &&
		(!skills.length || agent.skillIds.some((id) => skills.includes(id)))
	);
};

/* [Claude] Absences */

on('get', '/wfm/agents/absences', (_m, params) => {
	const { from, to } = dateRange(params);
	const page = Number(params.page || 1);
	const size = Number(params.size || 50);
	const sort = params.sort === '-name' ? -1 : 1;
	const found = db.agents
		.filter((agent) => matchesFilters(agent, params))
		.sort((a, b) => sort * a.name.localeCompare(b.name));
	return {
		items: found.slice((page - 1) * size, page * size).map((agent) => ({
			agent: lookup(agent),
			absences: db.absences
				.filter(
					(absence) =>
						absence.agentId === agent.id &&
						absence.date >= from &&
						absence.date <= to,
				)
				.map((absence) => ({
					id: absence.id,
					type_id: absence.type,
					absent_at: toWireDay(absence.date),
				})),
		})),
		next: found.length > page * size,
		total: String(found.length),
	};
});

on('post', '/wfm/agents/:agent/absences', ([agentId], _p, body) => {
	const item = body.item as {
		type_id: AbsenceType;
		absent_at: string;
	};
	const { written, deleted_shifts } = writeAbsences(
		[
			{
				agentId,
				date: fromWireDay(item.absent_at),
				type: item.type_id,
			},
		],
		!!body.delete_shifts,
	);
	return {
		item: {
			id: written[0].id,
			type_id: written[0].type,
			absent_at: toWireDay(written[0].date),
		},
		deleted_shifts,
	};
});

on('delete', '/wfm/agents/:agent/absences/:id', ([agentId, id]) => {
	const before = db.absences.length;
	db.absences = db.absences.filter(
		(absence) => !(absence.agentId === agentId && absence.id === id),
	);
	if (before === db.absences.length) {
		refuse(404, 'dbsql.query.no_rows', 'absence not found');
	}
	return {
		id,
	};
});

on('post', '/wfm/agents/absences', (_m, _p, body) => {
	const agentIds = asList(body.agent_ids);
	const items = body.items as {
		type_id: AbsenceType;
		date_from: string;
		date_to: string;
	}[];
	const pairs = agentIds.flatMap((agentId) =>
		items.flatMap((item) =>
			daysBetween(fromWireDay(item.date_from), fromWireDay(item.date_to)).map(
				(date) => ({
					agentId,
					date,
					type: item.type_id,
				}),
			),
		),
	);
	const { deleted_shifts } = writeAbsences(pairs, !!body.delete_shifts);
	return {
		items: [],
		deleted_shifts,
	};
});

/* [Claude] Agents' schedule */

on('get', '/wfm/agents/working_schedules/:id', ([id], params) => {
	const schedule = findSchedule(id);
	const calendar = findCalendar(schedule.calendarId);
	const { from, to } = dateRange(params);
	const page = Number(params.page || 1);
	const size = Number(params.size || 500);
	const found = schedule.agentIds
		.map((agentId) => findAgent(agentId))
		.filter(
			(agent): agent is NonNullable<typeof agent> =>
				!!agent && matchesFilters(agent, params),
		)
		.sort((a, b) => a.name.localeCompare(b.name));
	const days = daysBetween(from, to);
	return {
		items: found.slice((page - 1) * size, page * size).map((agent) => ({
			agent: lookup(agent),
			schedule: days.flatMap((date) => {
				const absence = absenceOf(agent.id, date);
				const shifts = db.shifts.filter(
					(shift) =>
						shift.scheduleId === id &&
						shift.agentId === agent.id &&
						shift.workingDate === date,
				);
				const isLocked = !!lockingSchedule(agent.id, date, id);
				if (!absence && !shifts.length && !isLocked) return [];
				return [
					{
						date: toWireDay(date),
						locked: isLocked,
						...(absence && {
							absence: absence.type,
							absence_id: absence.id,
						}),
						shifts: shifts.map(toWireShiftItem),
					},
				];
			}),
		})),
		holidays: (calendar?.holidays || [])
			.filter((holiday) => holiday.date >= from && holiday.date <= to)
			.map((holiday) => ({
				date: toWireDay(holiday.date),
				name: holiday.name,
			})),
		calendar: {
			time_zone: calendar?.timeZone,
			week: Object.fromEntries(
				Object.entries(calendar?.week || {}).map(([day, ranges]) => [
					day,
					{
						ranges,
					},
				]),
			),
		},
		total: String(found.length),
		next: found.length > page * size,
	};
});

on('post', '/wfm/agents/working_schedules/:id', ([id], _p, body) => {
	const schedule = findSchedule(id);
	assertNotArchived(schedule);
	const timeZone = findCalendar(schedule.calendarId)?.timeZone || 'UTC';
	const range = body.date as {
		from: string;
		to: string;
	};
	const agentIds = (body.agents as WireLookup[]).map((agent) =>
		String(agent.id),
	);
	const days = body.days as Record<
		string,
		{
			ranges: {
				start: number;
				end: number;
			}[];
		}
	>;
	const pauses = (body.pauses || []) as {
		start: number;
		duration: number;
		cause?: WireLookup;
	}[];
	const skills = (body.skills || []) as {
		skill: WireLookup;
		enabled: boolean;
	}[];

	const created: MockShift[] = [];
	const skipped: WireViolation[] = [];
	const violations: WireViolation[] = [];

	for (const agentId of agentIds) {
		const agent = lookup(agentLookup(agentId));
		if (!schedule.agentIds.includes(agentId)) {
			violations.push({
				agent,
				reason: 'storage.shift.agent_not_in_schedule',
			});
			continue;
		}
		for (const date of daysBetween(
			fromWireDay(range.from),
			fromWireDay(range.to),
		)) {
			const ranges = days[String(dayOfWeek(date))]?.ranges;
			if (!ranges?.length) continue;
			if (date < schedule.startDate || date > schedule.endDate) {
				violations.push({
					agent,
					date: toWireDay(date),
					reason: 'storage.shift.outside_schedule',
				});
				continue;
			}
			if (absenceOf(agentId, date)) {
				skipped.push({
					agent,
					date: toWireDay(date),
					reason: 'storage.shift.absence',
				});
				continue;
			}
			const locking = lockingSchedule(agentId, date, id);
			if (locking) {
				skipped.push({
					agent,
					date: toWireDay(date),
					reason: 'storage.shift.locked_date',
					schedule: scheduleLookup(locking),
				});
				continue;
			}
			for (const { start, end } of ranges) {
				const endMinutes = end <= start ? end + MINUTES_IN_DAY : end;
				const shift: MockShift = {
					id: newId(),
					scheduleId: id,
					agentId,
					startAt: wallToMs(date, start, timeZone),
					endAt: wallToMs(date, endMinutes, timeZone),
					workingDate: date,
					pauses: [],
					skills: skills.map((skill) => ({
						skill: {
							id: String(skill.skill.id),
							name: skill.skill.name || '',
						},
						enabled: skill.enabled,
					})),
					version: 1,
				};
				for (const pause of pauses) {
					// [Claude] In a range that crosses midnight, a pause after 00:00 is of the next day.
					const pauseStart =
						end <= start && pause.start < start
							? pause.start + MINUTES_IN_DAY
							: pause.start;
					if (pauseStart < start || pauseStart + pause.duration > endMinutes) {
						continue;
					}
					shift.pauses.push({
						id: newId(),
						startAt: wallToMs(date, pauseStart, timeZone),
						endAt: wallToMs(date, pauseStart + pause.duration, timeZone),
						cause: pause.cause?.id
							? {
									id: String(pause.cause.id),
									name: pause.cause.name || '',
								}
							: undefined,
					});
				}
				const clash = db.shifts
					.concat(created)
					.find(
						(other) =>
							other.agentId === agentId &&
							isLive(other.scheduleId) &&
							overlaps(other, shift),
					);
				if (clash) {
					violations.push({
						agent,
						date: toWireDay(date),
						reason: 'storage.shift.overlap',
						shift_id: clash.id,
						start_at: String(clash.startAt),
						end_at: String(clash.endAt),
					});
					continue;
				}
				created.push(shift);
			}
		}
	}
	if (violations.length) {
		refuse(400, 'storage.shift.refused', 'shifts refused', violations);
	}
	db.shifts.push(...created);
	return {
		items: [],
		skipped,
	};
});

const findShift = (scheduleId: string, id: string) =>
	db.shifts.find(
		(shift) => shift.scheduleId === scheduleId && shift.id === id,
	) || refuse(404, 'dbsql.query.no_rows', 'shift not found');

on(
	'put',
	'/wfm/agents/working_schedules/:schedule/shifts/:id',
	([scheduleId, id], _p, body) => {
		assertNotArchived(findSchedule(scheduleId));
		const shift = findShift(scheduleId, id);
		const next = body.shift as WireShift;
		assertEtag(shift.version, next.etag, 'storage.shift.version_conflict');
		const startAt = Number(next.start_at);
		const endAt = Number(next.end_at);
		const pauses = (next.pauses || []).map(pauseFromWire);
		const clash = db.shifts.find(
			(other) =>
				other.id !== shift.id &&
				other.agentId === shift.agentId &&
				isLive(other.scheduleId) &&
				overlaps(other, {
					startAt,
					endAt,
				}),
		);
		const isPauseOutside = pauses.some(
			(pause) => pause.startAt < startAt || pause.endAt > endAt,
		);
		if (clash || endAt <= startAt || isPauseOutside) {
			refuse(400, 'storage.shift.refused', 'shift refused', [
				{
					agent: lookup(agentLookup(shift.agentId)),
					date: toWireDay(shift.workingDate),
					reason: clash ? 'storage.shift.overlap' : 'storage.shift.time',
					shift_id: clash?.id,
					start_at: clash ? String(clash.startAt) : undefined,
					end_at: clash ? String(clash.endAt) : undefined,
				},
			]);
		}
		Object.assign(shift, {
			startAt,
			endAt,
			version: shift.version + 1,
			pauses,
			skills: (next.skills || []).map((skill) => ({
				skill: {
					id: String(skill.skill?.id),
					name: skill.skill?.name || '',
				},
				enabled: !!skill.enabled,
			})),
		});
		return {
			shift: toWireShiftItem(shift),
		};
	},
);

on(
	'delete',
	'/wfm/agents/working_schedules/:schedule/shifts/:id',
	([scheduleId, id], params) => {
		assertNotArchived(findSchedule(scheduleId));
		const shift = findShift(scheduleId, id);
		assertEtag(shift.version, params.etag, 'storage.shift.version_conflict');
		db.shifts = db.shifts.filter((item) => item !== shift);
		return {
			id,
		};
	},
);

/* [Claude] Schedules */

const STATE_ORDER = [
	ScheduleState.Active,
	ScheduleState.Pending,
	ScheduleState.Draft,
	ScheduleState.Archived,
];

on('get', '/wfm/lookups/working_schedules', (_m, params) => {
	const q = String(params.q || '')
		.replaceAll('*', '')
		.toLowerCase();
	const page = Number(params.page || 1);
	const size = Number(params.size || 10);
	const sort = String(params.sort || '');
	const direction = sort.startsWith('-') ? -1 : 1;
	const found = db.schedules
		.filter((schedule) => schedule.name.toLowerCase().includes(q))
		.sort((a, b) => {
			if (sort.endsWith('state')) {
				return (
					direction *
					(STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state))
				);
			}
			if (sort.endsWith('name')) {
				return direction * a.name.localeCompare(b.name);
			}
			return Number(b.id) - Number(a.id);
		});
	return {
		items: found.slice((page - 1) * size, page * size).map(toWireScheduleItem),
		next: found.length > page * size,
	};
});

type WireScheduleBody = {
	id?: string;
	etag?: string;
	name?: string;
	team?: WireLookup;
	calendar?: WireLookup;
	start_date_at?: string;
	end_date_at?: string;
	start_time_at?: string;
	end_time_at?: string;
	extra_skills?: WireLookup[];
	block_outside_activity?: boolean;
};

const validateHeader = (item: WireScheduleBody) => {
	const fields = [
		!item.name && 'name',
		!item.team?.id && 'team',
		!item.calendar?.id && 'calendar',
		!item.start_date_at && 'start_date_at',
		!item.end_date_at && 'end_date_at',
	].filter(Boolean);
	if (fields.length) {
		refuse(400, 'interceptor.validate', `required: ${fields.join(', ')}`);
	}
	if (Number(item.end_date_at) < Number(item.start_date_at)) {
		refuse(
			400,
			'interceptor.validate',
			'the end date is before the start date',
		);
	}
};

const timelineOf = (item: WireScheduleBody) => ({
	timelineFrom:
		item.start_time_at === undefined ? null : Number(item.start_time_at),
	timelineTo: item.end_time_at === undefined ? null : Number(item.end_time_at),
});

on('post', '/wfm/lookups/working_schedules', (_m, _p, body) => {
	const item = body.item as WireScheduleBody;
	validateHeader(item);
	const teamId = String(item.team?.id);
	const schedule: MockSchedule = {
		id: newId(),
		name: item.name || '',
		state: ScheduleState.Draft,
		teamId,
		calendarId: String(item.calendar?.id),
		startDate: fromWireDay(item.start_date_at),
		endDate: fromWireDay(item.end_date_at),
		...timelineOf(item),
		extraSkillIds: (item.extra_skills || []).map((skill) => String(skill.id)),
		isBlockOutsideActivity: !!item.block_outside_activity,
		agentIds: teamAgentIds(teamId),
		version: 1,
	};
	db.schedules.push(schedule);
	return {
		item: toWireScheduleItem(schedule),
	};
});

on('get', '/wfm/lookups/working_schedules/:id', ([id]) => ({
	item: toWireScheduleItem(findSchedule(id)),
}));

on('put', '/wfm/lookups/working_schedules/:id', ([id], _p, body) => {
	const schedule = findSchedule(id);
	const item = body.item as WireScheduleBody;
	if (schedule.state !== ScheduleState.Draft) {
		refuse(400, 'service.working_schedule.state', 'only a draft can be edited');
	}
	assertEtag(
		schedule.version,
		item.etag,
		'storage.working_schedule.version_conflict',
	);
	validateHeader(item);
	const teamId = String(item.team?.id);
	const calendarId = String(item.calendar?.id);
	const startDate = fromWireDay(item.start_date_at);
	const endDate = fromWireDay(item.end_date_at);
	if (teamId !== schedule.teamId) {
		schedule.agentIds = teamAgentIds(teamId);
	}
	db.shifts = db.shifts.filter(
		(shift) =>
			shift.scheduleId !== id ||
			(teamId === schedule.teamId &&
				calendarId === schedule.calendarId &&
				shift.workingDate >= startDate &&
				shift.workingDate <= endDate),
	);
	Object.assign(schedule, {
		name: item.name,
		teamId,
		calendarId,
		startDate,
		endDate,
		...timelineOf(item),
		extraSkillIds: (item.extra_skills || []).map((skill) => String(skill.id)),
		version: schedule.version + 1,
	});
	return {
		item: toWireScheduleItem(schedule),
	};
});

on('delete', '/wfm/lookups/working_schedules/:id', ([id]) => {
	const schedule = findSchedule(id);
	if (schedule.state === ScheduleState.Active) {
		refuse(
			400,
			'storage.working_schedule.active',
			'an active schedule cannot be deleted',
		);
	}
	db.schedules = db.schedules.filter((item) => item !== schedule);
	db.shifts = db.shifts.filter((shift) => shift.scheduleId !== id);
	return {
		id,
	};
});

on('post', '/wfm/lookups/working_schedules/:id/agents', ([id], _p, body) => {
	const schedule = findSchedule(id);
	assertNotArchived(schedule);
	const added = (body.agents as WireLookup[])
		.map((agent) => String(agent.id))
		.filter((agentId) => !schedule.agentIds.includes(agentId));
	schedule.agentIds.push(...added);
	return {
		agents: added.map((agentId) => lookup(agentLookup(agentId))),
	};
});

on(
	'delete',
	'/wfm/lookups/working_schedules/:id/agents/:agent',
	([id, agentId]) => {
		const schedule = findSchedule(id);
		assertNotArchived(schedule);
		schedule.agentIds = schedule.agentIds.filter((item) => item !== agentId);
		db.shifts = db.shifts.filter(
			(shift) => !(shift.scheduleId === id && shift.agentId === agentId),
		);
		return {
			id: agentId,
		};
	},
);

on('get', '/wfm/lookups/working_schedules/:id/forecast', ([id], params) => {
	const schedule = findSchedule(id);
	const timeZone = findCalendar(schedule.calendarId)?.timeZone || 'UTC';
	const { from, to } = dateRange(params);
	return {
		items: daysBetween(from, to).flatMap((date) =>
			Array.from(
				{
					length: 24,
				},
				(_, hour) => {
					const startAt = wallToMs(date, hour * 60, timeZone);
					return {
						date: toWireDay(date),
						start_at: String(startAt),
						agents: forecastAgents(schedule.teamId, startAt),
					};
				},
			).filter((hour) => hour.agents > 0),
		),
	};
});

on('get', '/wfm/lookups/working_schedules/:id/planned', ([id], params) => {
	const { from, to } = dateRange(params);
	const shifts = db.shifts.filter(
		(shift) =>
			shift.scheduleId === id &&
			shift.workingDate >= from &&
			shift.workingDate <= to,
	);
	const slots = new Map<number, number>();
	for (const shift of shifts) {
		for (let start = shift.startAt; start < shift.endAt; start += SLOT_MS) {
			// [Claude] Away only when a pause covers the whole slot.
			const isAway = shift.pauses.some(
				(pause) => pause.startAt <= start && pause.endAt >= start + SLOT_MS,
			);
			if (!isAway) slots.set(start, (slots.get(start) || 0) + 1);
		}
	}
	const days = new Map<DayKey, Set<string>>();
	for (const shift of shifts) {
		const agents = days.get(shift.workingDate) || new Set();
		agents.add(shift.agentId);
		days.set(shift.workingDate, agents);
	}
	return {
		slots: [
			...slots,
		].map(([start, agents]) => ({
			start_at: String(start),
			agents,
		})),
		days: [
			...days,
		].map(([date, agents]) => ({
			date: toWireDay(date),
			agents: agents.size,
		})),
	};
});

on('patch', '/wfm/lookups/working_schedules/:id/state', ([id], _p, body) => {
	const schedule = findSchedule(id);
	const state = body.state as ScheduleState;
	assertNotArchived(schedule);
	assertEtag(
		schedule.version,
		body.etag,
		'storage.working_schedule.version_conflict',
	);
	let filledDays = 0;
	if (state === ScheduleState.Pending || state === ScheduleState.Active) {
		const unplanned = schedule.agentIds.flatMap((agentId) =>
			daysBetween(schedule.startDate, schedule.endDate)
				.filter(
					(date) =>
						!absenceOf(agentId, date) &&
						!db.shifts.some(
							(shift) =>
								shift.scheduleId === id &&
								shift.agentId === agentId &&
								shift.workingDate === date,
						),
				)
				.map((date) => ({
					agentId,
					date,
				})),
		);
		if (unplanned.length && body.fill_days_off === undefined) {
			refuse(
				400,
				'service.working_schedule.unplanned_days',
				`${unplanned.length} unplanned days`,
			);
		}
		if (state === ScheduleState.Active) {
			const violations: WireViolation[] = db.schedules
				.filter(
					(other) =>
						other.id !== id &&
						other.teamId === schedule.teamId &&
						other.state === ScheduleState.Active &&
						other.startDate <= schedule.endDate &&
						schedule.startDate <= other.endDate,
				)
				.map((other) => ({
					reason: 'storage.working_schedule.team_active',
					schedule: scheduleLookup(other),
				}));
			if (violations.length) {
				refuse(
					400,
					'storage.working_schedule.activation_refused',
					'the schedule cannot be activated',
					violations,
				);
			}
		}
		if (body.fill_days_off && unplanned.length) {
			writeAbsences(
				unplanned.map((day) => ({
					...day,
					type: AbsenceType.DayOff,
				})),
				false,
			);
			filledDays = unplanned.length;
		}
	}
	schedule.state = state;
	schedule.version += 1;
	return {
		item: toWireScheduleItem(schedule),
		filled_days: filledDays,
	};
});

on(
	'patch',
	'/wfm/lookups/working_schedules/:id/block_outside_activity',
	([id], _p, body) => {
		const schedule = findSchedule(id);
		assertNotArchived(schedule);
		assertEtag(
			schedule.version,
			body.etag,
			'storage.working_schedule.version_conflict',
		);
		schedule.isBlockOutsideActivity = !!body.block_outside_activity;
		schedule.version += 1;
		return {
			item: toWireScheduleItem(schedule),
		};
	},
);

/* [Claude] ---------------------------------------------------------------- Adapter */

const respond = (
	config: InternalAxiosRequestConfig,
	status: number,
	data: unknown,
): AxiosResponse => ({
	data,
	status,
	statusText: String(status),
	headers: {},
	config,
});

const mockAdapter = async (
	config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> => {
	await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
	const method = (config.method || 'get').toLowerCase();
	const path = (config.url || '').split('?')[0];
	const body =
		typeof config.data === 'string'
			? JSON.parse(config.data)
			: config.data || {};
	for (const [routeMethod, pattern, handler] of routes) {
		const match = routeMethod === method && path.match(pattern);
		if (!match) continue;
		try {
			return respond(
				config,
				200,
				handler(match.slice(1), config.params || {}, body),
			);
		} catch (error) {
			if (!(error instanceof MockRefusal)) throw error;
			const response = respond(config, error.status, {
				id: error.id,
				code: error.status,
				status: 'error',
				detail: error.violations.length
					? JSON.stringify({
							text: error.text,
							violations: error.violations,
						})
					: error.text,
			});
			throw new AxiosError(
				error.text,
				String(error.status),
				config,
				null,
				response,
			);
		}
	}
	throw new AxiosError(
		`mock: no route ${method} ${path}`,
		'404',
		config,
		null,
		respond(config, 404, {
			id: 'mock.route',
			detail: `no route ${method} ${path}`,
		}),
	);
};

let instance: AxiosInstance | undefined;

export const getMockHttp = (): AxiosInstance => {
	instance ??= axios.create({
		adapter: mockAdapter,
	});
	return instance;
};
