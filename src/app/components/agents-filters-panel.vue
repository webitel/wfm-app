<template>
  <!-- [Claude] Agents filters (US_02.03, US_05.12): From / To set the shown period (Agents only);
       Team, Supervisor and Skill narrow the agents. -->
  <section class="agents-filters-panel">
    <template v-if="isPeriodShown">
      <wt-datepicker
        :label="t('wfmCalendar.from')"
        :max-date="range?.to ? new Date(dayToMs(range.to)) : undefined"
        :model-value="range ? dayToMs(range.from) : null"
        clearable
        timezone="UTC"
        @update:model-value="setFrom"
      />
      <wt-datepicker
        :label="t('wfmCalendar.to')"
        :min-date="range?.from ? new Date(dayToMs(range.from)) : undefined"
        :model-value="range ? dayToMs(range.to) : null"
        clearable
        timezone="UTC"
        @update:model-value="setTo"
      />
    </template>
    <wt-multi-select
      :label="t('wfmCalendar.team')"
      :model-value="filters.teams"
      :search-method="searchLookup('teams')"
      option-label="name"
      @update:model-value="update('teams', $event)"
    />
    <wt-multi-select
      :label="t('wfmCalendar.supervisor')"
      :model-value="filters.supervisors"
      :search-method="searchLookup('supervisors')"
      option-label="name"
      @update:model-value="update('supervisors', $event)"
    />
    <wt-multi-select
      :label="t('wfmCalendar.skill')"
      :model-value="filters.skills"
      :search-method="searchLookup('skills')"
      option-label="name"
      @update:model-value="update('skills', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { searchLookup } from '../api/wfm/lookupsApi';
import type { Lookup } from '../api/wfm/types';
import { dayToMs, msToDay } from '../utils/day';
import type { AgentsFiltersState, DayBounds } from './schedule-calendar/types';

const props = defineProps<{
	filters: AgentsFiltersState;
	// [Claude] From / To: Agents only; the Schedule page is bound to the schedule dates.
	isPeriodShown?: boolean;
}>();

const range = defineModel<DayBounds | null>('range', {
	default: null,
});

const emit = defineEmits<{
	'update:filters': [
		filters: AgentsFiltersState,
	];
}>();

const { t } = useI18n();

const update = (key: keyof AgentsFiltersState, value: Lookup[]) =>
	emit('update:filters', {
		...props.filters,
		[key]: value || [],
	});

// [Claude] One end set: the other follows, so the period is always whole.
const setFrom = (value: number | null) => {
	if (!value) {
		range.value = null;
		return;
	}
	const from = msToDay(value);
	range.value = {
		from,
		to: range.value?.to && range.value.to >= from ? range.value.to : from,
	};
};

const setTo = (value: number | null) => {
	if (!value) {
		range.value = null;
		return;
	}
	const to = msToDay(value);
	range.value = {
		from: range.value?.from && range.value.from <= to ? range.value.from : to,
		to,
	};
};
</script>

<style scoped>
.agents-filters-panel {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: var(--spacing-sm);
}
</style>
