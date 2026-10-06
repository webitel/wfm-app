import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Конфигурациялар',
			text: 'Бұл бөлімде модульдің бастапқы конфигурация деректері бар',
		},
		[WfmSections.Agents]: {
			name: 'Агенттер',
			text: 'Барлық агенттердің тізімін және олардың кестелерін көре аласыз',
		},
		[WfmSections.Schedules]: {
			name: 'Кестелер',
			text: 'Сіз кестелерді жасай және басқара аласыз',
		},
	},
};
