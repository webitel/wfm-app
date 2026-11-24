<template>
  <!-- [Claude] Create / Edit schedule dialog (US_05.01, Figma "Create new schedule" 8697:71448):
       name, team, calendar, dates, timeline, extra days skills, outside-activity switch. -->
  <wt-popup
    :shown="shown"
    size="md"
    @close="emit('close')"
  >
    <template #title>
      {{ schedule ? t('schedules.editSchedule') : t('schedules.createSchedule') }}
    </template>

    <template #main>
      <section class="schedule-popup">
        <wt-input-text
          v-model:model-value="draft.name"
          :label="t('reusable.name')"
          required
        />
        <wt-single-select
          v-model:model-value="draft.team"
          :label="t('objects.team', 1)"
          :search-method="searchTeamsLookup"
          option-label="name"
          required
        />
        <wt-single-select
          v-model:model-value="draft.calendar"
          :label="t('objects.calendar', 1)"
          :search-method="searchCalendarsLookup"
          option-label="name"
          required
        />

        <div class="schedule-popup__row">
          <wt-datepicker
            :label="t('schedules.startDate')"
            :max-date="draft.to ? toDate(draft.to) : undefined"
            :model-value="draft.from ? dayToUtcMs(draft.from) : null"
            required
            timezone="UTC"
            @update:model-value="draft.from = $event ? utcMsToDay($event) : null"
          />
          <wt-datepicker
            :label="t('schedules.endDate')"
            :min-date="draft.from ? toDate(draft.from) : undefined"
            :model-value="draft.to ? dayToUtcMs(draft.to) : null"
            required
            timezone="UTC"
            @update:model-value="draft.to = $event ? utcMsToDay($event) : null"
          />
          <!-- [Claude] Both unset = 24 hours (US_05.03). -->
          <wt-single-select
            :label="t('schedules.timelineFrom')"
            :model-value="hourOptions.find((o) => o.id === draft.timelineFrom)"
            :options="hourOptions"
            clearable
            option-label="name"
            @update:model-value="draft.timelineFrom = $event?.id ?? null"
          />
          <wt-single-select
            :label="t('schedules.timelineTo')"
            :model-value="hourOptions.find((o) => o.id === draft.timelineTo)"
            :options="hourOptions"
            clearable
            option-label="name"
            @update:model-value="draft.timelineTo = $event?.id ?? null"
          />
        </div>

        <wt-multi-select
          v-model:model-value="draft.extraSkills"
          :label="t('schedules.extraSkills')"
          :search-method="searchSkillsLookup"
          option-label="name"
        />

        <wt-switcher
          v-model:model-value="draft.blockOutsideActivity"
          :label="t('schedules.blockOutsideActivity')"
        />
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
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type {
	ScheduleDraft,
	ScheduleHeader,
} from '../../../app/api/wfm/wfmCalendarApi';
import type {
	DayKey,
	LookupEntity,
} from '../../../app/components/schedule-table/types';
import {
	dayToUtcMs,
	utcMsToDay,
} from '../../../app/components/schedule-table/utils/date';
import {
	searchCalendarsLookup,
	searchSkillsLookup,
	searchTeamsLookup,
} from '../../../app/mocks/schedule-table/mockLookups';

const props = defineProps<{
	shown: boolean;
	// [Claude] The schedule to edit; none = create a new one.
	schedule?: ScheduleHeader | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	close: [];
	save: [
		draft: ScheduleDraft,
	];
}>();

const { t } = useI18n();

const MINUTES_IN_HOUR = 60;
const HOURS_IN_DAY = 24;

// [Claude] Timeline ends by the hour, minutes from midnight; 24:00 closes the day.
const hourOptions = Array.from(
	{
		length: HOURS_IN_DAY + 1,
	},
	(_, hour) => ({
		id: hour * MINUTES_IN_HOUR,
		name: `${String(hour).padStart(2, '0')}:00`,
	}),
);

interface DraftForm {
	name: string;
	team: LookupEntity | null;
	calendar: LookupEntity | null;
	from: DayKey | null;
	to: DayKey | null;
	timelineFrom: number | null;
	timelineTo: number | null;
	extraSkills: LookupEntity[];
	blockOutsideActivity: boolean;
}

const formFrom = (schedule?: ScheduleHeader | null): DraftForm => ({
	name: schedule?.name ?? '',
	team: schedule?.team ?? null,
	calendar: schedule?.calendar ?? null,
	from: schedule?.from ?? null,
	to: schedule?.to ?? null,
	timelineFrom: schedule?.timeline?.from ?? null,
	timelineTo: schedule?.timeline?.to ?? null,
	extraSkills: [
		...(schedule?.extraSkills ?? []),
	],
	blockOutsideActivity: schedule?.blockOutsideActivity ?? false,
});

const draft = ref<DraftForm>(formFrom());

watch(
	() => props.shown,
	(isShown) => {
		if (isShown) draft.value = formFrom(props.schedule);
	},
);

const toDate = (day: DayKey) => new Date(dayToUtcMs(day));

const canSave = computed(() => {
	const { name, team, calendar, from, to } = draft.value;
	return !!(name.trim() && team && calendar && from && to && from <= to);
});

const save = () => {
	const {
		name,
		team,
		calendar,
		from,
		to,
		timelineFrom,
		timelineTo,
		extraSkills,
		blockOutsideActivity,
	} = draft.value;
	if (!team || !calendar || !from || !to) return;
	emit('save', {
		name: name.trim(),
		team,
		calendar,
		from,
		to,
		// [Claude] One end set: the other is the day's start or end.
		timeline:
			timelineFrom === null && timelineTo === null
				? undefined
				: {
						from: timelineFrom ?? 0,
						to: timelineTo ?? HOURS_IN_DAY * MINUTES_IN_HOUR,
					},
		extraSkills,
		blockOutsideActivity,
	});
};
</script>

<style scoped>
.schedule-popup {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

/* [Claude] Figma: Start date, End date, Timeline from, Timeline to in one row, 16px apart. */
.schedule-popup__row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
}
</style>
