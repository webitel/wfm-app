<template>
  <!-- [Claude] History of the schedule (EP_11): who changed what and when, newest first. -->
  <wt-popup
    :shown="shown"
    size="md"
    @close="emit('close')"
  >
    <template #title>
      {{ t('schedules.history.title') }}
    </template>

    <template #main>
      <wt-loader v-if="loading" />
      <wt-dummy
        v-else-if="!logs.length"
        :text="t('schedules.history.empty')"
      />
      <wt-table
        v-else
        :data="logs"
        :headers="headers"
        :selectable="false"
        :grid-actions="false"
      >
        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt) }}
        </template>
        <template #createdBy="{ item }">
          {{ item.createdBy?.name }}
        </template>
        <template #operation="{ item }">
          {{ t(`schedules.history.operation.${item.operation}`) }}
        </template>
        <template #agent="{ item }">
          {{ item.agent?.name }}
        </template>
      </wt-table>
    </template>

    <template #actions>
      <wt-button
        color="secondary"
        @click="emit('close')"
      >
        {{ t('reusable.close') }}
      </wt-button>
    </template>
  </wt-popup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ScheduleLog } from '../../../app/api/wfm/wfmCalendarApi';

defineProps<{
	shown: boolean;
	logs: ScheduleLog[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	close: [];
}>();

const { t, locale } = useI18n();

const headers = computed(() => [
	{
		value: 'createdAt',
		text: t('schedules.history.createdAt'),
	},
	{
		value: 'createdBy',
		text: t('schedules.history.createdBy'),
	},
	{
		value: 'operation',
		text: t('schedules.history.operation.title'),
	},
	{
		value: 'agent',
		text: t('schedules.history.agent'),
	},
]);

const formatDateTime = (ms: number) =>
	new Date(ms).toLocaleString(locale.value, {
		dateStyle: 'short',
		timeStyle: 'short',
	});
</script>
