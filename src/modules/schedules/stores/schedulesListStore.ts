import { getNextSortOrder, SortSymbols } from '@webitel/ui-sdk/scripts';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { WorkingSchedule } from '../../../app/api/wfm/types';
import {
	type ScheduleSort,
	WorkingSchedulesAPI,
} from '../../../app/api/wfm/workingSchedulesApi';
import { useWfmErrors } from '../../../app/composables/useWfmErrors';

type SortOrder = (typeof SortSymbols)[keyof typeof SortSymbols];
type SortField = 'name' | 'state';

// [Claude] Schedules register (US_05.01–05.02): search by name, sort by name or status
// [Claude] (active, pending, draft, archived), pages.
export const useSchedulesListStore = defineStore('wfm/schedules/list', () => {
	const { t } = useI18n();
	const { notifyError } = useWfmErrors();

	const items = ref<WorkingSchedule[]>([]);
	const selected = ref<WorkingSchedule[]>([]);
	const search = ref('');
	const page = ref(1);
	const size = ref(10);
	const next = ref(false);
	const isLoading = ref(false);
	const sort = ref<{
		field: SortField;
		order: SortOrder;
	} | null>(null);

	const headers = computed(() =>
		(
			[
				[
					'name',
					'reusable.name',
				],
				[
					'state',
					'reusable.status',
				],
			] as const
		).map(([field, locale]) => ({
			value: field,
			field,
			text: t(locale),
			show: true,
			sort: sort.value?.field === field ? sort.value.order : SortSymbols.NONE,
		})),
	);

	const sortQuery = computed<ScheduleSort | undefined>(() => {
		if (!sort.value?.order) return undefined;
		const prefix = sort.value.order === SortSymbols.ASC ? '+' : '-';
		return `${prefix}${sort.value.field}` as ScheduleSort;
	});

	const load = async () => {
		isLoading.value = true;
		try {
			const result = await WorkingSchedulesAPI.search({
				q: search.value ? `*${search.value}*` : undefined,
				page: page.value,
				size: size.value,
				sort: sortQuery.value,
			});
			items.value = result.items;
			next.value = result.next;
			selected.value = [];
		} catch (error) {
			notifyError(error);
		} finally {
			isLoading.value = false;
		}
	};

	const updateSort = (header: { field: SortField; sort?: SortOrder }) => {
		sort.value = {
			field: header.field,
			order: getNextSortOrder(header.sort),
		};
	};

	const remove = async (schedules: WorkingSchedule[]) => {
		for (const schedule of schedules) {
			try {
				await WorkingSchedulesAPI.remove(schedule.id);
			} catch (error) {
				notifyError(error);
			}
		}
		await load();
	};

	watch(search, () => {
		page.value = 1;
	});
	watch(
		[
			search,
			page,
			size,
			sortQuery,
		],
		load,
	);

	return {
		items,
		selected,
		search,
		page,
		size,
		next,
		isLoading,
		headers,
		load,
		updateSort,
		remove,
	};
});
