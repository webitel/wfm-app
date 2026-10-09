<template>
  <section class="opened-pause-template-template">
    <header class="table-title">
      <h3 class="table-title__title">
        {{ t('lookups.pauseTemplates.template') }}
      </h3>
      <wt-action-bar
        :include="[IconAction.ADD]"
        :disabled:add="disableUserInput"
        @click:add="addCause"
      />
    </header>

    <wt-table
      :data="causes"
      :headers="headers"
      :grid-actions="!disableUserInput"
      :selectable="false"
    >
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
      <template #actions="{ index }">
        <wt-icon-action
          action="delete"
          :disabled="disableUserInput"
          @click="removeCause(index)"
        />
      </template>
    </wt-table>
  </section>
</template>

<script setup lang="ts">
import { AgentPauseCausesAPI } from '@webitel/api-services/api';
import type {
	WfmPauseTemplate,
	WfmPauseTemplateCause,
} from '@webitel/api-services/gen/models';
import { getDefaultPauseTemplateCause } from '@webitel/api-services/validations';
import type { CardValidationFields } from '@webitel/ui-datalist/card';
import { IconAction } from '@webitel/ui-sdk/enums';
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

const causes = computed<WfmPauseTemplateCause[]>(() => {
	if (!modelValue.value.causes) modelValue.value.causes = [];
	return modelValue.value.causes;
});

const headers = computed(() => [
	{
		value: 'name',
		text: t('lookups.pauseTemplates.pauseReason'),
		width: '320px',
	},
	{
		value: 'duration',
		text: t('lookups.pauseTemplates.duration'),
		width: '200px',
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

const addCause = () => {
	causes.value.push(getDefaultPauseTemplateCause());
};

const removeCause = (index: number) => {
	causes.value.splice(index, 1);
};
</script>

<style scoped>
.opened-pause-template-template__duration {
  width: 100%;
}
</style>
