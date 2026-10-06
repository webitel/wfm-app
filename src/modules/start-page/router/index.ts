import type { RouteRecordRaw } from 'vue-router';

import TheStartPage from '../components/the-start-page.vue';

const startPageRoutes: RouteRecordRaw[] = [
	{
		path: '/start-page',
		name: 'the-start-page',
		component: TheStartPage,
	},
];

export default startPageRoutes;
