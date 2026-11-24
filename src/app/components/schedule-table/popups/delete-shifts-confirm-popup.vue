<template>
  <wt-popup
    :shown="!!violations.length"
    size="sm"
    @close="emit('cancel')"
  >
    <template #title>
      {{ t('scheduleTable.deleteShifts.title') }}
    </template>

    <template #main>
      <p>{{ t('scheduleTable.deleteShifts.text') }}</p>
      <ul class="delete-shifts-confirm-popup__list">
        <li
          v-for="(violation, index) of violations"
          :key="index"
          class="typo-body-2"
        >
          <b>{{ violation.agent?.name }}</b>,
          {{ formatDay(violation.date) }},
          {{ formatTime(violation.startAt) }}–{{ formatTime(violation.endAt) }}
          <span v-if="violation.schedule">({{ violation.schedule.name }})</span>
        </li>
      </ul>
    </template>

    <template #actions>
      <wt-button
        :loading="loading"
        color="error"
        @click="emit('confirm')"
      >
        {{ t('scheduleTable.deleteShifts.confirm') }}
      </wt-button>
      <wt-button
        color="secondary"
        @click="emit('cancel')"
      >
        {{ t('reusable.cancel') }}
      </wt-button>
    </template>
  </wt-popup>
</template>

<script setup lang="ts">
// [Claude] The modal of storage.absence.shifts_to_delete: the shifts an absence removes.
import { useI18n } from 'vue-i18n';

import type { DayKey, Violation } from '../types';
import { dayToUtcMs } from '../utils/date';

defineProps<{
	violations: Violation[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	confirm: [];
	cancel: [];
}>();

const { t, locale } = useI18n();

const formatDay = (day?: DayKey) =>
	day
		? new Intl.DateTimeFormat(locale.value, {
				timeZone: 'UTC',
				day: 'numeric',
				month: 'short',
			}).format(dayToUtcMs(day))
		: '';

// [Claude] In the user's zone: the violation carries no calendar zone.
const formatTime = (ms?: number) =>
	ms
		? new Intl.DateTimeFormat(locale.value, {
				hour: '2-digit',
				minute: '2-digit',
			}).format(ms)
		: '';
</script>

<style scoped>
.delete-shifts-confirm-popup__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xs);
  max-height: 300px;
  margin-top: var(--spacing-xs);
  overflow: auto;
}
</style>
