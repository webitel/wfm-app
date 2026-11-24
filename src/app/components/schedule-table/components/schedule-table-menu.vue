<template>
  <!-- [Claude] One popover for the whole grid: a menu per cell would mean thousands of popovers. -->
  <wt-popover
    ref="popover"
    unstyled
  >
    <template #default="{ hide }">
      <div class="schedule-table-menu typo-body-2">
        <p
          v-if="title"
          class="schedule-table-menu__title typo-caption"
        >
          {{ title }}
        </p>
        <button
          v-for="option of options"
          :key="`${option.action}-${option.absence || ''}`"
          class="schedule-table-menu__option"
          type="button"
          @click="select(option, hide)"
        >
          <wt-icon
            v-if="option.icon"
            :icon="option.icon"
            size="sm"
          />
          <span>{{ option.text }}</span>
        </button>
      </div>
    </template>
  </wt-popover>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

import type { CellMenuOption } from '../types';

const emit = defineEmits<{
	select: [
		option: CellMenuOption,
	];
}>();

const popover = useTemplateRef<{
	show: (event: Event, target?: HTMLElement) => void;
	hide: () => void;
}>('popover');

const options = ref<CellMenuOption[]>([]);
const title = ref('');

const open = (
	event: MouseEvent,
	nextOptions: CellMenuOption[],
	nextTitle = '',
) => {
	options.value = nextOptions;
	title.value = nextTitle;
	popover.value?.hide();
	// [Claude] Wait a tick so a menu that was open on another cell re-anchors.
	const target = event.currentTarget as HTMLElement;
	requestAnimationFrame(() => popover.value?.show(event, target));
};

const select = (option: CellMenuOption, hide: () => void) => {
	hide();
	emit('select', option);
};

defineExpose({
	open,
});
</script>

<style scoped>
.schedule-table-menu {
  display: flex;
  flex-direction: column;
  min-width: 160px;
  padding: var(--spacing-2xs) 0;
  border-radius: var(--border-radius, 8px);
  background: var(--dp-24-surface-color);
  box-shadow: var(--elevation-5);
}

.schedule-table-menu__title {
  padding: var(--spacing-2xs) var(--spacing-xs);
  color: var(--text-main-color);
  opacity: 0.7;
}

.schedule-table-menu__option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-2xs) var(--spacing-xs);
  border: none;
  background: transparent;
  color: var(--text-main-color);
  text-align: left;
  cursor: pointer;
}

.schedule-table-menu__option:hover {
  background: var(--primary-light-color);
}
</style>
