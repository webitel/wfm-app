import { createTableStore } from '@webitel/ui-datalist';

import AgentsAbsenceAPI from '../api/AgentsAbsenceAPI';
import { AgentsAbsenceNamespace } from '../namespace';
import { headers } from '../store/_internals/headers';

export const useAgentAbsenceStore = createTableStore(AgentsAbsenceNamespace, {
  apiModule: AgentsAbsenceAPI,
  headers,
});
