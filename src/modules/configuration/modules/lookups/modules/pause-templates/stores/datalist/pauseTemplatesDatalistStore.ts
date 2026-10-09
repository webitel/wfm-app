import { PauseTemplatesAPI } from '@webitel/api-services/api';
import { createTableStore } from '@webitel/ui-datalist';

import { PauseTemplatesNamespace } from '../../namespace';
import { headers } from './_internals/headers';

export const usePauseTemplatesDatalistStore = createTableStore(
	`${PauseTemplatesNamespace}/datalist`,
	{
		apiModule: PauseTemplatesAPI,
		headers,
	},
);
