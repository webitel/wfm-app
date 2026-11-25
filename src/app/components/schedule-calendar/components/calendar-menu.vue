<template>
  <!-- [Claude] The group of icons a click on a cell opens (US_02.05–02.07, US_05.14–05.19):
       absence types, shift, edit, delete. Placed at the click, closed by Esc or a click outside. -->
  <teleport to="body">
    <div
      v-if="isOpen"
      ref="panel"
      :style="position"
      class="calendar-menu"
    >
      <span
        v-if="title"
        class="typo-caption"
      >{{ title }}</span>
      <div class="calendar-menu__items">
        <wt-icon-btn
          v-for="(item, index) of items"
          :key="index"
          v-tooltip.top="item.text"
          :icon="item.icon"
          @click="pick(item)"
        />
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { onClickOutside, useEventListener } from '@vueuse/core';
import { ref, useTemplateRef } from 'vue';

import type { CellMenuItem } from '../types';

const emit = defineEmits<{
	select: [
		item: CellMenuItem,
	];
}>();

const OFFSET_PX = 4;

const isOpen = ref(false);
const items = ref<CellMenuItem[]>([]);
const title = ref('');
const position = ref({
	top: '0px',
	left: '0px',
});
const panel = useTemplateRef<HTMLElement>('panel');

const open = (
	point: {
		x: number;
		y: number;
	},
	next: CellMenuItem[],
	nextTitle = '',
) => {
	if (!next.length) return;
	items.value = next;
	title.value = nextTitle;
	position.value = {
		top: `${point.y + OFFSET_PX}px`,
		left: `${point.x + OFFSET_PX}px`,
	};
	isOpen.value = true;
};

const close = () => {
	isOpen.value = false;
};

const pick = (item: CellMenuItem) => {
	close();
	emit('select', item);
};

onClickOutside(panel, close);
useEventListener(document, 'keydown', (event: KeyboardEvent) => {
	if (event.key === 'Escape') close();
});

defineExpose({
	open,
	close,
});
</script>

<style scoped>
.calendar-menu {
	display: flex;
	position: fixed;
	flex-direction: column;
	gap: var(--spacing-3xs);
	z-index: 1000;
	box-shadow: var(--elevation-10);
	border-radius: var(--border-radius);
	background: var(--content-wrapper-color);
	padding: var(--spacing-2xs) var(--spacing-xs);
}

.calendar-menu__items {
	display: flex;
	gap: var(--spacing-xs);
}
</style>
