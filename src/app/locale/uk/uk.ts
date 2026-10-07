import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Конфігурації',
			text: 'Цей розділ містить початкові дані конфігурації модуля',
		},
		[WfmSections.Agents]: {
			name: 'Агенти',
			text: 'Ви можете переглянути список усіх агентів і їхні розклади',
		},
		[WfmSections.Schedules]: {
			name: 'Розклади',
			text: 'Ви можете створювати та керувати розкладами',
		},
	},
	configuration: {
		lookups: 'Довідники',
	},
	lookups: {
		pauseTemplates: {
			pauseTemplates: 'Шаблон пауз | Шаблони пауз',
			template: 'Шаблон',
			pauseReason: 'Причина паузи',
			notSelected: 'Не вибрано',
			duration: 'Тривалість (хв)',
		},
	},
};
