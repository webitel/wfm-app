import { WfmWorkingScheduleState } from '@webitel/api-services/gen/models';
import { WfmSections } from '@webitel/ui-sdk/enums';
import { ScheduleLogOperation } from '../../enums';

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
	// [Claude] Calendar grid of Agents and Schedules (WFM-72), prototype on mock data.
	scheduleTable: {
		agents: 'Agents ({count})',
		// [Claude] Toolbar of the table (Figma "PrimeVue Schedules Powered").
		timeline: {
			day: 'Resources Timeline Day',
			week: 'Resources Timeline Week',
			month: 'Resources Timeline Month',
		},
		today: 'Today',
		resources: 'Resources',
		absence: {
			dayOff: 'Day-off',
			sickLeave: 'Sick leave',
			vacation: 'Vacation',
		},
		forecast: {
			title: 'Forecast',
			planned: 'Planned',
		},
		confirmed: 'Confirmed the schedule',
		notConfirmed: 'Not confirmed the schedule',
		delete: 'Delete',
		shift: 'Shift',
		editShift: 'Edit',
		pause: 'Pause',
		addAbsence: 'Add absence',
		absences: 'Absences',
		absenceType: 'Type of absence',
		startDate: 'Start date',
		endDate: 'End date',
		agentsTab: 'Agents',
		addAgents: {
			title: 'Add agents',
		},
		dateFrom: 'Date from',
		dateTo: 'Date to',
		addShifts: 'Add shifts',
		editShiftTitle: 'Edit shift',
		workingShift: 'Working shift',
		pauses: 'Pauses',
		skills: 'Skills',
		day: 'Day',
		start: 'Start',
		end: 'End',
		enabled: 'State',
		pauseCause: 'Pause cause',
		startTime: 'Start time',
		duration: 'Duration (min)',
		notSelected: 'Not selected',
		deleteShifts: {
			title: 'Shifts will be deleted',
			text: 'These agents have shifts on the chosen days. The absence removes them:',
			confirm: 'Delete shifts',
		},
		skipped: 'Skipped days: {count}',
		dataUpdated: 'The data has changed, the calendar is refreshed',
		// [Claude] Nested by error id, so t(`scheduleTable.errors.${id}`) resolves it.
		errors: {
			storage: {
				shift: {
					agent_not_in_schedule: 'The agent is not in the schedule',
					agent_deactivated: 'The agent user is deactivated',
					outside_schedule: 'The date is outside the schedule',
					absence: 'The agent has an absence on this date',
					locked_date:
						'The agent works in another active schedule on this date',
					overlap: 'The shift overlaps another shift of the agent',
					refused: 'The shifts can not be saved',
					version_conflict: 'The shift has changed meanwhile',
				},
				working_schedule: {
					archived: 'The schedule is archived',
				},
			},
			dbsql: {
				query: {
					no_rows: 'The record no longer exists',
				},
			},
			interceptor: {
				validate: 'The request is not valid',
			},
		},
	},
	// [Claude] Agents section (EP_02).
	agents: {
		filters: {
			supervisor: 'Supervisor',
			team: 'Team',
			skill: 'Skill',
		},
	},
	schedules: {
		// [Claude] Create / Edit schedule dialog (Figma "Create new schedule").
		createSchedule: 'Create new schedule',
		editSchedule: 'Edit schedule',
		startDate: 'Start date',
		endDate: 'End date',
		timelineFrom: 'Timeline from',
		timelineTo: 'Timeline to',
		extraSkills: 'Extra days skills',
		blockOutsideActivity: 'Block agent activity outside of shift',
		// [Claude] Keyed by WfmWorkingScheduleState of @webitel/api-services.
		state: {
			[WfmWorkingScheduleState.WorkingScheduleStateDraft]: 'Draft',
			[WfmWorkingScheduleState.WorkingScheduleStatePending]: 'Pending',
			[WfmWorkingScheduleState.WorkingScheduleStateActive]: 'Active',
			[WfmWorkingScheduleState.WorkingScheduleStateArchived]: 'Archived',
		},
		// [Claude] Schedule page: header and action bar (Figma "Action bar/WFM").
		plan: 'Plan',
		planned: 'The shifts are planned',
		agents: 'Agents',
		actions: {
			search: 'Search',
			approve: 'Send for approval / activate',
			clear: 'Clear shifts of the period',
		},
		history: {
			title: 'History',
			empty: 'No changes yet',
			createdAt: 'Modified on',
			createdBy: 'Modified by',
			agent: 'Agent',
			operation: {
				title: 'Operation',
				[ScheduleLogOperation.AgentsAdded]: 'Agent added',
				[ScheduleLogOperation.AgentsDeleted]: 'Agent deleted',
				[ScheduleLogOperation.StateChanged]: 'State changed',
				[ScheduleLogOperation.Planned]: 'Shifts planned',
				[ScheduleLogOperation.ShiftsCleared]: 'Shifts cleared',
			},
		},
	},
};
