<template>
  <!-- [Claude] Left column of a grid row: the Forecast title on top, an agent card below. -->
  <!-- [Claude] `in` narrows the union in the template; a v-else after isForecast does not. -->
  <schedule-table-agent
    v-if="'row' in resource"
    v-model:selected="isSelected"
    :agent="resource.row.agent"
    :confirmed="resource.row.confirmed"
    :is-schedule-row="isScheduleRow"
    :readonly="readonly"
    @delete="emit('delete-agent', resource.row)"
  />
  <schedule-table-forecast-title
    v-else
    v-model:is-collapsed="isCollapsed"
  />
</template>

<script setup lang="ts">
import type { CalendarRow, ScheduleTableResource } from '../../types';
import ScheduleTableForecastTitle from '../forecast/schedule-table-forecast-title.vue';
import ScheduleTableAgent from './schedule-table-agent.vue';

defineProps<{
	resource: ScheduleTableResource;
	isScheduleRow?: boolean;
	readonly?: boolean;
}>();

const emit = defineEmits<{
	'delete-agent': [
		row: CalendarRow,
	];
}>();

const isCollapsed = defineModel<boolean>('isCollapsed', {
	default: false,
});
const isSelected = defineModel<boolean>('isSelected', {
	default: false,
});
</script>
