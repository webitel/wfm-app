import {
	WfmAbsenceType,
	WfmWorkingScheduleState,
} from '@webitel/api-services/gen/models';
import {
	type CalendarShift,
	type DayKey,
	type Holiday,
	type LookupEntity,
	type ScheduleCalendar,
} from '../../components/schedule-table/types';
import {
	addDays,
	daysBetween,
	endOfMonth,
	startOfMonth,
	todayKey,
	weekday,
	zonedTimeToUtcMs,
} from '../../components/schedule-table/utils/date';
import type { ScheduleLogOperation } from '../../enums';

// [Claude] Deterministic fake data for the calendar prototype (WFM-72), until the
// [Claude] backend of webitel/protos#532 exists. `?mockAgents=300` in the URL sets the size.

export interface MockAgent extends LookupEntity {
	team: LookupEntity;
	supervisor: LookupEntity;
	skills: LookupEntity[];
}

export interface MockAbsence {
	id: string;
	agentId: string;
	date: DayKey;
	type: WfmAbsenceType;
}

export type MockCalendar = ScheduleCalendar & {
	id: string;
	name: string;
};

export interface MockSchedule {
	id: string;
	name: string;
	state: WfmWorkingScheduleState;
	team: LookupEntity;
	calendar: MockCalendar;
	from: DayKey;
	to: DayKey;
	timeline: {
		from: number;
		to: number;
	};
	extraSkills: LookupEntity[];
	blockOutsideActivity: boolean;
	agentIds: string[];
	etag: string;
	// [Claude] agentId -> shifts
	shifts: Map<string, CalendarShift[]>;
	// [Claude] Records of the schedule's history, newest last.
	history: MockScheduleLog[];
}

export interface MockScheduleLog {
	id: string;
	createdAt: number;
	operation: ScheduleLogOperation;
	agent?: LookupEntity;
}

export interface MockDb {
	agents: MockAgent[];
	absences: Map<string, MockAbsence>; // [Claude] key `${agentId}:${date}`
	schedules: Map<string, MockSchedule>;
	holidays: Holiday[];
	skills: LookupEntity[];
	pauseCauses: LookupEntity[];
	teams: LookupEntity[];
	supervisors: LookupEntity[];
	// [Claude] Calendars a schedule can use (Create schedule dialog).
	calendars: MockCalendar[];
	seq: number;
}

const FIRST_NAMES = [
	'Olena',
	'Ivan',
	'Maria',
	'Taras',
	'Iryna',
	'Andrii',
	'Sofiia',
	'Dmytro',
	'Kateryna',
	'Oleh',
	'Yuliia',
	'Bohdan',
	'Nataliia',
	'Serhii',
	'Viktoriia',
	'Roman',
];
const LAST_NAMES = [
	'Shevchenko',
	'Kovalenko',
	'Bondarenko',
	'Tkachenko',
	'Kravchenko',
	'Oliinyk',
	'Melnyk',
	'Moroz',
	'Lysenko',
	'Marchenko',
	'Savchenko',
	'Rudenko',
];

// [Claude] mulberry32: small seeded PRNG so every reload shows the same data.
const createRandom = (seed: number) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const TIME_ZONE = 'Europe/Kyiv';

// [Claude] SPIKE (WFM-131) load check: two of three agents are in Support L1, so 450 agents
// [Claude] give its draft schedule ~300 rows (plus two from Sales).
const DEFAULT_MOCK_AGENTS_COUNT = 450;

export const mockAgentsCount = () => {
	if (typeof window === 'undefined') return DEFAULT_MOCK_AGENTS_COUNT;
	const fromUrl = Number(
		new URLSearchParams(window.location.search).get('mockAgents'),
	);
	return fromUrl > 0 ? fromUrl : DEFAULT_MOCK_AGENTS_COUNT;
};

export const createShift = (
	db: MockDb,
	day: DayKey,
	start: number,
	end: number,
	timeZone: string,
	pauses: {
		start: number;
		duration: number;
		cause?: LookupEntity;
	}[] = [],
	skills: CalendarShift['skills'] = [],
): CalendarShift => {
	const endDay = end <= start ? addDays(day, 1) : day;
	const startAt = zonedTimeToUtcMs(day, start, timeZone);
	const endAt = zonedTimeToUtcMs(endDay, end, timeZone);
	db.seq += 1;
	const id = String(db.seq);
	return {
		id,
		etag: `${id}-1`,
		startAt,
		endAt,
		skills,
		pauses: pauses
			.map((pause) => {
				// [Claude] A pause after midnight in a night shift belongs to the next calendar day.
				const pauseDay = pause.start < start && end <= start ? endDay : day;
				const pauseStart = zonedTimeToUtcMs(pauseDay, pause.start, timeZone);
				db.seq += 1;
				return {
					id: String(db.seq),
					startAt: pauseStart,
					endAt: pauseStart + pause.duration * 60_000,
					cause: pause.cause,
				};
			})
			.filter((pause) => pause.startAt >= startAt && pause.endAt <= endAt),
	};
};

export const generateMockDb = (agentsCount = mockAgentsCount()): MockDb => {
	const random = createRandom(42);
	const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];

	const teams = [
		{
			id: '11',
			name: 'Support L1',
		},
		{
			id: '12',
			name: 'Sales',
		},
		{
			id: '13',
			name: 'Collection',
		},
	];
	const supervisors = [
		{
			id: '21',
			name: 'Halyna Supervisor',
		},
		{
			id: '22',
			name: 'Petro Supervisor',
		},
	];
	const skills = [
		{
			id: '31',
			name: 'Inbound',
		},
		{
			id: '32',
			name: 'Outbound',
		},
		{
			id: '33',
			name: 'Collection',
		},
		{
			id: '34',
			name: 'Chat',
		},
	];
	const pauseCauses = [
		{
			id: '41',
			name: 'Lunch',
		},
		{
			id: '42',
			name: 'Coffee break',
		},
		{
			id: '43',
			name: 'Training',
		},
	];

	const agents: MockAgent[] = Array.from(
		{
			length: agentsCount,
		},
		(_, i) => ({
			id: String(1000 + i),
			name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}${i >= FIRST_NAMES.length * LAST_NAMES.length ? ` ${i}` : ''}`,
			team: teams[i % 3 === 2 ? 1 : 0],
			supervisor: pick(supervisors),
			skills: skills.filter(() => random() > 0.5).slice(0, 2),
		}),
	);

	const db: MockDb = {
		agents,
		absences: new Map(),
		schedules: new Map(),
		holidays: [],
		skills,
		pauseCauses,
		teams,
		supervisors,
		calendars: [],
		// [Claude] Ids of shifts, pauses and absences, int64 as on the wire.
		seq: 100000,
	};

	const today = todayKey();
	const monthFrom = startOfMonth(today);
	const monthTo = endOfMonth(today);
	const nextMonthTo = endOfMonth(addDays(monthTo, 1));

	db.holidays = [
		{
			date: addDays(monthFrom, 13),
			name: 'Mock holiday',
		},
		{
			date: addDays(monthTo, 25),
			name: 'Another holiday',
		},
	];

	// [Claude] Absences over the previous, current and next month.
	daysBetween(addDays(monthFrom, -31), nextMonthTo).forEach((date) => {
		agents.forEach((agent) => {
			const r = random();
			if (r > 0.94) {
				db.seq += 1;
				const type =
					r > 0.985
						? WfmAbsenceType.AbsenceTypeSickday
						: r > 0.965
							? WfmAbsenceType.AbsenceTypeVacation
							: WfmAbsenceType.AbsenceTypeDayoff;
				db.absences.set(`${agent.id}:${date}`, {
					id: String(db.seq),
					agentId: agent.id,
					date,
					type,
				});
			}
		});
	});

	const workWeek = {
		0: [],
		1: [
			{
				start: 540,
				end: 1080,
			},
		],
		2: [
			{
				start: 540,
				end: 1080,
			},
		],
		3: [
			{
				start: 540,
				end: 1080,
			},
		],
		4: [
			{
				start: 540,
				end: 1080,
			},
		],
		5: [
			{
				start: 540,
				end: 1080,
			},
		],
		6: [],
	};

	db.calendars = [
		{
			id: '51',
			name: 'Kyiv office',
			timeZone: TIME_ZONE,
			week: workWeek,
		},
		{
			id: '52',
			name: 'Warsaw office',
			timeZone: 'Europe/Warsaw',
			week: workWeek,
		},
	];

	const supportAgents = agents
		.filter((a) => a.team.id === teams[0].id)
		.map((a) => a.id);
	const salesAgents = agents
		.filter((a) => a.team.id === teams[1].id)
		.map((a) => a.id);

	const makeSchedule = (
		id: string,
		name: string,
		state: WfmWorkingScheduleState,
		team: LookupEntity,
		from: DayKey,
		to: DayKey,
		agentIds: string[],
	): MockSchedule => ({
		id,
		name,
		state,
		team,
		calendar: db.calendars[0],
		from,
		to,
		timeline: {
			from: 7 * 60,
			to: 22 * 60,
		},
		extraSkills: [],
		blockOutsideActivity: false,
		agentIds,
		etag: `${id}-1`,
		shifts: new Map(),
		history: [],
	});

	const draft = makeSchedule(
		'1',
		`${teams[0].name} — draft`,
		WfmWorkingScheduleState.WorkingScheduleStateDraft,
		teams[0],
		monthFrom,
		nextMonthTo,
		// [Claude] Plus two agents from another team, added by hand.
		[
			...supportAgents,
			...salesAgents.slice(0, 2),
		],
	);
	const active = makeSchedule(
		'2',
		`${teams[1].name} — active`,
		WfmWorkingScheduleState.WorkingScheduleStateActive,
		teams[1],
		monthFrom,
		monthTo,
		salesAgents,
	);
	const archived = makeSchedule(
		'3',
		`${teams[0].name} — archived`,
		WfmWorkingScheduleState.WorkingScheduleStateArchived,
		teams[0],
		addDays(monthFrom, -31),
		addDays(monthFrom, -1),
		supportAgents,
	);

	const fillShifts = (schedule: MockSchedule, density: number) => {
		schedule.agentIds.forEach((agentId) => {
			const list: CalendarShift[] = [];
			daysBetween(schedule.from, schedule.to).forEach((day) => {
				if (db.absences.has(`${agentId}:${day}`)) return;
				if (!workWeek[weekday(day)].length) return;
				if (random() > density) return;
				const night = random() > 0.95;
				const start = night
					? 22 * 60
					: pick([
							8 * 60,
							9 * 60,
							10 * 60,
						]);
				const end = night ? 6 * 60 : start + 9 * 60;
				list.push(
					createShift(
						db,
						day,
						start,
						end,
						TIME_ZONE,
						night
							? [
									{
										start: 2 * 60,
										duration: 30,
										cause: pauseCauses[1],
									},
								]
							: [
									{
										start: start + 4 * 60,
										duration: 60,
										cause: pauseCauses[0],
									},
									{
										start: start + 2 * 60,
										duration: 15,
									},
								],
						[
							{
								skill: skills[0],
								enabled: true,
							},
						],
					),
				);
			});
			schedule.shifts.set(agentId, list);
		});
	};

	fillShifts(draft, 0.45);
	fillShifts(active, 0.8);
	fillShifts(archived, 0.85);

	[
		draft,
		active,
		archived,
	].forEach((schedule) => {
		db.schedules.set(schedule.id, schedule);
	});

	return db;
};
