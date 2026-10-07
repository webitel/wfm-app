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
	configuration: {
		lookups: 'Búsquedas',
	},
	lookups: {
		pauseTemplates: {
			pauseTemplates: 'Plantilla de pausa | Plantillas de pausa',
			template: 'Plantilla',
			pauseReason: 'Motivo de pausa',
			notSelected: 'No seleccionado',
			duration: 'Duración (min)',
		},
		shiftTemplates: {
			shiftTemplates: 'Plantilla de turno | Plantillas de turnos',
		},
		workingConditions: {
			workingConditions: 'Condiciones de trabajo',
			workdayDuration: 'Duración del día laboral (hrs)',
			workdaysPerMonth: 'Días laborables al mes',
			vacationDaysPerYear: 'Días de vacaciones al año',
			sickLeavesPerYear: 'Días de enfermedad al año',
			daysOffPerYear: 'Días libres al año',
			pauseDuration: 'Duración de la pausa (min)',
		},
	},
};
