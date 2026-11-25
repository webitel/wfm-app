// [Claude] WorkingScheduleService (wfm/working_schedule.proto, PR 532).
import type { DayKey } from '../../utils/day';
import type {
	ForecastHour,
	Lookup,
	Page,
	PlannedDay,
	PlannedSlot,
	ScheduleState,
	WireInt64,
	WireLookup,
	WireWorkingSchedule,
	WorkingSchedule,
} from './types';
import { wfmRequest } from './wfmHttp';
import {
	fromWireForecastHour,
	fromWireLookup,
	fromWirePlannedDay,
	fromWirePlannedSlot,
	fromWireSchedule,
	toWireDay,
	toWireLookup,
	toWireSchedule,
} from './wire';

const BASE = '/wfm/lookups/working_schedules';

// [Claude] States sort as active, pending, draft, archived.
export type ScheduleSort = '+name' | '-name' | '+state' | '-state';

const dateParams = (from: DayKey, to: DayKey) => ({
	params: {
		'date.from': toWireDay(from),
		'date.to': toWireDay(to),
	},
});

const search = async ({
	q,
	page,
	size,
	sort,
}: {
	q?: string;
	page?: number;
	size?: number;
	sort?: ScheduleSort;
}): Promise<Page<WorkingSchedule>> => {
	const data = await wfmRequest<{
		items?: WireWorkingSchedule[];
		next?: boolean;
	}>((http) =>
		http.get(BASE, {
			params: {
				q: q || undefined,
				page,
				size,
				sort,
			},
		}),
	);
	return {
		items: (data.items || []).map(fromWireSchedule),
		next: !!data.next,
	};
};

const read = async (id: string): Promise<WorkingSchedule> => {
	const data = await wfmRequest<{
		item?: WireWorkingSchedule;
	}>((http) => http.get(`${BASE}/${id}`));
	return fromWireSchedule(data.item || {});
};

// [Claude] A new schedule is a draft with every agent of the team.
const create = async (
	item: Partial<WorkingSchedule>,
): Promise<WorkingSchedule> => {
	const data = await wfmRequest<{
		item?: WireWorkingSchedule;
	}>((http) =>
		http.post(BASE, {
			item: toWireSchedule(item),
		}),
	);
	return fromWireSchedule(data.item || {});
};

// [Claude] Draft only, with the etag; team / calendar / dates changes clear shifts.
const update = async (item: WorkingSchedule): Promise<WorkingSchedule> => {
	const data = await wfmRequest<{
		item?: WireWorkingSchedule;
	}>((http) =>
		http.put(`${BASE}/${item.id}`, {
			item: toWireSchedule(item),
		}),
	);
	return fromWireSchedule(data.item || {});
};

const remove = (id: string) =>
	wfmRequest((http) => http.delete(`${BASE}/${id}`));

const addAgents = async (id: string, agents: Lookup[]): Promise<Lookup[]> => {
	const data = await wfmRequest<{
		agents?: WireLookup[];
	}>((http) =>
		http.post(`${BASE}/${id}/agents`, {
			agents: agents.map(toWireLookup),
		}),
	);
	return (data.agents || []).map(fromWireLookup);
};

const removeAgent = (id: string, agentId: string) =>
	wfmRequest((http) => http.delete(`${BASE}/${id}/agents/${agentId}`));

const readForecast = async (
	id: string,
	from: DayKey,
	to: DayKey,
): Promise<ForecastHour[]> => {
	const data = await wfmRequest<{
		items?: {
			date?: WireInt64;
			start_at?: WireInt64;
			agents?: number;
		}[];
	}>((http) => http.get(`${BASE}/${id}/forecast`, dateParams(from, to)));
	return (data.items || []).map(fromWireForecastHour);
};

const readPlanned = async (
	id: string,
	from: DayKey,
	to: DayKey,
): Promise<{
	slots: PlannedSlot[];
	days: PlannedDay[];
}> => {
	const data = await wfmRequest<{
		slots?: {
			start_at?: WireInt64;
			agents?: number;
		}[];
		days?: {
			date?: WireInt64;
			agents?: number;
		}[];
	}>((http) => http.get(`${BASE}/${id}/planned`, dateParams(from, to)));
	return {
		slots: (data.slots || []).map(fromWirePlannedSlot),
		days: (data.days || []).map(fromWirePlannedDay),
	};
};

// [Claude] Pending / active need an answer about unplanned days (fillDaysOff); without it the
// [Claude] call is refused with service.working_schedule.unplanned_days.
const updateState = async ({
	id,
	state,
	etag,
	fillDaysOff,
}: {
	id: string;
	state: ScheduleState;
	etag: string;
	fillDaysOff?: boolean;
}): Promise<{
	item: WorkingSchedule;
	filledDays: number;
}> => {
	const data = await wfmRequest<{
		item?: WireWorkingSchedule;
		filled_days?: number;
	}>((http) =>
		http.patch(`${BASE}/${id}/state`, {
			state,
			etag,
			...(fillDaysOff !== undefined && {
				fill_days_off: fillDaysOff,
			}),
		}),
	);
	return {
		item: fromWireSchedule(data.item || {}),
		filledDays: data.filled_days || 0,
	};
};

const updateBlockOutsideActivity = async ({
	id,
	value,
	etag,
}: {
	id: string;
	value: boolean;
	etag: string;
}): Promise<WorkingSchedule> => {
	const data = await wfmRequest<{
		item?: WireWorkingSchedule;
	}>((http) =>
		http.patch(`${BASE}/${id}/block_outside_activity`, {
			block_outside_activity: value,
			etag,
		}),
	);
	return fromWireSchedule(data.item || {});
};

export const WorkingSchedulesAPI = {
	search,
	read,
	create,
	update,
	remove,
	addAgents,
	removeAgent,
	readForecast,
	readPlanned,
	updateState,
	updateBlockOutsideActivity,
};
