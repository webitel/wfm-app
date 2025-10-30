<template>
  <wt-start-page :nav="nav" :app-logo="logo" :dark-mode="darkMode" />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { useAppearanceStore } from '@/modules/appearance/store/appearanceStore'

import LogoDark from '../assets/wfm-logo-dark.svg';
import LogoLight from '../assets/wfm-logo-light.svg';
import { useNavStore } from '../stores/navStore'

const logo = {
  light: LogoLight,
  dark: LogoDark,
};
const navStore = useNavStore();
const appearanceStore = useAppearanceStore()

const { darkMode } = storeToRefs(appearanceStore)

const { nav } = storeToRefs(navStore);
</script>
