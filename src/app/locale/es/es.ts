import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	startPage: {
		[WfmSections.MySchedules]: {
			name: 'Mis horarios',
			text: 'Puedes ver tu horario',
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
