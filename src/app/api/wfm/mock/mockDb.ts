// [Claude] In-memory data of the WFM mock (VITE_WFM_MOCK=true): teams, calendars, agents,
// [Claude] absences, schedules and shifts, generated once per page load around today.
// [Claude] Kept in app-model shapes; mockHttp turns them into the wire contract of PR 532.
// [Claude] localStorage 'wfm-mock-agents' sets how many agents there are (load checks).
import {
	addDays,
	addMonths,
	type DayKey,
	dayOfWeek,
	daysBetween,
	daysInMonth,
	isWeekend,
	startOfMonth,
	todayIn,
	wallToMs,
} from '../../../utils/day';
import type { LookupKind, LookupParams } from '../lookupsApi';
import {
	AbsenceType,
	type Lookup,
	type MinutesRange,
	type Page,
	ScheduleState,
	type ShiftPause,
	type ShiftSkill,
} from '../types';

export const MOCK_TIME_ZONE = 'Europe/Kyiv';
const DEFAULT_MOCK_AGENTS_COUNT = 36;

export interface MockAgent extends Lookup {
	teamId: string;
	supervisorId: string;
	skillIds: string[];
}

export interface MockCalendar extends Lookup {
	timeZone: string;
	week: Record<number, MinutesRange[]>;
	holidays: {
		date: DayKey;
		name: string;
	}[];
}

export interface MockAbsence {
	id: string;
	agentId: string;
	type: AbsenceType;
	date: DayKey;
}

export interface MockSchedule {
	id: string;
	name: string;
	state: ScheduleState;
	teamId: string;
	calendarId: string;
	startDate: DayKey;
	endDate: DayKey;
	timelineFrom: number | null;
	timelineTo: number | null;
	extraSkillIds: string[];
	isBlockOutsideActivity: boolean;
	agentIds: string[];
	version: number;
}

export interface MockShift {
	id: string;
	scheduleId: string;
	agentId: string;
	startAt: number;
	endAt: number;
	workingDate: DayKey;
	pauses: ShiftPause[];
	skills: ShiftSkill[];
	version: number;
}

const FIRST_NAMES = [
	'Anna',
	'Bohdan',
	'Daria',
	'Dmytro',
	'Iryna',
	'Kateryna',
	'Maksym',
	'Mariia',
	'Mykola',
	'Nataliia',
	'Oleh',
	'Olena',
];
const LAST_NAMES = [
	'Kovalenko',
	'Shevchenko',
	'Melnyk',
	'Bondarenko',
	'Tkachenko',
	'Kravchenko',
	'Oliinyk',
	'Shevchuk',
	'Polishchuk',
	'Lysenko',
	'Rudenko',
	'Savchenko',
];

const lookups = {
	teams: [
		{
			id: '1',
			name: 'Sales',
		},
		{
			id: '2',
			name: 'Support',
		},
		{
			id: '3',
			name: 'Collection',
		},
	],
	skills: [
		{
			id: '11',
			name: 'Inbound',
		},
		{
			id: '12',
			name: 'Outbound',
		},
		{
			id: '13',
			name: 'Chats',
		},
		{
			id: '14',
			name: 'Collection',
		},
		{
			id: '15',
			name: 'VIP',
		},
	],
	pauseCauses: [
		{
			id: '21',
			name: 'Lunch',
		},
		{
			id: '22',
			name: 'Break',
		},
		{
			id: '23',
			name: 'Training',
		},
	],
} satisfies Record<string, Lookup[]>;

const OFFICE_DAY: MinutesRange[] = [
	{
		start: 540,
		end: 1080,
	},
];

const today = todayIn(MOCK_TIME_ZONE);
const thisMonth = startOfMonth(today);
const nextMonth = addMonths(thisMonth, 1);
const lastMonth = addMonths(thisMonth, -1);
const monthEnd = (first: DayKey) => addDays(first, daysInMonth(first) - 1);

const calendars: MockCalendar[] = [
	{
		id: '31',
		name: 'Office Mon–Fri 9–18',
		timeZone: MOCK_TIME_ZONE,
		week: {
			0: [],
			1: OFFICE_DAY,
			2: OFFICE_DAY,
			3: OFFICE_DAY,
			4: OFFICE_DAY,
			5: OFFICE_DAY,
			6: [],
		},
		holidays: [
			{
				date: `${today.slice(0, 4)}-12-25`,
				name: 'Christmas',
			},
			{
				date: addDays(thisMonth, 14),
				name: 'Company day',
			},
		],
	},
	{
		id: '32',
		name: '24/7',
		timeZone: MOCK_TIME_ZONE,
		week: Object.fromEntries(
			[
				0,
				1,
				2,
				3,
				4,
				5,
				6,
			].map((day) => [
				day,
				[
					{
						start: 0,
						end: 1440,
					},
				],
			]),
		),
		holidays: [],
	},
];

const agentsCount = (() => {
	try {
		return (
			Number(localStorage.getItem('wfm-mock-agents')) ||
			DEFAULT_MOCK_AGENTS_COUNT
		);
	} catch {
		return DEFAULT_MOCK_AGENTS_COUNT;
	}
})();

const agents: MockAgent[] = Array.from(
	{
		length: agentsCount,
	},
	(_, index) => {
		const round = Math.floor(index / (FIRST_NAMES.length * LAST_NAMES.length));
		const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${
			LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]
		}${round ? ` ${round + 1}` : ''}`;
		return {
			id: String(100 + index),
			name,
			teamId: lookups.teams[index % 3].id,
			// [Claude] The first three agents supervise the rest.
			supervisorId: String(100 + (index % 3)),
			skillIds: [
				lookups.skills[index % 5].id,
				lookups.skills[(index + 2) % 5].id,
			],
		};
	},
);

let nextId = 1000;
export const newId = () => String(nextId++);

export const db = {
	agents,
	calendars,
	absences: [] as MockAbsence[],
	schedules: [] as MockSchedule[],
	shifts: [] as MockShift[],
};

export const teamAgentIds = (teamId: string) =>
	agents.filter((agent) => agent.teamId === teamId).map((agent) => agent.id);

export const findAgent = (id: string) =>
	agents.find((agent) => agent.id === id);
export const findCalendar = (id: string) =>
	calendars.find((calendar) => calendar.id === id);
export const lookupName = (kind: keyof typeof lookups, id: string): Lookup => ({
	id,
	name: lookups[kind].find((item) => item.id === id)?.name || '',
});

const addSchedule = (
	schedule: Omit<MockSchedule, 'id' | 'version' | 'agentIds'>,
): MockSchedule => {
	const item = {
		...schedule,
		id: newId(),
		version: 1,
		agentIds: teamAgentIds(schedule.teamId),
	};
	db.schedules.push(item);
	return item;
};

// [Claude] Office shifts 9–18 with a lunch at 13:00 on the calendar's working days.
const fillOfficeShifts = (schedule: MockSchedule, from: DayKey, to: DayKey) => {
	const calendar = findCalendar(schedule.calendarId);
	if (!calendar) return;
	for (const agentId of schedule.agentIds) {
		for (const day of daysBetween(from, to)) {
			if (!calendar.week[dayOfWeek(day)]?.length) continue;
			if (db.absences.some((a) => a.agentId === agentId && a.date === day)) {
				continue;
			}
			db.shifts.push({
				id: newId(),
				scheduleId: schedule.id,
				agentId,
				startAt: wallToMs(day, 540, calendar.timeZone),
				endAt: wallToMs(day, 1080, calendar.timeZone),
				workingDate: day,
				pauses: [
					{
						id: newId(),
						startAt: wallToMs(day, 780, calendar.timeZone),
						endAt: wallToMs(day, 840, calendar.timeZone),
						cause: lookups.pauseCauses[0],
					},
				],
				skills: [],
				version: 1,
			});
		}
	}
};

const seed = () => {
	// [Claude] A few absences around today for every third agent.
	const types = [
		AbsenceType.DayOff,
		AbsenceType.Vacation,
		AbsenceType.SickDay,
	];
	agents.forEach((agent, index) => {
		if (index % 3) return;
		for (let shift = 0; shift < 2; shift += 1) {
			db.absences.push({
				id: newId(),
				agentId: agent.id,
				type: types[(index + shift) % 3],
				date: addDays(today, (index % 7) - 3 + shift),
			});
		}
	});

	const active = addSchedule({
		name: `Support — ${thisMonth.slice(0, 7)}`,
		state: ScheduleState.Active,
		teamId: '2',
		calendarId: '31',
		startDate: thisMonth,
		endDate: monthEnd(thisMonth),
		timelineFrom: null,
		timelineTo: null,
		extraSkillIds: [],
		isBlockOutsideActivity: false,
	});
	fillOfficeShifts(active, thisMonth, monthEnd(thisMonth));

	// [Claude] Overlaps the active one by its last working day only: that day is locked for the
	// [Claude] same agents (US_05.03), the rest of the draft is free to plan.
	let overlapDay = monthEnd(thisMonth);
	while (isWeekend(overlapDay)) overlapDay = addDays(overlapDay, -1);
	const draft = addSchedule({
		name: `Support — ${nextMonth.slice(0, 7)}`,
		state: ScheduleState.Draft,
		teamId: '2',
		calendarId: '31',
		startDate: overlapDay,
		endDate: monthEnd(nextMonth),
		timelineFrom: 480,
		timelineTo: 1200,
		extraSkillIds: [],
		isBlockOutsideActivity: false,
	});
	fillOfficeShifts(draft, nextMonth, addDays(nextMonth, 6));

	addSchedule({
		name: `Sales — ${nextMonth.slice(0, 7)}`,
		state: ScheduleState.Draft,
		teamId: '1',
		calendarId: '32',
		startDate: nextMonth,
		endDate: monthEnd(nextMonth),
		timelineFrom: null,
		timelineTo: null,
		extraSkillIds: [
			'15',
		],
		isBlockOutsideActivity: true,
	});

	const archived = addSchedule({
		name: `Collection — ${lastMonth.slice(0, 7)}`,
		state: ScheduleState.Archived,
		teamId: '3',
		calendarId: '31',
		startDate: lastMonth,
		endDate: monthEnd(lastMonth),
		timelineFrom: 480,
		timelineTo: 1200,
		extraSkillIds: [],
		isBlockOutsideActivity: false,
	});
	fillOfficeShifts(archived, lastMonth, monthEnd(lastMonth));
};

seed();

/* [Claude] --------------------------------------------------------------- Lookups */

const pageOf = <T>(items: T[], page = 1, size = 10): Page<T> => ({
	items: items.slice((page - 1) * size, page * size),
	next: items.length > page * size,
});

const toLookup = ({ id, name }: Lookup): Lookup => ({
	id,
	name,
});

export const searchMockLookup = (
	kind: LookupKind,
	{ search = '', page = 1, size = 10 }: LookupParams,
): Page<Lookup> => {
	const source: Record<LookupKind, Lookup[]> = {
		teams: lookups.teams,
		calendars: calendars.map(toLookup),
		skills: lookups.skills,
		agents: agents.map(toLookup),
		supervisors: agents.slice(0, 3).map(toLookup),
		pauseCauses: lookups.pauseCauses,
	};
	const query = search.replaceAll('*', '').toLowerCase();
	return pageOf(
		source[kind].filter((item) => item.name.toLowerCase().includes(query)),
		page,
		size,
	);
};

export const mockAgentSkills = (agentId: string): Lookup[] =>
	(findAgent(agentId)?.skillIds || []).map((id) => lookupName('skills', id));

// [Claude] Agents needed in an hour; a team without a forecast calculation (Collection) has none.
export const forecastAgents = (teamId: string, startAt: number): number => {
	if (teamId === '3') return 0;
	const hour = new Date(startAt).getUTCHours();
	return 2 + ((hour * 7 + Number(teamId) * 3) % 6);
};
