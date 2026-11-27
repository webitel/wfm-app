<template>
  <wt-editable-list
    v-model="modelValue.times"
    :headers="headers"
    :create-row="getDefaultShiftTemplateTime"
    :disabled="disableUserInput"
    class="opened-shift-template-template"
    sortable
  >
    <template #title>
      <h3 class="table-title__title">
        {{ t('lookups.shiftTemplates.template') }}
      </h3>
    </template>
    <template #start="{ item, index }">
      <wt-timepicker
        :model-value="minToSec(item.start)"
        :disabled="disableUserInput"
        :regle-validation="getRangeValidation(index, 'start')"
        format="hh:mm"
        no-label
        @update:model-value="item.start = secToMin($event)"
      />
    </template>
    <template #end="{ item, index }">
      <wt-timepicker
        :model-value="minToSec(item.end)"
        :disabled="disableUserInput"
        :regle-validation="getRangeValidation(index, 'end')"
        format="hh:mm"
        no-label
        @update:model-value="item.end = secToMin($event)"
      />
    </template>
    <template #duration="{ item }">
      <wt-timepicker
        :model-value="minToSec(getTimeRangeDuration(item))"
        :disabled="disableUserInput"
        format="hh:mm"
        no-label
        @update:model-value="setTimeRangeDuration(item, secToMin($event))"
      />
    </template>
  </wt-editable-list>
</template>

<script setup lang="ts">
import type {
	WfmShiftTemplate,
	WfmShiftTemplateTime,
} from '@webitel/api-services/gen/models';
import { minToSec, secToMin } from '@webitel/api-services/scripts';
import {
	getDefaultShiftTemplateTime,
	getShiftTemplateTimeRangeErrors,
	getTimeRangeDuration,
	setTimeRangeDuration,
} from '@webitel/api-services/validations';
import {
	type CardValidationFields,
	useTimeRangesValidation,
} from '@webitel/ui-datalist/card';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useUserAccessControl } from '../../../../../../../app/composables/useUserAccessControl';

const modelValue = defineModel<WfmShiftTemplate>({
	required: true,
});

defineProps<{
	validationFields?: CardValidationFields<WfmShiftTemplate>;
}>();

const { t } = useI18n();
const { disableUserInput } = useUserAccessControl();

const headers = computed(() => [
	{
		value: 'start',
		text: t('lookups.shiftTemplates.start'),
		width: '200px',
		sortBy: (row: WfmShiftTemplateTime) => row.start,
	},
	{
		value: 'end',
		text: t('lookups.shiftTemplates.end'),
		width: '200px',
		sortBy: (row: WfmShiftTemplateTime) => row.end,
	},
	{
		value: 'duration',
		text: t('lookups.shiftTemplates.duration'),
		width: '200px',
		sortBy: getTimeRangeDuration,
	},
]);

/* [Claude] regle types a row as a plain field, so the range errors come from the schema */
const { getRangeValidation } = useTimeRangesValidation(
	() => modelValue.value.times ?? [],
	getShiftTemplateTimeRangeErrors,
);
</script>
