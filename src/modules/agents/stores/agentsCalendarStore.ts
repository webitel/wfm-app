import {
	createFiltersManager,
	FilterOption,
} from '@webitel/ui-datalist/filters';
import { endOfDay, format, parseISO } from 'date-fns';
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { searchAgentsAbsences } from '../../../app/api/wfm/wfmCalendarApi';
import {
	type CalendarRow,
	type DayKey,
} from '../../../app/components/schedule-table/types';
import {
	type DayRange,
	rangeForView,
	todayKey,
} from '../../../app/components/schedule-table/utils/date';
import {
	AGENTS_PAGE_SIZE,
	appendRows,
	reloadSize,
} from '../../../app/components/schedule-table/utils/paging';
import { CalendarView } from '../../../app/enums';

// [Claude] Filter name of the search bar (dynamic-filter-search single-search-name).
export const SEARCH_FILTER_NAME = 'search';

// [Claude] The date range filter gives local timestamps of the picked days.
const toDay = (ms: number): DayKey => format(ms, 'yyyy-MM-dd');

const toIds = (value: unknown) =>
	Array.isArray(value) ? value.map(String) : undefined;

// [Claude] Agents section (EP_02): all agents the user can access and their absences
// [Claude] over the visible period. Data comes from the mock API for now.
export const useAgentsCalendarStore = defineStore('wfm/agents/calendar', () => {
	const view = ref<CalendarView>(CalendarView.Week);
	const date = ref<DayKey>(todayKey());
	const rows = ref<CalendarRow[]>([]);
	const total = ref(0);
	const selected = ref<string[]>([]);
	const isLoading = ref(false);
	const isLoadingMore = ref(false);
	// [Claude] More agents on the server than shown (infinite scroll).
	const hasMore = ref(false);
	let pagesLoaded = 0;
	let queryKey = '';

	/* [Claude] ----------------------------------------------------- Filters */

	// [Claude] Standard ui-datalist filters (as cc-supervisor Agents): search, From / To,
	// [Claude] supervisor, team, skill. The calendar is not a datalist table, so only the
	// [Claude] filters manager is taken, without createTableStore.
	const filtersManager = reactive(createFiltersManager());
	const isFiltersRestoring = ref(false);

	const filterValues = computed(() => filtersManager.getAllValues());

	// [Claude] From / To (US_02.03): a period of its own instead of the week or month. It is
	// [Claude] the `date` of SearchAgentsAbsences, so it limits the absences shown, not the agents.
	const customRange = computed<DayRange | null>({
		get: () => {
			const range = filterValues.value[FilterOption.Date] as
				| {
						from?: number;
						to?: number;
				  }
				| undefined;
			if (!range?.from || !range?.to || range.from > range.to) return null;
			return {
				from: toDay(range.from),
				to: toDay(range.to),
			};
		},
		// [Claude] The table moves the period with its arrows and drops it on a view change.
		set: (range) => {
			if (!range) {
				filtersManager.deleteFilter({
					name: FilterOption.Date,
				});
				return;
			}
			filtersManager.updateFilter({
				name: FilterOption.Date,
				value: {
					from: parseISO(range.from).getTime(),
					to: endOfDay(parseISO(range.to)).getTime(),
				},
			});
		},
	});

	const period = computed<DayRange>(
		() => customRange.value || rangeForView(view.value, date.value),
	);

	/* [Claude] -------------------------------------------------------- Load */

	// [Claude] Only the latest request may write the result: views switch faster than mocks answer.
	let requestId = 0;

	const query = () => {
		const values = filterValues.value;
		return {
			date: period.value,
			q: values[SEARCH_FILTER_NAME] as string | undefined,
			teamId: toIds(values[FilterOption.Team]),
			supervisorId: toIds(values[FilterOption.Supervisor]),
			skillId: toIds(values[FilterOption.Skill]),
		};
	};

	// [Claude] The first page of a new query, or all shown pages again for the same query.
	const load = async () => {
		requestId += 1;
		const current = requestId;
		const params = query();
		const key = JSON.stringify(params);
		if (key !== queryKey) pagesLoaded = 1;
		queryKey = key;
		const pages = Math.max(pagesLoaded, 1);
		isLoading.value = true;
		isLoadingMore.value = false;
		try {
			const response = await searchAgentsAbsences({
				...params,
				page: 1,
				size: reloadSize(pages),
			});
			if (current !== requestId) return;
			pagesLoaded = pages;
			rows.value = response.items;
			total.value = response.total;
			hasMore.value = response.next;
			const ids = new Set(response.items.map((r) => r.agent.id));
			selected.value = selected.value.filter((id) => ids.has(id));
		} finally {
			if (current === requestId) isLoading.value = false;
		}
	};

	// [Claude] The next page, when the user scrolls near the end of the table.
	const loadMore = async () => {
		if (!hasMore.value || isLoading.value || isLoadingMore.value) return;
		const current = requestId;
		isLoadingMore.value = true;
		try {
			const response = await searchAgentsAbsences({
				...query(),
				page: pagesLoaded + 1,
				size: AGENTS_PAGE_SIZE,
			});
			if (current !== requestId) return;
			pagesLoaded += 1;
			rows.value = appendRows(rows.value, response.items);
			total.value = response.total;
			hasMore.value = response.next;
		} finally {
			if (current === requestId) isLoadingMore.value = false;
		}
	};

	return {
		view,
		date,
		rows,
		total,
		selected,
		isLoading,
		isLoadingMore,
		hasMore,
		filtersManager,
		isFiltersRestoring,
		filterValues,
		customRange,
		period,
		load,
		loadMore,
	};
});
