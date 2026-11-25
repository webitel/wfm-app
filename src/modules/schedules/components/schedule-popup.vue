<template>
  <!-- [Claude] Create new schedule / Edit schedule (US_05.03–05.04): name, team, calendar, dates,
       timeline, Special time skills, Block agent activity outside of shift. A new schedule is a
       draft; editing is for drafts only and its Block switch goes through its own call. -->
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
          :maxlength="NAME_MAX_LENGTH"
          required
        />
        <wt-single-select
          v-model:model-value="draft.team"
          :label="t('schedules.team')"
          :search-method="searchLookup('teams')"
          option-label="name"
          required
        />
        <wt-single-select
          v-model:model-value="draft.calendar"
          :label="t('schedules.calendar')"
          :search-method="searchLookup('calendars')"
          option-label="name"
          required
        />

        <div class="schedule-popup__row">
          <wt-datepicker
            :label="t('schedules.startDate')"
            :max-date="draft.endDate ? new Date(dayToMs(draft.endDate)) : undefined"
            :model-value="draft.startDate ? dayToMs(draft.startDate) : null"
            required
            timezone="UTC"
            @update:model-value="draft.startDate = $event ? msToDay($event) : null"
          />
          <wt-datepicker
            :label="t('schedules.endDate')"
            :min-date="draft.startDate ? new Date(dayToMs(draft.startDate)) : undefined"
            :model-value="draft.endDate ? dayToMs(draft.endDate) : null"
            required
            timezone="UTC"
            @update:model-value="draft.endDate = $event ? msToDay($event) : null"
          />
        </div>

        <!-- [Claude] Both empty = 24 hours. -->
        <div class="schedule-popup__row">
          <wt-single-select
            :label="t('schedules.timelineFrom')"
            :model-value="hourOptions.find((option) => option.id === draft.timelineFrom)"
            :options="hourOptions"
            option-label="name"
            @update:model-value="draft.timelineFrom = $event?.id ?? null"
          />
          <wt-single-select
            :label="t('schedules.timelineTo')"
            :model-value="hourOptions.find((option) => option.id === draft.timelineTo)"
            :options="hourOptions"
            option-label="name"
            @update:model-value="draft.timelineTo = $event?.id ?? null"
          />
        </div>

        <wt-multi-select
          v-model:model-value="draft.extraSkills"
          :label="t('schedules.extraSkills')"
          :search-method="searchLookup('skills')"
          option-label="name"
        />

        <wt-switcher
          v-model:model-value="draft.isBlockOutsideActivity"
          :label="t('schedules.blockOutsideActivity')"
        />
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

import { searchLookup } from '../../../app/api/wfm/lookupsApi';
import type { Lookup, WorkingSchedule } from '../../../app/api/wfm/types';
import { WorkingSchedulesAPI } from '../../../app/api/wfm/workingSchedulesApi';
import { useWfmErrors } from '../../../app/composables/useWfmErrors';
import {
	type DayKey,
	dayToMs,
	MINUTES_IN_DAY,
	minutesToTime,
	msToDay,
} from '../../../app/utils/day';

const NAME_MAX_LENGTH = 250;
const HOUR_MINUTES = 60;

interface ScheduleDraft {
	name: string;
	team: Lookup | null;
	calendar: Lookup | null;
	startDate: DayKey | null;
	endDate: DayKey | null;
	timelineFrom: number | null;
	timelineTo: number | null;
	extraSkills: Lookup[];
	isBlockOutsideActivity: boolean;
}

const props = defineProps<{
	shown: boolean;
	// [Claude] The schedule to edit; null creates a new one.
	schedule: WorkingSchedule | null;
}>();

const emit = defineEmits<{
	close: [];
	saved: [
		schedule: WorkingSchedule,
		isNew: boolean,
	];
}>();

const { t } = useI18n();
const { notifyError } = useWfmErrors();

const hourOptions = Array.from(
	{
		length: MINUTES_IN_DAY / HOUR_MINUTES + 1,
	},
	(_, hour) => ({
		id: hour * HOUR_MINUTES,
		name:
			hour * HOUR_MINUTES === MINUTES_IN_DAY
				? '24:00'
				: minutesToTime(hour * HOUR_MINUTES),
	}),
);

const emptyDraft = (): ScheduleDraft => ({
	name: '',
	team: null,
	calendar: null,
	startDate: null,
	endDate: null,
	timelineFrom: null,
	timelineTo: null,
	extraSkills: [],
	isBlockOutsideActivity: false,
});

const draft = ref<ScheduleDraft>(emptyDraft());
const isSaving = ref(false);

watch(
	() => props.shown,
	(shown) => {
		if (!shown) return;
		const schedule = props.schedule;
		draft.value = schedule
			? {
					name: schedule.name,
					team: schedule.team,
					calendar: schedule.calendar,
					startDate: schedule.startDate,
					endDate: schedule.endDate,
					timelineFrom: schedule.timelineFrom,
					timelineTo: schedule.timelineTo,
					extraSkills: [
						...schedule.extraSkills,
					],
					isBlockOutsideActivity: schedule.isBlockOutsideActivity,
				}
			: emptyDraft();
	},
	{
		immediate: true,
	},
);

// [Claude] The timeline is both ends or none (both absent = 24 hours).
const isTimelineWhole = computed(
	() =>
		(draft.value.timelineFrom === null) === (draft.value.timelineTo === null),
);

const canSave = computed(
	() =>
		!!draft.value.name.trim() &&
		draft.value.name.length <= NAME_MAX_LENGTH &&
		!!draft.value.team &&
		!!draft.value.calendar &&
		!!draft.value.startDate &&
		!!draft.value.endDate &&
		draft.value.startDate <= draft.value.endDate &&
		isTimelineWhole.value,
);

const save = async () => {
	isSaving.value = true;
	try {
		const header = {
			...draft.value,
			name: draft.value.name.trim(),
		};
		if (!props.schedule) {
			emit('saved', await WorkingSchedulesAPI.create(header), true);
			return;
		}
		let saved = await WorkingSchedulesAPI.update({
			...props.schedule,
			...header,
		});
		// [Claude] Block outside activity changes only through its own call.
		if (
			header.isBlockOutsideActivity !== props.schedule.isBlockOutsideActivity
		) {
			saved = await WorkingSchedulesAPI.updateBlockOutsideActivity({
				id: saved.id,
				value: header.isBlockOutsideActivity,
				etag: saved.etag,
			});
		}
		emit('saved', saved, false);
	} catch (error) {
		notifyError(error);
	} finally {
		isSaving.value = false;
	}
};
</script>

<style scoped>
.schedule-popup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
}

.schedule-popup__row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing-sm);
}
</style>
