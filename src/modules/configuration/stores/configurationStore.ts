import { WfmSections } from '@webitel/ui-sdk/enums';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useUserinfoStore } from '../../userinfo/store/userinfoStore';

interface ConfigurationNavItem {
	value: string;
	name: string;
	route?: string;
	subNav?: ConfigurationNavItem[];
}

export const useConfigurationStore = defineStore('configuration', () => {
	const { t } = useI18n();
	const router = useRouter();

	const { routeAccessGuard } = useUserinfoStore();

	const nav = computed<ConfigurationNavItem[]>(() => [
		{
			value: 'lookups',
			name: t('configuration.lookups'),
			subNav: [
				{
					value: WfmSections.PauseTemplates,
					name: t('lookups.pauseTemplates.pauseTemplates', 2),
					route: 'configuration/lookups/pause-templates',
				},
				{
					value: WfmSections.WorkingConditions,
					name: t('lookups.workingConditions.workingConditions', 2),
					route: 'configuration/lookups/working-conditions',
				},
			],
		},
	]);

	const hasRouteAccess = (path: string) =>
		routeAccessGuard(
			router.resolve({
				path,
			}),
		) === true;

	const navAccessReducer = (
		reducedNav: ConfigurationNavItem[],
		currentNav: ConfigurationNavItem,
	): ConfigurationNavItem[] => {
		if (currentNav.subNav) {
			const subNav = currentNav.subNav.reduce(navAccessReducer, []);
			return subNav.length
				? [
						...reducedNav,
						{
							...currentNav,
							subNav,
						},
					]
				: reducedNav;
		}

		return hasRouteAccess(`/${currentNav.route}`)
			? [
					...reducedNav,
					currentNav,
				]
			: reducedNav;
	};

	const accessibleNav = computed(() => nav.value.reduce(navAccessReducer, []));

	const hasAnyConfigurationAccess = computed(
		() => accessibleNav.value.length > 0,
	);

	return {
		nav,
		accessibleNav,
		hasAnyConfigurationAccess,
	};
});
