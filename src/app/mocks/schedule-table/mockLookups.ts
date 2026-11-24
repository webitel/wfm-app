import type { LookupEntity } from '../../components/schedule-table/types';
import { getMockDb } from './mockServer';

// [Claude] Lookups of the modals' selects, in the `searchMethod` shape of wt-single-select /
// [Claude] wt-multi-select. Not part of the WFM contract: in the real app they come from
// [Claude] other services (agents, skills, agent pause causes) via @webitel/api-services.

interface LookupParams {
	search?: string;
	id?: string[];
}

const LATENCY_MS = 150;

const searchLookup = (list: LookupEntity[], params: LookupParams = {}) =>
	new Promise<{
		items: LookupEntity[];
		next: boolean;
	}>((resolve) => {
		setTimeout(() => {
			const q = params.search?.trim().toLowerCase();
			resolve({
				items: list
					.filter((item) => !params.id?.length || params.id.includes(item.id))
					.filter((item) => !q || item.name.toLowerCase().includes(q))
					.slice(0, 50)
					.map(({ id, name }) => ({
						id,
						name,
					})),
				next: false,
			});
		}, LATENCY_MS);
	});

export const searchAgentsLookup = (params?: LookupParams) =>
	searchLookup(getMockDb().agents, params);

// [Claude] Agents of one schedule: the Agents tab of Add shifts picks only from them.
export const searchScheduleAgentsLookup =
	(scheduleId: string) => (params?: LookupParams) => {
		const db = getMockDb();
		const ids = db.schedules.get(scheduleId)?.agentIds || [];
		return searchLookup(
			db.agents.filter((a) => ids.includes(a.id)),
			params,
		);
	};

export const searchCalendarsLookup = (params?: LookupParams) =>
	searchLookup(getMockDb().calendars, params);

export const searchSkillsLookup = (params?: LookupParams) =>
	searchLookup(getMockDb().skills, params);

export const searchPauseCausesLookup = (params?: LookupParams) =>
	searchLookup(getMockDb().pauseCauses, params);

// [Claude] Filters of the Agents section (US_02.03).
export const searchTeamsLookup = (params?: LookupParams) =>
	searchLookup(getMockDb().teams, params);

export const searchSupervisorsLookup = (params?: LookupParams) =>
	searchLookup(getMockDb().supervisors, params);

// [Claude] Agents the Add agents modal offers: not in the schedule yet, by team and skill.
export const searchAgentsToAddLookup =
	(scheduleId: string) =>
	(
		params: LookupParams & {
			teamId?: string;
			skillId?: string;
		} = {},
	) => {
		const db = getMockDb();
		const ids = db.schedules.get(scheduleId)?.agentIds || [];
		return searchLookup(
			db.agents
				.filter((a) => !ids.includes(a.id))
				.filter((a) => !params.teamId || a.team.id === params.teamId)
				.filter(
					(a) =>
						!params.skillId || a.skills.some((s) => s.id === params.skillId),
				),
			params,
		);
	};
