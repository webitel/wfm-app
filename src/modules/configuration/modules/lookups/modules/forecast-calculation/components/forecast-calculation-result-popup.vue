<template>
  <wt-popup
    :shown="shown"
    :size="hasError ? 'sm' : 'md'"
    @close="emit('close')"
  >
    <template #title>
      {{ t('lookups.forecastCalculation.testResult') }}
    </template>

    <template #main>
      <wt-loader v-if="isLoading" />
      <div
        v-else-if="hasError"
        class="forecast-calculation-result-popup__error"
      >
        <wt-icon
          icon="attention"
          color="error"
        />
        <p class="typo-body-1">
          {{ t('lookups.forecastCalculation.executeError') }}
        </p>
      </div>
      <wt-table
        v-else
        :data="items"
        :headers="headers"
        :selectable="false"
        :grid-actions="false"
      >
        <template #timestamp="{ item }">
          {{ formatTimestamp(item.timestamp) }}
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
import type { WfmExecuteForecastCalculationResponseForecast } from '@webitel/api-services/gen/models';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps<{
	shown: boolean;
	isLoading?: boolean;
	hasError?: boolean;
	items: WfmExecuteForecastCalculationResponseForecast[];
}>();

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();

const headers = computed(() => [
	{
		value: 'timestamp',
		text: t('lookups.forecastCalculation.timestamp'),
	},
	{
		value: 'agents',
		text: t('lookups.forecastCalculation.agents'),
	},
]);

/** [Claude] the backend sends the timestamp as epoch ms, but may send an ISO date */
const formatTimestamp = (value?: string) => {
	if (!value) return '';
	const date = new Date(Number.isNaN(+value) ? value : +value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>

<style scoped>
.forecast-calculation-result-popup__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: center;
  white-space: pre-wrap;
}
</style>
