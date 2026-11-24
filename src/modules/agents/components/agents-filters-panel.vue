<template>
  <!-- [Claude] Filters panel of Agents (US_02.03), as cc-supervisor Agents: the standard
       ui-datalist static panel, From / To, Supervisor, Team, Skill in one row. -->
  <table-filters-panel
    class="agents-filters-panel"
    :filter-options="filterOptions"
    :filters-manager="filtersManager"
    :has-read-access="userinfoStore.hasReadAccess"
    static-mode
    @filter:add="filtersManager.addFilter($event)"
    @filter:update="filtersManager.updateFilter($event)"
    @filter:delete="filtersManager.deleteFilter($event)"
    @filter:reset-all="filtersManager.reset()"
  />
</template>

<script setup lang="ts">
import {
	createDateRangeFilterConfig,
	createFilterConfig,
	type FilterConfigDefinition,
	FilterOption,
	TableFiltersPanelComponent as TableFiltersPanel,
} from '@webitel/ui-datalist/filters';
import { storeToRefs } from 'pinia';

import { useUserinfoStore } from '../../userinfo/store/userinfoStore';
import { useAgentsCalendarStore } from '../stores/agentsCalendarStore';

const filterOptions: FilterConfigDefinition[] = [
	createDateRangeFilterConfig({
		name: FilterOption.Date,
		showFilterName: true,
	}),
	createFilterConfig({
		name: FilterOption.Supervisor,
		showFilterName: true,
	}),
	createFilterConfig({
		name: FilterOption.Team,
		showFilterName: true,
	}),
	createFilterConfig({
		name: FilterOption.Skill,
		showFilterName: true,
	}),
];

const userinfoStore = useUserinfoStore();
const { filtersManager } = storeToRefs(useAgentsCalendarStore());
</script>

<style scoped>
/* [Claude] Figma: all 5 filters in one row. From / To take two columns (static-filter-field--pair),
   so 5 instead of the panel's 4. */
.agents-filters-panel :deep(.dynamic-filter-panel-wrapper__filters) {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
</style>
