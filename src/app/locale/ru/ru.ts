import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Конфигурации',
			text: 'Этот раздел содержит начальные данные конфигурации модуля',
		},
		[WfmSections.Agents]: {
			name: 'Агенты',
			text: 'Вы можете увидеть список всех агентов и их расписания',
		},
		[WfmSections.Schedules]: {
			name: 'Расписания',
			text: 'Вы можете создавать и управлять расписаниями',
		},
	},
	configuration: {
		lookups: 'Справочники',
	},
	lookups: {
		pauseTemplates: {
			pauseTemplates: 'Шаблон пауз | Шаблоны пауз',
			template: 'Шаблон',
			pauseReason: 'Причина паузы',
			notSelected: 'Не выбрано',
			duration: 'Длительность (мин)',
		},
		shiftTemplates: {
			shiftTemplates: 'Шаблон смен | Шаблоны смен',
			template: 'Шаблон',
			start: 'Начало',
			end: 'Конец',
			duration: 'Длительность (чч:мм)',
		},
		workingConditions: {
			workingConditions: 'Условия работы',
			workdayDuration: 'Длительность рабочего дня (час.)',
			workdaysPerMonth: 'Количество рабочих дней в месяц',
			vacationDaysPerYear: 'Количество дней отпуска в год',
			sickLeavesPerYear: 'Количество дней больничного в год',
			daysOffPerYear: 'Количество выходных дней в год',
			pauseDuration: 'Длительность перерыва (мин)',
		},
	},
};
