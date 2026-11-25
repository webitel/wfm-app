// [Claude] AgentAbsenceService (wfm/agent_absence.proto, PR 532).
import type { DayKey } from '../../utils/day';
import type {
	AbsenceType,
	AgentAbsences,
	AgentsFilters,
	DeletedShift,
	Page,
	WireAbsence,
	WireAgentAbsences,
	WireDeletedShift,
	WireInt64,
} from './types';
import { wfmRequest } from './wfmHttp';
import {
	fromWireAbsence,
	fromWireAgentAbsences,
	fromWireDeletedShift,
	toWireDay,
} from './wire';

export interface SearchAgentsAbsencesParams extends AgentsFilters {
	from: DayKey;
	to: DayKey;
	page?: number;
	size?: number;
	sort?: '+name' | '-name';
}

// [Claude] Every agent the user has access to, with their absences over the period.
const searchAgentsAbsences = async ({
	from,
	to,
	q,
	teamIds,
	supervisorIds,
	skillIds,
	page,
	size,
	sort,
}: SearchAgentsAbsencesParams): Promise<Page<AgentAbsences>> => {
	const data = await wfmRequest<{
		items?: WireAgentAbsences[];
		next?: boolean;
		total?: WireInt64;
	}>((http) =>
		http.get('/wfm/agents/absences', {
			params: {
				'date.from': toWireDay(from),
				'date.to': toWireDay(to),
				q: q || undefined,
				team_id: teamIds,
				supervisor_id: supervisorIds,
				skill_id: skillIds,
				page,
				size,
				sort,
			},
		}),
	);
	return {
		items: (data.items || []).map(fromWireAgentAbsences),
		next: !!data.next,
		total: Number(data.total || 0),
	};
};

// [Claude] Sets the absence of one day; adding and changing the type is the same call.
// [Claude] Without deleteShifts a day with shifts is refused (storage.absence.shifts_to_delete).
const setAgentAbsence = async ({
	agentId,
	type,
	date,
	deleteShifts = false,
}: {
	agentId: string;
	type: AbsenceType;
	date: DayKey;
	deleteShifts?: boolean;
}) => {
	const data = await wfmRequest<{
		item?: WireAbsence;
		deleted_shifts?: WireDeletedShift[];
	}>((http) =>
		http.post(`/wfm/agents/${agentId}/absences`, {
			item: {
				type_id: type,
				absent_at: toWireDay(date),
			},
			delete_shifts: deleteShifts,
		}),
	);
	return {
		item: fromWireAbsence(data.item || {}),
		deletedShifts: (data.deleted_shifts || []).map(fromWireDeletedShift),
	};
};

const deleteAgentAbsence = ({ agentId, id }: { agentId: string; id: string }) =>
	wfmRequest((http) => http.delete(`/wfm/agents/${agentId}/absences/${id}`));

// [Claude] Absences of several types over ranges of dates for several agents.
const createAgentsAbsences = async ({
	agentIds,
	items,
	deleteShifts = false,
}: {
	agentIds: string[];
	items: {
		type: AbsenceType;
		from: DayKey;
		to: DayKey;
	}[];
	deleteShifts?: boolean;
}): Promise<{
	deletedShifts: DeletedShift[];
}> => {
	const data = await wfmRequest<{
		deleted_shifts?: WireDeletedShift[];
	}>((http) =>
		http.post('/wfm/agents/absences', {
			agent_ids: agentIds,
			items: items.map((item) => ({
				type_id: item.type,
				date_from: toWireDay(item.from),
				date_to: toWireDay(item.to),
			})),
			delete_shifts: deleteShifts,
		}),
	);
	return {
		deletedShifts: (data.deleted_shifts || []).map(fromWireDeletedShift),
	};
};

export const AbsencesAPI = {
	searchAgentsAbsences,
	setAgentAbsence,
	deleteAgentAbsence,
	createAgentsAbsences,
};
