import { PauseTemplatesAPI } from '@webitel/api-services/api';
import type { WfmPauseTemplate } from '@webitel/api-services/gen/models';
import { pauseTemplateSchema as standardValidationSchema } from '@webitel/api-services/validations';
import { createCardStore } from '@webitel/ui-datalist/card';

import { PauseTemplatesNamespace } from '../../namespace';

export const usePauseTemplatesCardStore = createCardStore<WfmPauseTemplate>({
	namespace: `${PauseTemplatesNamespace}/card`,
	apiModule: PauseTemplatesAPI,
	standardValidationSchema,
});
