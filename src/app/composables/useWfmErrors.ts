import { eventBus } from '@webitel/ui-sdk/scripts';
import { useI18n } from 'vue-i18n';

import type { Violation } from '../api/wfm/types';
import { WfmApiError } from '../api/wfm/wfmHttp';
import { dayToMs, formatTime } from '../utils/day';

// [Claude] Notifications and readable lines for WFM refusals (wfm/violation.proto reasons).
export const useWfmErrors = () => {
	const { t, te, locale } = useI18n();

	const notify = (type: 'success' | 'info' | 'error', text: string) =>
		eventBus.$emit('notification', {
			type,
			text,
		});

	const formatDay = (day: string) =>
		new Intl.DateTimeFormat(locale.value, {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC',
		}).format(dayToMs(day));

	// [Claude] Ids are dotted (storage.shift.overlap); locale keys use underscores.
	const textOf = (id: string, fallback: string) => {
		const key = `wfmErrors.${id.replaceAll('.', '_')}`;
		return te(key) ? t(key) : fallback;
	};

	// [Claude] "Anna Kovalenko, 24 Nov, 09:00–18:00 — the shift overlaps … — Support — 2026-11".
	const violationText = (violation: Violation, timeZone = 'UTC') =>
		[
			[
				violation.agent?.name,
				violation.date && formatDay(violation.date),
				violation.startAt &&
					violation.endAt &&
					`${formatTime(violation.startAt, timeZone)}–${formatTime(violation.endAt, timeZone)}`,
			]
				.filter(Boolean)
				.join(', '),
			textOf(violation.reason, violation.reason),
			violation.schedule?.name,
		]
			.filter(Boolean)
			.join(' — ');

	const errorText = (error: unknown) => {
		if (error instanceof WfmApiError) {
			return textOf(error.id, error.text || error.id);
		}
		return error instanceof Error ? error.message : String(error);
	};

	const notifyError = (error: unknown) => notify('error', errorText(error));

	return {
		notify,
		notifyError,
		violationText,
	};
};
