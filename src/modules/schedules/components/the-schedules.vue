<template>
  <!-- [Claude] Schedules register (US_05.01–05.04): name (opens the schedule), status, edit for
       drafts only, delete with confirmation, search, sort, pages; Add opens Create new schedule. -->
  <wt-page-wrapper
    :actions-panel="false"
    class="the-schedules"
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
      <section class="table-section the-schedules__section">
        <header class="table-title">
          <h3 class="table-title__title">
            {{ t('schedules.allSchedules') }}
          </h3>
          <wt-action-bar
            :include="[IconAction.ADD, IconAction.REFRESH, IconAction.DELETE]"
            :disabled:delete="!selected.length"
            @click:add="openPopup(null)"
            @click:delete="askDelete(selected)"
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
          </wt-action-bar>
        </header>

        <div class="table-section__table-wrapper">
          <wt-empty
            v-show="!items.length && !isLoading"
            :primary-action-text="search ? '' : t('reusable.add')"
            :text="search ? t('wfmCalendar.noMatches') : ''"
            @click:primary="openPopup(null)"
          />
          <wt-loader v-show="isLoading" />

          <wt-table
            v-show="items.length && !isLoading"
            :data="items"
            :headers="headers"
            :selected="selected"
            sortable
            @sort="updateSort"
            @update:selected="selected = $event"
          >
            <template #name="{ item }">
              <wt-item-link :link="{ name: `${WfmSections.Schedules}-card`, params: { id: item.id } }">
                {{ item.name }}
              </wt-item-link>
            </template>
            <template #state="{ item }">
              {{ t(`schedules.state.${item.state}`) }}
            </template>
            <template #actions="{ item }">
              <wt-icon-action
                :disabled="item.state !== ScheduleState.Draft"
                action="edit"
                @click="askEdit(item)"
              />
              <wt-icon-action
                action="delete"
                @click="askDelete([item])"
              />
            </template>
          </wt-table>

          <wt-pagination
            :next="next"
            :prev="page > 1"
            :size="size"
            debounce
            @change="size = $event"
            @next="page += 1"
            @prev="page -= 1"
          />
        </div>
      </section>

      <schedule-popup
        :schedule="editedSchedule"
        :shown="isPopup"
        @close="isPopup = false"
        @saved="onSaved"
      />
      <wfm-confirm-popup ref="confirmPopup" />
    </template>
  </wt-page-wrapper>
</template>

<script setup lang="ts">
import { WtEmpty } from '@webitel/ui-sdk/components';
import { IconAction, WfmSections } from '@webitel/ui-sdk/enums';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import {
	ScheduleState,
	type WorkingSchedule,
} from '../../../app/api/wfm/types';
import WfmConfirmPopup from '../../../app/components/wfm-confirm-popup.vue';
import { useSchedulesListStore } from '../stores/schedulesListStore';
import SchedulePopup from './schedule-popup.vue';

const { t } = useI18n();
const router = useRouter();

const store = useSchedulesListStore();
const { items, selected, search, page, size, next, isLoading, headers } =
	storeToRefs(store);
const { load, updateSort, remove } = store;

const confirmPopup =
	useTemplateRef<InstanceType<typeof WfmConfirmPopup>>('confirmPopup');
const isPopup = ref(false);
const editedSchedule = ref<WorkingSchedule | null>(null);

const openPopup = (schedule: WorkingSchedule | null) => {
	editedSchedule.value = schedule;
	isPopup.value = true;
};

// [Claude] Editing may clear the planned shifts: asked first (US_05.04).
const askEdit = async (schedule: WorkingSchedule) => {
	const isYes = await confirmPopup.value?.ask({
		title: t('schedules.editConfirm.title'),
		text: t('schedules.editConfirm.text'),
	});
	if (isYes) openPopup(schedule);
};

const askDelete = async (schedules: WorkingSchedule[]) => {
	const isYes = await confirmPopup.value?.ask({
		title: t('schedules.deleteConfirm.title'),
		text: t('schedules.deleteConfirm.schedules', {
			names: schedules.map((schedule) => schedule.name).join(', '),
		}),
		yes: t('reusable.delete'),
		no: t('reusable.cancel'),
		isDanger: true,
	});
	if (isYes) await remove(schedules);
};

// [Claude] Save of a new schedule opens its page (US_05.03).
const onSaved = (schedule: WorkingSchedule, isNew: boolean) => {
	isPopup.value = false;
	if (isNew) {
		router.push({
			name: `${WfmSections.Schedules}-card`,
			params: {
				id: schedule.id,
			},
		});
		return;
	}
	load();
};

const path = computed(() => [
	{
		name: t('wfm'),
		route: '/start-page',
	},
	{
		name: t('schedules.schedules', 2),
	},
]);

const close = () =>
	router.push({
		name: 'the-start-page',
	});

onMounted(load);
</script>

<style scoped>
.the-schedules__section {
	flex: 1;
	width: 100%;
}
</style>
