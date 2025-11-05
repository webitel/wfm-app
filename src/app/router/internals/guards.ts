import { WebitelApplications } from '@webitel/ui-sdk/enums';
import { type RouteLocationNormalized } from 'vue-router';

import { useUserinfoStore } from '../../../modules/userinfo/store/userinfoStore';

export const checkAppAccess = () => {
  const userInfoStore = useUserinfoStore()

  const hasReadAccess = userInfoStore.hasApplicationVisibility(WebitelApplications.ADMIN)
  if (hasReadAccess) {
    return true;
  } else {
    return { path: '/access-denied' };
  }
};

export const checkRouteAccess = (to: RouteLocationNormalized) => {
  const userInfoStore = useUserinfoStore()

  const hasReadAccess = userInfoStore.routeAccessGuard(to)
  if (hasReadAccess) {
    return true;
  } else {
    return { path: '/access-denied' };
  }
};
