import { WfmWorkingScheduleState } from '@webitel/api-services/gen/models';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
	readWorkingSchedule,
	readWorkingScheduleForecast,
	readWorkingSchedulePlanned,
	type ScheduleHeader,
	searchAgentsWorkingSchedule,
} from '../../../app/api/wfm/wfmCalendarApi';
import {
	type CalendarForecast,
	type CalendarRow,
	type DayKey,
	type Holiday,
	type LookupEntity,
	type ScheduleCalendar,
} from '../../../app/components/schedule-table/types';
import {
	clampDay,
	rangeForView,
	todayKey,
} from '../../../app/components/schedule-table/utils/date';
import {
	AGENTS_PAGE_SIZE,
	appendRows,
	reloadSize,
} from '../../../app/components/schedule-table/utils/paging';
import { CalendarView } from '../../../app/enums';

// [Claude] One schedule's page (EP_05): its agents with shifts and absences, the calendar
// [Claude] of the schedule and the Forecast block. Data comes from the mock API for now.
export const useScheduleCalendarStore = defineStore(
	'wfm/schedules/calendar',
	() => {
		const scheduleId = ref<string | null>(null);
		const schedule = ref<ScheduleHeader | null>(null);
		const view = ref<CalendarView>(CalendarView.Week);
		const date = ref<DayKey>(todayKey());
		const q = ref('');
		// [Claude] Filters of the schedule page (Figma "Frame 2752"): Supervisor, Team, Skill.
		const supervisors = ref<LookupEntity[]>([]);
		const teams = ref<LookupEntity[]>([]);
		const skills = ref<LookupEntity[]>([]);
		const rows = ref<CalendarRow[]>([]);
		const holidays = ref<Holiday[]>([]);
		const calendar = ref<ScheduleCalendar | null>(null);
		const forecast = ref<CalendarForecast>({
			hours: [],
			plannedDays: [],
			plannedSlots: [],
		});
		const total = ref(0);
		const selected = ref<string[]>([]);
		const isLoading = ref(false);
		const isLoadingMore = ref(false);
		// [Claude] More agents on the server than shown (infinite scroll).
		const hasMore = ref(false);
		let pagesLoaded = 0;
		let queryKey = '';

		const bounds = computed(() =>
			schedule.value
				? {
						from: schedule.value.from,
						to: schedule.value.to,
					}
				: undefined,
		);

		const isReadonly = computed(
			() =>
				schedule.value?.state ===
				WfmWorkingScheduleState.WorkingScheduleStateArchived,
		);

		let requestId = 0;

		const query = () => ({
			date: rangeForView(view.value, date.value),
			q: q.value,
			supervisorId: supervisors.value.map((s) => s.id),
			teamId: teams.value.map((t) => t.id),
			skillId: skills.value.map((s) => s.id),
		});

		// [Claude] MVP: everyone has confirmed an active schedule, nobody any other (protos#532).
		const withConfirmed = (items: CalendarRow[]) => {
			const confirmed =
				schedule.value?.state ===
				WfmWorkingScheduleState.WorkingScheduleStateActive;
			return items.map((row) => ({
				...row,
				confirmed,
			}));
		};

		// [Claude] The first page of a new query, or all shown pages again for the same query.
		const load = async () => {
			if (!scheduleId.value) return;
			requestId += 1;
			const current = requestId;
			const id = scheduleId.value;
			const params = query();
			const range = params.date;
			const key = JSON.stringify([
				id,
				params,
			]);
			if (key !== queryKey) pagesLoaded = 1;
			queryKey = key;
			const pages = Math.max(pagesLoaded, 1);
			isLoading.value = true;
			isLoadingMore.value = false;
			try {
				// [Claude] The forecast and the planned counts are two reads (protos#532):
				// [Claude] the forecast runs a procedure, the planned one only reads the schedule.
				const [agents, hours, planned] = await Promise.all([
					searchAgentsWorkingSchedule(id, {
						...params,
						page: 1,
						size: reloadSize(pages),
					}),
					readWorkingScheduleForecast(id, range),
					readWorkingSchedulePlanned(id, range),
				]);
				if (current !== requestId) return;
				pagesLoaded = pages;
				rows.value = withConfirmed(agents.items);
				hasMore.value = agents.next;
				holidays.value = agents.holidays;
				calendar.value = agents.calendar;
				total.value = agents.total;
				forecast.value = {
					hours,
					plannedDays: planned.days,
					plannedSlots: planned.slots,
				};
				const ids = new Set(agents.items.map((r) => r.agent.id));
				selected.value = selected.value.filter((s) => ids.has(s));
			} finally {
				if (current === requestId) isLoading.value = false;
			}
		};

		// [Claude] The next page of agents, when the user scrolls near the end of the table.
		const loadMore = async () => {
			if (
				!scheduleId.value ||
				!hasMore.value ||
				isLoading.value ||
				isLoadingMore.value
			)
				return;
			const current = requestId;
			isLoadingMore.value = true;
			try {
				const agents = await searchAgentsWorkingSchedule(scheduleId.value, {
					...query(),
					page: pagesLoaded + 1,
					size: AGENTS_PAGE_SIZE,
				});
				if (current !== requestId) return;
				pagesLoaded += 1;
				rows.value = appendRows(rows.value, withConfirmed(agents.items));
				total.value = agents.total;
				hasMore.value = agents.next;
			} finally {
				if (current === requestId) isLoadingMore.value = false;
			}
		};

		// [Claude] Opens a schedule on its first week, or on today when today is inside it.
		const open = async (id: string) => {
			scheduleId.value = id;
			rows.value = [];
			selected.value = [];
			q.value = '';
			supervisors.value = [];
			teams.value = [];
			skills.value = [];
			schedule.value = await readWorkingSchedule(id);
			date.value = clampDay(todayKey(), bounds.value);
			view.value = CalendarView.Week;
		};

		// [Claude] The schedule after a change of the action bar (state, agents, plan).
		const setSchedule = (header: ScheduleHeader) => {
			schedule.value = header;
		};

		return {
			scheduleId,
			schedule,
			view,
			date,
			q,
			supervisors,
			teams,
			skills,
			rows,
			holidays,
			calendar,
			forecast,
			total,
			selected,
			isLoading,
			isLoadingMore,
			hasMore,
			bounds,
			isReadonly,
			load,
			loadMore,
			open,
			setSchedule,
		};
	},
);
