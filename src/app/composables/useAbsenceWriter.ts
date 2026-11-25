import { type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { useI18n } from 'vue-i18n';

import { AbsencesAPI } from '../api/wfm/absencesApi';
import type { AbsenceType } from '../api/wfm/types';
import { WfmApiError, WfmErrorId } from '../api/wfm/wfmHttp';
import type WfmConfirmPopup from '../components/wfm-confirm-popup.vue';
import type { DayKey } from '../utils/day';
import { useWfmErrors } from './useWfmErrors';

// [Claude] Absence writes shared by Agents and the Schedule page (US_02.05–02.07, US_05.17–05.19).
// [Claude] A day with shifts is refused with storage.absence.shifts_to_delete; the user is asked
// [Claude] and, on yes, the same call goes again with delete_shifts.
export const useAbsenceWriter = ({
	confirmPopup,
	timeZone,
	onWritten,
}: {
	confirmPopup: Readonly<Ref<InstanceType<typeof WfmConfirmPopup> | null>>;
	timeZone: MaybeRefOrGetter<string>;
	onWritten: () => unknown;
}) => {
	const { t } = useI18n();
	const { notify, notifyError, violationText } = useWfmErrors();

	// [Claude] Resolves whether it was written (false when the user said no).
	const withShiftsConfirmation = async (
		write: (deleteShifts: boolean) => Promise<{
			deletedShifts: unknown[];
		}>,
	): Promise<boolean> => {
		try {
			await write(false);
			return true;
		} catch (error) {
			if (
				!(error instanceof WfmApiError) ||
				error.id !== WfmErrorId.AbsenceShiftsToDelete
			) {
				throw error;
			}
			const isYes = await confirmPopup.value?.ask({
				title: t('wfmCalendar.shiftsToDelete.title'),
				text: t('wfmCalendar.shiftsToDelete.text'),
				details: error.violations.map((violation) =>
					violationText(violation, toValue(timeZone)),
				),
				yes: t('wfmCalendar.shiftsToDelete.yes'),
				isDanger: true,
			});
			if (!isYes) return false;
			const { deletedShifts } = await write(true);
			notify(
				'info',
				t('wfmCalendar.shiftsToDelete.deleted', {
					count: deletedShifts.length,
				}),
			);
			return true;
		}
	};

	const run = async (action: () => Promise<boolean | unknown>) => {
		try {
			return await action();
		} catch (error) {
			notifyError(error);
			return false;
		} finally {
			await onWritten();
		}
	};

	// [Claude] Adds or changes the absence of one day.
	const setAbsence = (agentId: string, type: AbsenceType, date: DayKey) =>
		run(() =>
			withShiftsConfirmation((deleteShifts) =>
				AbsencesAPI.setAgentAbsence({
					agentId,
					type,
					date,
					deleteShifts,
				}),
			),
		);

	const deleteAbsence = (agentId: string, id: string) =>
		run(() =>
			AbsencesAPI.deleteAgentAbsence({
				agentId,
				id,
			}),
		);

	// [Claude] Add absence popup: several types over ranges for several agents; resolves true when
	// [Claude] written, so the popup closes only then.
	const createAbsences = async (
		agentIds: string[],
		items: {
			type: AbsenceType;
			from: DayKey;
			to: DayKey;
		}[],
	): Promise<boolean> =>
		(await run(() =>
			withShiftsConfirmation((deleteShifts) =>
				AbsencesAPI.createAgentsAbsences({
					agentIds,
					items,
					deleteShifts,
				}),
			),
		)) === true;

	return {
		setAbsence,
		deleteAbsence,
		createAbsences,
	};
};
