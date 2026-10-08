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
		shiftTemplates: {
			shiftTemplates: 'Șablon de schimb | Șabloane de schimb',
			template: 'Șablon',
			start: 'Început',
			end: 'Sfârșit',
			duration: 'Durata (hh:mm)',
		},
		workingConditions: {
			workingConditions: 'Condiții de lucru',
			workdayDuration: 'Durata zilei de lucru (ore)',
			workdaysPerMonth: 'Zile de lucru pe lună',
			vacationDaysPerYear: 'Zile de concediu pe an',
			sickLeavesPerYear: 'Zile de concediu medical pe an',
			daysOffPerYear: 'Zile libere pe an',
			pauseDuration: 'Durata pauzei (min)',
		},
	},
};
