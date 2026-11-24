<template>
  <!-- [Claude] Add absence modal (US_02.05.02, US_05.17.04): absences of several types over
       date ranges for several agents. -->
  <wt-popup
    :shown="shown"
    size="md"
    @close="emit('close')"
  >
    <template #title>
      {{ t('scheduleTable.addAbsence') }}
    </template>

    <template #main>
      <!-- [Claude] Figma "Add absence" (8702:100830): tabs with the add button at the right. -->
      <div class="add-absence-popup__tabs">
        <wt-tabs
          :current="currentTab"
          :tabs="tabs"
          @change="currentTab = $event"
        />
        <wt-icon-action
          v-if="currentTab.value === 'absences'"
          action="add"
          @click="addItem"
        />
      </div>

      <wt-table
        v-if="currentTab.value === 'absences'"
        :data="sortedItems"
        :headers="headers"
        :selectable="false"
        class="add-absence-popup__table"
        sortable
        @sort="sortBy"
      >
        <template #type="{ item }">
          <wt-single-select
            :model-value="absenceOptions.find((o) => o.id === item.type)"
            :show-clear="false"
            :options="absenceOptions"
            :placeholder="t('reusable.type')"
            option-label="name"
            @update:model-value="item.type = $event?.id"
          />
        </template>
        <template #from="{ item }">
          <wt-datepicker
            :model-value="dayToUtcMs(item.from)"
            timezone="UTC"
            @update:model-value="setFrom(item, $event)"
          />
        </template>
        <template #to="{ item }">
          <wt-datepicker
            :model-value="dayToUtcMs(item.to)"
            timezone="UTC"
            @update:model-value="setTo(item, $event)"
          />
        </template>
        <template #actions="{ item }">
          <wt-icon-action
            :disabled="items.length === 1"
            action="delete"
            @click="removeItem(item)"
          />
        </template>
      </wt-table>

      <section
        v-else
        class="add-absence-popup__section"
      >
        <div class="add-absence-popup__row">
          <wt-multi-select
            v-model:model-value="agentsToAdd"
            :label="t('scheduleTable.agentsTab')"
            :search-method="searchAgents"
            option-label="name"
          />
          <wt-button
            :disabled="!agentsToAdd.length"
            @click="addAgents"
          >
            {{ t('reusable.add') }}
          </wt-button>
        </div>
        <ul class="add-absence-popup__agents">
          <li
            v-for="agent of agents"
            :key="agent.id"
            class="add-absence-popup__agent typo-body-2"
          >
            {{ agent.name }}
            <wt-icon-action
              action="delete"
              @click="agents = agents.filter((a) => a.id !== agent.id)"
            />
          </li>
        </ul>
      </section>
    </template>

    <template #actions>
      <wt-button
        :disabled="!canSave"
        :loading="loading"
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
import { WfmAbsenceType } from '@webitel/api-services/gen/models';
import type { WtTableHeader } from '@webitel/ui-sdk/src/components/wt-table/types/WtTable';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AbsenceItem } from '../../../api/wfm/wfmCalendarApi';
import { type DayKey, type LookupEntity } from '../types';
import { dayToUtcMs, todayKey, utcMsToDay } from '../utils/date';

const props = defineProps<{
	shown: boolean;
	// [Claude] Agents picked with the checkboxes; empty when opened from the toolbar.
	initialAgents: LookupEntity[];
	searchAgents: (params?: { search?: string }) => Promise<{
		items: LookupEntity[];
		next: boolean;
	}>;
	loading?: boolean;
}>();

const emit = defineEmits<{
	close: [];
	save: [
		payload: {
			agentIds: string[];
			items: AbsenceItem[];
		},
	];
}>();

const { t } = useI18n();

const tabs = computed(() => [
	{
		value: 'absences',
		text: t('scheduleTable.absences'),
	},
	{
		value: 'agents',
		text: t('scheduleTable.agentsTab'),
	},
]);
const currentTab = ref(tabs.value[0]);

const absenceOptions = computed(() => [
	{
		id: WfmAbsenceType.AbsenceTypeDayoff,
		name: t('scheduleTable.absence.dayOff'),
	},
	{
		id: WfmAbsenceType.AbsenceTypeSickday,
		name: t('scheduleTable.absence.sickLeave'),
	},
	{
		id: WfmAbsenceType.AbsenceTypeVacation,
		name: t('scheduleTable.absence.vacation'),
	},
]);

// [Claude] Start and end default to today; the list starts with one row to fill.
const newItem = (): AbsenceItem => ({
	type: WfmAbsenceType.AbsenceTypeDayoff,
	from: todayKey(),
	to: todayKey(),
});

const items = ref<AbsenceItem[]>([
	newItem(),
]);
const agents = ref<LookupEntity[]>([]);
const agentsToAdd = ref<LookupEntity[]>([]);

watch(
	() => props.shown,
	(shown) => {
		if (!shown) return;
		items.value = [
			newItem(),
		];
		agents.value = [
			...props.initialAgents,
		];
		agentsToAdd.value = [];
		currentTab.value = tabs.value[0];
	},
	{
		immediate: true,
	},
);

const addItem = () => {
	items.value.push(newItem());
};

const removeItem = (item: AbsenceItem) => {
	items.value = items.value.filter((i) => i !== item);
};

/* [Claude] ------------------------------------------------------------ Table sort */

type SortField = 'type' | 'from' | 'to';
type SortOrder = 'asc' | 'desc' | null;

const sortField = ref<SortField | null>(null);
const sortOrder = ref<SortOrder>(null);

const headers = computed<WtTableHeader[]>(() =>
	(
		[
			{
				value: 'type',
				text: t('scheduleTable.absenceType'),
				width: '360px',
			},
			{
				value: 'from',
				text: t('scheduleTable.startDate'),
				width: '140px',
			},
			{
				value: 'to',
				text: t('scheduleTable.endDate'),
				width: '140px',
			},
		] as const
	).map((header) => ({
		...header,
		field: header.value,
		sort: sortField.value === header.value ? sortOrder.value : null,
	})),
);

const sortBy = (header: WtTableHeader, order: SortOrder) => {
	sortField.value = header.field as SortField;
	sortOrder.value = order;
};

const absenceName = (type: AbsenceItem['type']) =>
	absenceOptions.value.find((o) => o.id === type)?.name || '';

// [Claude] The same row objects in another order, so editing a sorted row edits the item.
const sortedItems = computed(() => {
	const field = sortField.value;
	const order = sortOrder.value;
	if (!field || !order) return items.value;
	const sortValue = (item: AbsenceItem) =>
		field === 'type' ? absenceName(item.type) : item[field];
	const direction = order === 'asc' ? 1 : -1;
	return [
		...items.value,
	].sort((a, b) => sortValue(a).localeCompare(sortValue(b)) * direction);
});

const setFrom = (item: AbsenceItem, ms: number | null) => {
	if (!ms) return;
	item.from = utcMsToDay(ms);
	if (item.to < item.from) item.to = item.from;
};

const setTo = (item: AbsenceItem, ms: number | null) => {
	if (!ms) return;
	item.to = utcMsToDay(ms) as DayKey;
	if (item.from > item.to) item.from = item.to;
};

const addAgents = () => {
	const known = new Set(agents.value.map((a) => a.id));
	agents.value = [
		...agents.value,
		...agentsToAdd.value.filter((a) => !known.has(a.id)),
	];
	agentsToAdd.value = [];
};

const canSave = computed(
	() =>
		agents.value.length > 0 &&
		items.value.length > 0 &&
		items.value.every((i) => i.type && i.from && i.to),
);

const save = () => {
	emit('save', {
		agentIds: agents.value.map((a) => a.id),
		items: items.value.map((i) => ({
			...i,
		})),
	});
};
</script>

<style scoped>
.add-absence-popup__tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-xs);
}

.add-absence-popup__table {
  margin-top: var(--spacing-xs);
}

/* [Claude] The column header names the field, the inputs in the cells have no label. */
.add-absence-popup__table :deep(.wt-datepicker > .wt-label) {
  display: none;
}

.add-absence-popup__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
}

.add-absence-popup__row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: var(--spacing-xs);
}

.add-absence-popup__agents {
  display: flex;
  flex-direction: column;
  max-height: 300px;
  overflow: auto;
}

.add-absence-popup__agent {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2xs) 0;
}
</style>
