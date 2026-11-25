<template>
  <!-- [Claude] Add agents to the schedule (US_05.06): search among all agents, check, Add.
       Agents already in the schedule are shown checked and off; the server skips them anyway. -->
  <wt-popup
    :shown="shown"
    size="sm"
    @close="emit('close')"
  >
    <template #title>
      {{ t('schedules.addAgents') }}
    </template>

    <template #main>
      <section class="add-agents-popup">
        <wt-search-bar
          :value="search"
          debounce
          @search="search = $event"
          @update:value="search = $event"
        />
        <ul class="add-agents-popup__list">
          <li
            v-for="agent of agents"
            :key="agent.id"
          >
            <wt-checkbox
              :disabled="existing.has(agent.id)"
              :label="agent.name"
              :selected="existing.has(agent.id) || checked.has(agent.id)"
              @update:selected="toggle(agent, $event)"
            />
          </li>
        </ul>
        <wt-button
          v-if="hasNext"
          color="secondary"
          wide
          @click="loadMore"
        >
          {{ t('webitelUI.pagination.next') }}
        </wt-button>
      </section>
    </template>

    <template #actions>
      <wt-button
        :disabled="!checked.size"
        :loading="isSaving"
        @click="add"
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
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { searchLookup } from '../../../app/api/wfm/lookupsApi';
import type { Lookup } from '../../../app/api/wfm/types';
import { useWfmErrors } from '../../../app/composables/useWfmErrors';

const props = defineProps<{
	shown: boolean;
	// [Claude] Agents already in the schedule.
	scheduleAgents: Lookup[];
	save: (agents: Lookup[]) => Promise<void>;
}>();

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const { notifyError } = useWfmErrors();

const PAGE_SIZE = 50;

const search = ref('');
const agents = ref<Lookup[]>([]);
const page = ref(1);
const hasNext = ref(false);
const checked = ref(new Map<string, Lookup>());
const isSaving = ref(false);

const existing = computed(
	() => new Set(props.scheduleAgents.map((agent) => agent.id)),
);

const load = async (isMore = false) => {
	try {
		const result = await searchLookup('agents')({
			search: search.value ? `*${search.value}*` : '',
			page: page.value,
			size: PAGE_SIZE,
		});
		agents.value = isMore
			? [
					...agents.value,
					...result.items,
				]
			: result.items;
		hasNext.value = result.next;
	} catch (error) {
		notifyError(error);
	}
};

const loadMore = () => {
	page.value += 1;
	load(true);
};

const toggle = (agent: Lookup, value: boolean) => {
	const next = new Map(checked.value);
	if (value) next.set(agent.id, agent);
	else next.delete(agent.id);
	checked.value = next;
};

const add = async () => {
	isSaving.value = true;
	try {
		await props.save([
			...checked.value.values(),
		]);
		emit('close');
	} catch (error) {
		notifyError(error);
	} finally {
		isSaving.value = false;
	}
};

watch(search, () => {
	page.value = 1;
	load();
});

watch(
	() => props.shown,
	(shown) => {
		if (!shown) return;
		search.value = '';
		page.value = 1;
		checked.value = new Map();
		load();
	},
	{
		immediate: true,
	},
);
</script>

<style scoped>
.add-agents-popup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
}

.add-agents-popup__list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	max-height: 360px;
	overflow: auto;
}
</style>
