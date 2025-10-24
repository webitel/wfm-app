<template>
  <wt-start-page :nav="nav"  :dark-mode="darkMode" />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useStore } from 'vuex';

import { useNavStore } from '../stores/navStore';

const store = useStore();
const navStore = useNavStore();

const darkMode = computed(() => store.getters['appearance/DARK_MODE']);

const { nav } = storeToRefs(navStore);
</script>
