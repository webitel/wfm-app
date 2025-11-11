<template>
  <wt-page-wrapper class="table-page" :actions-panel="false">
    <template #header>
      <wt-page-header :secondary-action="close" hide-primary>
        <wt-breadcrumb :path="path" />
      </wt-page-header>
    </template>

    <template #main>
      <section class="table-section">
        <header class="table-title">
          <h3 class="table-title__title">
            {{ t(`${WfmSections.Agents}.name`) }}
          </h3>
        </header>

        <div
          class="table-section__table-wrapper"
        >
          <wt-loader v-show="isLoading" />

          <div
            v-show="!isLoading && dataList?.length"
            class="table-wrapper"
          >
            <wt-table
              :data="dataList"
              :headers="shownHeaders"
              :selectable="false"
              :grid-actions="false"
              sortable
              @sort="updateSort"
            >
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
        </div>
      </section>
    </template>
  </wt-page-wrapper>
</template>

<script setup lang="ts">
import { WtEmpty } from '@webitel/ui-sdk/components';
import { WebitelApplications, WfmSections } from '@webitel/ui-sdk/enums';
import { useClose } from '@webitel/ui-sdk/src/composables/useClose/useClose.js';
import {
  useTableFilters,
} from '@webitel/ui-sdk/src/modules/Filters/composables/useTableFilters.js';
import {
  useTableEmpty,
} from '@webitel/ui-sdk/src/modules/TableComponentModule/composables/useTableEmpty';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useAgentAbsenceStore } from '../store/agents.ts';


const { close } = useClose('configuration');

const { t } = useI18n();

const tableStore = useAgentAbsenceStore();

const {
  dataList,
  error,
  isLoading,
  page,
  size,
  next,
  headers,
  shownHeaders,
  filtersManager,
} = storeToRefs(tableStore);

const {
  initialize,
  loadDataList,
  updatePage,
  updateSize,
  updateSort,
  updateShownHeaders,
} = tableStore;

const path = computed(() => [{
  name: t(`WebitelApplications.${WebitelApplications.WFM}.name`),
  route: '/start-page',
}, {
  name: t(`${WfmSections.Agents}.name`),
}]);

initialize();
</script>
