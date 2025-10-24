import { WfmSections } from '@webitel/ui-sdk/enums';
import { type RouteRecordRaw } from 'vue-router';

import TheAgents from '../components/the-agents.vue';

const agentsRoutes: RouteRecordRaw[] = [
  {
    path: 'agents',
    name: WfmSections.Agents,
    component: TheAgents,
  },
];

export default agentsRoutes;
