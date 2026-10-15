<template>
  <wt-popup
    :shown="shown"
    size="sm"
    overflow
    @close="emit('close')"
  >
    <template #title>
      {{ t('lookups.forecastCalculation.executeTestProcedure') }}
    </template>

    <template #main>
      <form
        class="forecast-calculation-execute-params-popup__form"
        @submit.prevent="submit"
      >
        <wt-single-select
          v-model:model-value="params.team"
          :label="t('objects.team', 1)"
          :search-method="TeamsAPI.getLookup"
          required
        />
        <wt-datepicker
          v-model:model-value="params.from"
          :label="t('lookups.forecastCalculation.periodFrom')"
          :max-date="params.to ? new Date(params.to) : undefined"
          required
        />
        <wt-datepicker
          v-model:model-value="params.to"
          :label="t('reusable.to')"
          :min-date="params.from ? new Date(params.from) : undefined"
          required
        />
      </form>
    </template>

    <template #actions>
      <wt-button
        :disabled="!isFilled"
        @click="submit"
      >
        {{ t('reusable.ok') }}
      </wt-button>
      <wt-button
        color="secondary"
        @click="emit('close')"
      >
        {{ t('reusable.cancel') }}
      </wt-button>
    </template>
  </wt-popup>
</template>

<script setup lang="ts">
import { TeamsAPI } from '@webitel/api-services/api';
import type { WfmLookupEntity } from '@webitel/api-services/gen/models';
import { getEndOfDay, getStartOfDay } from '@webitel/ui-sdk/scripts';
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

export interface ForecastCalculationExecuteParams {
	teamId: string;
	/** [Claude] period bounds, epoch milliseconds */
	from: number;
	to: number;
}

defineProps<{
	shown: boolean;
}>();

const emit = defineEmits<{
	close: [];
	submit: [
		params: ForecastCalculationExecuteParams,
	];
}>();

const { t } = useI18n();

const params = reactive<{
	team: WfmLookupEntity | null;
	from: number | null;
	to: number | null;
}>({
	team: null,
	from: null,
	to: null,
});

const isFilled = computed(
	() => !!(params.team?.id && params.from && params.to),
);

const submit = () => {
	const { team, from, to } = params;
	if (!team?.id || !from || !to) return;

	emit('submit', {
		teamId: team.id,
		from: getStartOfDay(from),
		to: getEndOfDay(to),
	});
};
</script>

<style scoped>
.forecast-calculation-execute-params-popup__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
</style>
