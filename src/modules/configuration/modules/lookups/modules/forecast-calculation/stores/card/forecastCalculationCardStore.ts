import { ForecastCalculationsAPI } from '@webitel/api-services/api';
import type { WfmForecastCalculation } from '@webitel/api-services/gen/models';
import { forecastCalculationSchema as standardValidationSchema } from '@webitel/api-services/validations';
import { createCardStore } from '@webitel/ui-datalist/card';

import { ForecastCalculationNamespace } from '../../namespace';

export const useForecastCalculationCardStore =
	createCardStore<WfmForecastCalculation>({
		namespace: `${ForecastCalculationNamespace}/card`,
		apiModule: ForecastCalculationsAPI,
		standardValidationSchema,
	});
