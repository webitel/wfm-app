import { WorkingConditionsAPI } from '@webitel/api-services/api';
import { createTableStore } from '@webitel/ui-datalist';

import { WorkingConditionsNamespace } from '../../namespace';
import { headers } from './_internals/headers';

export const useWorkingConditionsDatalistStore = createTableStore(
	`${WorkingConditionsNamespace}/datalist`,
	{
		apiModule: WorkingConditionsAPI,
		headers,
	},
);
