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
};
