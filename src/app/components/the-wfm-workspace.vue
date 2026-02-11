<template>
  <main>
    <section>
      <wt-app-header v-if="!shouldHideHeader">
        <wt-notifications-bar />
        <wt-navigation-bar
          :current-app="thisApp"
          :nav="accessibleNav"
          :dark-mode="darkMode"
          :logo-route="StartPageRoutePaths.TheStartPage"
        />
        <wt-logo :dark-mode="darkMode" :logo-href="startPageHref" />
        <wt-dark-mode-switcher @changed-mode="setTheme" />
        <wt-app-navigator :apps="apps" :current-app="thisApp" :dark-mode="darkMode" />
        <wt-header-actions
          :build-info="{ release, build, timestamp }"
          :user="userInfo"
          @logout="logoutUser"
          @settings="settings"
        />
      </wt-app-header>
      <div class="object-content-wrap">
        <router-view />
      </div>
    </section>
  </main>
</template>

<script setup>
import { WebitelApplications } from '@webitel/ui-sdk/enums';
import WtDarkModeSwitcher from '@webitel/ui-sdk/src/modules/Appearance/components/wt-dark-mode-switcher.vue';
import { storeToRefs } from 'pinia';
import { computed, inject } from 'vue';
import { useRoute } from 'vue-router';

import { useAppearanceStore } from '../../modules/appearance/store/appearanceStore';
import StartPageRoutePaths from '../../modules/start-page/router/internals/start-page-route-paths';
import { useNavStore } from '../../modules/start-page/stores/navStore';
import { useUserinfoStore } from '../../modules/userinfo/store/userinfoStore';

const route = useRoute();
const release = import.meta.env.npm_package_version;
const build = import.meta.env.VITE_BUILD_NUMBER;
const timestamp = import.meta.env.VITE_BUILD_TIMESTAMP;

const navStore = useNavStore();
const userInfoStore = useUserinfoStore();
const appearanceStore = useAppearanceStore();

const { logoutUser, hasApplicationVisibility } = userInfoStore;
const { setTheme } = appearanceStore;
const { userInfo } = storeToRefs(userInfoStore);
const { darkMode } = storeToRefs(appearanceStore);

const thisApp = WebitelApplications.WFM;

const shouldHideHeader = computed(() => !!route.meta.hideHeader);

const startPageHref = computed(() => import.meta.env.VITE_START_PAGE_URL);

const { nav } = storeToRefs(navStore);

const accessibleNav = computed(() =>
	nav.value.filter(({ disabled }) => !disabled),
);

const apps = computed(() => {
	const agent = {
		name: WebitelApplications.AGENT,
		href: import.meta.env.VITE_AGENT_URL,
	};
	const supervisor = {
		name: WebitelApplications.SUPERVISOR,
		href: import.meta.env.VITE_SUPERVISOR_URL,
	};
	const history = {
		name: WebitelApplications.HISTORY,
		href: import.meta.env.VITE_HISTORY_URL,
	};
	const audit = {
		name: WebitelApplications.AUDIT,
		href: import.meta.env.VITE_AUDIT_URL,
	};
	const admin = {
		name: WebitelApplications.ADMIN,
		href: import.meta.env.VITE_ADMIN_URL,
	};
	const grafana = {
		name: WebitelApplications.ANALYTICS,
		href: import.meta.env.VITE_GRAFANA_URL,
	};
	const crm = {
		name: WebitelApplications.CRM,
		href: import.meta.env.VITE_CRM_URL,
	};

	const config = inject('$config');

	const allApps = [
		admin,
		supervisor,
		agent,
		history,
		audit,
		crm,
	];
	if (config?.ON_SITE) allApps.push(grafana);
	return allApps.filter(({ name }) => hasApplicationVisibility(name));
});

function settings() {
	const settingsUrl = import.meta.env.VITE_SETTINGS_URL;
	window.open(settingsUrl);
}
</script>

<style scoped>
.wt-dark-mode-switcher {
  margin-right: auto;
}
</style>
