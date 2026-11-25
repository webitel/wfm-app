import { WfmSections } from '@webitel/ui-sdk/enums';
import type { RouteRecordRaw } from 'vue-router';

import TheSchedule from '../components/the-schedule.vue';
import TheSchedules from '../components/the-schedules.vue';

const schedulesRoutes: RouteRecordRaw[] = [
	{
		path: 'schedules',
		name: WfmSections.Schedules,
		component: TheSchedules,
	},
	// [Claude] The page of one schedule (US_05.05); no WtObject for schedules, app access only.
	{
		path: 'schedules/:id',
		name: `${WfmSections.Schedules}-card`,
		component: TheSchedule,
	},
];

export default schedulesRoutes;
