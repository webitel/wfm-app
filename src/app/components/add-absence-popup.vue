<template>
  <!-- [Claude] Add absence (US_02.05.02, US_05.17.04): tab Absences — type + start / end date rows;
       tab Agents — who gets them (preset from the checked agents, more from the multiselect).
       Save is off while there are no agents or no rows. -->
  <wt-popup
    :shown="shown"
    size="md"
    @close="emit('close')"
  >
    <template #title>
      {{ t('wfmCalendar.addAbsence') }}
    </template>

    <template #main>
      <wt-tabs
        :current="currentTab"
        :tabs="tabs"
        @change="currentTab = $event"
      />

      <section
        v-if="currentTab.value === Tab.Absences"
        class="add-absence-popup__tab"
      >
        <div
          v-for="(row, index) of rows"
          :key="row.key"
          class="add-absence-popup__row"
        >
          <wt-single-select
            :clearable="false"
            :label="t('wfmCalendar.absenceType')"
            :model-value="typeOptions.find((option) => option.id === row.type)"
            :options="typeOptions"
            option-label="name"
            required
            @update:model-value="row.type = $event?.id ?? row.type"
          />
          <wt-datepicker
            :label="t('wfmCalendar.startDate')"
            :model-value="dayToMs(row.from)"
            required
            timezone="UTC"
            @update:model-value="setFrom(row, $event)"
          />
          <wt-datepicker
            :label="t('wfmCalendar.endDate')"
            :min-date="new Date(dayToMs(row.from))"
            :model-value="dayToMs(row.to)"
            required
            timezone="UTC"
            @update:model-value="row.to = $event ? msToDay($event) : row.to"
          />
          <wt-icon-btn
            class="add-absence-popup__remove"
            icon="bucket"
            @click="rows.splice(index, 1)"
          />
        </div>
        <wt-icon-btn
          icon="plus"
          @click="addRow"
        />
      </section>

      <section
        v-else
        class="add-absence-popup__tab"
      >
        <div class="add-absence-popup__add-agents">
          <wt-multi-select
            v-model:model-value="agentsToAdd"
            :label="t('wfmCalendar.agents')"
            :search-method="searchAgents || searchLookup('agents')"
            option-label="name"
          />
          <wt-button
            :disabled="!agentsToAdd.length"
            color="secondary"
            @click="addAgents"
          >
            {{ t('reusable.add') }}
          </wt-button>
        </div>
        <ul class="add-absence-popup__agents">
          <li
            v-for="agent of sortedAgents"
            :key="agent.id"
            class="add-absence-popup__agent typo-body-1"
          >
            <span>{{ agent.name }}</span>
            <wt-icon-btn
              icon="bucket"
              @click="agents = agents.filter((item) => item.id !== agent.id)"
            />
          </li>
        </ul>
      </section>
    </template>

    <template #actions>
      <wt-button
        :disabled="!canSave"
        :loading="isSaving"
        @click="save"
      >
        {{ t('reusable.save') }}
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

import { searchLookup } from '../api/wfm/lookupsApi';
import { AbsenceType, type Lookup, type Page } from '../api/wfm/types';
import { ABSENCE_LOCALE, ABSENCE_TYPES } from '../enums';
import { type DayKey, dayToMs, msToDay } from '../utils/day';

interface AbsenceRow {
	key: number;
	type: AbsenceType;
	from: DayKey;
	to: DayKey;
}

const props = defineProps<{
	shown: boolean;
	// [Claude] Agents checked on the page; empty when opened without a selection.
	presetAgents: Lookup[];
	// [Claude] Today in the zone of the page: the default start and end date.
	today: DayKey;
	// [Claude] Saves and resolves true when written; the popup closes then.
	save: (
		agentIds: string[],
		items: {
			type: AbsenceType;
			from: DayKey;
			to: DayKey;
		}[],
	) => Promise<boolean>;
	// [Claude] The agents the multiselect offers (all on Agents, the schedule's on Schedule).
	searchAgents?: (params: { search?: string }) => Promise<Page<Lookup>>;
}>();

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();

enum Tab {
	Absences = 'absences',
	Agents = 'agents',
}

const tabs = computed(() => [
	{
		text: t('wfmCalendar.absences'),
		value: Tab.Absences,
	},
	{
		text: t('wfmCalendar.agents'),
		value: Tab.Agents,
	},
]);
const currentTab = ref(tabs.value[0]);

const typeOptions = computed(() =>
	ABSENCE_TYPES.map((type) => ({
		id: type,
		name: t(ABSENCE_LOCALE[type]),
	})),
);

let nextKey = 0;
const rows = ref<AbsenceRow[]>([]);
const agents = ref<Lookup[]>([]);
const agentsToAdd = ref<Lookup[]>([]);
const isSaving = ref(false);

const sortedAgents = computed(() =>
	[
		...agents.value,
	].sort((a, b) => a.name.localeCompare(b.name)),
);

const addRow = () => {
	rows.value.push({
		key: nextKey++,
		type: AbsenceType.DayOff,
		from: props.today,
		to: props.today,
	});
};

const setFrom = (row: AbsenceRow, value: number | null) => {
	if (!value) return;
	row.from = msToDay(value);
	if (row.to < row.from) row.to = row.from;
};

const addAgents = () => {
	const known = new Set(agents.value.map((agent) => agent.id));
	agents.value = [
		...agents.value,
		...agentsToAdd.value.filter((agent) => !known.has(agent.id)),
	];
	agentsToAdd.value = [];
};

watch(
	() => props.shown,
	(shown) => {
		if (!shown) return;
		currentTab.value = tabs.value[0];
		rows.value = [];
		addRow();
		agents.value = [
			...props.presetAgents,
		];
		agentsToAdd.value = [];
	},
	{
		immediate: true,
	},
);

const canSave = computed(
	() =>
		!!agents.value.length &&
		!!rows.value.length &&
		rows.value.every((row) => row.from <= row.to),
);

const save = async () => {
	isSaving.value = true;
	try {
		const isWritten = await props.save(
			agents.value.map((agent) => agent.id),
			rows.value.map(({ type, from, to }) => ({
				type,
				from,
				to,
			})),
		);
		if (isWritten) emit('close');
	} finally {
		isSaving.value = false;
	}
};
</script>

<style scoped>
.add-absence-popup__tab {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
	padding-top: var(--spacing-sm);
	min-height: 240px;
}

.add-absence-popup__row {
	display: grid;
	grid-template-columns: 1.2fr 1fr 1fr auto;
	align-items: end;
	gap: var(--spacing-xs);
}

.add-absence-popup__remove {
	margin-bottom: var(--spacing-xs);
}

.add-absence-popup__add-agents {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: end;
	gap: var(--spacing-xs);
}

.add-absence-popup__agents {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	max-height: 260px;
	overflow: auto;
}

.add-absence-popup__agent {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
</style>
