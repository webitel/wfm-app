<template>
  <!-- [Claude] Agent row of the resources column (Figma "PrimeVue Schedules Powered"):
       checkbox, avatar, bold name; in a schedule also the confirmation mark and the trash. -->
  <div class="schedule-table-agent">
    <wt-checkbox
      :selected="selected"
      @update:selected="emit('update:selected', $event)"
    />
    <wt-avatar
      :username="agent.name"
      class="schedule-table-agent__avatar"
      size="xs"
    />
    <span
      :title="agent.name"
      class="schedule-table-agent__name typo-body-2-bold"
    >
      {{ agent.name }}
    </span>

    <template v-if="isScheduleRow">
      <wt-icon
        :icon="confirmed ? 'wfm-approved' : 'wfm-not-approved'"
        :title="t(confirmed ? 'scheduleTable.confirmed' : 'scheduleTable.notConfirmed')"
        size="sm"
      />
      <wt-icon-btn
        :disabled="readonly"
        icon="bucket"
        size="sm"
        @click="emit('delete')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { LookupEntity } from '../../types';

defineProps<{
	agent: LookupEntity;
	selected: boolean;
	confirmed?: boolean;
	// [Claude] Schedules: the confirmation mark (US_05.05) and the trash (US_05.07).
	isScheduleRow?: boolean;
	readonly?: boolean;
}>();

const emit = defineEmits<{
	'update:selected': [
		value: boolean,
	];
	delete: [];
}>();

const { t } = useI18n();
</script>

<style scoped>
.schedule-table-agent {
  display: flex;
  align-items: center;
  gap: 2px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: var(--schedule-table-row-height);
  padding: 0 8px;
  overflow: hidden;
}

.schedule-table-agent__avatar {
  flex: 0 0 auto;
  margin-right: 2px;
}

.schedule-table-agent__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-main-color);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
