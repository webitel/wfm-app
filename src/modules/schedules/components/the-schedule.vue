<template>
  <!-- [Claude] Schedule page (EP_05): agents of the schedule, their shifts, pauses and absences by
       day / week / month, the forecast, status and the planning tools (US_05.05–05.21);
       shifts are dragged and resized in the Day view. -->
  <wt-page-wrapper
    :actions-panel="false"
    class="the-schedule"
  >
    <template #header>
      <wt-page-header
        :secondary-action="close"
        hide-primary
      >
        <wt-breadcrumb :path="path" />
      </wt-page-header>
    </template>

    <template #main>
      <section
        v-if="schedule"
        class="the-schedule__section"
      >
        <header class="the-schedule__row">
          <div class="the-schedule__group">
            <h3 class="typo-heading-4">
              {{ schedule.name }}
            </h3>
            <!-- [Claude] Re-created after a refusal, so it shows the state the schedule kept. -->
            <wt-single-select
              :key="`${schedule.state}-${stateSelectKey}`"
              :clearable="false"
              :disabled="isReadonly || isStateSaving"
              :model-value="stateOptions.find((option) => option.id === schedule?.state)"
              :options="stateOptions"
              class="the-schedule__state"
              option-label="name"
              @update:model-value="$event && changeState($event.id)"
            />
          </div>
          <div class="the-schedule__group">
            <!-- [Claude] Auto planning is EP_04, not in this scope. -->
            <wt-button
              color="secondary"
              disabled
            >
              {{ t('schedules.plan') }}
            </wt-button>
            <wt-button
              :disabled="schedule.state !== ScheduleState.Draft"
              color="secondary"
              @click="askEdit"
            >
              {{ t('reusable.edit') }}
            </wt-button>
          </div>
        </header>

        <div class="the-schedule__row">
          <wt-search-bar
            :value="search"
            debounce
            @search="search = $event"
            @update:value="search = $event"
          />
          <div class="the-schedule__group">
            <wt-icon-btn
              v-tooltip="t('schedules.addShifts')"
              :disabled="isReadonly"
              icon="plus"
              @click="openShiftPopup({ mode: 'add', agents: selectedAgents, date: todayInSchedule })"
            />
            <wt-icon-btn
              v-tooltip="t('wfmCalendar.addAbsence')"
              :disabled="isReadonly"
              icon="calendar"
              @click="isAbsencePopup = true"
            />
            <wt-icon-btn
              v-tooltip="t('schedules.addAgents')"
              :disabled="isReadonly"
              icon="add-contact"
              @click="isAgentsPopup = true"
            />
            <wt-icon-btn
              v-tooltip="t('schedules.deleteAgents')"
              :disabled="isReadonly || !selected.length"
              icon="bucket"
              @click="askRemoveAgents(selected)"
            />
            <wt-icon-action
              :action="IconAction.FILTERS"
              @click="isFiltersOpen = !isFiltersOpen"
            />
            <wt-icon-action
              :action="IconAction.CLEAR"
              :disabled="!hasFilters"
              @click="resetFilters"
            />
            <wt-icon-action
              :action="IconAction.REFRESH"
              @click="refresh"
            />
            <wt-icon-action
              :action="IconAction.HISTORY"
              disabled
            />
          </div>
        </div>

        <agents-filters-panel
          v-if="isFiltersOpen"
          :filters="filters"
          @update:filters="filters = $event"
        />

        <div class="the-schedule__calendar">
          <the-schedule-calendar
            v-model:date="date"
            v-model:selected="selected"
            v-model:view="view"
            :bounds="bounds"
            :forecast="forecast"
            :holidays="holidays"
            :is-confirmed-shown="isActive"
            :is-loading="isLoading"
            :is-readonly="isReadonly"
            :rows="rows"
            :time-zone="timeZone"
            :timeline="timeline"
            is-agent-deletable
            is-day-view-enabled
            is-shifts-enabled
            @action="onAction"
          />
        </div>

        <footer class="the-schedule__total typo-body-2">
          <span>{{ t('wfmCalendar.total') }}: {{ total }}</span>
          <span>
            <wt-icon icon="wfm-approved" />
            {{ t('wfmCalendar.confirmed') }}: {{ isActive ? total : 0 }}
          </span>
          <span>{{ t('wfmCalendar.notConfirmed') }}: {{ isActive ? 0 : total }}</span>
        </footer>
      </section>
      <wt-loader v-else />

      <schedule-popup
        :schedule="schedule"
        :shown="isEditPopup"
        @close="isEditPopup = false"
        @saved="onScheduleSaved"
      />
      <shift-popup
        :bounds="bounds"
        :save-shift="saveShift"
        :save-template="saveTemplate"
        :schedule-agents="scheduleAgents"
        :shown="!!shiftTarget"
        :target="shiftTarget"
        :time-zone="timeZone"
        @close="shiftTarget = null"
      />
      <add-absence-popup
        :preset-agents="selectedAgents"
        :save="createAbsences"
        :search-agents="searchScheduleAgents"
        :shown="isAbsencePopup"
        :today="todayInSchedule"
        @close="isAbsencePopup = false"
      />
      <add-agents-popup
        :save="addAgents"
        :schedule-agents="scheduleAgents"
        :shown="isAgentsPopup"
        @close="isAgentsPopup = false"
      />
      <wfm-confirm-popup ref="confirmPopup" />
    </template>
  </wt-page-wrapper>
</template>

<script setup lang="ts">
import { IconAction, WfmSections } from '@webitel/ui-sdk/enums';
import { storeToRefs } from 'pinia';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import {
	type Lookup,
	ScheduleState,
	type Shift,
	type ShiftTemplate,
	type Violation,
	type WorkingSchedule,
} from '../../../app/api/wfm/types';
import { WfmApiError, WfmErrorId } from '../../../app/api/wfm/wfmHttp';
import AddAbsencePopup from '../../../app/components/add-absence-popup.vue';
import AgentsFiltersPanel from '../../../app/components/agents-filters-panel.vue';
import TheScheduleCalendar from '../../../app/components/schedule-calendar/the-schedule-calendar.vue';
import type { CellAction } from '../../../app/components/schedule-calendar/types';
import WfmConfirmPopup from '../../../app/components/wfm-confirm-popup.vue';
import { useAbsenceWriter } from '../../../app/composables/useAbsenceWriter';
import { useWfmErrors } from '../../../app/composables/useWfmErrors';
import { CellActionType } from '../../../app/enums';
import { clampDay, todayIn } from '../../../app/utils/day';
import { useScheduleStore } from '../stores/scheduleStore';
import AddAgentsPopup from './add-agents-popup.vue';
import SchedulePopup from './schedule-popup.vue';
import ShiftPopup, { type ShiftPopupTarget } from './shift-popup.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { notify, notifyError, violationText } = useWfmErrors();

const store = useScheduleStore();
const {
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
} = storeToRefs(store);
const {
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
} = store;

watch(
	() => route.params.id,
	(id) => {
		if (id) open(String(id));
	},
	{
		immediate: true,
	},
);

const confirmPopup =
	useTemplateRef<InstanceType<typeof WfmConfirmPopup>>('confirmPopup');
const isFiltersOpen = ref(false);
const isEditPopup = ref(false);
const isAbsencePopup = ref(false);
const isAgentsPopup = ref(false);
const isStateSaving = ref(false);
const stateSelectKey = ref(0);
const shiftTarget = ref<ShiftPopupTarget | null>(null);

const todayInSchedule = computed(() =>
	clampDay(todayIn(timeZone.value), bounds.value),
);
const scheduleAgents = computed<Lookup[]>(() =>
	rows.value.map((row) => row.agent),
);
const selectedAgents = computed(() =>
	scheduleAgents.value.filter((agent) => selected.value.includes(agent.id)),
);

// [Claude] Absences on the schedule page offer the schedule's agents.
const searchScheduleAgents = async ({ search: query = '' }) => {
	const text = String(query).replaceAll('*', '').toLowerCase();
	return {
		items: scheduleAgents.value.filter((agent) =>
			agent.name.toLowerCase().includes(text),
		),
		next: false,
	};
};

const stateOptions = computed(() =>
	[
		ScheduleState.Draft,
		ScheduleState.Pending,
		ScheduleState.Active,
		ScheduleState.Archived,
	].map((state) => ({
		id: state,
		name: t(`schedules.state.${state}`),
	})),
);

const showViolations = (title: string, violations: Violation[]) =>
	confirmPopup.value?.ask({
		title,
		details: violations.map((violation) =>
			violationText(violation, timeZone.value),
		),
		yes: t('reusable.close'),
		isInfo: true,
	});

/* [Claude] ----------------------------------------------------------- Absences */

const { setAbsence, deleteAbsence, createAbsences } = useAbsenceWriter({
	confirmPopup,
	timeZone,
	onWritten: loadDays,
});

/* [Claude] ------------------------------------------------------------ Shifts */

const openShiftPopup = (target: ShiftPopupTarget) => {
	shiftTarget.value = target;
};

// [Claude] A refusal lists its rules; a version conflict needs a fresh read (wfm/violation.proto).
const handleShiftError = async (error: unknown): Promise<boolean> => {
	if (error instanceof WfmApiError && error.violations.length) {
		await showViolations(
			t('wfmErrors.storage_shift_refused'),
			error.violations,
		);
		await loadDays();
		return false;
	}
	notifyError(error);
	await loadDays();
	return (
		error instanceof WfmApiError && error.id === WfmErrorId.ShiftVersionConflict
	);
};

// [Claude] Days the template skipped (absence, locked) are reported.
const saveTemplate = async (template: ShiftTemplate) => {
	try {
		const skipped = await createShifts(template);
		if (skipped.length) {
			notify(
				'info',
				t('schedules.skipped', {
					count: skipped.length,
				}),
			);
		}
		return true;
	} catch (error) {
		return handleShiftError(error);
	}
};

const saveShift = async (shift: Shift) => {
	try {
		await updateShift(shift);
		return true;
	} catch (error) {
		return handleShiftError(error);
	}
};

const removeShift = async (shift: Shift) => {
	try {
		await deleteShift(shift);
	} catch (error) {
		await handleShiftError(error);
	}
};

/* [Claude] ------------------------------------------------------------ Agents */

const askRemoveAgents = async (agentIds: string[]) => {
	const isYes = await confirmPopup.value?.ask({
		title: t('schedules.deleteConfirm.title'),
		text: t('schedules.deleteConfirm.agents', {
			count: agentIds.length,
		}),
		yes: t('reusable.delete'),
		no: t('reusable.cancel'),
		isDanger: true,
	});
	if (!isYes) return;
	try {
		await removeAgents(agentIds);
	} catch (error) {
		notifyError(error);
		await refresh();
	}
};

/* [Claude] ----------------------------------------------------- Cell actions */

const onAction = (action: CellAction) => {
	const { shift, pause } = action;
	switch (action.type) {
		case CellActionType.AddAbsence:
		case CellActionType.ChangeAbsence:
			if (action.absence) {
				setAbsence(action.agent.id, action.absence, action.date);
			}
			break;
		case CellActionType.DeleteAbsence:
			if (action.absenceId) deleteAbsence(action.agent.id, action.absenceId);
			break;
		case CellActionType.AddShift:
			openShiftPopup({
				mode: 'add',
				agents: [
					action.agent,
				],
				date: action.date,
			});
			break;
		case CellActionType.EditShift:
			if (shift) {
				openShiftPopup({
					mode: 'edit',
					agent: action.agent,
					shift,
				});
			}
			break;
		case CellActionType.DeleteShift:
			if (shift) removeShift(shift);
			break;
		// [Claude] Dragged in Day: the calendar already checked the rules; the server has the last word.
		case CellActionType.MoveShift:
			if (shift) saveShift(shift);
			break;
		// [Claude] A pause is deleted by saving its shift without it (UpdateAgentWorkingScheduleShift).
		case CellActionType.DeletePause:
			if (shift && pause) {
				saveShift({
					...shift,
					pauses: shift.pauses.filter(
						(item) =>
							item.startAt !== pause.startAt || item.endAt !== pause.endAt,
					),
				});
			}
			break;
		case CellActionType.DeleteAgent:
			askRemoveAgents([
				action.agent.id,
			]);
			break;
	}
};

/* [Claude] ------------------------------------------------------------ Status */

// [Claude] Pending / active ask about unplanned days first (US_05.20); activation may be refused
// [Claude] with the rules it breaks.
const changeState = async (state: ScheduleState) => {
	if (!schedule.value || state === schedule.value.state) return;
	isStateSaving.value = true;
	const send = async (fillDaysOff?: boolean) => {
		const filled = await updateState(state, fillDaysOff);
		notify(
			'success',
			t('schedules.stateChanged', {
				state: t(`schedules.state.${state}`),
			}),
		);
		if (filled) {
			notify(
				'info',
				t('schedules.unplanned.filled', {
					count: filled,
				}),
			);
		}
	};
	try {
		try {
			await send();
		} catch (error) {
			if (
				!(error instanceof WfmApiError) ||
				error.id !== WfmErrorId.ScheduleUnplannedDays
			) {
				throw error;
			}
			const isYes = await confirmPopup.value?.ask({
				title: t('schedules.unplanned.title'),
				text: t('schedules.unplanned.text'),
			});
			await send(!!isYes);
		}
	} catch (refusal) {
		if (
			refusal instanceof WfmApiError &&
			refusal.id === WfmErrorId.ScheduleActivationRefused
		) {
			await showViolations(
				t('schedules.activationRefused'),
				refusal.violations,
			);
		} else {
			notifyError(refusal);
		}
		if (
			refusal instanceof WfmApiError &&
			refusal.id === WfmErrorId.ScheduleVersionConflict
		) {
			await refresh();
		}
	} finally {
		isStateSaving.value = false;
		stateSelectKey.value += 1;
	}
};

/* [Claude] -------------------------------------------------------------- Edit */

// [Claude] Editing may clear the planned shifts: asked first (US_05.04).
const askEdit = async () => {
	const isYes = await confirmPopup.value?.ask({
		title: t('schedules.editConfirm.title'),
		text: t('schedules.editConfirm.text'),
	});
	if (isYes) isEditPopup.value = true;
};

const onScheduleSaved = (saved: WorkingSchedule) => {
	isEditPopup.value = false;
	setSchedule(saved);
};

/* [Claude] ------------------------------------------------------- Navigation */

const path = computed(() => [
	{
		name: t('wfm'),
		route: '/start-page',
	},
	{
		name: t('schedules.schedules', 2),
		route: '/schedules',
	},
	{
		name: schedule.value?.name || '',
	},
]);

const close = () =>
	router.push({
		name: WfmSections.Schedules,
	});
</script>

<style scoped>
.the-schedule__section {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing-sm);
	border-radius: var(--border-radius);
	background: var(--content-wrapper-color);
	padding: var(--spacing-sm);
	width: 100%;
	min-height: 0;
}

.the-schedule__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-sm);
}

.the-schedule__group {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.the-schedule__state {
	width: 180px;
}

.the-schedule__calendar {
	flex: 1;
	min-height: 460px;
}

.the-schedule__total {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
}

.the-schedule__total span {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}
</style>
