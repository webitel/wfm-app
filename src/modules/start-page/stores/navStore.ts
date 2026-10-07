import { WfmSections } from '@webitel/ui-sdk/enums';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useConfigurationStore } from '../../configuration/stores/configurationStore';
import { useUserinfoStore } from '../../userinfo/store/userinfoStore';
import AgentsSectionDark from '../assets/agents-section-dark.svg';
import AgentsSectionLight from '../assets/agents-section-light.svg';
import ConfigurationSectionDark from '../assets/configuration-section-dark.svg';
import ConfigurationSectionLight from '../assets/configuration-section-light.svg';
import SchedulesSectionDark from '../assets/schedules-section-dark.svg';
import SchedulesSectionLight from '../assets/schedules-section-light.svg';

export const useNavStore = defineStore('nav', () => {
	const { t } = useI18n();
	const router = useRouter();

	const { routeAccessGuard } = useUserinfoStore();
	const configurationStore = useConfigurationStore();

	const nav = computed(() => {
		const agentsRoutePath = '/agents';
		const agentsRoute = router.resolve({
			path: agentsRoutePath,
		});
		const hasAgentsAccess = routeAccessGuard(agentsRoute) === true;

		const schedulesRoutePath = '/schedules';
		const schedulesRoute = router.resolve({
			path: schedulesRoutePath,
		});
		const hasSchedulesAccess = routeAccessGuard(schedulesRoute) === true;

		const navigation = [
			{
				value: 'configuration',
				route: '/configuration',
				name: t(`startPage.configuration.name`),
				text: t(`startPage.configuration.text`),
				disabled: !configurationStore.hasAnyConfigurationAccess,
				images: {
					light: ConfigurationSectionLight,
					dark: ConfigurationSectionDark,
				},
			},
			{
				value: WfmSections.Agents,
				route: agentsRoutePath,
				name: t(`startPage.${WfmSections.Agents}.name`),
				text: t(`startPage.${WfmSections.Agents}.text`),
				disabled: !hasAgentsAccess,
				images: {
					light: AgentsSectionLight,
					dark: AgentsSectionDark,
				},
			},
			{
				value: WfmSections.Schedules,
				route: schedulesRoutePath,
				name: t(`startPage.${WfmSections.Schedules}.name`),
				text: t(`startPage.${WfmSections.Schedules}.text`),
				disabled: !hasSchedulesAccess,
				images: {
					light: SchedulesSectionLight,
					dark: SchedulesSectionDark,
				},
			},
		];

		return navigation;
	});

	return {
		nav,
	};
});
