import { ShiftTemplatesAPI } from '@webitel/api-services/api';
import type { WfmShiftTemplate } from '@webitel/api-services/gen/models';
import { shiftTemplateSchema as standardValidationSchema } from '@webitel/api-services/validations';
import { createCardStore } from '@webitel/ui-datalist/card';

import { ShiftTemplatesNamespace } from '../../namespace';

export const useShiftTemplatesCardStore = createCardStore<WfmShiftTemplate>({
	namespace: `${ShiftTemplatesNamespace}/card`,
	apiModule: ShiftTemplatesAPI,
	standardValidationSchema,
});
