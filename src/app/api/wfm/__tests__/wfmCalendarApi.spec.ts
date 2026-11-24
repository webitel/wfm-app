import {
	WfmAbsenceType,
	WfmWorkingScheduleState,
} from '@webitel/api-services/gen/models';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WfmApiError } from '../../../components/schedule-table/types';
import {
	rangeForView,
	todayKey,
} from '../../../components/schedule-table/utils/date';
import { CalendarView } from '../../../enums';
import { searchAgentsLookup } from '../../../mocks/schedule-table/mockLookups';
import {
	mockWfmHttpClient,
	resetMockDb,
} from '../../../mocks/schedule-table/mockServer';
import {
	addWorkingScheduleAgents,
	createAgentsAbsences,
	createAgentsWorkingScheduleShifts,
	deleteAgentsWorkingScheduleShifts,
	deleteAgentWorkingScheduleShift,
	deleteWorkingScheduleAgents,
	planWorkingSchedule,
	readWorkingSchedule,
	readWorkingSchedulePlanned,
	searchAgentsAbsences,
	searchAgentsWorkingSchedule,
	searchWorkingScheduleHistory,
	setWfmHttpClient,
	updateAgentWorkingScheduleShift,
	updateWorkingScheduleState,
	type WfmHttpClient,
} from '../wfmCalendarApi';

// [Claude] The adapter against the mock backend, plus what goes on the wire: the paths,
// [Claude] query and bodies of webitel/protos#532.

const month = rangeForView(CalendarView.Month, todayKey());

interface Call {
	method: string;
	url: string;
	params?: Record<string, unknown>;
	body?: unknown;
}

let calls: Call[] = [];

// [Claude] Records every request on its way to the mock backend.
const recordingClient: WfmHttpClient = {
	get: (url, config) => {
		calls.push({
			method: 'GET',
			url,
			params: config?.params,
		});
		return mockWfmHttpClient.get(url, config);
	},
	post: (url, body) => {
		calls.push({
			method: 'POST',
			url,
			body,
		});
		return mockWfmHttpClient.post(url, body);
	},
	put: (url, body) => {
		calls.push({
			method: 'PUT',
			url,
			body,
		});
		return mockWfmHttpClient.put(url, body);
	},
	delete: (url, config) => {
		calls.push({
			method: 'DELETE',
			url,
			params: config?.params,
		});
		return mockWfmHttpClient.delete(url, config);
	},
};

const firstShift = async () => {
	const { items } = await searchAgentsWorkingSchedule('1', {
		date: month,
	});
	for (const row of items) {
		const cell = Object.values(row.cells).find((c) => c.shifts.length);
		if (cell)
			return {
				row,
				cell,
				shift: cell.shifts[0],
			};
	}
	throw new Error('no shift in mock data');
};

describe('wfmCalendarApi', () => {
	beforeEach(() => {
		resetMockDb(30);
		calls = [];
		setWfmHttpClient(recordingClient);
	});

	afterEach(() => {
		setWfmHttpClient(mockWfmHttpClient);
	});

	it('searches absences with the visible period as UTC-midnight ms', async () => {
		const { items, total } = await searchAgentsAbsences({
			date: month,
			q: 'a',
		});
		expect(total).toBe(items.length);
		expect(calls[0]).toMatchObject({
			method: 'GET',
			url: '/wfm/agents/absences',
			params: {
				'date.from': String(Date.parse(`${month.from}T00:00:00Z`)),
				'date.to': String(Date.parse(`${month.to}T00:00:00Z`)),
				q: 'a',
			},
		});
	});

	it('refuses a request without the period, as the contract requires it', async () => {
		const error = await mockWfmHttpClient
			.get('/wfm/agents/absences', {
				params: {},
			})
			.catch((e) => e);
		expect(error.response.data.id).toBe('interceptor.validate');
	});

	it('sends absence types by name and asks to confirm deleting shifts', async () => {
		const { row, cell } = await firstShift();
		const params = {
			agentIds: [
				row.agent.id,
			],
			items: [
				{
					type: WfmAbsenceType.AbsenceTypeVacation,
					from: cell.date,
					to: cell.date,
				},
			],
		};

		const refusal = await createAgentsAbsences(params).catch((e) => e);
		expect(calls.at(-1)).toMatchObject({
			method: 'POST',
			url: '/wfm/agents/absences',
			body: {
				items: [
					{
						type_id: 'ABSENCE_TYPE_VACATION',
					},
				],
				agent_ids: [
					row.agent.id,
				],
				delete_shifts: false,
			},
		});
		expect(refusal).toBeInstanceOf(WfmApiError);
		expect(refusal.id).toBe('storage.absence.shifts_to_delete');
		expect(refusal.violations[0]).toMatchObject({
			reason: 'storage.absence.shift',
			date: cell.date,
		});

		const { deletedShifts } = await createAgentsAbsences({
			...params,
			deleteShifts: true,
		});
		expect(deletedShifts.length).toBeGreaterThan(0);

		const { items } = await searchAgentsWorkingSchedule('1', {
			date: month,
		});
		const after = items.find((r) => r.agent.id === row.agent.id).cells[
			cell.date
		];
		expect(after.absence).toBe(WfmAbsenceType.AbsenceTypeVacation);
		expect(after.absenceId).toBeTruthy();
		expect(after.shifts).toHaveLength(0);
	});

	it('maps the schedule header, its calendar and the shifts of a cell', async () => {
		const header = await readWorkingSchedule('1');
		expect(header.state).toBe(
			WfmWorkingScheduleState.WorkingScheduleStateDraft,
		);
		expect(header.timeline).toEqual({
			from: 7 * 60,
			to: 22 * 60,
		});

		const { calendar, shift } = await (async () => {
			const result = await searchAgentsWorkingSchedule('1', {
				date: month,
			});
			return {
				calendar: result.calendar,
				...(await firstShift()),
			};
		})();
		expect(calendar.timeZone).toBe('Europe/Kyiv');
		expect(calendar.week[1]).toEqual([
			{
				start: 540,
				end: 1080,
			},
		]);
		expect(calendar.week[0]).toEqual([]);
		expect(typeof shift.startAt).toBe('number');
		expect(shift.workingDate).toBeTruthy();
		expect(shift.etag).toBeTruthy();
	});

	it('updates a shift as a whole with its etag, and refuses a stale etag', async () => {
		const { shift } = await firstShift();
		const stale = await updateAgentWorkingScheduleShift('1', {
			...shift,
			etag: 'stale-0',
		}).catch((e) => e);
		expect(stale.status).toBe(409);
		expect(stale.id).toBe('storage.shift.version_conflict');

		const { shift: updated } = await updateAgentWorkingScheduleShift('1', {
			...shift,
			pauses: [],
		});
		expect(calls.at(-1)).toMatchObject({
			method: 'PUT',
			url: `/wfm/agents/working_schedules/1/shifts/${shift.id}`,
			body: {
				shift: {
					id: shift.id,
					etag: shift.etag,
					pauses: [],
				},
			},
		});
		expect(updated.pauses).toHaveLength(0);
		expect(updated.etag).not.toBe(shift.etag);

		const deleted = await deleteAgentWorkingScheduleShift(
			'1',
			shift.id,
			shift.etag,
		).catch((e) => e);
		expect(calls.at(-1)).toMatchObject({
			method: 'DELETE',
			params: {
				etag: shift.etag,
			},
		});
		expect(deleted.status).toBe(409);
	});

	it('sends the Add shifts template with agents as lookups and string day keys', async () => {
		const { items } = await searchAgentsWorkingSchedule('1', {
			date: month,
		});
		const agent = items[0].agent;
		await createAgentsWorkingScheduleShifts('1', {
			date: {
				from: month.to,
				to: month.to,
			},
			agents: [
				agent,
			],
			days: {
				0: [
					{
						start: 600,
						end: 700,
					},
				],
				1: [
					{
						start: 600,
						end: 700,
					},
				],
			},
			pauses: [],
			skills: [],
		}).catch(() => {});
		const body = calls.at(-1).body as {
			agents: unknown[];
			days: Record<string, unknown>;
		};
		expect(body.agents).toEqual([
			{
				id: agent.id,
				name: agent.name,
			},
		]);
		expect(Object.keys(body.days)).toEqual([
			'0',
			'1',
		]);
	});

	it('refuses writes into an archived schedule', async () => {
		const error = await deleteAgentWorkingScheduleShift('3', '1', 'x').catch(
			(e) => e,
		);
		expect(error.id).toBe('storage.working_schedule.archived');
	});

	it('counts planned agents per day', async () => {
		const { days, slots } = await readWorkingSchedulePlanned('1', month);
		expect(days.length).toBeGreaterThan(0);
		expect(slots.length).toBeGreaterThan(0);
	});
	// [Claude] Prototype-only calls of the schedule page's action bar.
	describe('action bar (prototype-only)', () => {
		it('adds agents to a schedule and logs it', async () => {
			const before = await readWorkingSchedule('1');
			const { items } = await searchAgentsLookup();
			const { items: rows } = await searchAgentsWorkingSchedule('1', {
				date: month,
			});
			const inSchedule = new Set(rows.map((r) => r.agent.id));
			const newcomer = items.find((a) => !inSchedule.has(a.id));
			const after = await addWorkingScheduleAgents('1', [
				newcomer.id,
			]);
			expect(calls.at(-1)).toMatchObject({
				method: 'POST',
				url: '/wfm/lookups/working_schedules/1/agents',
				body: {
					agent_ids: [
						newcomer.id,
					],
				},
			});
			expect(after.totalAgents).toBe(before.totalAgents + 1);
			const [log] = await searchWorkingScheduleHistory('1');
			expect(log.agent?.id).toBe(newcomer.id);
		});

		it('deletes agents from a schedule with their shifts', async () => {
			const { row } = await firstShift();
			const after = await deleteWorkingScheduleAgents('1', [
				row.agent.id,
			]);
			expect(calls.at(-1)).toMatchObject({
				method: 'DELETE',
				url: '/wfm/lookups/working_schedules/1/agents',
				params: {
					agent_id: [
						row.agent.id,
					],
				},
			});
			const { items } = await searchAgentsWorkingSchedule('1', {
				date: month,
			});
			expect(items.some((r) => r.agent.id === row.agent.id)).toBe(false);
			expect(after.totalAgents).toBe(items.length);
		});

		it('moves a draft to pending and refuses a skipped state', async () => {
			const draft = await readWorkingSchedule('1');
			const pending = await updateWorkingScheduleState(
				'1',
				WfmWorkingScheduleState.WorkingScheduleStatePending,
				draft.etag,
			);
			expect(pending.state).toBe(
				WfmWorkingScheduleState.WorkingScheduleStatePending,
			);
			const error = await updateWorkingScheduleState(
				'1',
				WfmWorkingScheduleState.WorkingScheduleStateDraft,
				pending.etag,
			).catch((e) => e);
			expect(error).toBeInstanceOf(WfmApiError);
		});

		it('refuses a state change on a stale etag', async () => {
			const error = await updateWorkingScheduleState(
				'1',
				WfmWorkingScheduleState.WorkingScheduleStatePending,
				'stale',
			).catch((e) => e);
			expect(error.status).toBe(409);
		});

		it('plans shifts on free working days', async () => {
			const count = async () =>
				(
					await searchAgentsWorkingSchedule('1', {
						date: month,
					})
				).items.reduce(
					(sum, r) =>
						sum +
						Object.values(r.cells).reduce((n, c) => n + c.shifts.length, 0),
					0,
				);
			const before = await count();
			await planWorkingSchedule('1');
			expect(await count()).toBeGreaterThan(before);
		});

		it('clears the shifts of agents in a period', async () => {
			const { row, cell } = await firstShift();
			const { deleted } = await deleteAgentsWorkingScheduleShifts('1', {
				agentIds: [
					row.agent.id,
				],
				date: {
					from: cell.date,
					to: cell.date,
				},
			});
			expect(deleted).toBe(cell.shifts.length);
			expect(calls.at(-1)).toMatchObject({
				method: 'DELETE',
				url: '/wfm/agents/working_schedules/1/shifts',
			});
		});
	});
});
