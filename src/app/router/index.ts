import { WtApplication } from '@webitel/ui-sdk/enums';
import {
	createRouter,
	createWebHistory,
	type NavigationGuardNext,
	type RouteLocationNormalized,
	type RouteRecordRaw,
} from 'vue-router';

import agentsRoutes from '../../modules/agents/router';
import configurationRoutes from '../../modules/configuration/router';
import schedulesRoutes from '../../modules/schedules/router';
import startPageRoutes from '../../modules/start-page/router';
import TheWfmWorkspace from '../components/the-wfm-workspace.vue';
import AccessDenied from '../components/utils/access-denied-component.vue';

const routes: Array<RouteRecordRaw> = [
	{
		path: '/',
		name: 'wfm-workspace',
		redirect: {
			name: 'the-start-page',
		},
		component: TheWfmWorkspace,
		meta: {
			WtApplication: WtApplication.Wfm,
		},
		children: [
			...startPageRoutes,
			...agentsRoutes,
			...schedulesRoutes,
			...configurationRoutes,
		],
	},
	{
		path: '/access-denied',
		name: 'access-denied',
		component: AccessDenied,
	},
];

export let router = null;

export const initRouter = async ({ beforeEach = [] } = {}) => {
	router = createRouter({
		history: createWebHistory(import.meta.env.BASE_URL),
		scrollBehavior() {
			return {
				left: 0,
				top: 0,
			};
		},
		routes,
	});

	router.beforeEach(
		(
			to: RouteLocationNormalized,
			_from: RouteLocationNormalized,
			next: NavigationGuardNext,
		) => {
			// [https://webitel.atlassian.net/browse/WTEL-10705]
			// only the stored token counts: `?accessToken=` is never trusted
			if (!localStorage.getItem('access-token')) {
				const desiredUrl = encodeURIComponent(window.location.href);
				const authUrl = import.meta.env.VITE_AUTH_URL;
				window.location.href = `${authUrl}?redirectTo=${desiredUrl}`;
			} else if (to.query.accessToken) {
				// old links may still carry the token: drop it from the url
				const newQuery = {
					...to.query,
				};
				delete newQuery.accessToken;
				next({
					...to,
					query: newQuery,
				});
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
