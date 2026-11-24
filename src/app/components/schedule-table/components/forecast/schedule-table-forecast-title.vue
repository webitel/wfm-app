<template>
  <!-- [Claude] Figma "Forecast Bar" label cell: the ui-sdk expansion panel header (Figma
       "Expansion panel/Header"). Its body stays empty: the bars live in the day cells. -->
  <wt-expansion-panel
    :collapsed="isCollapsed"
    class="schedule-table-forecast-title"
    @closed="isCollapsed = true"
    @opened="isCollapsed = false"
  >
    <template #title>
      {{ t('scheduleTable.forecast.title') }}
    </template>
  </wt-expansion-panel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const isCollapsed = defineModel<boolean>('isCollapsed', {
	default: false,
});

const { t } = useI18n();
</script>

<style scoped>
/* [Claude] The header fills the row cell of the agents column. */
.schedule-table-forecast-title,
.schedule-table-forecast-title :deep(.wt-expansion-panel-header) {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: var(--schedule-table-row-height);
}
</style>
