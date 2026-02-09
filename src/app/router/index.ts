import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router';
import { WtApplication } from '@webitel/ui-sdk/enums';

import agentsRoutes from '../../modules/agents/router';
import mySchedulesRoutes from '../../modules/my-schedules/router';
import schedulesRoutes from '../../modules/schedules/router';
import startPageRoutes from '../../modules/start-page/router';
import TheWfmWorkspace from '../components/the-wfm-workspace.vue';
import AccessDenied from '../components/utils/access-denied-component.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'crm-workspace',
    redirect: { name: 'the-start-page' },
    component: TheWfmWorkspace,
    meta: { app: WtApplication.Wfm },
    children: [
      ...startPageRoutes,
      ...mySchedulesRoutes,
      ...schedulesRoutes,
      ...agentsRoutes
    ],
  },
  {
    path: '/access-denied',
    name: 'access-denied',
    component: AccessDenied,
  },
];

export let router = null;

export const initRouter = async ({
  beforeEach = [],
} = {}) => {
  router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior() {
      return { left: 0, top: 0 };
    },
    routes,
  });

  router.beforeEach(
    (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext,
    ) => {
      if (!localStorage.getItem('access-token') && !to.query.accessToken) {
        const desiredUrl = encodeURIComponent(window.location.href);
        const authUrl = import.meta.env.VITE_AUTH_URL;
        window.location.href = `${authUrl}?redirectTo=${desiredUrl}`;
      } else if (to.query.accessToken) {
        // assume that access token was set from query before app initialization in main.js
        const newQuery = { ...to.query };
        delete newQuery.accessToken;
        next({ ...to, query: newQuery });
      } else {
        next();
      }
    },
  );

  beforeEach.forEach((guard) => {
    router.beforeEach(guard);
  });

  return router;
};
