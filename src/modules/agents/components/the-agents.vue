<template>
  <wt-page-wrapper
    :actions-panel="isFiltersOpen"
    class="the-agents table-page"
  >
    <template #header>
      <wt-page-header
        :secondary-action="close"
        hide-primary
      >
        <wt-breadcrumb :path="path" />
      </wt-page-header>
    </template>

    <!-- [Claude] As cc-supervisor Agents: the filters panel in the page actions panel. -->
    <template #actions-panel>
      <agents-filters-panel />
    </template>

    <template #main>
      <div class="the-agents__content">

        <!-- [Claude] table-page / table-section (ui-sdk): the block takes the whole page and
             only the calendar scrolls, as in the mockups. -->
        <section class="the-agents__section table-section">
          <header class="the-agents__header">
            <h3 class="typo-heading-4">
              {{ t('startPage.agents.name') }}
            </h3>

            <wt-action-bar
              :include="[IconAction.FILTERS, IconAction.REFRESH]"
              @click:refresh="load"
            >
              <!-- [Claude] As cc-supervisor: a badge on the filters icon while a filter is set;
                   the reset is in the filters panel. -->
              <template #filters>
                <wt-badge :hidden="!hasFilters">
                  <wt-icon-action
                    :action="IconAction.FILTERS"
                    @click="isFiltersOpen = !isFiltersOpen"
                  />
                </wt-badge>
              </template>
              <!-- [Claude] Add absence to one or several agents (US_02.05.02): the checked agents
                   go to the modal, none checked = empty Agents tab. -->
              <wt-icon-btn
                :tooltip="t('scheduleTable.addAbsence')"
                icon="wfm-vacation"
                @click="openAddAbsence"
              />
              <template #search-bar>
                <dynamic-filter-search
                  :filters-manager="filtersManager"
                  :is-filters-restoring="isFiltersRestoring"
                  :single-search-name="SEARCH_FILTER_NAME"
                  @filter:add="filtersManager.addFilter($event)"
                  @filter:update="filtersManager.updateFilter($event)"
                  @filter:delete="filtersManager.deleteFilter($event)"
                />
              </template>
            </wt-action-bar>
          </header>

          <the-schedule-table
            v-if="rows.length || isLoading"
            v-model:date="date"
            v-model:range="customRange"
            v-model:selected="selected"
            v-model:view="view"
            :loading="isLoading"
            :rows="rows"
            :total="total"
            class="the-agents__calendar"
            @action="onAction"
          />

          <!-- [Claude] No agent matches: the standard Webitel placeholder (US_02.03, US_02.04). -->
          <wt-empty
            v-else-if="showEmpty"
            :image="imageEmpty"
            :text="textEmpty"
          />
        </section>
      </div>

      <add-absence-popup
        :initial-agents="selectedAgents"
        :loading="isSaving"
        :search-agents="searchAgentsLookup"
        :shown="isAddAbsenceOpen && !shiftsToDelete.length"
        @close="isAddAbsenceOpen = false"
        @save="saveAbsences"
      />

      <delete-shifts-confirm-popup
        :loading="isSaving"
        :violations="shiftsToDelete"
        @cancel="cancel"
        @confirm="confirm"
      />
    </template>
  </wt-page-wrapper>
</template>

<script setup lang="ts">
import { DynamicFilterSearchComponent as DynamicFilterSearch } from '@webitel/ui-datalist/filters';
import { WtEmpty } from '@webitel/ui-sdk/components';
import { useClose } from '@webitel/ui-sdk/composables';
import { IconAction } from '@webitel/ui-sdk/enums';
import { useTableEmpty } from '@webitel/ui-sdk/src/modules/TableComponentModule/composables/useTableEmpty';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AbsenceItem } from '../../../app/api/wfm/wfmCalendarApi';
import { useAbsenceWriter } from '../../../app/components/schedule-table/composables/useAbsenceWriter';
import AddAbsencePopup from '../../../app/components/schedule-table/popups/add-absence-popup.vue';
import DeleteShiftsConfirmPopup from '../../../app/components/schedule-table/popups/delete-shifts-confirm-popup.vue';
import TheScheduleTable from '../../../app/components/schedule-table/the-schedule-table.vue';
import { type CellAction } from '../../../app/components/schedule-table/types';
import { CellActionType } from '../../../app/enums';
import { searchAgentsLookup } from '../../../app/mocks/schedule-table/mockLookups';
import { useAgentsFiltersQuery } from '../composables/useAgentsFiltersQuery';
import {
	SEARCH_FILTER_NAME,
	useAgentsCalendarStore,
} from '../stores/agentsCalendarStore';
import AgentsFiltersPanel from './agents-filters-panel.vue';

const { t } = useI18n();
const { close } = useClose('the-start-page');

const store = useAgentsCalendarStore();
const {
	view,
	date,
	rows,
	total,
	selected,
	isLoading,
	filtersManager,
	isFiltersRestoring,
	filterValues,
	customRange,
	period,
} = storeToRefs(store);
const { load } = store;

// [Claude] Filters live in the URL (standard Webitel logic): restored on open, then kept
// [Claude] in sync, so the first load already uses them.
const { restore } = useAgentsFiltersQuery();
restore();

// [Claude] Filters other than the search: they mark the filters icon and open the panel.
const hasFilters = computed(() =>
	Object.keys(filterValues.value).some((name) => name !== SEARCH_FILTER_NAME),
);
const isFiltersOpen = ref(hasFilters.value);

watch(
	[
		period,
		filterValues,
	],
	() => load(),
	{
		deep: true,
		immediate: true,
	},
);

const path = computed(() => [
	{
		name: t('wfm'),
		route: '/start-page',
	},
	{
		name: t('startPage.agents.name'),
	},
]);

const {
	showEmpty,
	image: imageEmpty,
	text: textEmpty,
} = useTableEmpty({
	dataList: rows,
	isLoading,
	filters: filterValues,
});

const { shiftsToDelete, isSaving, write, confirm, cancel, remove } =
	useAbsenceWriter({
		onDone: () => {
			isAddAbsenceOpen.value = false;
			return load();
		},
	});

/* [Claude] ----------------------------------------------------------- Add absence */

const isAddAbsenceOpen = ref(false);

const selectedAgents = computed(() =>
	rows.value
		.filter((r) => selected.value.includes(r.agent.id))
		.map((r) => r.agent),
);

const openAddAbsence = () => {
	isAddAbsenceOpen.value = true;
};

const saveAbsences = (payload: { agentIds: string[]; items: AbsenceItem[] }) =>
	write(payload);

/* [Claude] ---------------------------------------------------------- Cell actions */

// [Claude] Agents plans absences only: one day, one agent (US_02.05.01, US_02.06, US_02.07).
const onAction = (action: CellAction) => {
	if (
		action.type === CellActionType.AddAbsence ||
		action.type === CellActionType.ChangeAbsence
	) {
		write({
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
	}
	if (action.type === CellActionType.DeleteAbsence) {
		remove(action.agent.id, action.absenceId);
	}
};
</script>

<style scoped>
/* [Claude] The page main is a flex row: the table block fills it. */
.the-agents__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-sm);
  min-width: 0;
  min-height: 0;
}

.the-agents__section {
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius, 8px);
  background: var(--content-wrapper-color);
}

.the-agents__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.the-agents__header h3 {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.the-agents__calendar {
  flex: 1;
  min-height: 0;
}
</style>
