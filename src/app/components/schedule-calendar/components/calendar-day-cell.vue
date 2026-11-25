<template>
  <!-- [Claude] An agent-day with something on it (US_02.01, US_05.08, US_05.10): the absence icon,
       the shift times, or a lock when another active schedule holds the day. Empty days are plain
       DayPilot cells with "+" (CSS), not events. In the Day view the absence icon repeats per hour. -->
  <div
    :class="`calendar-day-cell--${state}`"
    class="calendar-day-cell"
  >
    <template v-if="day.absence">
      <span
        v-for="index of repeat"
        :key="index"
        class="calendar-day-cell__part"
      >
        <wt-icon
          v-tooltip="t(ABSENCE_LOCALE[day.absence])"
          :icon="ABSENCE_ICON[day.absence]"
        />
      </span>
    </template>
    <div
      v-else-if="day.shifts.length"
      class="calendar-day-cell__shifts"
    >
      <span
        v-for="shift of day.shifts"
        :key="shift.id"
        class="typo-caption"
      >
        {{ shiftTime(shift) }}
      </span>
    </div>
    <wt-icon
      v-else
      v-tooltip="t('wfmCalendar.locked')"
      icon="lock"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { AgentDay, Shift } from '../../../api/wfm/types';
import { ABSENCE_ICON, ABSENCE_LOCALE } from '../../../enums';
import { formatTime } from '../../../utils/day';

const props = withDefaults(
	defineProps<{
		day: AgentDay;
		timeZone: string;
		// [Claude] Month cells are narrow: whole hours as "9–18".
		isCompact?: boolean;
		// [Claude] Day view: one absence icon per hour of the timeline.
		repeat?: number;
	}>(),
	{
		repeat: 1,
	},
);

const { t } = useI18n();

const compactTime = (ms: number) => {
	const time = formatTime(ms, props.timeZone);
	return time.endsWith(':00') ? String(Number(time.slice(0, 2))) : time;
};

const shiftTime = (shift: Shift) =>
	props.isCompact
		? `${compactTime(shift.startAt)}–${compactTime(shift.endAt)}`
		: `${formatTime(shift.startAt, props.timeZone)}–${formatTime(shift.endAt, props.timeZone)}`;

const state = computed(() => {
	if (props.day.absence) return 'absence';
	if (props.day.shifts.length) return 'shift';
	return 'locked';
});
</script>

<style scoped>
.calendar-day-cell {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--border-radius);
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.calendar-day-cell--shift {
	background: var(--wfm-calendar-shift-bg);
}

.calendar-day-cell--absence {
	background: var(--wfm-calendar-absence-bg);
}

.calendar-day-cell--locked {
	background: var(--wfm-calendar-locked-bg);
}

.calendar-day-cell__part {
	display: flex;
	flex: 1;
	justify-content: center;
}

.calendar-day-cell__shifts {
	display: flex;
	flex-direction: column;
	align-items: center;
	line-height: 1.2;
}
</style>
