<template>
  <!-- [Claude] Add shifts / Edit shift (US_05.14–05.15, Figma "Add shifts").
       Working shift: dates and the days of week in them, each with its hours (several ranges for
       different skills) and an on / off state. Pauses: cause, start, duration. Skills switched on
       for the shift. Agents who get it. Add = a weekly template the server expands; Edit = that
       one shift of that one agent, replaced whole. -->
  <wt-popup
    :shown="shown"
    size="lg"
    @close="emit('close')"
  >
    <template #title>
      {{ isEdit ? t('wfmCalendar.editShift') : t('schedules.addShifts') }}
    </template>

    <template #main>
      <wt-tabs
        :current="currentTab"
        :tabs="tabs"
        @change="currentTab = $event"
      />

      <!-- [Claude] Working shift -->
      <section
        v-if="currentTab.value === Tab.WorkingShift"
        class="shift-popup__tab"
      >
        <div class="shift-popup__pair">
          <wt-datepicker
            :disabled="isEdit"
            :label="t('schedules.shift.dateFrom')"
            :max-date="bounds ? new Date(dayToMs(bounds.to)) : undefined"
            :min-date="bounds ? new Date(dayToMs(bounds.from)) : undefined"
            :model-value="dayToMs(from)"
            required
            timezone="UTC"
            @update:model-value="setFrom"
          />
          <wt-datepicker
            :disabled="isEdit"
            :label="t('schedules.shift.dateTo')"
            :max-date="bounds ? new Date(dayToMs(bounds.to)) : undefined"
            :min-date="new Date(dayToMs(from))"
            :model-value="dayToMs(to)"
            required
            timezone="UTC"
            @update:model-value="to = $event ? msToDay($event) : to"
          />
        </div>

        <div class="shift-popup__grid shift-popup__grid--days typo-subtitle-2">
          <span>{{ t('schedules.shift.day') }}</span>
          <span>{{ t('schedules.shift.start') }}</span>
          <span>{{ t('schedules.shift.end') }}</span>
          <span>{{ t('schedules.shift.state') }}</span>
          <span />
        </div>
        <template
          v-for="weekday of weekdays"
          :key="weekday"
        >
          <div
            v-for="(range, index) of days[weekday]?.ranges || []"
            :key="`${weekday}-${index}`"
            class="shift-popup__grid shift-popup__grid--days"
          >
            <span class="typo-body-1">{{ index ? '' : weekdayName(weekday) }}</span>
            <wt-single-select
              :clearable="false"
              :disabled="!days[weekday].isEnabled"
              :model-value="timeOption(range.start)"
              :options="startOptions"
              option-label="name"
              @update:model-value="range.start = $event?.id ?? range.start"
            />
            <wt-single-select
              :clearable="false"
              :disabled="!days[weekday].isEnabled"
              :model-value="timeOption(range.end)"
              :options="endOptions"
              option-label="name"
              @update:model-value="range.end = $event?.id ?? range.end"
            />
            <wt-switcher
              v-if="!index"
              v-model:model-value="days[weekday].isEnabled"
              :disabled="isEdit"
            />
            <span v-else />
            <div class="shift-popup__row-actions">
              <wt-icon-btn
                v-if="index"
                icon="bucket"
                @click="days[weekday].ranges.splice(index, 1)"
              />
              <wt-icon-btn
                v-else-if="!isEdit"
                v-tooltip="t('schedules.shift.addRange')"
                :disabled="!days[weekday].isEnabled"
                icon="plus"
                @click="addRange(weekday)"
              />
            </div>
          </div>
        </template>
      </section>

      <!-- [Claude] Pauses -->
      <section
        v-else-if="currentTab.value === Tab.Pauses"
        class="shift-popup__tab"
      >
        <div class="shift-popup__grid shift-popup__grid--pauses typo-subtitle-2">
          <span>{{ t('schedules.shift.pauseCause') }}</span>
          <span>{{ t('schedules.shift.startTime') }}</span>
          <span>{{ t('schedules.shift.duration') }}</span>
          <span />
        </div>
        <div
          v-for="(pause, index) of pauses"
          :key="pause.key"
          class="shift-popup__grid shift-popup__grid--pauses"
        >
          <wt-single-select
            v-model:model-value="pause.cause"
            :placeholder="t('schedules.shift.notSelected')"
            :search-method="searchLookup('pauseCauses')"
            clearable
            option-label="name"
          />
          <wt-single-select
            :clearable="false"
            :model-value="timeOption(pause.start)"
            :options="startOptions"
            option-label="name"
            @update:model-value="pause.start = $event?.id ?? pause.start"
          />
          <wt-input-number
            v-model:model-value="pause.duration"
            :min="1"
            :show-buttons="false"
            hide-input-info
          />
          <wt-icon-btn
            icon="bucket"
            @click="pauses.splice(index, 1)"
          />
        </div>
        <wt-icon-btn
          icon="plus"
          @click="addPause"
        />
      </section>

      <!-- [Claude] Skills -->
      <section
        v-else-if="currentTab.value === Tab.Skills"
        class="shift-popup__tab"
      >
        <div class="shift-popup__add">
          <wt-single-select
            v-model:model-value="skillToAdd"
            :label="t('schedules.shift.skill')"
            :search-method="searchLookup('skills')"
            option-label="name"
          />
          <wt-button
            :disabled="!skillToAdd"
            color="secondary"
            @click="addSkill"
          >
            {{ t('reusable.add') }}
          </wt-button>
        </div>
        <div
          v-for="(item, index) of skills"
          :key="item.skill.id"
          class="shift-popup__grid shift-popup__grid--list"
        >
          <span class="typo-body-1">{{ item.skill.name }}</span>
          <wt-switcher v-model:model-value="item.enabled" />
          <wt-icon-btn
            icon="bucket"
            @click="skills.splice(index, 1)"
          />
        </div>
      </section>

      <!-- [Claude] Agents -->
      <section
        v-else
        class="shift-popup__tab"
      >
        <div
          v-if="!isEdit"
          class="shift-popup__add"
        >
          <wt-multi-select
            v-model:model-value="agentsToAdd"
            :label="t('schedules.shift.agents')"
            :options="scheduleAgents"
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
        <div
          v-for="agent of sortedAgents"
          :key="agent.id"
          class="shift-popup__grid shift-popup__grid--list"
        >
          <span class="typo-body-1">{{ agent.name }}</span>
          <span />
          <wt-icon-btn
            v-if="!isEdit"
            icon="bucket"
            @click="agents = agents.filter((item) => item.id !== agent.id)"
          />
        </div>
        <p
          v-if="!agents.length"
          class="typo-body-2"
        >
          {{ t('schedules.shift.noAgents') }}
        </p>
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
        {{ t('reusable.close') }}
      </wt-button>
    </template>
  </wt-popup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getAgentSkills, searchLookup } from '../../../app/api/wfm/lookupsApi';
import type {
	Lookup,
	MinutesRange,
	Shift,
	ShiftSkill,
	ShiftTemplate,
} from '../../../app/api/wfm/types';
import type { DayBounds } from '../../../app/components/schedule-calendar/types';
import {
	type DayKey,
	dayOfWeek,
	daysBetween,
	dayToMs,
	MINUTES_IN_DAY,
	MS_IN_MINUTE,
	minutesToTime,
	msToDay,
	msToMinutes,
	wallToMs,
} from '../../../app/utils/day';

// [Claude] What the popup opens for: new shifts (from a cell or the toolbar) or one shift.
export type ShiftPopupTarget =
	| {
			mode: 'add';
			agents: Lookup[];
			date: DayKey;
	  }
	| {
			mode: 'edit';
			agent: Lookup;
			shift: Shift;
	  };

interface PauseRow {
	key: number;
	cause: Lookup | null;
	start: number;
	duration: number;
}

interface DayRow {
	isEnabled: boolean;
	ranges: MinutesRange[];
}

const props = defineProps<{
	shown: boolean;
	target: ShiftPopupTarget | null;
	bounds: DayBounds | null;
	timeZone: string;
	// [Claude] Agents of the schedule: the only ones a shift can go to.
	scheduleAgents: Lookup[];
	saveTemplate: (template: ShiftTemplate) => Promise<boolean>;
	saveShift: (shift: Shift) => Promise<boolean>;
}>();

const emit = defineEmits<{
	close: [];
}>();

const { t, locale } = useI18n();

enum Tab {
	WorkingShift = 'working-shift',
	Pauses = 'pauses',
	Skills = 'skills',
	Agents = 'agents',
}

const tabs = computed(() => [
	{
		text: t('schedules.shift.workingShift'),
		value: Tab.WorkingShift,
	},
	{
		text: t('schedules.shift.pauses'),
		value: Tab.Pauses,
	},
	{
		text: t('schedules.shift.skills'),
		value: Tab.Skills,
	},
	{
		text: t('schedules.shift.agents'),
		value: Tab.Agents,
	},
]);
const currentTab = ref(tabs.value[0]);

const STEP_MINUTES = 15;
const NEXT_RANGE_MINUTES = 240;
const DEFAULT_RANGE: MinutesRange = {
	start: 540,
	end: 1080,
};
const DEFAULT_PAUSE = {
	start: 780,
	duration: 60,
};
// [Claude] Monday first, as the spec's list of days.
const WEEK_ORDER = [
	1,
	2,
	3,
	4,
	5,
	6,
	0,
];
// [Claude] 2026-11-01 is a Sunday: weekday names come from that week.
const SUNDAY = '2026-11-01';

const timeOption = (minutes: number) => ({
	id: minutes,
	name: minutes === MINUTES_IN_DAY ? '24:00' : minutesToTime(minutes),
});
const timeOptions = (isEnd: boolean) =>
	Array.from(
		{
			length: MINUTES_IN_DAY / STEP_MINUTES + (isEnd ? 1 : 0),
		},
		(_, index) => timeOption(index * STEP_MINUTES),
	);
const startOptions = timeOptions(false);
const endOptions = timeOptions(true);

const isEdit = computed(() => props.target?.mode === 'edit');

const from = ref<DayKey>('');
const to = ref<DayKey>('');
const days = ref<Record<number, DayRow>>({});
const pauses = ref<PauseRow[]>([]);
const skills = ref<ShiftSkill[]>([]);
const skillToAdd = ref<Lookup | null>(null);
const agents = ref<Lookup[]>([]);
const agentsToAdd = ref<Lookup[]>([]);
const isSaving = ref(false);
let nextKey = 0;

// [Claude] Days of week inside the dates, Monday first, each once.
const weekdays = computed(() => {
	if (!from.value || !to.value || from.value > to.value) return [];
	const present = new Set(
		daysBetween(from.value, to.value).slice(0, 7).map(dayOfWeek),
	);
	return WEEK_ORDER.filter((day) => present.has(day));
});

// [Claude] Every shown day of week has its row: on, 09:00–18:00 by default.
const ensureDays = () => {
	for (const day of weekdays.value) {
		days.value[day] ??= {
			isEnabled: true,
			ranges: [
				{
					...DEFAULT_RANGE,
				},
			],
		};
	}
};

watch(weekdays, ensureDays);

const weekdayName = (weekday: number) =>
	new Intl.DateTimeFormat(locale.value, {
		weekday: 'long',
		timeZone: 'UTC',
	}).format(dayToMs(SUNDAY) + weekday * 86_400_000);

const setFrom = (value: number | null) => {
	if (!value) return;
	from.value = msToDay(value);
	if (to.value < from.value) to.value = from.value;
};

const addRange = (weekday: number) => {
	const ranges = days.value[weekday].ranges;
	const last = ranges[ranges.length - 1];
	ranges.push({
		start: last.end % MINUTES_IN_DAY,
		end: Math.min(last.end + NEXT_RANGE_MINUTES, MINUTES_IN_DAY),
	});
};

const addPause = () =>
	pauses.value.push({
		key: nextKey++,
		cause: null,
		...DEFAULT_PAUSE,
	});

const addSkill = () => {
	const skill = skillToAdd.value;
	if (skill && !skills.value.some((item) => item.skill.id === skill.id)) {
		skills.value.push({
			skill,
			enabled: true,
		});
	}
	skillToAdd.value = null;
};

const addAgents = () => {
	const known = new Set(agents.value.map((agent) => agent.id));
	agents.value = [
		...agents.value,
		...agentsToAdd.value.filter((agent) => !known.has(agent.id)),
	];
	agentsToAdd.value = [];
};

const sortedAgents = computed(() =>
	[
		...agents.value,
	].sort((a, b) => a.name.localeCompare(b.name)),
);

// [Claude] One agent: the Skills tab starts from the agent's skills (US_05.14, Skills).
const presetSkills = async (agentId: string) => {
	try {
		skills.value = (await getAgentSkills(agentId)).map((skill) => ({
			skill,
			enabled: true,
		}));
	} catch {
		skills.value = [];
	}
};

const reset = () => {
	const target = props.target;
	if (!target) return;
	currentTab.value = tabs.value[0];
	days.value = {};
	pauses.value = [];
	skills.value = [];
	agentsToAdd.value = [];
	if (target.mode === 'add') {
		from.value = target.date;
		to.value = target.date;
		agents.value = [
			...target.agents,
		];
		ensureDays();
		if (target.agents.length === 1) presetSkills(target.agents[0].id);
		return;
	}
	const { shift, agent } = target;
	const day = shift.workingDate;
	from.value = day;
	to.value = day;
	agents.value = [
		agent,
	];
	const end = msToMinutes(shift.endAt, day, props.timeZone);
	days.value = {
		[dayOfWeek(day)]: {
			isEnabled: true,
			ranges: [
				{
					start: msToMinutes(shift.startAt, day, props.timeZone),
					end: end > MINUTES_IN_DAY ? end - MINUTES_IN_DAY : end,
				},
			],
		},
	};
	pauses.value = shift.pauses.map((pause) => ({
		key: nextKey++,
		cause: pause.cause || null,
		start: msToMinutes(pause.startAt, day, props.timeZone) % MINUTES_IN_DAY,
		duration: Math.round((pause.endAt - pause.startAt) / MS_IN_MINUTE),
	}));
	skills.value = shift.skills.map((skill) => ({
		...skill,
	}));
};

watch(
	() => props.shown,
	(shown) => {
		if (shown) reset();
	},
	{
		immediate: true,
	},
);

const activeDays = computed(() =>
	weekdays.value.filter((day) => days.value[day]?.isEnabled),
);

const canSave = computed(
	() =>
		!!agents.value.length &&
		!!from.value &&
		from.value <= to.value &&
		!!activeDays.value.length &&
		activeDays.value.every((day) =>
			days.value[day].ranges.every(({ start, end }) => start !== end),
		) &&
		pauses.value.every((pause) => pause.duration > 0),
);

// [Claude] The edited shift: its day's range and pauses back into instants of the calendar zone.
const editedShift = (shift: Shift): Shift => {
	const day = shift.workingDate;
	const range = days.value[dayOfWeek(day)].ranges[0];
	const isNight = range.end <= range.start;
	const end = isNight ? range.end + MINUTES_IN_DAY : range.end;
	return {
		...shift,
		startAt: wallToMs(day, range.start, props.timeZone),
		endAt: wallToMs(day, end, props.timeZone),
		pauses: pauses.value.map((pause) => {
			// [Claude] In a night shift a pause after 00:00 is of the next day.
			const start =
				isNight && pause.start < range.start
					? pause.start + MINUTES_IN_DAY
					: pause.start;
			return {
				startAt: wallToMs(day, start, props.timeZone),
				endAt: wallToMs(day, start + pause.duration, props.timeZone),
				cause: pause.cause || undefined,
			};
		}),
		skills: skills.value,
	};
};

const save = async () => {
	const target = props.target;
	if (!target) return;
	isSaving.value = true;
	try {
		const isWritten =
			target.mode === 'edit'
				? await props.saveShift(editedShift(target.shift))
				: await props.saveTemplate({
						from: from.value,
						to: to.value,
						agents: agents.value,
						days: Object.fromEntries(
							activeDays.value.map((day) => [
								day,
								days.value[day].ranges,
							]),
						),
						pauses: pauses.value.map((pause) => ({
							start: pause.start,
							duration: pause.duration,
							cause: pause.cause || undefined,
						})),
						skills: skills.value,
					});
		if (isWritten) emit('close');
	} finally {
		isSaving.value = false;
	}
};
</script>

<style scoped>
.shift-popup__tab {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	padding-top: var(--spacing-sm);
	min-height: 320px;
}

.shift-popup__pair,
.shift-popup__add {
	display: grid;
	grid-template-columns: 1fr 1fr;
	align-items: end;
	gap: var(--spacing-sm);
}

.shift-popup__add {
	grid-template-columns: 1fr auto;
}

.shift-popup__grid {
	display: grid;
	align-items: center;
	gap: var(--spacing-xs);
}

.shift-popup__grid--days {
	grid-template-columns: 140px 1fr 1fr 64px 40px;
}

.shift-popup__grid--pauses {
	grid-template-columns: 1.4fr 1fr 1fr 40px;
}

.shift-popup__grid--list {
	grid-template-columns: 1fr 64px 40px;
}

.shift-popup__row-actions {
	display: flex;
	justify-content: center;
}
</style>
