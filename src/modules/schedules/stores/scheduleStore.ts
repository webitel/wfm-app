import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { AgentSchedulesAPI } from '../../../app/api/wfm/agentSchedulesApi';
import {
	type AgentRow,
	type Holiday,
	type Lookup,
	type ScheduleCalendar,
	ScheduleState,
	type Shift,
	type ShiftTemplate,
	type Violation,
	type WorkingSchedule,
} from '../../../app/api/wfm/types';
import { WorkingSchedulesAPI } from '../../../app/api/wfm/workingSchedulesApi';
import type {
	AgentsFiltersState,
	CalendarForecast,
	DayBounds,
	Timeline,
} from '../../../app/components/schedule-calendar/types';
import { periodOf } from '../../../app/components/schedule-calendar/utils/period';
import { useWfmErrors } from '../../../app/composables/useWfmErrors';
import { CalendarView } from '../../../app/enums';
import { clampDay, type DayKey, todayIn } from '../../../app/utils/day';

// [Claude] All agents of the schedule on one page (US_05.05: no pagination).
const PAGE_SIZE = 500;

const emptyFilters = (): AgentsFiltersState => ({
	teams: [],
	supervisors: [],
	skills: [],
});

// [Claude] Schedule page (EP_05): the header, the agents with their days, holidays, the
// [Claude] calendar's zone and the forecast of the shown period.
export const useScheduleStore = defineStore('wfm/schedules/schedule', () => {
	const { notifyError } = useWfmErrors();

	const id = ref('');
	const schedule = ref<WorkingSchedule | null>(null);
	const rows = ref<AgentRow[]>([]);
	const holidays = ref<Holiday[]>([]);
	const calendar = ref<ScheduleCalendar | null>(null);
	const forecast = ref<CalendarForecast | null>(null);
	const total = ref(0);
	const view = ref(CalendarView.Week);
	const date = ref<DayKey>(todayIn('UTC'));
	const search = ref('');
	const filters = ref<AgentsFiltersState>(emptyFilters());
	const selected = ref<string[]>([]);
	const isLoading = ref(false);

	const timeZone = computed(
		() =>
			calendar.value?.timeZone ||
			Intl.DateTimeFormat().resolvedOptions().timeZone,
	);
	const bounds = computed<DayBounds | null>(() =>
		schedule.value?.startDate && schedule.value.endDate
			? {
					from: schedule.value.startDate,
					to: schedule.value.endDate,
				}
			: null,
	);
	const timeline = computed<Timeline | null>(() =>
		schedule.value && schedule.value.timelineFrom !== null
			? {
					from: schedule.value.timelineFrom,
					to: schedule.value.timelineTo ?? schedule.value.timelineFrom,
				}
			: null,
	);
	const isReadonly = computed(
		() => schedule.value?.state === ScheduleState.Archived,
	);
	// [Claude] Agents confirm a schedule when it is activated (confirmation by agents is not MVP).
	const isActive = computed(
		() => schedule.value?.state === ScheduleState.Active,
	);
	const hasFilters = computed(
		() =>
			!!filters.value.teams.length ||
			!!filters.value.supervisors.length ||
			!!filters.value.skills.length,
	);

	// [Claude] The shown period cut to the schedule dates: nothing is asked outside them.
	const queryPeriod = computed(() => {
		const period = periodOf(view.value, date.value);
		if (!bounds.value) return period;
		return {
			from: period.from < bounds.value.from ? bounds.value.from : period.from,
			to: period.to > bounds.value.to ? bounds.value.to : period.to,
		};
	});

	const ids = (items: Lookup[]) => items.map((item) => item.id);

	let request = 0;
	const loadDays = async () => {
		if (!schedule.value) return;
		const current = ++request;
		const { from, to } = queryPeriod.value;
		isLoading.value = true;
		try {
			const [page, hours, planned] = await Promise.all([
				AgentSchedulesAPI.searchAgentsSchedule({
					scheduleId: id.value,
					from,
					to,
					q: search.value,
					teamIds: ids(filters.value.teams),
					supervisorIds: ids(filters.value.supervisors),
					skillIds: ids(filters.value.skills),
					size: PAGE_SIZE,
				}),
				WorkingSchedulesAPI.readForecast(id.value, from, to),
				WorkingSchedulesAPI.readPlanned(id.value, from, to),
			]);
			if (current !== request) return;
			rows.value = page.items;
			holidays.value = page.holidays;
			calendar.value = page.calendar;
			total.value = page.total ?? page.items.length;
			forecast.value = {
				hours,
				plannedSlots: planned.slots,
				plannedDays: planned.days,
			};
			const shown = new Set(rows.value.map((row) => row.agent.id));
			selected.value = selected.value.filter((agentId) => shown.has(agentId));
		} catch (error) {
			if (current === request) notifyError(error);
		} finally {
			if (current === request) isLoading.value = false;
		}
	};

	// [Claude] Opens a schedule on its first week (US_05.08).
	const open = async (scheduleId: string) => {
		id.value = scheduleId;
		schedule.value = null;
		rows.value = [];
		selected.value = [];
		search.value = '';
		filters.value = emptyFilters();
		view.value = CalendarView.Week;
		try {
			schedule.value = await WorkingSchedulesAPI.read(scheduleId);
			date.value = clampDay(
				schedule.value.startDate || todayIn('UTC'),
				bounds.value,
			);
			await loadDays();
		} catch (error) {
			notifyError(error);
		}
	};

	const refresh = async () => {
		try {
			schedule.value = await WorkingSchedulesAPI.read(id.value);
		} catch (error) {
			notifyError(error);
		}
		await loadDays();
	};

	const resetFilters = () => {
		filters.value = emptyFilters();
	};

	/* [Claude] ------------------------------------------------------ Writes */

	const createShifts = async (
		template: ShiftTemplate,
	): Promise<Violation[]> => {
		const { skipped } = await AgentSchedulesAPI.createShifts(
			id.value,
			template,
		);
		await loadDays();
		return skipped;
	};

	const updateShift = async (shift: Shift) => {
		await AgentSchedulesAPI.updateShift(id.value, shift);
		await loadDays();
	};

	const deleteShift = async (shift: Shift) => {
		await AgentSchedulesAPI.deleteShift(id.value, shift);
		await loadDays();
	};

	const addAgents = async (agents: Lookup[]) => {
		await WorkingSchedulesAPI.addAgents(id.value, agents);
		await refresh();
	};

	const removeAgents = async (agentIds: string[]) => {
		for (const agentId of agentIds) {
			await WorkingSchedulesAPI.removeAgent(id.value, agentId);
		}
		selected.value = selected.value.filter(
			(agentId) => !agentIds.includes(agentId),
		);
		await refresh();
	};

	const updateState = async (state: ScheduleState, fillDaysOff?: boolean) => {
		if (!schedule.value) return 0;
		const { item, filledDays } = await WorkingSchedulesAPI.updateState({
			id: id.value,
			state,
			etag: schedule.value.etag,
			fillDaysOff,
		});
		schedule.value = item;
		await loadDays();
		return filledDays;
	};

	const setSchedule = (item: WorkingSchedule) => {
		schedule.value = item;
		date.value = clampDay(date.value, bounds.value);
		loadDays();
	};

	watch(
		[
			queryPeriod,
			search,
			filters,
		],
		(next, previous) => {
			if (JSON.stringify(next) !== JSON.stringify(previous)) loadDays();
		},
		{
			deep: true,
		},
	);

	return {
		schedule,
		rows,
		holidays,
		forecast,
		total,
		view,
		date,
		search,
		filters,
		selected,
		isLoading,
		timeZone,
		bounds,
		timeline,
		isReadonly,
		isActive,
		hasFilters,
		open,
		refresh,
		loadDays,
		resetFilters,
		createShifts,
		updateShift,
		deleteShift,
		addAgents,
		removeAgents,
		updateState,
		setSchedule,
	};
});
