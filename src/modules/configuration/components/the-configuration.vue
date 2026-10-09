<template>
  <div class="the-configuration">
    <wt-navigation-menu
      :nav="accessibleNav"
      :icons="['wfm-lookups']"
    />
  </div>
</template>

<script setup lang="ts">
import { WtNavigationMenu } from '@webitel/ui-sdk/components';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import { useConfigurationStore } from '../stores/configurationStore';

const router = useRouter();

const configurationStore = useConfigurationStore();
const { accessibleNav, hasAnyConfigurationAccess } =
	storeToRefs(configurationStore);

if (!hasAnyConfigurationAccess.value) {
	router.replace('/access-denied');
}
</script>

<style scoped>
.the-configuration {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>
