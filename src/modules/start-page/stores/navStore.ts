import { WfmSections } from '@webitel/ui-sdk/enums';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useUserinfoStore } from '../../userinfo/store/userinfoStore';
import WfmAgentsDark from '../assets/wfm-agents-dark.svg'
import WfmAgentsLight from '../assets/wfm-agents-light.svg'
import WfmMySchedulesDark from '../assets/wfm-my-schedules-dark.svg'
import WfmMySchedulesLight from '../assets/wfm-my-schedules-light.svg'
import WfmSchedulesDark from '../assets/wfm-schedules-dark.svg'
import WfmSchedulesLight from '../assets/wfm-schedules-light.svg'

export const useNavStore = defineStore('nav', () => {
    const { t } = useI18n();
    const router = useRouter();

    const { routeAccessGuard } = useUserinfoStore();

    const nav = computed(() => {

      const mySchedulesRoutePath = '/my-schedules';
      const mySchedulesRoute = router.resolve({ path: mySchedulesRoutePath });
      const hasMySchedulesAccess = routeAccessGuard(mySchedulesRoute) === true;

      const agentsRoutePath = '/agents';
      const agentsRoute = router.resolve({ path: agentsRoutePath });
      const hasAgentsAccess = routeAccessGuard(agentsRoute) === true;

      const schedulesRoutePath = '/schedules';
      const schedulesRoute = router.resolve({ path: schedulesRoutePath });
      const hasSchedulesAccess = routeAccessGuard(schedulesRoute) === true;

      const navigation = [
        {
          value: WfmSections.MySchedules,
          route: mySchedulesRoutePath,
          name: t(`startPage.${WfmSections.MySchedules}.name`),
          text: t(`startPage.${WfmSections.MySchedules}.text`),
          disabled: !hasMySchedulesAccess,
          images: {
            light: WfmMySchedulesLight,
            dark: WfmAgentsDark,
          },
        },
        {
          value: WfmSections.Agents,
          route: agentsRoutePath,
          name: t(`startPage.${WfmSections.Agents}.name`),
          text: t(`startPage.${WfmSections.Agents}.text`),
          disabled: !hasAgentsAccess,
          images: {
            light: WfmSchedulesLight,
            dark: WfmMySchedulesDark,
          },
        },
        {
          value: WfmSections.Schedules,
          route: schedulesRoutePath,
          name: t(`startPage.${WfmSections.Schedules}.name`),
          text: t(`startPage.${WfmSections.Schedules}.text`),
          disabled: !hasSchedulesAccess,
          images: {
            light: WfmAgentsLight,
            dark: WfmSchedulesDark,
          }
        }
      ]

      return navigation;
    });

    return { nav };
});
