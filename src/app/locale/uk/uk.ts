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
		shiftTemplates: {
			shiftTemplates: 'Шаблон змін | Шаблони змін',
			template: 'Шаблон',
			start: 'Початок',
			end: 'Кінець',
			duration: 'Тривалість (гг:хх)',
		},
		workingConditions: {
			workingConditions: 'Умови роботи',
			workdayDuration: 'Тривалість робочого дня (год.)',
			workdaysPerMonth: 'Кількість робочих днів на місяць',
			vacationDaysPerYear: 'Кількість днів відпустки на рік',
			sickLeavesPerYear: 'Кількість днів лікарняного на рік',
			daysOffPerYear: 'Кількість вихідних днів на рік',
			pauseDuration: 'Тривалість перерви (хв)',
		},
		forecastCalculation: {
			forecastCalculation: 'Розрахунок прогнозу | Розрахунки прогнозу',
			procedure: 'SQL-процедура',
			arguments: 'Аргументи',
			executeDescription:
				'Виконайте процедуру, щоб перевірити розрахунок прогнозу',
			execute: 'Виконати',
			executeTestProcedure: 'Виконати тестову процедуру',
			periodFrom: 'Період для розрахунку: З',
			testResult: 'Перевірка розрахунку прогнозу',
			timestamp: 'Час',
			agents: 'Оператори',
			executeError: 'Під час виконання процедури сталася помилка',
		},
	},
};
