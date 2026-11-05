<template>
  <section class="opened-card-tabs__tab opened-forecast-calculation-general">
    <div class="opened-card-input-grid opened-forecast-calculation-general__grid">
      <div class="opened-card-input-grid opened-card-input-grid--1-col opened-forecast-calculation-general__col opened-forecast-calculation-general__col--execute">
        <wt-input-text
          v-model:model-value="modelValue.name"
          :disabled="disableUserInput"
          :label="t('reusable.name')"
          :regle-validation="validationFields?.name"
          required
        />
        <wt-input-text
          v-model:model-value="modelValue.procedure"
          :disabled="disableUserInput"
          :label="t('lookups.forecastCalculation.procedure')"
          :regle-validation="validationFields?.procedure"
          required
        />
        <forecast-calculation-execute
          :item-id="modelValue.id"
          :disabled="!modelValue.id"
        />
      </div>
      <div class="opened-card-input-grid opened-card-input-grid--1-col opened-forecast-calculation-general__col">
        <wt-multi-select
          v-model:model-value="modelValue.args"
          :disabled="disableUserInput"
          :label="t('lookups.forecastCalculation.arguments')"
          :options="argumentOptions"
          :data-key="null"
          chips-view
          allow-custom-values
        />
        <wt-textarea
          v-model:model-value="modelValue.description"
          :disabled="disableUserInput"
          :label="t('vocabulary.description')"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WfmForecastCalculation } from '@webitel/api-services/gen/models';
import type { CardValidationFields } from '@webitel/ui-datalist/card';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useUserAccessControl } from '@/app/composables/useUserAccessControl';
import { ForecastCalculationGlobalArgument } from '../enums/ForecastCalculationGlobalArgument.enum';
import ForecastCalculationExecute from './forecast-calculation-execute.vue';

const modelValue = defineModel<WfmForecastCalculation>({
	required: true,
});

const props = defineProps<{
	validationFields?: CardValidationFields<WfmForecastCalculation>;
}>();

const { t } = useI18n();
const { disableUserInput } = useUserAccessControl();

const argumentOptions = computed(() => [
	...new Set([
		...Object.values(ForecastCalculationGlobalArgument),
		...(modelValue.value.args ?? []),
	]),
]);
</script>

<style scoped>
/* [Claude] the execute zone takes all the free card height, without a page scroll */
.opened-forecast-calculation-general__grid {
  flex-grow: 1;
}

.opened-forecast-calculation-general__col {
  align-content: start;
}

.opened-forecast-calculation-general__col--execute {
  align-self: stretch;
  grid-template-rows: auto auto 1fr;
}
</style>
