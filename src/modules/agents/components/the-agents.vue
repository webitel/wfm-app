<template>
  <!-- [Claude] Agents (EP_02): every agent the user has access to and their absences by day.
       Only absences are planned here (US_02.01–02.07). -->
  <wt-page-wrapper
    :actions-panel="false"
    class="the-agents"
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
      <section class="the-agents__section">
        <header class="the-agents__head">
          <h3 class="typo-heading-4">
            {{ t('startPage.agents.name') }}
          </h3>
          <!-- [Claude] Add = Add absence for the checked agents (US_02.05.02); history is not MVP. -->
          <wt-action-bar
            :include="[IconAction.ADD, IconAction.FILTERS, IconAction.REFRESH]"
            @click:add="isAbsencePopup = true"
            @click:filters="isFiltersOpen = !isFiltersOpen"
            @click:refresh="load"
          >
            <template #search-bar>
              <wt-search-bar
                :value="search"
                debounce
                @search="search = $event"
                @update:value="search = $event"
              />
            </template>
            <wt-icon-action
              :action="IconAction.CLEAR"
              :disabled="!hasFilters"
              @click="resetFilters"
            />
            <wt-icon-action
              :action="IconAction.HISTORY"
              disabled
            />
          </wt-action-bar>
        </header>

        <agents-filters-panel
          v-if="isFiltersOpen"
          v-model:range="range"
          :filters="filters"
          is-period-shown
          @update:filters="filters = $event"
        />

        <div class="the-agents__calendar">
          <wt-empty
            v-if="!rows.length && !isLoading"
            :text="search || hasFilters ? t('wfmCalendar.noMatches') : t('wfmCalendar.noAgents')"
          />
          <the-schedule-calendar
            v-else
            v-model:date="date"
            v-model:range="range"
            v-model:selected="selected"
            v-model:view="view"
            :is-loading="isLoading"
            :rows="rows"
            :time-zone="timeZone"
            @action="onAction"
          />
        </div>

        <footer class="typo-body-2">
          {{ t('wfmCalendar.total') }}: {{ total }}
        </footer>
      </section>

      <add-absence-popup
        :preset-agents="selectedAgents"
        :save="createAbsences"
        :shown="isAbsencePopup"
        :today="todayIn(timeZone)"
        @close="isAbsencePopup = false"
      />
      <wfm-confirm-popup ref="confirmPopup" />
    </template>
  </wt-page-wrapper>
</template>

<script setup lang="ts">
import { WtEmpty } from '@webitel/ui-sdk/components';
import { IconAction } from '@webitel/ui-sdk/enums';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AddAbsencePopup from '../../../app/components/add-absence-popup.vue';
import AgentsFiltersPanel from '../../../app/components/agents-filters-panel.vue';
import TheScheduleCalendar from '../../../app/components/schedule-calendar/the-schedule-calendar.vue';
import type { CellAction } from '../../../app/components/schedule-calendar/types';
import WfmConfirmPopup from '../../../app/components/wfm-confirm-popup.vue';
import { useAbsenceWriter } from '../../../app/composables/useAbsenceWriter';
import { CellActionType } from '../../../app/enums';
import { todayIn } from '../../../app/utils/day';
import { useUserinfoStore } from '../../userinfo/store/userinfoStore';
import { useAgentsStore } from '../stores/agentsStore';

const { t } = useI18n();
const router = useRouter();

const agentsStore = useAgentsStore();
const {
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
} = storeToRefs(agentsStore);
const { load, resetFilters, setTimeZone } = agentsStore;

// [Claude] Dates are the user's: the time zone from their settings, the browser's until known.
const { timezone: userTimeZone } = storeToRefs(useUserinfoStore());
watch(userTimeZone, (value) => setTimeZone(value), {
	immediate: true,
});

const isFiltersOpen = ref(hasFilters.value);
const isAbsencePopup = ref(false);
const confirmPopup =
	useTemplateRef<InstanceType<typeof WfmConfirmPopup>>('confirmPopup');

const selectedAgents = computed(() =>
	rows.value
		.filter((row) => selected.value.includes(row.agent.id))
		.map((row) => row.agent),
);

const { setAbsence, deleteAbsence, createAbsences } = useAbsenceWriter({
	confirmPopup,
	timeZone,
	onWritten: load,
});

const onAction = (action: CellAction) => {
	if (
		(action.type === CellActionType.AddAbsence ||
			action.type === CellActionType.ChangeAbsence) &&
		action.absence
	) {
		setAbsence(action.agent.id, action.absence, action.date);
	}
	if (action.type === CellActionType.DeleteAbsence && action.absenceId) {
		deleteAbsence(action.agent.id, action.absenceId);
	}
};

const path = computed(() => [
	{
		name: t('wfm'),
		route: '/start-page',
	},
	{
		name: t('startPage.agents.name'),
	},
]);

const close = () =>
	router.push({
		name: 'the-start-page',
	});

onMounted(load);
</script>

<style scoped>
.the-agents__section {
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

.the-agents__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-sm);
}

.the-agents__calendar {
	flex: 1;
	min-height: 420px;
}
</style>
