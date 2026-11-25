<template>
  <!-- [Claude] Figma "PrimeVue Schedules Powered" event chip: a marker bar (::before), a title
       and an optional second line (time or period). Absences are outlined: white with a marker.
       Styles live in schedule-table.css: Week / Month cells draw the same chip as plain spans. -->
  <span
    :class="[
      `schedule-table-chip--${color}`,
      `schedule-table-chip--${size}`,
      {
        'schedule-table-chip--outlined': isOutlined,
        'schedule-table-chip--two-lines': !!subtitle,
      },
    ]"
    :title="subtitle ? `${title} ${subtitle}` : title"
    class="schedule-table-chip"
  >
    <span
      v-if="subtitle"
      class="schedule-table-chip__content"
    >
      <span class="schedule-table-chip__title">{{ title }}</span>
      <span class="schedule-table-chip__subtitle">{{ subtitle }}</span>
    </span>
    <span
      v-else
      class="schedule-table-chip__title"
    >{{ title }}</span>
  </span>
</template>

<script setup lang="ts">
import type { ScheduleChipColor } from '../../../../enums';

withDefaults(
	defineProps<{
		title: string;
		subtitle?: string;
		color: ScheduleChipColor;
		// [Claude] sm: Week / Month cells; md: the Day timeline.
		size?: 'sm' | 'md';
		isOutlined?: boolean;
	}>(),
	{
		size: 'sm',
	},
);
</script>
