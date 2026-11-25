import { describe, expect, it, vi } from 'vitest';

import { AbsenceType, ScheduleState } from '../types';
import {
	fromWireAgentWorkingSchedule,
	fromWireSchedule,
	toWireSchedule,
} from '../wire';

// [Claude] The adapters run against the mock server: the wire contract of PR 532 end to end.
vi.stubEnv('VITE_WFM_MOCK', 'true');

const { AbsencesAPI } = await import('../absencesApi');
const { AgentSchedulesAPI } = await import('../agentSchedulesApi');
const { WorkingSchedulesAPI } = await import('../workingSchedulesApi');
const { WfmApiError, WfmErrorId } = await import('../wfmHttp');

describe('wire converters', () => {
	it('schedule: int64 strings, dates, empty timeline = 24 hours', () => {
		const schedule = fromWireSchedule({
			id: '7',
			name: 'Dec',
			state: ScheduleState.Active,
			start_date_at: String(Date.UTC(2026, 11, 1)),
			end_date_at: String(Date.UTC(2026, 11, 31)),
			total_agents: '12',
			etag: 'v3',
		});
		expect(schedule).toMatchObject({
			id: '7',
			startDate: '2026-12-01',
			endDate: '2026-12-31',
			timelineFrom: null,
			totalAgents: 12,
		});
		expect(toWireSchedule(schedule).start_date_at).toBe(
			String(Date.UTC(2026, 11, 1)),
		);
	});

	it('agent days keyed by date', () => {
		const row = fromWireAgentWorkingSchedule({
			agent: {
				id: '1',
				name: 'Anna',
			},
			schedule: [
				{
					date: String(Date.UTC(2026, 11, 1)),
					absence: AbsenceType.Vacation,
					absence_id: '9',
				},
			],
		});
		expect(row.days['2026-12-01']).toMatchObject({
			absence: AbsenceType.Vacation,
			absenceId: '9',
			isLocked: false,
		});
	});
});

describe('mock server follows PR 532 rules', () => {
	it('an absence on a day with shifts is refused until delete_shifts', async () => {
		const active = (await WorkingSchedulesAPI.search({})).items.find(
			(item) => item.state === ScheduleState.Active,
		);
		if (!active?.startDate || !active.endDate) throw new Error('no active');
		const page = await AgentSchedulesAPI.searchAgentsSchedule({
			scheduleId: active.id,
			from: active.startDate,
			to: active.endDate,
		});
		const day = page.items
			.flatMap((row) =>
				Object.values(row.days).map((item) => ({
					agentId: row.agent.id,
					...item,
				})),
			)
			.find((item) => item.shifts.length);
		if (!day) throw new Error('no shifts');

		const write = (deleteShifts: boolean) =>
			AbsencesAPI.setAgentAbsence({
				agentId: day.agentId,
				type: AbsenceType.DayOff,
				date: day.date,
				deleteShifts,
			});
		await expect(write(false)).rejects.toMatchObject({
			id: WfmErrorId.AbsenceShiftsToDelete,
		});
		const { deletedShifts } = await write(true);
		expect(deletedShifts.length).toBeGreaterThan(0);
	});

	it('moving to pending asks about unplanned days first', async () => {
		const draft = (await WorkingSchedulesAPI.search({})).items.find(
			(item) => item.state === ScheduleState.Draft,
		);
		if (!draft) throw new Error('no draft');
		const error = await WorkingSchedulesAPI.updateState({
			id: draft.id,
			state: ScheduleState.Pending,
			etag: draft.etag,
		}).catch((refusal) => refusal);
		expect(error).toBeInstanceOf(WfmApiError);
		expect(error.id).toBe(WfmErrorId.ScheduleUnplannedDays);
	});
});
