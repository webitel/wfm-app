<template>
  <!-- [Claude] An agent row head: checkbox + avatar + name (US_02.01, US_05.05), the confirmation
       mark when the schedule is active and the trash that takes the agent out (US_05.07). -->
  <div class="calendar-agent">
    <wt-checkbox
      :disabled="state.isReadonly"
      :selected="state.selected.includes(agent.id)"
      @update:selected="emit('select', agent.id, $event)"
    />
    <wt-avatar
      :username="agent.name"
      size="xs"
    />
    <span
      :title="agent.name"
      class="calendar-agent__name typo-body-2"
    >
      {{ agent.name }}
    </span>
    <wt-icon
      v-if="state.isConfirmedShown"
      v-tooltip="t('wfmCalendar.confirmed')"
      icon="wfm-approved"
    />
    <wt-icon-btn
      v-if="state.isAgentDeletable && !state.isReadonly"
      class="calendar-agent__delete"
      icon="bucket"
      @click="emit('delete', agent)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { Lookup } from '../../../api/wfm/types';

defineProps<{
	agent: Lookup;
	// [Claude] Shared reactive state of the calendar: the head re-renders on selection by itself.
	state: {
		selected: string[];
		isReadonly: boolean;
		isConfirmedShown: boolean;
		isAgentDeletable: boolean;
	};
}>();

const emit = defineEmits<{
	select: [
		id: string,
		value: boolean,
	];
	delete: [
		agent: Lookup,
	];
}>();

const { t } = useI18n();
</script>

<style scoped>
.calendar-agent {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	padding: 0 var(--spacing-xs);
	height: 100%;
	min-width: 0;
}

.calendar-agent__name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.calendar-agent__delete {
	visibility: hidden;
}

.calendar-agent:hover .calendar-agent__delete {
	visibility: visible;
}
</style>
