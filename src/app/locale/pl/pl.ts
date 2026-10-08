import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Konfiguracje',
			text: 'Ta sekcja zawiera początkowe dane konfiguracyjne modułu',
		},
		[WfmSections.Agents]: {
			name: 'Agenci',
			text: 'Możesz zobaczyć listę wszystkich agentów i ich harmonogramy',
		},
		[WfmSections.Schedules]: {
			name: 'Harmonogramy',
			text: 'Możesz tworzyć i zarządzać harmonogramami',
		},
	},
	configuration: {
		lookups: 'Wyszukiwanie',
	},
	lookups: {
		pauseTemplates: {
			pauseTemplates: 'Szablon zawieszenia | Szablony zawieszenia',
			template: 'Szablon',
			pauseReason: 'Przyczyna zawieszenia',
			notSelected: 'Nie wybrano',
			duration: 'Długość (min)',
		},
		shiftTemplates: {
			shiftTemplates: 'Szablon zmiany | Szablony zmian',
			template: 'Szablon',
			start: 'Początek',
			end: 'Koniec',
			duration: 'Długość (hh:mm)',
		},
		workingConditions: {
			workingConditions: 'Warunki pracy',
			workdayDuration: 'Długość dnia pracy (godz)',
			workdaysPerMonth: 'Dni pracy w miesiącu',
			vacationDaysPerYear: 'Dni urlopu w roku',
			sickLeavesPerYear: 'Dni chorobowe w roku',
			daysOffPerYear: 'Dni wolne w roku',
			pauseDuration: 'Długość przerwy (min)',
		},
	},
};
