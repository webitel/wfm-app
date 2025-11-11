import { AgentAbsenceAPI } from '@webitel/api-services/api';
import { createTableStore } from '@webitel/ui-datalist';

import { AgentsAbsenceNamespace } from '../namespace';
import { headers } from '../store/_internals/headers';

export const useAgentAbsenceStore = createTableStore(AgentsAbsenceNamespace, {
  apiModule: AgentAbsenceAPI,
  headers,
});
