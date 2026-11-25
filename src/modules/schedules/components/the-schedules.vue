<template>
  <!-- [Claude] Schedules register (US_05.01, Figma "Schedules directory" 8689:148834): the standard
       table page, as the lookups of Configuration. Add and Edit open the schedule dialog. -->
  <wt-page-wrapper
    :actions-panel="false"
    class="table-page"
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
      <section class="table-section">
        <header class="table-title">
          <h3 class="table-title__title">
            {{ t('startPage.schedules.name') }}
          </h3>

          <wt-action-bar
            :include="[IconAction.ADD, IconAction.DELETE]"
            :disabled:delete="!selected.length"
            @click:add="openPopup()"
            @click:delete="askDeleteConfirmation({
              deleted: selected,
              callback: () => deleteEls(selected),
            })"
          >
            <template #search-bar>
              <dynamic-filter-search
                :filters-manager="filtersManager"
                :is-filters-restoring="isFiltersRestoring"
                single-search-name="search"
                @filter:add="addFilter"
                @filter:update="updateFilter"
                @filter:delete="deleteFilter"
              />
            </template>
          </wt-action-bar>
        </header>

        <delete-confirmation-popup
          :callback="deleteCallback"
          :delete-count="deleteCount"
          :shown="isDeleteConfirmationPopup"
          @close="closeDelete"
        />

        <schedule-popup
          :loading="isSaving"
          :schedule="editedSchedule"
          :shown="isPopupShown"
          @close="isPopupShown = false"
          @save="saveSchedule"
        />

        <div class="table-section__table-wrapper">
          <wt-empty
            v-show="showEmpty"
                        :image="imageEmpty"
            :primary-action-text="primaryActionTextEmpty"
            :text="textEmpty"
            @click:primary="openPopup()"
          />

          <wt-loader v-show="isLoading" />

          <wt-table
            v-show="dataList.length && !isLoading"
            :data="dataList"
            :headers="shownHeaders"
            :selected="selected"
            sortable
            @sort="updateSort"
            @update:selected="updateSelected"
          >
            <template #name="{ item }">
              <wt-item-link :link="{ name: `${WfmSections.Schedules}-card`, params: { id: item.id } }">
                {{ item.name }}
              </wt-item-link>
            </template>

            <template #state="{ item }">
              <wt-chip :color="STATE_COLORS[item.state]">
                {{ t(`schedules.state.${item.state}`) }}
              </wt-chip>
            </template>

            <template #actions="{ item }">
              <wt-icon-action
                :disabled="item.state === WfmWorkingScheduleState.WorkingScheduleStateArchived"
                action="edit"
                @click="openPopup(item)"
              />
              <wt-icon-action
                action="delete"
                @click="askDeleteConfirmation({
                  deleted: [item],
                  callback: () => deleteEls([item]),
                })"
              />
            </template>
          </wt-table>

          <wt-pagination
            :next="next"
            :prev="page > 1"
            :size="size"
            debounce
            @change="updateSize"
            @next="updatePage(page + 1)"
            @prev="updatePage(page - 1)"
          />
        </div>
      </section>
    </template>
  </wt-page-wrapper>
</template>

<script setup lang="ts">
import { WfmWorkingScheduleState } from '@webitel/api-services/gen/models';
import { DynamicFilterSearchComponent as DynamicFilterSearch } from '@webitel/ui-datalist/filters';
import { WtEmpty } from '@webitel/ui-sdk/components';
import { useClose } from '@webitel/ui-sdk/composables';
import { ChipColor, IconAction, WfmSections } from '@webitel/ui-sdk/enums';
import DeleteConfirmationPopup from '@webitel/ui-sdk/src/modules/DeleteConfirmationPopup/components/delete-confirmation-popup.vue';
import { useDeleteConfirmationPopup } from '@webitel/ui-sdk/src/modules/DeleteConfirmationPopup/composables/useDeleteConfirmationPopup';
import { useTableEmpty } from '@webitel/ui-sdk/src/modules/TableComponentModule/composables/useTableEmpty';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import {
	createWorkingSchedule,
	type ScheduleDraft,
	type ScheduleHeader,
	updateWorkingSchedule,
} from '../../../app/api/wfm/wfmCalendarApi';
import { useSchedulesDatalistStore } from '../stores/schedulesDatalistStore';
import SchedulePopup from './schedule-popup.vue';

const { t } = useI18n();
const { close } = useClose('the-start-page');

// [Claude] No access checks yet: ui-sdk has no WtObject for working schedules, so
// [Claude] useUserAccessControl would deny everything here.

// [Claude] Figma: Draft red, Active green.
const STATE_COLORS: Record<WfmWorkingScheduleState, ChipColor> = {
	[WfmWorkingScheduleState.WorkingScheduleStateUnspecified]:
		ChipColor.SECONDARY,
	[WfmWorkingScheduleState.WorkingScheduleStateDraft]: ChipColor.ERROR,
	[WfmWorkingScheduleState.WorkingScheduleStatePending]: ChipColor.WARNING,
	[WfmWorkingScheduleState.WorkingScheduleStateActive]: ChipColor.SUCCESS,
	[WfmWorkingScheduleState.WorkingScheduleStateArchived]: ChipColor.SECONDARY,
};

const schedulesDatalistStore = useSchedulesDatalistStore();

const {
	dataList,
	selected,
	error,
	isLoading,
	page,
	size,
	next,
	shownHeaders,
	filtersManager,
	isFiltersRestoring,
} = storeToRefs(schedulesDatalistStore);

const {
	initialize,
	loadDataList,
	updateSelected,
	updatePage,
	updateSize,
	updateSort,
	deleteEls,
	addFilter,
	updateFilter,
	deleteFilter,
} = schedulesDatalistStore;

initialize();

const {
	isVisible: isDeleteConfirmationPopup,
	deleteCount,
	deleteCallback,
	askDeleteConfirmation,
	closeDelete,
} = useDeleteConfirmationPopup();

const path = computed(() => [
	{
		name: t('wfm'),
		route: '/start-page',
	},
	{
		name: t('startPage.schedules.name'),
	},
]);

/* [Claude] ---------------------------------------------------- Schedule dialog */

const isPopupShown = ref(false);
const isSaving = ref(false);
// [Claude] The schedule being edited; null = a new one.
const editedSchedule = ref<ScheduleHeader | null>(null);

const openPopup = (schedule: ScheduleHeader | null = null) => {
	editedSchedule.value = schedule;
	isPopupShown.value = true;
};

const saveSchedule = async (draft: ScheduleDraft) => {
	isSaving.value = true;
	try {
		if (editedSchedule.value) {
			await updateWorkingSchedule(editedSchedule.value.id, draft);
		} else {
			await createWorkingSchedule(draft);
		}
		isPopupShown.value = false;
		await loadDataList();
	} finally {
		isSaving.value = false;
	}
};

const {
	showEmpty,
	image: imageEmpty,
	text: textEmpty,
	primaryActionText: primaryActionTextEmpty,
} = useTableEmpty({
	dataList,
	error,
	filters: computed(() => filtersManager.value.getAllValues()),
	isLoading,
});
</script>
