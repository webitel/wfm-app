<template>
  <!-- [Claude] Head of the Forecast row: its name and the collapse / expand toggle (US_05.11). -->
  <div class="calendar-forecast-label">
    <span class="typo-subtitle-2">{{ t('wfmCalendar.forecast') }}</span>
    <wt-icon-btn
      :icon="state.isForecastCollapsed ? 'expand' : 'collapse'"
      @click="emit('toggle')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
	state: {
		isForecastCollapsed: boolean;
	};
}>();

const emit = defineEmits<{
	toggle: [];
}>();

const { t } = useI18n();
</script>

<style scoped>
.calendar-forecast-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing-xs);
	height: 100%;
}
</style>
