<template>
  <!-- [Claude] Add shifts / Edit shift modal (EP_05, "Модальне вікно додавання зміни").
       Add: a weekly template over a date range for several agents.
       Edit: one shift of one agent; pauses and skills replace the old ones. -->
  <wt-popup
    :shown="shown"
    size="md"
    @close="emit('close')"
  >
    <template #title>
      {{ isEdit ? t('scheduleTable.editShiftTitle') : t('scheduleTable.addShifts') }}
    </template>

    <template #main>
      <wt-tabs
        :current="currentTab"
        :tabs="tabs"
        @change="currentTab = $event"
      />

      <!-- [Claude] Working shift -->
      <section
        v-if="currentTab.value === 'shift'"
        class="shift-popup__section"
      >
        <div
          v-if="!isEdit"
          class="shift-popup__row shift-popup__row--dates"
        >
          <wt-datepicker
            :label="t('scheduleTable.dateFrom')"
            :model-value="dayToUtcMs(from)"
            required
            timezone="UTC"
            @update:model-value="setFrom"
          />
          <wt-datepicker
            :label="t('scheduleTable.dateTo')"
            :model-value="dayToUtcMs(to)"
            required
            timezone="UTC"
            @update:model-value="setTo"
          />
        </div>

        <!-- [Claude] Figma "Add working shift" (8702:92942): a table of the weekdays,
             Monday first, so the Day column shows the ascending arrow. -->
        <wt-table
          :data="templateLines"
          :grid-actions="false"
          :headers="templateHeaders"
          :selectable="false"
          class="shift-popup__table"
        >
          <template #day="{ item }">
            <span v-if="item.isFirst">{{ weekdayName(item.day.weekday) }}</span>
          </template>
          <template #start="{ item }">
            <wt-timepicker
              :disabled="!item.day.enabled"
              :model-value="minToSec(item.range.start)"
              format="hh:mm"
              no-label
              @update:model-value="item.range.start = secToMin($event)"
            />
          </template>
          <template #end="{ item }">
            <wt-timepicker
              :disabled="!item.day.enabled"
              :model-value="minToSec(item.range.end)"
              format="hh:mm"
              no-label
              @update:model-value="item.range.end = secToMin($event)"
            />
          </template>
          <template #enabled="{ item }">
            <div
              v-if="!isEdit"
              class="shift-popup__state"
            >
              <template v-if="item.isFirst">
                <wt-switcher v-model:model-value="item.day.enabled" />
                <wt-icon-btn
                  :disabled="!item.day.enabled"
                  icon="plus"
                  @click="addRange(item.day)"
                />
              </template>
              <wt-icon-action
                v-else
                action="delete"
                @click="item.day.ranges.splice(item.index, 1)"
              />
            </div>
          </template>
        </wt-table>
      </section>

      <!-- [Claude] Pauses -->
      <section
        v-else-if="currentTab.value === 'pauses'"
        class="shift-popup__section"
      >
        <div
          v-for="(pause, index) of pauses"
          :key="index"
          class="shift-popup__row shift-popup__row--pause"
        >
          <wt-single-select
            v-model:model-value="pause.cause"
            :label="t('scheduleTable.pauseCause')"
            :placeholder="t('scheduleTable.notSelected')"
            :search-method="searchPauseCausesLookup"
            clearable
            option-label="name"
          />
          <wt-timepicker
            :label="t('scheduleTable.startTime')"
            :model-value="minToSec(pause.start)"
            format="hh:mm"
            @update:model-value="pause.start = secToMin($event)"
          />
          <wt-input-number
            v-model:model-value="pause.duration"
            :label="t('scheduleTable.duration')"
            :min="1"
          />
          <wt-icon-action
            action="delete"
            @click="pauses.splice(index, 1)"
          />
        </div>
        <wt-icon-btn
          icon="plus"
          @click="pauses.push({ start: 780, duration: 30, cause: null })"
        />
      </section>

      <!-- [Claude] Skills: switched on or off for the shift with the agent's own capacity,
           so there is no capacity here (AgentScheduleShiftSkill, protos#532). -->
      <section
        v-else-if="currentTab.value === 'skills'"
        class="shift-popup__section"
      >
        <div class="shift-popup__row shift-popup__row--skill">
          <wt-single-select
            v-model:model-value="skillToAdd"
            :label="t('scheduleTable.skills')"
            :search-method="searchSkillsLookup"
            option-label="name"
          />
          <wt-button
            :disabled="!skillToAdd"
            @click="addSkill"
          >
            {{ t('reusable.add') }}
          </wt-button>
        </div>
        <div
          v-for="(skill, index) of skills"
          :key="skill.skill.id"
          class="shift-popup__row shift-popup__row--skill"
        >
          <span class="typo-body-2">{{ skill.skill.name }}</span>
          <div class="shift-popup__skill-actions">
            <wt-switcher v-model:model-value="skill.enabled" />
            <wt-icon-action
              action="delete"
              @click="skills.splice(index, 1)"
            />
          </div>
        </div>
      </section>

      <!-- [Claude] Agents -->
      <section
        v-else
        class="shift-popup__section"
      >
        <div
          v-if="!isEdit"
          class="shift-popup__row shift-popup__row--skill"
        >
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
        <ul class="shift-popup__agents">
          <li
            v-for="agent of agents"
            :key="agent.id"
            class="shift-popup__agent typo-body-2"
          >
            {{ agent.name }}
            <wt-icon-action
              v-if="!isEdit"
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
import { minToSec, secToMin } from '@webitel/api-services/scripts';
import type { WtTableHeader } from '@webitel/ui-sdk/src/components/wt-table/types/WtTable';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type {
	CreateShiftsParams,
	UpdateShiftParams,
} from '../../../app/api/wfm/wfmCalendarApi';
import type {
	CalendarShift,
	CalendarShiftSkill,
	DayKey,
	LookupEntity,
} from '../../../app/components/schedule-table/types';
import {
	addDays,
	daysBetween,
	dayToUtcMs,
	utcMsToDay,
	weekday,
	zonedParts,
	zonedTimeToUtcMs,
} from '../../../app/components/schedule-table/utils/date';
import { Weekday } from '../../../app/enums';
import {
	searchPauseCausesLookup,
	searchSkillsLookup,
} from '../../../app/mocks/schedule-table/mockLookups';

export interface ShiftPopupContext {
	from: DayKey;
	to: DayKey;
	agents: LookupEntity[];
	// [Claude] Set for Edit shift.
	shift?: CalendarShift;
}

const props = defineProps<{
	shown: boolean;
	context: ShiftPopupContext | null;
	timeZone: string;
	searchAgents: (params?: { search?: string }) => Promise<{
		items: LookupEntity[];
		next: boolean;
	}>;
	loading?: boolean;
}>();

const emit = defineEmits<{
	close: [];
	create: [
		params: CreateShiftsParams,
	];
	update: [
		params: UpdateShiftParams,
	];
}>();

const { t, locale } = useI18n();

interface TemplateDay {
	weekday: number;
	enabled: boolean;
	ranges: {
		start: number;
		end: number;
	}[];
}

interface PauseRow {
	start: number;
	duration: number;
	cause: LookupEntity | null;
}

const isEdit = computed(() => !!props.context?.shift);

const tabs = computed(() => [
	{
		value: 'shift',
		text: t('scheduleTable.workingShift'),
	},
	{
		value: 'pauses',
		text: t('scheduleTable.pauses'),
	},
	{
		value: 'skills',
		text: t('scheduleTable.skills'),
	},
	{
		value: 'agents',
		text: t('scheduleTable.agentsTab'),
	},
]);
const currentTab = ref(tabs.value[0]);

const from = ref<DayKey>('');
const to = ref<DayKey>('');
const days = ref<Record<number, TemplateDay>>({});
const pauses = ref<PauseRow[]>([]);
const skills = ref<CalendarShiftSkill[]>([]);
const agents = ref<LookupEntity[]>([]);
const agentsToAdd = ref<LookupEntity[]>([]);
const skillToAdd = ref<LookupEntity | null>(null);

const DEFAULT_RANGE = {
	start: 9 * 60,
	end: 18 * 60,
};

// [Claude] The days of week present in the range, Monday first, each once (as in Calendars).
const presentWeekdays = computed(() => {
	const present = new Set(
		daysBetween(from.value, to.value)
			.slice(0, 7)
			.map((d) => weekday(d)),
	);
	return Object.values(Weekday).filter((wd) => present.has(wd));
});

// [Claude] A weekday that comes into the range gets the default range; a removed one
// [Claude] keeps its ranges in case the range grows back.
const fillDays = () => {
	presentWeekdays.value.forEach((wd) => {
		if (!days.value[wd]) {
			days.value[wd] = {
				weekday: wd,
				enabled: true,
				ranges: [
					{
						...DEFAULT_RANGE,
					},
				],
			};
		}
	});
};

watch(presentWeekdays, fillDays);

const templateDays = computed(() =>
	presentWeekdays.value.map((wd) => days.value[wd]).filter(Boolean),
);

// [Claude] One table row per range; the weekday name and its switch go on the first one.
const templateLines = computed(() =>
	templateDays.value.flatMap((day) =>
		day.ranges.map((range, index) => ({
			key: `${day.weekday}-${index}`,
			day,
			range,
			index,
			isFirst: index === 0,
		})),
	),
);

const templateHeaders = computed<WtTableHeader[]>(() => [
	{
		value: 'day',
		text: t('scheduleTable.day'),
		width: '250px',
		sort: 'asc',
	},
	{
		value: 'start',
		text: t('scheduleTable.start'),
	},
	{
		value: 'end',
		text: t('scheduleTable.end'),
	},
	{
		value: 'enabled',
		text: t('scheduleTable.enabled'),
		width: '100px',
	},
]);

const addRange = (day: TemplateDay) => {
	const last = day.ranges[day.ranges.length - 1];
	day.ranges.push({
		start: last.end,
		end: Math.min(last.end + 240, 1439),
	});
};

const weekdayName = (wd: number) =>
	new Intl.DateTimeFormat(locale.value, {
		weekday: 'long',
		timeZone: 'UTC',
	}).format(Date.UTC(2026, 10, 15 + wd)); // [Claude] 2026-11-15 is a Sunday

const minutesIn = (ms: number) => zonedParts(ms, props.timeZone).minutes;

const reset = () => {
	const context = props.context;
	if (!context) return;
	currentTab.value = tabs.value[0];
	agents.value = [
		...context.agents,
	];
	agentsToAdd.value = [];
	skillToAdd.value = null;
	days.value = {};
	if (context.shift) {
		const { shift } = context;
		const day = zonedParts(shift.startAt, props.timeZone).day;
		from.value = day;
		to.value = day;
		days.value[weekday(day)] = {
			weekday: weekday(day),
			enabled: true,
			ranges: [
				{
					start: minutesIn(shift.startAt),
					end: minutesIn(shift.endAt),
				},
			],
		};
		pauses.value = shift.pauses.map((p) => ({
			start: minutesIn(p.startAt),
			duration: Math.round((p.endAt - p.startAt) / 60_000),
			cause: p.cause || null,
		}));
		skills.value = shift.skills.map((s) => ({
			...s,
		}));
	} else {
		from.value = context.from;
		to.value = context.to;
		pauses.value = [];
		// [Claude] Several agents start with no skills; one agent would get their own (spec).
		skills.value = [];
	}
	fillDays();
};

watch(
	() => props.shown,
	(shown) => shown && reset(),
	{
		immediate: true,
	},
);

const setFrom = (ms: number | null) => {
	if (!ms) return;
	from.value = utcMsToDay(ms);
	if (to.value < from.value) to.value = from.value;
};

const setTo = (ms: number | null) => {
	if (!ms) return;
	to.value = utcMsToDay(ms);
	if (from.value > to.value) from.value = to.value;
};

const addSkill = () => {
	if (skills.value.some((s) => s.skill.id === skillToAdd.value.id)) return;
	skills.value.push({
		skill: skillToAdd.value,
		enabled: true,
	});
	skillToAdd.value = null;
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
		templateDays.value.some((d) => d.enabled && d.ranges.length) &&
		templateDays.value.every((d) => d.ranges.every((r) => r.start !== r.end)) &&
		pauses.value.every((p) => p.duration > 0),
);

const save = () => {
	if (isEdit.value) {
		const day = from.value;
		const [range] = templateDays.value[0].ranges;
		// [Claude] An end before the start crosses midnight (ShiftTemplateRange).
		const crosses = range.end <= range.start;
		const startAt = zonedTimeToUtcMs(day, range.start, props.timeZone);
		const endAt = zonedTimeToUtcMs(
			crosses ? addDays(day, 1) : day,
			range.end,
			props.timeZone,
		);
		emit('update', {
			id: props.context.shift.id,
			etag: props.context.shift.etag,
			startAt,
			endAt,
			pauses: pauses.value.map((p) => {
				// [Claude] In a night shift a pause after 00:00 belongs to the next calendar day.
				const pauseDay =
					crosses && p.start < range.start ? addDays(day, 1) : day;
				const pauseStart = zonedTimeToUtcMs(pauseDay, p.start, props.timeZone);
				return {
					startAt: pauseStart,
					endAt: pauseStart + p.duration * 60_000,
					cause: p.cause || undefined,
				};
			}),
			skills: skills.value,
		});
		return;
	}
	emit('create', {
		date: {
			from: from.value,
			to: to.value,
		},
		agents: agents.value,
		days: Object.fromEntries(
			templateDays.value
				.filter((d) => d.enabled)
				.map((d) => [
					d.weekday,
					d.ranges.map((r) => ({
						...r,
					})),
				]),
		),
		pauses: pauses.value.map((p) => ({
			start: p.start,
			duration: p.duration,
			cause: p.cause || undefined,
		})),
		skills: skills.value,
	});
};
</script>

<style scoped>
.shift-popup__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-sm);
}

.shift-popup__row {
  display: grid;
  align-items: end;
  gap: var(--spacing-xs);
}

.shift-popup__row--dates {
  grid-template-columns: 1fr 1fr;
}

.shift-popup__row--pause {
  grid-template-columns: 2fr 1fr 1fr auto;
}

.shift-popup__row--skill {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.shift-popup__state {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.shift-popup__skill-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.shift-popup__agents {
  display: flex;
  flex-direction: column;
  max-height: 300px;
  overflow: auto;
}

.shift-popup__agent {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2xs) 0;
}
</style>
