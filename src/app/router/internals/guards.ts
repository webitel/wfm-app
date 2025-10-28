import { type RouteLocationNormalized } from 'vue-router';

import { useUserinfoStore } from '@/modules/userinfo/store/userinfoStore.ts';

export const checkAppAccess = () => {
  // TODO Need to implement check read access from wfm app
  const hasReadAccess = true
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
