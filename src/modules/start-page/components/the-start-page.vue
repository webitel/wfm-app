<template>
  <wt-start-page :nav="nav" :app-logo="logo" :dark-mode="darkMode" />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useStore } from 'vuex';

import LogoDark from '../assets/wfm-logo-dark.svg';
import LogoLight from '../assets/wfm-logo-light.svg';
import { useNavStore } from '../stores/navStore'

const logo = {
  light: LogoLight,
  dark: LogoDark,
};
const store = useStore();
const navStore = useNavStore();

const darkMode = computed(() => store.getters['appearance/DARK_MODE']);

const { nav } = storeToRefs(navStore);
</script>
