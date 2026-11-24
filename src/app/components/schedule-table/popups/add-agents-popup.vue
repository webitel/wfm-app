<template>
  <!-- [Claude] Add agents modal, Figma "Add agents" (8697:72887): filters bar, a table of
       agents with checkboxes, ADD / CANCEL. -->
  <wt-popup
    :shown="shown"
    size="md"
    @close="emit('close')"
  >
    <template #title>
      {{ t('scheduleTable.addAgents.title') }}
    </template>

    <template #main>
      <div class="add-agents-popup__filters">
        <wt-search-bar
          :value="search"
          @input="search = $event"
          @search="load"
        />
        <wt-single-select
          v-model:model-value="team"
          :options="searchTeams ? undefined : []"
          :placeholder="t('agents.filters.team')"
          :search-method="searchTeams"
          option-label="name"
        />
        <wt-single-select
          v-model:model-value="skill"
          :options="searchSkills ? undefined : []"
          :placeholder="t('agents.filters.skill')"
          :search-method="searchSkills"
          option-label="name"
        />
        <wt-icon-action
          action="clear"
          @click="clearFilters"
        />
      </div>

      <wt-table
        :data="sortedAgents"
        :grid-actions="false"
        :headers="headers"
        :selected="selected"
        class="add-agents-popup__table"
        data-key="id"
        sortable
        @sort="(_header, order) => (sortOrder = order)"
        @update:selected="selected = $event"
      >
        <template #name="{ item }">
          <div class="add-agents-popup__agent">
            <wt-avatar
              :username="item.name"
              size="xs"
            />
            {{ item.name }}
          </div>
        </template>
      </wt-table>
    </template>

    <template #actions>
      <wt-button
        :disabled="!selected.length"
        :loading="loading"
        @click="emit('add', selected.map((agent) => agent.id))"
      >
        {{ t('reusable.add') }}
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
import type { WtTableHeader } from '@webitel/ui-sdk/src/components/wt-table/types/WtTable';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { LookupEntity } from '../types';

interface AgentsSearchParams {
	search?: string;
	teamId?: string;
	skillId?: string;
}

type LookupSearch<
	Params = {
		search?: string;
	},
> = (params?: Params) => Promise<{
	items: LookupEntity[];
	next: boolean;
}>;

const props = defineProps<{
	shown: boolean;
	loading?: boolean;
	// [Claude] Gets the team and skill picked in the filters, a plain lookup may ignore them.
	searchAgents: LookupSearch<AgentsSearchParams>;
	searchTeams?: LookupSearch;
	searchSkills?: LookupSearch;
}>();

const emit = defineEmits<{
	close: [];
	add: [
		agentIds: string[],
	];
}>();

const { t } = useI18n();

type SortOrder = 'asc' | 'desc' | null;

const search = ref('');
const team = ref<LookupEntity | null>(null);
const skill = ref<LookupEntity | null>(null);
const agents = ref<LookupEntity[]>([]);
const selected = ref<LookupEntity[]>([]);
// [Claude] Figma shows the list sorted by name, ascending.
const sortOrder = ref<SortOrder>('asc');

const headers = computed<WtTableHeader[]>(() => [
	{
		value: 'name',
		field: 'name',
		text: t('scheduleTable.agentsTab'),
		sort: sortOrder.value,
	},
]);

const sortedAgents = computed(() => {
	if (!sortOrder.value) return agents.value;
	const direction = sortOrder.value === 'asc' ? 1 : -1;
	return [
		...agents.value,
	].sort((a, b) => a.name.localeCompare(b.name) * direction);
});

const load = async () => {
	const { items } = await props.searchAgents({
		search: search.value || undefined,
		teamId: team.value?.id,
		skillId: skill.value?.id,
	});
	agents.value = items;
};

const clearFilters = () => {
	search.value = '';
	team.value = null;
	skill.value = null;
};

watch(
	[
		team,
		skill,
	],
	load,
);

// [Claude] The search bar searches on Enter and when it is cleared.
watch(search, (value) => !value && load());

watch(
	() => props.shown,
	(shown) => {
		if (!shown) return;
		// [Claude] Clearing a set filter reloads through the watchers above.
		const isFiltered = !!(search.value || team.value || skill.value);
		clearFilters();
		selected.value = [];
		sortOrder.value = 'asc';
		if (!isFiltered) load();
	},
	{
		immediate: true,
	},
);
</script>

<style scoped>
.add-agents-popup__filters {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  align-items: center;
  gap: var(--spacing-xs);
}

.add-agents-popup__table {
  height: 424px;
  margin-top: var(--spacing-xs);
}

.add-agents-popup__agent {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
</style>
