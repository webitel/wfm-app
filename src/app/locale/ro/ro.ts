import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Configurații',
			text: 'Această secțiune conține datele inițiale de configurare a modulului',
		},
		[WfmSections.Agents]: {
			name: 'Agenți',
			text: 'Poți vedea lista tuturor agenților și programele lor',
		},
		[WfmSections.Schedules]: {
			name: 'Programe',
			text: 'Poți crea și gestiona programe',
		},
	},
	configuration: {
		lookups: 'Căutări',
	},
	lookups: {
		pauseTemplates: {
			pauseTemplates: 'Șablon de pauză | Șabloane de pauză',
			template: 'Șablon',
			pauseReason: 'Motiv de pauză',
			notSelected: 'Neales',
			duration: 'Durata (min)',
		},
	},
};
