// [Claude] Options of the selects (team, calendar, skill, agent, supervisor, pause cause).
// [Claude] Real ones come from the api-services clients; with VITE_WFM_MOCK=true from the mock,
// [Claude] whose ids match the mock schedules.
import {
	AgentPauseCausesAPI,
	AgentSkillsAPI,
	AgentsAPI,
	CalendarsAPI,
	SkillsAPI,
	TeamsAPI,
} from '@webitel/api-services/api';

import type { Lookup, Page } from './types';

export interface LookupParams {
	search?: string;
	page?: number;
	size?: number;
}

export type LookupKind =
	| 'teams'
	| 'calendars'
	| 'skills'
	| 'agents'
	| 'supervisors'
	| 'pauseCauses';

type ListResponse = {
	items?: {
		id?: string | number;
		name?: string;
	}[];
	next?: boolean;
};

const toPage = (response: ListResponse): Page<Lookup> => ({
	items: (response.items || []).map((item) => ({
		id: String(item.id),
		name: item.name || '',
	})),
	next: !!response.next,
});

const REAL: Record<
	LookupKind,
	(params: LookupParams) => Promise<ListResponse>
> = {
	teams: (params) => TeamsAPI.getLookup(params),
	calendars: (params) => CalendarsAPI.getLookup(params),
	skills: (params) => SkillsAPI.getLookup(params),
	agents: (params) => AgentsAPI.getLookup(params),
	supervisors: (params) =>
		AgentsAPI.getSupervisorOptions({
			...params,
			fields: [
				'id',
				'name',
			],
		}),
	pauseCauses: (params) => AgentPauseCausesAPI.getLookup(params),
};

export const searchLookup =
	(kind: LookupKind) =>
	async (params: LookupParams = {}): Promise<Page<Lookup>> => {
		if (import.meta.env.VITE_WFM_MOCK === 'true') {
			const { searchMockLookup } = await import('./mock/mockDb');
			return searchMockLookup(kind, params);
		}
		return toPage(await REAL[kind](params));
	};

// [Claude] Skills of one agent, to preset the Skills tab of Add shifts (US_05.14).
export const getAgentSkills = async (agentId: string): Promise<Lookup[]> => {
	if (import.meta.env.VITE_WFM_MOCK === 'true') {
		const { mockAgentSkills } = await import('./mock/mockDb');
		return mockAgentSkills(agentId);
	}
	const response = await AgentSkillsAPI.getList({
		parentId: agentId,
		size: 100,
	});
	return (response.items || []).map(
		(item: {
			skill?: {
				id?: string | number;
				name?: string;
			};
		}) => ({
			id: String(item.skill?.id),
			name: item.skill?.name || '',
		}),
	);
};
