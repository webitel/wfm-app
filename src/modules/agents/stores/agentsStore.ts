import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { AbsencesAPI } from '../../../app/api/wfm/absencesApi';
import type { AgentDay, AgentRow, Lookup } from '../../../app/api/wfm/types';
import type {
	AgentsFiltersState,
	DayBounds,
} from '../../../app/components/schedule-calendar/types';
import { periodOf } from '../../../app/components/schedule-calendar/utils/period';
import { useWfmErrors } from '../../../app/composables/useWfmErrors';
import { CalendarView } from '../../../app/enums';
import { type DayKey, todayIn } from '../../../app/utils/day';

// [Claude] Everything on one page: the spec has no pagination for Agents, only Total.
const PAGE_SIZE = 500;

const emptyFilters = (): AgentsFiltersState => ({
	teams: [],
	supervisors: [],
	skills: [],
});

// [Claude] Agents page (EP_02): who is shown, which period, and their absences.
export const useAgentsStore = defineStore('wfm/agents', () => {
	const { notifyError } = useWfmErrors();

	const timeZone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
	const view = ref(CalendarView.Week);
	const date = ref<DayKey>(todayIn(timeZone.value));
	// [Claude] Filters From / To (US_02.03): an own period instead of the week or month.
	const range = ref<DayBounds | null>(null);
	const search = ref('');
	const filters = ref<AgentsFiltersState>(emptyFilters());
	const rows = ref<AgentRow[]>([]);
	const total = ref(0);
	const selected = ref<string[]>([]);
	const isLoading = ref(false);

	const period = computed(() => periodOf(view.value, date.value, range.value));

	const hasFilters = computed(
		() =>
			!!range.value ||
			!!filters.value.teams.length ||
			!!filters.value.supervisors.length ||
			!!filters.value.skills.length,
	);

	const ids = (items: Lookup[]) => items.map((item) => item.id);

	let request = 0;
	const load = async () => {
		const current = ++request;
		isLoading.value = true;
		try {
			const page = await AbsencesAPI.searchAgentsAbsences({
				from: period.value.from,
				to: period.value.to,
				q: search.value,
				teamIds: ids(filters.value.teams),
				supervisorIds: ids(filters.value.supervisors),
				skillIds: ids(filters.value.skills),
				size: PAGE_SIZE,
			});
			if (current !== request) return;
			rows.value = page.items.map(({ agent, absences }) => ({
				agent,
				days: Object.fromEntries(
					absences.map(
						(
							absence,
						): [
							DayKey,
							AgentDay,
						] => [
							absence.date,
							{
								date: absence.date,
								isLocked: false,
								absence: absence.type,
								absenceId: absence.id,
								shifts: [],
							},
						],
					),
				),
			}));
			total.value = page.total ?? page.items.length;
			const shown = new Set(rows.value.map((row) => row.agent.id));
			selected.value = selected.value.filter((id) => shown.has(id));
		} catch (error) {
			if (current === request) notifyError(error);
		} finally {
			if (current === request) isLoading.value = false;
		}
	};

	const resetFilters = () => {
		range.value = null;
		filters.value = emptyFilters();
	};

	const setTimeZone = (value?: string) => {
		if (!value || value === timeZone.value) return;
		timeZone.value = value;
		date.value = todayIn(value);
	};

	watch(
		[
			period,
			search,
			filters,
		],
		load,
		{
			deep: true,
		},
	);

	return {
		timeZone,
		view,
		date,
		range,
		search,
		filters,
		rows,
		total,
		selected,
		isLoading,
		hasFilters,
		load,
		resetFilters,
		setTimeZone,
	};
});
