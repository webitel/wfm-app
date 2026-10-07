<template>
  <section class="opened-working-condition-general">
    <header class="opened-card-header">
      <h3 class="opened-card-header__title">
        {{ t('reusable.generalInfo') }}
      </h3>
    </header>
    <div class="opened-card-input-grid">
      <div class="opened-card-input-grid opened-card-input-grid--1-col">
        <wt-input-text
          v-model:model-value="modelValue.name"
          :disabled="disableUserInput"
          :label="t('reusable.name')"
          :regle-validation="validationFields?.name"
          required
        />
        <wt-textarea
          v-model:model-value="modelValue.description"
          :disabled="disableUserInput"
          :label="t('vocabulary.description')"
        />
        <wt-input-number
          v-model:model-value="modelValue.vacation"
          :disabled="disableUserInput"
          :label="t('lookups.workingConditions.vacationDaysPerYear')"
          :max-fraction-digits="0"
          :regle-validation="validationFields?.vacation"
        />
        <wt-input-number
          v-model:model-value="modelValue.sickLeaves"
          :disabled="disableUserInput"
          :label="t('lookups.workingConditions.sickLeavesPerYear')"
          :max-fraction-digits="0"
          :regle-validation="validationFields?.sickLeaves"
        />
        <wt-input-number
          v-model:model-value="modelValue.daysOff"
          :disabled="disableUserInput"
          :label="t('lookups.workingConditions.daysOffPerYear')"
          :max-fraction-digits="0"
          :regle-validation="validationFields?.daysOff"
        />
      </div>
      <div class="opened-card-input-grid opened-card-input-grid--1-col">
        <wt-input-number
          v-model:model-value="modelValue.workdayHours"
          :disabled="disableUserInput"
          :label="t('lookups.workingConditions.workdayDuration')"
          :max-fraction-digits="0"
          :regle-validation="validationFields?.workdayHours"
        />
        <wt-input-number
          v-model:model-value="modelValue.workdaysPerMonth"
          :disabled="disableUserInput"
          :label="t('lookups.workingConditions.workdaysPerMonth')"
          :max-fraction-digits="0"
          :regle-validation="validationFields?.workdaysPerMonth"
        />
        <wt-input-number
          v-model:model-value="modelValue.pauseDuration"
          :disabled="disableUserInput"
          :label="t('lookups.workingConditions.pauseDuration')"
          :max-fraction-digits="0"
          :regle-validation="validationFields?.pauseDuration"
        />
        <wt-single-select
          v-model:model-value="modelValue.pauseTemplate"
          :disabled="disableUserInput"
          :label="t('lookups.pauseTemplates.pauseTemplates', 1)"
          :search-method="PauseTemplatesAPI.getLookup"
          :regle-validation="validationFields?.pauseTemplate"
          required
        />
        <wt-single-select
          v-model:model-value="modelValue.shiftTemplate"
          :disabled="disableUserInput"
          :label="t('lookups.shiftTemplates.shiftTemplates', 1)"
          :search-method="ShiftTemplatesAPI.getLookup"
          clearable
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
	PauseTemplatesAPI,
	ShiftTemplatesAPI,
} from '@webitel/api-services/api';
import type { WfmWorkingCondition } from '@webitel/api-services/gen/models';
import type { CardValidationFields } from '@webitel/ui-datalist/card';
import { useI18n } from 'vue-i18n';

import { useUserAccessControl } from '../../../../../../../app/composables/useUserAccessControl';

const modelValue = defineModel<WfmWorkingCondition>({
	required: true,
});

const props = defineProps<{
	validationFields?: CardValidationFields<WfmWorkingCondition>;
}>();

const { t } = useI18n();
const { disableUserInput } = useUserAccessControl();
</script>
