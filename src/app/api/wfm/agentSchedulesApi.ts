// [Claude] AgentWorkingScheduleService (wfm/agent_working_schedule.proto, PR 532).
import type { DayKey } from '../../utils/day';
import type {
	AgentRow,
	AgentsFilters,
	Holiday,
	Page,
	ScheduleCalendar,
	Shift,
	ShiftTemplate,
	Violation,
	WireAgentWorkingSchedule,
	WireHoliday,
	WireInt64,
	WireScheduleCalendar,
	WireShift,
	WireViolation,
} from './types';
import { wfmRequest } from './wfmHttp';
import {
	fromWireAgentWorkingSchedule,
	fromWireCalendar,
	fromWireHoliday,
	fromWireShift,
	fromWireViolation,
	toWireDay,
	toWireLookup,
	toWireShift,
} from './wire';

const BASE = '/wfm/agents/working_schedules';

export interface SearchAgentsScheduleParams extends AgentsFilters {
	scheduleId: string;
	from: DayKey;
	to: DayKey;
	page?: number;
	size?: number;
}

// [Claude] A page of the schedule's agents with their days, and the calendar of the schedule.
const searchAgentsSchedule = async ({
	scheduleId,
	from,
	to,
	q,
	teamIds,
	supervisorIds,
	skillIds,
	page,
	size,
}: SearchAgentsScheduleParams): Promise<
	Page<AgentRow> & {
		holidays: Holiday[];
		calendar: ScheduleCalendar;
	}
> => {
	const data = await wfmRequest<{
		items?: WireAgentWorkingSchedule[];
		holidays?: WireHoliday[];
		calendar?: WireScheduleCalendar;
		total?: WireInt64;
		next?: boolean;
	}>((http) =>
		http.get(`${BASE}/${scheduleId}`, {
			params: {
				'date.from': toWireDay(from),
				'date.to': toWireDay(to),
				q: q || undefined,
				team_id: teamIds,
				supervisor_id: supervisorIds,
				skill_id: skillIds,
				page,
				size,
			},
		}),
	);
	return {
		items: (data.items || []).map(fromWireAgentWorkingSchedule),
		holidays: (data.holidays || []).map(fromWireHoliday),
		calendar: fromWireCalendar(data.calendar),
		total: Number(data.total || 0),
		next: !!data.next,
	};
};

// [Claude] Expands a weekly template into shifts; days with an absence or locked are skipped.
const createShifts = async (
	scheduleId: string,
	template: ShiftTemplate,
): Promise<{
	skipped: Violation[];
}> => {
	const data = await wfmRequest<{
		skipped?: WireViolation[];
	}>((http) =>
		http.post(`${BASE}/${scheduleId}`, {
			date: {
				from: toWireDay(template.from),
				to: toWireDay(template.to),
			},
			agents: template.agents.map(toWireLookup),
			days: Object.fromEntries(
				Object.entries(template.days).map(([day, ranges]) => [
					day,
					{
						ranges,
					},
				]),
			),
			pauses: template.pauses.map((pause) => ({
				start: pause.start,
				duration: pause.duration,
				...(pause.cause && {
					cause: toWireLookup(pause.cause),
				}),
			})),
			skills: template.skills.map((skill) => ({
				skill: toWireLookup(skill.skill),
				enabled: skill.enabled,
			})),
		}),
	);
	return {
		skipped: (data.skipped || []).map(fromWireViolation),
	};
};

// [Claude] Replaces one shift whole (time, pauses, skills); needs the etag from a read.
const updateShift = async (
	scheduleId: string,
	shift: Shift,
): Promise<Shift> => {
	const data = await wfmRequest<{
		shift?: WireShift;
	}>((http) =>
		http.put(`${BASE}/${scheduleId}/shifts/${shift.id}`, {
			shift: toWireShift(shift),
		}),
	);
	return fromWireShift(data.shift || {});
};

const deleteShift = (scheduleId: string, shift: Pick<Shift, 'id' | 'etag'>) =>
	wfmRequest((http) =>
		http.delete(`${BASE}/${scheduleId}/shifts/${shift.id}`, {
			params: {
				etag: shift.etag,
			},
		}),
	);

export const AgentSchedulesAPI = {
	searchAgentsSchedule,
	createShifts,
	updateShift,
	deleteShift,
};
