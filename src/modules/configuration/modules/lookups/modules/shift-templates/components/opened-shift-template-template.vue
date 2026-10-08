<template>
  <section class="opened-shift-template-template">
    <header class="table-title">
      <h3 class="table-title__title">
        {{ t('lookups.shiftTemplates.template') }}
      </h3>
      <wt-action-bar
        :include="[IconAction.ADD]"
        :disabled:add="disableUserInput"
        @click:add="addTime"
      />
    </header>

    <wt-table
      :data="times"
      :headers="headers"
      :grid-actions="!disableUserInput"
      :selectable="false"
    >
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
          :model-value="minToSec(getDuration(item))"
          :disabled="disableUserInput"
          format="hh:mm"
          no-label
          @update:model-value="setDuration(item, secToMin($event))"
        />
      </template>
      <template #actions="{ index }">
        <wt-icon-action
          action="delete"
          :disabled="disableUserInput"
          @click="removeTime(index)"
        />
      </template>
    </wt-table>
  </section>
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
} from '@webitel/api-services/validations';
import {
	type CardValidationFields,
	useTimeRangesValidation,
} from '@webitel/ui-datalist/card';
import { IconAction } from '@webitel/ui-sdk/enums';
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

const times = computed<WfmShiftTemplateTime[]>(() => {
	if (!modelValue.value.times) modelValue.value.times = [];
	return modelValue.value.times;
});

const headers = computed(() => [
	{
		value: 'start',
		text: t('lookups.shiftTemplates.start'),
		width: '200px',
	},
	{
		value: 'end',
		text: t('lookups.shiftTemplates.end'),
		width: '200px',
	},
	{
		value: 'duration',
		text: t('lookups.shiftTemplates.duration'),
		width: '200px',
	},
]);

/* [Claude] regle types a row as a plain field, so the range errors come from the schema */
const { getRangeValidation } = useTimeRangesValidation(
	times,
	getShiftTemplateTimeRangeErrors,
);

/* [Claude] the API keeps only start and end (minutes of the day); the duration is derived */
const getDuration = (row: WfmShiftTemplateTime) =>
	Math.max(0, (row.end ?? 0) - (row.start ?? 0));

const setDuration = (row: WfmShiftTemplateTime, minutes: number) => {
	row.end = (row.start ?? 0) + minutes;
};

const addTime = () => {
	times.value.push(getDefaultShiftTemplateTime());
};

const removeTime = (index: number) => {
	times.value.splice(index, 1);
};
</script>
