// [Claude] Props, events and inner data of the schedule calendar (the-schedule-calendar.vue).
import type {
	AbsenceType,
	AgentDay,
	ForecastHour,
	Lookup,
	PlannedDay,
	PlannedSlot,
	Shift,
	ShiftPause,
} from '../../api/wfm/types';
import type { CellActionType } from '../../enums';
import type { DayKey } from '../../utils/day';

export interface DayBounds {
	from: DayKey;
	to: DayKey;
}

// [Claude] The time scale of the Day view, minutes from midnight; `to` before `from` crosses midnight.
export interface Timeline {
	from: number;
	to: number;
}

export interface CalendarForecast {
	hours: ForecastHour[];
	plannedSlots: PlannedSlot[];
	plannedDays: PlannedDay[];
}

export interface CellAction {
	type: CellActionType;
	agent: Lookup;
	date: DayKey;
	absence?: AbsenceType;
	absenceId?: string;
	shift?: Shift;
	pause?: ShiftPause;
}

// [Claude] One item of the cell menu.
export interface CellMenuItem {
	action: CellActionType;
	text: string;
	absence?: AbsenceType;
	shift?: Shift;
}

// [Claude] What a calendar event stands for; kept in the DayPilot event's `tags`.
export type CalendarEventKind =
	| 'day' // [Claude] an agent-day of Week / Month with an absence, shifts or a lock
	| 'day-line' // [Claude] the whole timeline of an agent in Day: absence or lock
	| 'shift' // [Claude] one shift in Day (movable, resizable)
	| 'forecast-day'
	| 'forecast-hour';

export interface CalendarEventTags {
	kind: CalendarEventKind;
	agentId?: string;
	date: DayKey;
	day?: AgentDay;
	shift?: Shift;
	// [Claude] Minutes from midnight of `date`: the hour of a forecast-hour event.
	hourStart?: number;
}

// [Claude] Filters of the agents list (US_02.03, US_05.12).
export interface AgentsFiltersState {
	teams: Lookup[];
	supervisors: Lookup[];
	skills: Lookup[];
}
