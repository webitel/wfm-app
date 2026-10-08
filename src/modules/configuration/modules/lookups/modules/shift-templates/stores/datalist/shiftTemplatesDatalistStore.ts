import { ShiftTemplatesAPI } from '@webitel/api-services/api';
import { createTableStore } from '@webitel/ui-datalist';

import { ShiftTemplatesNamespace } from '../../namespace';
import { headers } from './_internals/headers';

export const useShiftTemplatesDatalistStore = createTableStore(
	`${ShiftTemplatesNamespace}/datalist`,
	{
		apiModule: ShiftTemplatesAPI,
		headers,
	},
);
