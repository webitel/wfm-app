<template>
  <div class="forecast-calculation-execute">
    <p class="typo-body-2">
      {{ t('lookups.forecastCalculation.executeDescription') }}
    </p>
    <wt-button
      :disabled="disabled"
      @click="isParamsPopup = true"
    >
      {{ t('lookups.forecastCalculation.execute') }}
    </wt-button>

    <forecast-calculation-execute-params-popup
      :shown="isParamsPopup"
      @close="isParamsPopup = false"
      @submit="execute"
    />

    <forecast-calculation-result-popup
      :shown="isResultPopup"
      :is-loading="isExecuting"
      :has-error="hasError"
      :items="result"
      @close="isResultPopup = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ForecastCalculationsAPI } from '@webitel/api-services/api';
import type { WfmExecuteForecastCalculationResponseForecast } from '@webitel/api-services/gen/models';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ForecastCalculationExecuteParamsPopup, {
	type ForecastCalculationExecuteParams,
} from './forecast-calculation-execute-params-popup.vue';
import ForecastCalculationResultPopup from './forecast-calculation-result-popup.vue';

const props = defineProps<{
	itemId?: string;
	disabled?: boolean;
}>();

const { t } = useI18n();

const isParamsPopup = ref(false);
const isResultPopup = ref(false);
const isExecuting = ref(false);
const hasError = ref(false);
const result = ref<WfmExecuteForecastCalculationResponseForecast[]>([]);

const openResultPopup = () => {
	isParamsPopup.value = false;
	isResultPopup.value = true;
	isExecuting.value = true;
	hasError.value = false;
	result.value = [];
};

const execute = async (params: ForecastCalculationExecuteParams) => {
	if (!props.itemId) return;

	openResultPopup();

	try {
		const { items } = await ForecastCalculationsAPI.execute({
			itemId: props.itemId,
			...params,
		});
		result.value = items;
	} catch {
		// [Claude] the backend error text comes as a notification from the API client
		hasError.value = true;
	} finally {
		isExecuting.value = false;
	}
};
</script>

<style scoped>
.forecast-calculation-execute {
  /* [Claude] stretched by the card column to the free height */
  align-self: stretch;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  border: 1px solid var(--secondary-color);
  border-radius: var(--spacing-sm);
}
</style>
