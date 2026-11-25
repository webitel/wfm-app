<template>
  <wt-page-wrapper
    :actions-panel="false"
    class="the-schedule table-page"
  >
    <template #header>
      <!-- [Claude] Figma "Headline": PLAN (automatic planning, EP_04) and CLOSE. -->
      <wt-page-header :secondary-action="close">
        <wt-breadcrumb :path="path" />
        <template #primary-action>
          <wt-button
            :disabled="isReadonly || !schedule"
            :loading="isPlanning"
            color="success"
            @click="plan"
          >
            {{ t('schedules.plan') }}
          </wt-button>
        </template>
      </wt-page-header>
    </template>

    <template #main>
      <div
        v-if="schedule"
        class="the-schedule__content"
      >
        <!-- [Claude] Figma "Frame 2752": Supervisor, Team, Skill; every change applies at once. -->
        <section
          v-if="isFiltersOpen"
          class="the-schedule__filters"
        >
          <wt-multi-select
            v-model:model-value="supervisors"
            :label="t('agents.filters.supervisor')"
            :placeholder="t('agents.filters.supervisor')"
            :search-method="searchSupervisorsLookup"
            option-label="name"
          />
          <wt-multi-select
            v-model:model-value="teams"
            :label="t('agents.filters.team')"
            :placeholder="t('agents.filters.team')"
            :search-method="searchTeamsLookup"
            option-label="name"
          />
          <wt-multi-select
            v-model:model-value="skills"
            :label="t('agents.filters.skill')"
            :placeholder="t('agents.filters.skill')"
            :search-method="searchSkillsLookup"
            option-label="name"
          />
        </section>

        <section class="the-schedule__section table-section">
          <!-- [Claude] Figma "Action bar/WFM": WFM › Agents, the state chip, then the icons in
               the mockup's order. Not wt-action-bar: it sorts its icons in its own order. -->
          <header class="the-schedule__header">
            <wt-breadcrumb :path="sectionPath" />
            <wt-chip :color="stateChipColor">
              {{ t(`schedules.state.${schedule.state}`) }}
            </wt-chip>

            <div class="the-schedule__actions">
              <wt-search-bar
                v-if="isSearchOpen"
                :value="q"
                @input="q = $event"
                @search="load"
              />

              <wt-icon-btn

                size="sm"
                :tooltip="t('schedules.actions.search')"
                icon="search"
                @click="isSearchOpen = !isSearchOpen"
              />
              <!-- [Claude] Order as in the mockup: add shifts, approve, add absence (US_05.14, US_05.17). -->
              <wt-icon-action
                size="sm"
                :action="IconAction.ADD"
                :disabled="isReadonly"
                @click="openAddShifts"
              />
              <wt-icon-btn
                size="sm"
                :disabled="!nextState"
                :tooltip="t('schedules.actions.approve')"
                color="success"
                icon="done"
                @click="approve"
              />
              <wt-icon-btn
                size="sm"
                :disabled="isReadonly"
                :tooltip="t('scheduleTable.addAbsence')"
                icon="wfm-vacation"
                @click="openAddAbsence"
              />
              <wt-icon-action
                size="sm"
                :action="IconAction.ADD_CONTACT"
                :disabled="isReadonly"
                @click="isAddAgentsOpen = true"
              />
              <wt-icon-action
                size="sm"
                :action="IconAction.HISTORY"
                @click="openHistory"
              />
              <wt-icon-action
                size="sm"
                :action="IconAction.FILTERS"
                @click="isFiltersOpen = !isFiltersOpen"
              />
              <wt-icon-action
                size="sm"
                :action="IconAction.REFRESH"
                @click="load"
              />
              <wt-icon-btn
                size="sm"
                :disabled="isReadonly || !rows.length"
                :tooltip="t('schedules.actions.clear')"
                icon="edit"
                @click="askClearShifts"
              />
              <wt-icon-action
                size="sm"
                :action="IconAction.DELETE"
                :disabled="isReadonly || !selected.length"
                @click="askDeleteAgents()"
              />
              <wt-icon-action
                size="sm"
                :action="IconAction.CANCEL"
                :disabled="!selected.length"
                @click="selected = []"
              />
            </div>
          </header>

          <the-schedule-table
            v-model:date="date"
            v-model:selected="selected"
            v-model:view="view"
            :bounds="bounds"
            :time-zone="calendar?.timeZone"
            is-day-view
            shifts
            :forecast="forecast"
            :holidays="holidays"
            :loading="isLoading"
            :has-more="hasMore"
            :readonly="isReadonly"
            :rows="rows"
            :total="total"
            :timeline="schedule.timeline"
            class="the-schedule__calendar"
            @action="onAction"
            @load-more="store.loadMore"
          />
        </section>
      </div>

      <add-agents-popup
        :loading="isAgentsSaving"
        :search-agents="searchAgentsToAdd"
        :search-skills="searchSkillsLookup"
        :search-teams="searchTeamsLookup"
        :shown="isAddAgentsOpen"
        @add="addAgents"
        @close="isAddAgentsOpen = false"
      />

      <schedule-history-popup
        :loading="isHistoryLoading"
        :logs="historyLogs"
        :shown="isHistoryOpen"
        @close="isHistoryOpen = false"
      />

      <delete-confirmation-popup
        :callback="deleteCallback"
        :delete-count="deleteCount"
        :shown="isDeleteConfirmationPopup"
        @close="closeDelete"
      />

      <shift-popup
        :context="shiftContext"
        :loading="isSaving"
        :search-agents="searchScheduleAgents"
        :shown="!!shiftContext"
        :time-zone="calendar?.timeZone || 'UTC'"
        @close="shiftContext = null"
        @create="createShifts"
        @update="updateShift"
      />

      <add-absence-popup
        :initial-agents="selectedAgents"
        :loading="isAbsenceSaving"
        :search-agents="searchScheduleAgents"
        :shown="isAddAbsenceOpen && !shiftsToDelete.length"
        @close="isAddAbsenceOpen = false"
        @save="writeAbsence"
      />

      <delete-shifts-confirm-popup
        :loading="isAbsenceSaving"
        :violations="shiftsToDelete"
        @cancel="cancelAbsence"
        @confirm="confirmAbsence"
      />
    </template>
  </wt-page-wrapper>
</template>

<script setup lang="ts">
import { WfmWorkingScheduleState } from '@webitel/api-services/gen/models';
import { useClose } from '@webitel/ui-sdk/composables';
import { ChipColor, IconAction, WfmSections } from '@webitel/ui-sdk/enums';
import DeleteConfirmationPopup from '@webitel/ui-sdk/src/modules/DeleteConfirmationPopup/components/delete-confirmation-popup.vue';
import { useDeleteConfirmationPopup } from '@webitel/ui-sdk/src/modules/DeleteConfirmationPopup/composables/useDeleteConfirmationPopup';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import {
	addWorkingScheduleAgents,
	type CreateShiftsParams,
	createAgentsWorkingScheduleShifts,
	deleteAgentsWorkingScheduleShifts,
	deleteAgentWorkingScheduleShift,
	deleteWorkingScheduleAgents,
	planWorkingSchedule,
	type ScheduleLog,
	searchWorkingScheduleHistory,
	type UpdateShiftParams,
	updateAgentWorkingScheduleShift,
	updateWorkingScheduleState,
} from '../../../app/api/wfm/wfmCalendarApi';
import { useAbsenceWriter } from '../../../app/components/schedule-table/composables/useAbsenceWriter';
import { useWfmNotify } from '../../../app/components/schedule-table/composables/useWfmNotify';
import AddAbsencePopup from '../../../app/components/schedule-table/popups/add-absence-popup.vue';
import AddAgentsPopup from '../../../app/components/schedule-table/popups/add-agents-popup.vue';
import DeleteShiftsConfirmPopup from '../../../app/components/schedule-table/popups/delete-shifts-confirm-popup.vue';
import TheScheduleTable from '../../../app/components/schedule-table/the-schedule-table.vue';
import {
	type CalendarShift,
	type CellAction,
	WfmApiError,
} from '../../../app/components/schedule-table/types';
import { rangeForView } from '../../../app/components/schedule-table/utils/date';
import { CellActionType } from '../../../app/enums';
import {
	searchAgentsToAddLookup,
	searchScheduleAgentsLookup,
	searchSkillsLookup,
	searchSupervisorsLookup,
	searchTeamsLookup,
} from '../../../app/mocks/schedule-table/mockLookups';
import { useScheduleCalendarStore } from '../stores/scheduleCalendarStore';
import ScheduleHistoryPopup from './schedule-history-popup.vue';
import ShiftPopup, { type ShiftPopupContext } from './shift-popup.vue';

const { t } = useI18n();
const route = useRoute();
const { close } = useClose(WfmSections.Schedules);
const { notifyError, notifyInfo } = useWfmNotify();

const store = useScheduleCalendarStore();
const {
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
	hasMore,
	bounds,
	isReadonly,
} = storeToRefs(store);
const { load, open, setSchedule } = store;

watch(
	() => route.params.id as string,
	async (id) => {
		if (!id) return;
		try {
			await open(id);
		} catch (error) {
			notifyError(error);
		}
	},
	{
		immediate: true,
	},
);

watch(
	[
		view,
		date,
		schedule,
		supervisors,
		teams,
		skills,
	],
	load,
);

const path = computed(() => [
	{
		name: t('wfm'),
		route: '/start-page',
	},
	{
		name: t('startPage.schedules.name'),
		route: '/schedules',
	},
	{
		name: schedule.value?.name || '',
	},
]);

// [Claude] Second level of the action bar's breadcrumb (Figma "Action bar/WFM").
const sectionPath = computed(() => [
	{
		name: t('wfm'),
		route: '/start-page',
	},
	{
		name: t('schedules.agents'),
	},
]);

const searchScheduleAgents = (params?: { search?: string }) =>
	searchScheduleAgentsLookup(route.params.id as string)(params);

const searchAgentsToAdd = (params?: {
	search?: string;
	teamId?: string;
	skillId?: string;
}) => searchAgentsToAddLookup(route.params.id as string)(params);

const isFiltersOpen = ref(true);
const isSearchOpen = ref(false);

const selectedAgents = computed(() =>
	rows.value
		.filter((r) => selected.value.includes(r.agent.id))
		.map((r) => r.agent),
);

// [Claude] 409: someone changed the shift meanwhile — reread and say the data is fresh.
const handleWriteError = async (error: unknown) => {
	if (error instanceof WfmApiError && error.status === 409) {
		notifyInfo(t('scheduleTable.dataUpdated'));
		await load();
		return;
	}
	notifyError(error);
};

/* [Claude] ---------------------------------------------------------- Action bar */
// [Claude] Calls of the action bar are prototype-only: the contract (protos#532) lacks them.

// [Claude] Draft is red in the mockup; the other states follow their meaning.
const STATE_CHIP_COLOR: Record<WfmWorkingScheduleState, ChipColor> = {
	[WfmWorkingScheduleState.WorkingScheduleStateUnspecified]:
		ChipColor.SECONDARY,
	[WfmWorkingScheduleState.WorkingScheduleStateDraft]: ChipColor.ERROR,
	[WfmWorkingScheduleState.WorkingScheduleStatePending]: ChipColor.WARNING,
	[WfmWorkingScheduleState.WorkingScheduleStateActive]: ChipColor.SUCCESS,
	[WfmWorkingScheduleState.WorkingScheduleStateArchived]: ChipColor.SECONDARY,
};

const stateChipColor = computed(() => STATE_CHIP_COLOR[schedule.value.state]);

// [Claude] Approve moves the schedule on: draft -> pending -> active (WFM overview).
const NEXT_STATE: Partial<
	Record<WfmWorkingScheduleState, WfmWorkingScheduleState>
> = {
	[WfmWorkingScheduleState.WorkingScheduleStateDraft]:
		WfmWorkingScheduleState.WorkingScheduleStatePending,
	[WfmWorkingScheduleState.WorkingScheduleStatePending]:
		WfmWorkingScheduleState.WorkingScheduleStateActive,
};

const nextState = computed(() => NEXT_STATE[schedule.value?.state]);

// [Claude] Runs a change of the schedule, then shows the fresh schedule and its rows.
// [Claude] Resolves to whether it went through.
const changeSchedule = async (
	change: () => ReturnType<typeof planWorkingSchedule>,
) => {
	try {
		setSchedule(await change());
		return true;
	} catch (error) {
		await handleWriteError(error);
		return false;
	}
};

const isPlanning = ref(false);

const plan = async () => {
	isPlanning.value = true;
	const isPlanned = await changeSchedule(() =>
		planWorkingSchedule(schedule.value.id),
	);
	isPlanning.value = false;
	if (isPlanned) notifyInfo(t('schedules.planned'));
};

const approve = () =>
	changeSchedule(() =>
		updateWorkingScheduleState(
			schedule.value.id,
			nextState.value,
			schedule.value.etag,
		),
	);

const isAddAgentsOpen = ref(false);
const isAgentsSaving = ref(false);

const addAgents = async (agentIds: string[]) => {
	isAgentsSaving.value = true;
	const isAdded = await changeSchedule(() =>
		addWorkingScheduleAgents(schedule.value.id, agentIds),
	);
	isAgentsSaving.value = false;
	if (isAdded) isAddAgentsOpen.value = false;
};

const isHistoryOpen = ref(false);
const isHistoryLoading = ref(false);
const historyLogs = ref<ScheduleLog[]>([]);

const openHistory = async () => {
	isHistoryOpen.value = true;
	isHistoryLoading.value = true;
	try {
		historyLogs.value = await searchWorkingScheduleHistory(schedule.value.id);
	} catch (error) {
		notifyError(error);
	} finally {
		isHistoryLoading.value = false;
	}
};

const {
	isVisible: isDeleteConfirmationPopup,
	deleteCount,
	deleteCallback,
	askDeleteConfirmation,
	closeDelete,
} = useDeleteConfirmationPopup();

// [Claude] Delete agents from the schedule with their shifts (EP_05): the checked ones, or
// [Claude] the one whose row trash was clicked (US_05.07).
const askDeleteAgents = (
	agentIds = [
		...selected.value,
	],
) => {
	askDeleteConfirmation({
		deleted: agentIds,
		callback: async () => {
			await changeSchedule(() =>
				deleteWorkingScheduleAgents(schedule.value.id, agentIds),
			);
			selected.value = selected.value.filter((id) => !agentIds.includes(id));
		},
	});
};

// [Claude] Clear: the shifts of the checked agents (all when none) in the shown period.
const askClearShifts = () => {
	const agentIds = selected.value.length
		? [
				...selected.value,
			]
		: rows.value.map((r) => r.agent.id);
	askDeleteConfirmation({
		deleted: agentIds,
		callback: async () => {
			try {
				await deleteAgentsWorkingScheduleShifts(schedule.value.id, {
					agentIds,
					date: rangeForView(view.value, date.value),
				});
				await load();
			} catch (error) {
				await handleWriteError(error);
			}
		},
	});
};

/* [Claude] ---------------------------------------------------------------- Shifts */

const shiftContext = ref<ShiftPopupContext | null>(null);
const isSaving = ref(false);

const openAddShifts = () => {
	shiftContext.value = {
		from: date.value,
		to: date.value,
		agents: selectedAgents.value,
	};
};

const createShifts = async (params: CreateShiftsParams) => {
	isSaving.value = true;
	try {
		const { skipped } = await createAgentsWorkingScheduleShifts(
			schedule.value.id,
			params,
		);
		// [Claude] Days with an absence or another schedule's lock are skipped, not refused.
		if (skipped.length)
			notifyInfo(
				t('scheduleTable.skipped', {
					count: skipped.length,
				}),
			);
		shiftContext.value = null;
		await load();
	} catch (error) {
		await handleWriteError(error);
	} finally {
		isSaving.value = false;
	}
};

const updateShift = async (params: UpdateShiftParams) => {
	isSaving.value = true;
	try {
		await updateAgentWorkingScheduleShift(schedule.value.id, params);
		shiftContext.value = null;
		await load();
	} catch (error) {
		await handleWriteError(error);
	} finally {
		isSaving.value = false;
	}
};

// [Claude] A shift dragged in the Day view. The row is reread either way, so a refused drop
// [Claude] puts the shift back where it was.
const saveDraggedShift = async (shift: CalendarShift) => {
	isSaving.value = true;
	try {
		await updateAgentWorkingScheduleShift(schedule.value.id, {
			id: shift.id,
			etag: shift.etag,
			startAt: shift.startAt,
			endAt: shift.endAt,
			pauses: shift.pauses,
			skills: shift.skills,
		});
		await load();
	} catch (error) {
		await handleWriteError(error);
		if (!(error instanceof WfmApiError && error.status === 409)) await load();
	} finally {
		isSaving.value = false;
	}
};

/* [Claude] -------------------------------------------------------------- Absences */

const isAddAbsenceOpen = ref(false);

const {
	shiftsToDelete,
	isSaving: isAbsenceSaving,
	write: writeAbsence,
	confirm: confirmAbsence,
	cancel: cancelAbsence,
	remove: removeAbsence,
} = useAbsenceWriter({
	onDone: () => {
		isAddAbsenceOpen.value = false;
		return load();
	},
});

const openAddAbsence = () => {
	isAddAbsenceOpen.value = true;
};

/* [Claude] ---------------------------------------------------------- Cell actions */

const onAction = async (action: CellAction) => {
	switch (action.type) {
		case CellActionType.AddAbsence:
		case CellActionType.ChangeAbsence:
			await writeAbsence({
				agentIds: [
					action.agent.id,
				],
				items: [
					{
						type: action.absence,
						from: action.date,
						to: action.date,
					},
				],
			});
			break;
		case CellActionType.DeleteAbsence:
			await removeAbsence(action.agent.id, action.absenceId);
			break;
		case CellActionType.AddShift:
			shiftContext.value = {
				from: action.date,
				to: action.date,
				agents: [
					action.agent,
				],
			};
			break;
		case CellActionType.EditShift:
			shiftContext.value = {
				from: action.date,
				to: action.date,
				agents: [
					action.agent,
				],
				shift: action.shift,
			};
			break;
		case CellActionType.DeleteShift:
			try {
				await deleteAgentWorkingScheduleShift(
					schedule.value.id,
					action.shift.id,
					action.shift.etag,
				);
				await load();
			} catch (error) {
				await handleWriteError(error);
			}
			break;
		case CellActionType.DeletePause:
			// [Claude] A pause is deleted by editing its shift without it (protos#532).
			await updateShift({
				id: action.shift.id,
				etag: action.shift.etag,
				startAt: action.shift.startAt,
				endAt: action.shift.endAt,
				pauses: action.shift.pauses.filter((p) => p.id !== action.pause.id),
				skills: action.shift.skills,
			});
			break;
		case CellActionType.DragShift:
			await saveDraggedShift(action.shift);
			break;
		case CellActionType.DeleteAgent:
			askDeleteAgents([
				action.agent.id,
			]);
			break;
	}
};
</script>

<style scoped>
/* [Claude] Layout comes from ui-sdk table-page / table-section: whole page, inner scroll.
   The page main is a flex row: filters and table go in one column. */
/* [Claude] Figma: filters and table are two white blocks on the page background, so the
   wrapper's own white block goes. */
.the-schedule :deep(.wt-page-wrapper__main) {
  padding: 0;
  background: transparent;
}

.the-schedule__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-sm);
  min-width: 0;
  min-height: 0;
}

/* [Claude] Figma "Frame 2752": a white block, three selects in a row. */
.the-schedule__filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius, 8px);
  background: var(--content-wrapper-color);
}

.the-schedule__section {
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius, 8px);
  background: var(--content-wrapper-color);
}

.the-schedule__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2xs, 4px);
}

/* [Claude] Figma: 16px icons, 8px padding each, 4px apart. */
.the-schedule__actions {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
}

.the-schedule__calendar {
  flex: 1;
  min-height: 0;
}
</style>
