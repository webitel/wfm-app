<template>
	<main class="object-wrap">
		<section class="object">
			<wt-app-header v-if="!shouldHideHeader">
				<wt-notifications-bar />
				<wt-navigation-bar
					:current-app="currentApp"
					:nav="accessibleNav"
					:dark-mode="darkMode"
					logo-route="/start-page"
				/>
				<wt-logo
					:dark-mode="darkMode"
					:logo-href="startPageHref"
				/>
				<wt-dark-mode-switcher @changed-mode="setTheme" />
				<wt-app-navigator
					:apps="apps"
					:current-app="currentApp"
					:dark-mode="darkMode"
				/>
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

<script lang="ts" setup>
import { WtNavigationBar } from '@webitel/ui-sdk/components';
import { WtApplication } from '@webitel/ui-sdk/enums';
import { WtDarkModeSwitcher } from '@webitel/ui-sdk/modules/Appearance';
import { storeToRefs } from 'pinia';
import { computed, inject } from 'vue';
import { useRoute } from 'vue-router';
import packageJson from './../../../package.json' with { type: 'json' };
import { useAppearanceStore } from '../../modules/appearance/store/appearanceStore';
import { useNavStore } from '../../modules/start-page/stores/navStore';
import { useUserinfoStore } from '../../modules/userinfo/store/userinfoStore';

const route = useRoute();
const release = packageJson.version;
const build = import.meta.env.VITE_BUILD_NUMBER;
const timestamp = import.meta.env.VITE_BUILD_TIMESTAMP;

const navStore = useNavStore();
const userInfoStore = useUserinfoStore();
const appearanceStore = useAppearanceStore();

const { logoutUser, hasApplicationVisibility } = userInfoStore;
const { setTheme } = appearanceStore;
const { userInfo } = storeToRefs(userInfoStore);
const { darkMode } = storeToRefs(appearanceStore);

const currentApp = WtApplication.Wfm;

const shouldHideHeader = computed(() => !!route.meta.hideHeader);

const startPageHref = computed(() => import.meta.env.VITE_START_PAGE_URL);

const { nav } = storeToRefs(navStore);

const accessibleNav = computed(() =>
	nav.value.filter(({ disabled }) => !disabled),
);

const config = inject<{
	ON_SITE?: boolean;
}>('$config');

const apps = computed(() => {
	const agent = {
		name: WtApplication.Agent,
		href: import.meta.env.VITE_AGENT_URL,
	};
	const supervisor = {
		name: WtApplication.Supervisor,
		href: import.meta.env.VITE_SUPERVISOR_URL,
	};
	const history = {
		name: WtApplication.History,
		href: import.meta.env.VITE_HISTORY_URL,
	};
	const audit = {
		name: WtApplication.Audit,
		href: import.meta.env.VITE_AUDIT_URL,
	};
	const admin = {
		name: WtApplication.Admin,
		href: import.meta.env.VITE_ADMIN_URL,
	};
	const grafana = {
		name: WtApplication.Analytics,
		href: import.meta.env.VITE_GRAFANA_URL,
	};
	const crm = {
		name: WtApplication.Crm,
		href: import.meta.env.VITE_CRM_URL,
	};
	const wfm = {
		name: WtApplication.Wfm,
		href: import.meta.env.VITE_WFM_URL,
	};

	const allApps: {
		name: WtApplication;
		href: string;
	}[] = [
		admin,
		supervisor,
		agent,
		history,
		audit,
		crm,
		wfm,
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
.object-wrap {
	display: flex;
	width: 100%;
	height: 100%;
}

.object {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	width: 100%;
	height: 100%;
}

.object-content-wrap {
	flex: 1;
	min-height: 0;
}

.wt-dark-mode-switcher {
	margin-right: auto;
}
</style>
