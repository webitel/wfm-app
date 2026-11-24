<template>
  <!-- [Claude] Figma "PrimeVue Schedules Powered" event chip: a marker bar, a title and an
       optional second line (time or period). Absences are outlined: white with a marker. -->
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
    <span class="schedule-table-chip__marker" />
    <span class="schedule-table-chip__content">
      <span class="schedule-table-chip__title">{{ title }}</span>
      <span
        v-if="subtitle"
        class="schedule-table-chip__subtitle"
      >{{ subtitle }}</span>
    </span>
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

<style scoped>
.schedule-table-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  box-sizing: border-box;
  min-width: 0;
  height: 20px;
  padding: 2px 3px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--schedule-table-chip-background);
  color: var(--schedule-table-chip-title-color);
  text-align: left;
  white-space: nowrap;
}

.schedule-table-chip__marker {
  flex: 0 0 2px;
  align-self: stretch;
  margin: 2px 0;
  border-radius: 1px;
  background: var(--schedule-table-chip-marker);
}

.schedule-table-chip__content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  overflow: hidden;
}

.schedule-table-chip__title,
.schedule-table-chip__subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* [Claude] Figma Week / Month: SemiBold 9px, 10px with a second line of Medium 9px. */
.schedule-table-chip__title {
  font-size: 9px;
  font-weight: 600;
  line-height: normal;
}

.schedule-table-chip__subtitle {
  color: var(--schedule-table-chip-subtitle-color);
  font-size: 9px;
  font-weight: 500;
  line-height: normal;
}

.schedule-table-chip--two-lines {
  height: 36px;
}

.schedule-table-chip--two-lines .schedule-table-chip__title {
  font-size: 10px;
}

/* [Claude] Figma Day: 28px with one line, 36px with two; SemiBold 12px over Medium 11px. */
.schedule-table-chip--md {
  gap: 4px;
  height: 28px;
  padding: 2px 4px;
}

.schedule-table-chip--md.schedule-table-chip--two-lines {
  height: 36px;
}

.schedule-table-chip--md .schedule-table-chip__title {
  font-size: 12px;
}

.schedule-table-chip--md .schedule-table-chip__subtitle {
  font-size: 11px;
}

.schedule-table-chip--orange {
  --schedule-table-chip-background: var(--schedule-table-chip-orange-background);
  --schedule-table-chip-marker: var(--schedule-table-chip-orange-marker);
}

.schedule-table-chip--teal {
  --schedule-table-chip-background: var(--schedule-table-chip-teal-background);
  --schedule-table-chip-marker: var(--schedule-table-chip-teal-marker);
}

.schedule-table-chip--blue {
  --schedule-table-chip-background: var(--schedule-table-chip-blue-background);
  --schedule-table-chip-marker: var(--schedule-table-chip-blue-marker);
}

.schedule-table-chip--purple {
  --schedule-table-chip-background: var(--schedule-table-chip-purple-background);
  --schedule-table-chip-marker: var(--schedule-table-chip-purple-marker);
}

.schedule-table-chip--red {
  --schedule-table-chip-marker: var(--schedule-table-chip-red-marker);
}

.schedule-table-chip--coral {
  --schedule-table-chip-marker: var(--schedule-table-chip-coral-marker);
}

.schedule-table-chip--outlined {
  --schedule-table-chip-background: var(--schedule-table-chip-outlined-background);
}
</style>
