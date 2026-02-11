<template>
  <wt-start-page :nav="nav" :app-logo="logo" :dark-mode="darkMode" />
</template>

<script setup lang="ts">
import WtStartPage from '@webitel/ui-sdk/src/components/on-demand/wt-start-page/components/wt-start-page.vue';
import { storeToRefs } from 'pinia';

import { useAppearanceStore } from '../../appearance/store/appearanceStore';
import LogoDark from '../assets/wfm-logo-dark.svg';
import LogoLight from '../assets/wfm-logo-light.svg';
import { useNavStore } from '../stores/navStore';

const logo = {
	light: LogoLight,
	dark: LogoDark,
};
const navStore = useNavStore();
const appearanceStore = useAppearanceStore();

const { darkMode } = storeToRefs(appearanceStore);

const { nav } = storeToRefs(navStore);
</script>
