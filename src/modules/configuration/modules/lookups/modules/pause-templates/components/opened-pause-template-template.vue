<template>
  <wt-editable-list
    v-model="modelValue.causes"
    :headers="headers"
    :create-row="getDefaultPauseTemplateCause"
    :disabled="disableUserInput"
    class="opened-pause-template-template"
    sortable
  >
    <template #title>
      <h3 class="table-title__title">
        {{ t('lookups.pauseTemplates.template') }}
      </h3>
    </template>
    <template #name="{ item }">
      <wt-single-select
        v-model:model-value="item.cause"
        :search-method="AgentPauseCausesAPI.getLookup"
        :placeholder="t('lookups.pauseTemplates.notSelected')"
        :disabled="disableUserInput"
        clearable
      />
    </template>
    <template #duration="{ item, index }">
      <wt-input-number
        :model-value="item.duration ? Number(item.duration) : null"
        class="opened-pause-template-template__duration"
        :max-fraction-digits="0"
        :disabled="disableUserInput"
        :regle-validation="getDurationValidation(index)"
        required
        @update:model-value="setDuration(item, $event)"
      />
    </template>
  </wt-editable-list>
</template>

<script setup lang="ts">
import { AgentPauseCausesAPI } from '@webitel/api-services/api';
import type {
	WfmPauseTemplate,
	WfmPauseTemplateCause,
} from '@webitel/api-services/gen/models';
import { getDefaultPauseTemplateCause } from '@webitel/api-services/validations';
import type { CardValidationFields } from '@webitel/ui-datalist/card';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useUserAccessControl } from '../../../../../../../app/composables/useUserAccessControl';

const modelValue = defineModel<WfmPauseTemplate>({
	required: true,
});

const props = defineProps<{
	/* [Claude] `Required`: regle infers an optional array as a plain field, without `$each` */
	validationFields?: CardValidationFields<Required<WfmPauseTemplate>>;
}>();

const { t } = useI18n();
const { disableUserInput } = useUserAccessControl();

const headers = computed(() => [
	{
		value: 'name',
		text: t('lookups.pauseTemplates.pauseReason'),
		width: '320px',
		sortBy: (row: WfmPauseTemplateCause) => row.cause?.name,
	},
	{
		value: 'duration',
		text: t('lookups.pauseTemplates.duration'),
		width: '200px',
		sortBy: (row: WfmPauseTemplateCause) =>
			row.duration ? Number(row.duration) : undefined,
	},
]);

/* [Claude] regle types a row as a plain field; at runtime it has `$fields` */
const getDurationValidation = (index: number) =>
	(
		props.validationFields?.causes?.$each?.[index] as {
			$fields?: CardValidationFields<Required<WfmPauseTemplateCause>>;
		}
	)?.$fields?.duration;

/* [Claude] the API keeps the duration (minutes) as an int64 string */
const setDuration = (row: WfmPauseTemplateCause, minutes: number | null) => {
	row.duration = minutes === null ? undefined : String(minutes);
};
</script>

<style scoped>
.opened-pause-template-template__duration {
  width: 100%;
}
</style>
