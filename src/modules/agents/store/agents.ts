import { createTableStore } from '@webitel/ui-datalist';

import { AgentAbsenceAPI } from '@webitel/api-services/api;
import { AgentsAbsenceNamespace } from '../namespace';
import { headers } from '../store/_internals/headers';

export const useAgentAbsenceStore = createTableStore(AgentsAbsenceNamespace, {
  apiModule: AgentAbsenceAPI,
  headers,
});
