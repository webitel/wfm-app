<template>
  <!-- [Claude] Total under the agents column (US_02.01, US_05.05): agents matching the
       filters on all pages; on the Schedule page also approved / not approved (Figma "Total"). -->
  <div class="schedule-table-total">
    <span class="typo-body-1-bold">{{ t('reusable.total') }}:</span>
    <span class="schedule-table-total__value typo-body-1">{{ total }}</span>
    <template v-if="isConfirmationVisible">
      <span
        :title="t('scheduleTable.confirmed')"
        class="schedule-table-total__counter"
      >
        <wt-icon
          icon="wfm-approved"
          size="sm"
        />
        <span class="typo-body-1">{{ confirmedCount }}</span>
      </span>
      <span
        :title="t('scheduleTable.notConfirmed')"
        class="schedule-table-total__counter"
      >
        <wt-icon
          icon="wfm-not-approved"
          size="sm"
        />
        <span class="typo-body-1">{{ rows.length - confirmedCount }}</span>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { CalendarRow } from '../types';

const props = defineProps<{
	total: number;
	// [Claude] Loaded rows: the confirmation counters are counted over them.
	rows: CalendarRow[];
	isConfirmationVisible?: boolean;
}>();

const { t } = useI18n();

const confirmedCount = computed(
	() => props.rows.filter((row) => row.confirmed).length,
);
</script>

<style scoped>
.schedule-table-total {
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  width: var(--calendar-resources-width);
  padding: 0 2px;
  background: var(--schedule-table-total-background);
  color: var(--text-main-color);
}

.schedule-table-total__value {
  flex: 1;
}

.schedule-table-total__counter {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 50px;
}
</style>
