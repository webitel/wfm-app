<template>
  <router-view />
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { onMounted, provide } from "vue";
import { useI18n } from "vue-i18n";

import { useAppearanceStore } from './modules/appearance/store/appearanceStore.ts';

const { locale, fallbackLocale } = useI18n();

const appearanceStore = useAppearanceStore()

const { darkMode } = storeToRefs(appearanceStore)
provide('darkMode', darkMode);

function setLanguage() {
  const lang = localStorage.getItem('lang');
  if (lang) locale.value = lang;
  const fallbackLang = localStorage.getItem('fallbackLang');
  if (fallbackLang && fallbackLocale) fallbackLocale.value = fallbackLang;
}

onMounted(() => {
  setLanguage();
});
</script>

<style lang="scss">
#app {
  min-width: 100%;
  min-height: 100%;
}
</style>
