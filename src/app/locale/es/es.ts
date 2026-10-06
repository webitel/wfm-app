import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Configuraciones',
			text: 'Esta sección contiene los datos de configuración inicial del módulo',
		},
		[WfmSections.Agents]: {
			name: 'Agentes',
			text: 'Puedes ver la lista de todos los agentes y sus horarios',
		},
		[WfmSections.Schedules]: {
			name: 'Horarios',
			text: 'Puedes crear y gestionar horarios',
		},
	},
};
