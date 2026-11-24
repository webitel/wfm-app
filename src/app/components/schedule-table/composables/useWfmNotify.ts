import { eventBus } from '@webitel/ui-sdk/scripts';
import { useI18n } from 'vue-i18n';

import { WfmApiError } from '../types';

// [Claude] WFM errors are told apart by id, not by HTTP status (violation.proto):
// [Claude] the text is a translation of the id, with the first violation's reason as detail.
export const useWfmNotify = () => {
	const { t, te } = useI18n();

	const translate = (id: string) =>
		te(`scheduleTable.errors.${id}`) ? t(`scheduleTable.errors.${id}`) : id;

	const notifyError = (error: unknown) => {
		if (!(error instanceof WfmApiError)) {
			eventBus.$emit('notification', {
				type: 'error',
				text: String(error),
			});
			return;
		}
		const reasons = [
			...new Set(error.violations.map((v) => v.reason)),
		]
			.map(translate)
			.join('; ');
		eventBus.$emit('notification', {
			type: 'error',
			text: reasons
				? `${translate(error.id)}: ${reasons}`
				: translate(error.id),
		});
	};

	const notifyInfo = (text: string) => {
		eventBus.$emit('notification', {
			type: 'info',
			text,
		});
	};

	return {
		notifyError,
		notifyInfo,
		translate,
	};
};
