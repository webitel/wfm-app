import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Configurations',
			text: 'This section contains initial module configuration data',
		},
		[WfmSections.Agents]: {
			name: 'Agents',
			text: 'You can see the list of all agents and their schedules',
		},
		[WfmSections.Schedules]: {
			name: 'Schedules',
			text: 'You can create and manage schedules',
		},
	},
	configuration: {
		lookups: 'Lookups',
	},
	lookups: {
		pauseTemplates: {
			pauseTemplates: 'Pause template | Pause templates',
			template: 'Template',
			pauseReason: 'Pause reason',
			notSelected: 'Not selected',
			duration: 'Duration (min)',
		},
		shiftTemplates: {
			shiftTemplates: 'Shift template | Shift templates',
			template: 'Template',
			start: 'Start',
			end: 'End',
			duration: 'Duration (hh:mm)',
		},
		workingConditions: {
			workingConditions: 'Working condition | Working conditions',
			workdayDuration: 'Workday duration (hrs)',
			workdaysPerMonth: 'Workdays per month',
			vacationDaysPerYear: 'Vacation days (per year)',
			sickLeavesPerYear: 'Sick leaves (per year)',
			daysOffPerYear: 'Days-off (per year)',
			pauseDuration: 'Pause duration (min)',
		},
	},
};
