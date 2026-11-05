import { ForecastCalculationsAPI } from '@webitel/api-services/api';
import { createTableStore } from '@webitel/ui-datalist';

import { ForecastCalculationNamespace } from '../../namespace';
import { headers } from './_internals/headers';

export const useForecastCalculationDatalistStore = createTableStore(
	`${ForecastCalculationNamespace}/datalist`,
	{
		apiModule: ForecastCalculationsAPI,
		headers,
	},
);
