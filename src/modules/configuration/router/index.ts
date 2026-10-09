import type { RouteRecordRaw } from 'vue-router';

import lookupsRoutes from '../modules/lookups/router';
import { ConfigurationNamespace } from '../namespace';

const TheConfiguration = () => import('../components/the-configuration.vue');

const configurationRoutes: RouteRecordRaw[] = [
	{
		path: 'configuration',
		name: ConfigurationNamespace,
		component: TheConfiguration,
	},
	...lookupsRoutes,
];

export default configurationRoutes;
