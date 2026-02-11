import { WfmSections } from '@webitel/ui-sdk/enums';
import type { RouteRecordRaw } from 'vue-router';

import TheSchedules from '../components/the-schedules.vue';

const schedulesRoutes: RouteRecordRaw[] = [
	{
		path: 'schedules',
		name: WfmSections.Schedules,
		component: TheSchedules,
	},
];

export default schedulesRoutes;
