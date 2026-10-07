import { WorkingConditionsAPI } from '@webitel/api-services/api';
import type { WfmWorkingCondition } from '@webitel/api-services/gen/models';
import { workingConditionSchema as standardValidationSchema } from '@webitel/api-services/validations';
import { createCardStore } from '@webitel/ui-datalist/card';

import { WorkingConditionsNamespace } from '../../namespace';

export const useWorkingConditionsCardStore =
	createCardStore<WfmWorkingCondition>({
		namespace: `${WorkingConditionsNamespace}/card`,
		apiModule: WorkingConditionsAPI,
		standardValidationSchema,
	});
