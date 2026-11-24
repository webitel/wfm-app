import { WfmWorkingScheduleState } from '@webitel/api-services/gen/models';
import { WfmSections } from '@webitel/ui-sdk/enums';
import { ScheduleLogOperation } from '../../enums';

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
	},
	// [Claude] Календар Agents і Schedules (WFM-72), прототип на моках.
	scheduleTable: {
		agents: 'Оператори ({count})',
		// [Claude] Toolbar of the table (Figma "PrimeVue Schedules Powered").
		timeline: {
			day: 'Таймлайн: день',
			week: 'Таймлайн: тиждень',
			month: 'Таймлайн: місяць',
		},
		today: 'Сьогодні',
		resources: 'Ресурси',
		absence: {
			dayOff: 'Вихідний',
			sickLeave: 'Лікарняний',
			vacation: 'Відпустка',
		},
		forecast: {
			title: 'Прогноз',
			planned: 'Розплановано',
		},
		confirmed: 'Підтвердив графік',
		notConfirmed: 'Не підтвердив графік',
		delete: 'Видалити',
		shift: 'Зміна',
		editShift: 'Редагувати',
		pause: 'Пауза',
		addAbsence: 'Додати відсутність',
		absences: 'Відсутності',
		absenceType: 'Тип відсутності',
		startDate: 'Дата початку',
		endDate: 'Дата кінця',
		agentsTab: 'Оператори',
		addAgents: {
			title: 'Додати операторів',
		},
		dateFrom: 'Дата з',
		dateTo: 'Дата по',
		addShifts: 'Додати зміни',
		editShiftTitle: 'Редагувати зміну',
		workingShift: 'Робоча зміна',
		pauses: 'Паузи',
		skills: 'Навички',
		day: 'День',
		start: 'Початок',
		end: 'Кінець',
		enabled: 'Стан',
		pauseCause: 'Причина паузи',
		startTime: 'Час початку',
		duration: 'Тривалість (хв)',
		notSelected: 'Не вибрано',
		deleteShifts: {
			title: 'Зміни буде видалено',
			text: 'У цих операторів є зміни на вибрані дні. Відсутність їх прибере:',
			confirm: 'Видалити зміни',
		},
		skipped: 'Пропущено днів: {count}',
		dataUpdated: 'Дані змінились, календар оновлено',
		// [Claude] Вкладено за id помилки, щоб t(`scheduleTable.errors.${id}`) її знаходив.
		errors: {
			storage: {
				shift: {
					agent_not_in_schedule: 'Оператора немає в графіку',
					agent_deactivated: 'Користувача оператора деактивовано',
					outside_schedule: 'Дата поза періодом графіка',
					absence: 'На цю дату в оператора відсутність',
					locked_date: 'На цю дату оператор працює в іншому активному графіку',
					overlap: 'Зміна перетинається з іншою зміною оператора',
					refused: 'Зміни не можна зберегти',
					version_conflict: 'Зміну тим часом змінили',
				},
				working_schedule: {
					archived: 'Графік архівний',
				},
			},
			dbsql: {
				query: {
					no_rows: 'Запису вже немає',
				},
			},
			interceptor: {
				validate: 'Некоректний запит',
			},
		},
	},
	// [Claude] Agents section (EP_02).
	agents: {
		filters: {
			supervisor: 'Супервізор',
			team: 'Команда',
			skill: 'Навичка',
		},
	},
	schedules: {
		// [Claude] Create / Edit schedule dialog (Figma "Create new schedule").
		createSchedule: 'Створити новий розклад',
		editSchedule: 'Редагувати розклад',
		startDate: 'Дата початку',
		endDate: 'Дата завершення',
		timelineFrom: 'Таймлайн з',
		timelineTo: 'Таймлайн до',
		extraSkills: 'Навички для додаткових днів',
		blockOutsideActivity: 'Блокувати активність оператора поза зміною',
		// [Claude] Keyed by WfmWorkingScheduleState of @webitel/api-services.
		state: {
			[WfmWorkingScheduleState.WorkingScheduleStateDraft]: 'Чернетка',
			[WfmWorkingScheduleState.WorkingScheduleStatePending]: 'Очікує',
			[WfmWorkingScheduleState.WorkingScheduleStateActive]: 'Активний',
			[WfmWorkingScheduleState.WorkingScheduleStateArchived]: 'Архівний',
		},
		// [Claude] Schedule page: header and action bar (Figma "Action bar/WFM").
		plan: 'Розпланувати',
		planned: 'Зміни розплановано',
		agents: 'Оператори',
		actions: {
			search: 'Пошук',
			approve: 'Надіслати на погодження / активувати',
			clear: 'Очистити зміни періоду',
		},
		history: {
			title: 'Історія',
			empty: 'Змін ще немає',
			createdAt: 'Змінено',
			createdBy: 'Ким змінено',
			agent: 'Оператор',
			operation: {
				title: 'Операція',
				[ScheduleLogOperation.AgentsAdded]: 'Оператора додано',
				[ScheduleLogOperation.AgentsDeleted]: 'Оператора видалено',
				[ScheduleLogOperation.StateChanged]: 'Статус змінено',
				[ScheduleLogOperation.Planned]: 'Зміни розплановано',
				[ScheduleLogOperation.ShiftsCleared]: 'Зміни очищено',
			},
		},
	},
};
