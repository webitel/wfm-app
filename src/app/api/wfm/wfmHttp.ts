// [Claude] HTTP client of the WFM API. The real one is the api-services default instance
// [Claude] (token, base url, `repeat` arrays in the query). With VITE_WFM_MOCK=true requests go
// [Claude] to an in-memory server that follows the same wire contract (./mock), so the pages
// [Claude] work before the backend of PR 532 is deployed. The env check is inline at each use,
// [Claude] so production builds drop the mock chunks.
import { getDefaultAxiosInstance } from '@webitel/api-services/api/axios';
import { type AxiosInstance, isAxiosError } from 'axios';

import type { Violation, WireError, WireViolation } from './types';
import { fromWireViolation } from './wire';

export const wfmHttp = async (): Promise<AxiosInstance> => {
	if (import.meta.env.VITE_WFM_MOCK === 'true') {
		const { getMockHttp } = await import('./mock/mockHttp');
		return getMockHttp();
	}
	return getDefaultAxiosInstance();
};

// [Claude] A refusal of the WFM API: told apart by `id`, not by HTTP status (wfm/violation.proto).
export class WfmApiError extends Error {
	constructor(
		public id: string,
		public status: number,
		public text: string,
		public violations: Violation[] = [],
	) {
		super(text || id);
	}
}

// [Claude] `detail` holds plain text, or JSON {text, violations} when the refusal lists rules.
const parseDetail = (
	detail = '',
): {
	text: string;
	violations: WireViolation[];
} => {
	try {
		const parsed = JSON.parse(detail);
		if (parsed && typeof parsed === 'object') {
			return {
				text: parsed.text || '',
				violations: parsed.violations || [],
			};
		}
	} catch {
		// [Claude] not JSON: plain text
	}
	return {
		text: detail,
		violations: [],
	};
};

export const toWfmApiError = (error: unknown): unknown => {
	if (!isAxiosError(error) || !error.response) return error;
	const body = (error.response.data || {}) as WireError;
	const { text, violations } = parseDetail(body.detail);
	return new WfmApiError(
		body.id || 'unknown',
		error.response.status,
		text || error.message,
		violations.map(fromWireViolation),
	);
};

// [Claude] Runs a request and turns an HTTP refusal into WfmApiError.
export const wfmRequest = async <T>(
	send: (http: AxiosInstance) => Promise<{
		data: T;
	}>,
): Promise<T> => {
	try {
		const { data } = await send(await wfmHttp());
		return data;
	} catch (error) {
		throw toWfmApiError(error);
	}
};

// [Claude] Error ids the pages react to.
export const WfmErrorId = {
	AbsenceShiftsToDelete: 'storage.absence.shifts_to_delete',
	ShiftRefused: 'storage.shift.refused',
	ShiftVersionConflict: 'storage.shift.version_conflict',
	ScheduleVersionConflict: 'storage.working_schedule.version_conflict',
	ScheduleUnplannedDays: 'service.working_schedule.unplanned_days',
	ScheduleActivationRefused: 'storage.working_schedule.activation_refused',
} as const;
