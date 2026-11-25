import { ref } from 'vue';

import {
	type CreateAgentsAbsencesParams,
	createAgentsAbsences,
	deleteAgentAbsence,
} from '../../../api/wfm/wfmCalendarApi';
import { type Violation, WfmApiError } from '../types';
import { useWfmNotify } from './useWfmNotify';

// [Claude] Writes absences with the confirmation flow of CreateAgentAbsence(s):
// [Claude] without deleteShifts the server refuses with storage.absence.shifts_to_delete
// [Claude] and lists the shifts; the user confirms them and the call is repeated.
// [Claude] Shared by Agents and Schedules, so both sections behave the same (EP_05 US_05.17).
export const useAbsenceWriter = ({ onDone }: { onDone: () => unknown }) => {
	const { notifyError } = useWfmNotify();

	const shiftsToDelete = ref<Violation[]>([]);
	const isSaving = ref(false);
	let pending: CreateAgentsAbsencesParams | null = null;

	const run = async (params: CreateAgentsAbsencesParams) => {
		isSaving.value = true;
		try {
			await createAgentsAbsences(params);
			shiftsToDelete.value = [];
			pending = null;
			await onDone();
			return true;
		} catch (error) {
			if (
				error instanceof WfmApiError &&
				error.id === 'storage.absence.shifts_to_delete'
			) {
				pending = params;
				shiftsToDelete.value = error.violations;
				return false;
			}
			notifyError(error);
			return false;
		} finally {
			isSaving.value = false;
		}
	};

	const write = (params: Omit<CreateAgentsAbsencesParams, 'deleteShifts'>) =>
		run({
			...params,
			deleteShifts: false,
		});

	const confirm = () =>
		pending &&
		run({
			...pending,
			deleteShifts: true,
		});

	const cancel = () => {
		pending = null;
		shiftsToDelete.value = [];
	};

	const remove = async (agentId: string, absenceId: string) => {
		try {
			await deleteAgentAbsence(agentId, absenceId);
			await onDone();
		} catch (error) {
			notifyError(error);
		}
	};

	return {
		shiftsToDelete,
		isSaving,
		write,
		confirm,
		cancel,
		remove,
	};
};
