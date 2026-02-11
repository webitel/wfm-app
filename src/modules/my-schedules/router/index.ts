import { WfmSections } from '@webitel/ui-sdk/enums';
import type { RouteRecordRaw } from 'vue-router';

import TheMySchedules from '../components/the-my-schedules.vue';

const mySchedulesRoutes: RouteRecordRaw[] = [
	{
		path: 'my-schedules',
		name: WfmSections.MySchedules,
		component: TheMySchedules,
	},
];

export default mySchedulesRoutes;
