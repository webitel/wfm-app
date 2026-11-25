// [Claude] Calendar model shared by Agents (absences) and Schedules (shifts).
// [Claude] Mirrors the manual planning contract from webitel/protos#532 (WFM-134),
// [Claude] but uses camelCase and 'YYYY-MM-DD' day keys instead of UTC-midnight ms.
// [Claude] Enums live in ./enums.
import type { WfmAbsenceType } from '@webitel/api-services/gen/models';
import type { CellActionType } from '../../enums';

export type DayKey = string; // [Claude] 'YYYY-MM-DD'

export interface LookupEntity {
	id: string;
	name: string;
}

export interface CalendarPause {
	id: string;
	startAt: number; // [Claude] epoch ms
	endAt: number;
	cause?: LookupEntity;
}

// [Claude] Switches a skill the agent already has on or off for the shift; the capacity is
// [Claude] the agent's own, so it is not part of the shift (AgentScheduleShiftSkill).
export interface CalendarShiftSkill {
	skill: LookupEntity;
	enabled: boolean;
}

export interface CalendarShift {
	id: string;
	etag: string;
	startAt: number; // [Claude] epoch ms; the shift ends right before endAt
	endAt: number;
	// [Claude] Set by the server: the day the shift starts on in the calendar's zone.
	workingDate?: DayKey;
	pauses: CalendarPause[];
	skills: CalendarShiftSkill[];
}

export interface CalendarCell {
	date: DayKey;
	absence?: WfmAbsenceType;
	absenceId?: string;
	// [Claude] The agent works in another active schedule on this date.
	locked?: boolean;
	shifts: CalendarShift[];
}

export interface CalendarRow {
	agent: LookupEntity;
	// [Claude] Only days that have something; a missing key is an empty day.
	cells: Record<DayKey, CalendarCell>;
	confirmed?: boolean;
}

// [Claude] A row of the grid: the Forecast row on top, then one per agent. A spacer stands
// [Claude] for the agent rows scrolled out of view (useRowWindow): QCalendar sizes it by
// [Claude] `height` and the slots draw nothing in it.
export type ScheduleTableResource =
	| {
			id: string;
			isForecast: true;
	  }
	| {
			id: string;
			isForecast?: false;
			row: CalendarRow;
	  }
	| {
			id: string;
			isSpacer: true;
			height: number;
	  };

export interface Holiday {
	date: DayKey;
	name: string;
}

export interface CalendarRange {
	start: number; // [Claude] minutes from midnight
	end: number;
}

export interface ScheduleCalendar {
	timeZone: string;
	// [Claude] 0 = Sunday … 6 = Saturday; a day without ranges is a day off.
	week: Record<number, CalendarRange[]>;
}

export interface PlannedDay {
	date: DayKey;
	agents: number;
}

export interface PlannedSlot {
	startAt: number;
	agents: number;
}

export interface ForecastHour {
	date: DayKey;
	startAt: number;
	agents: number;
}

// [Claude] One day of the Forecast row: agents needed at the busiest hour and agents with a shift.
export interface ForecastDay {
	forecast: number;
	planned: number;
}

export interface CalendarForecast {
	hours: ForecastHour[];
	plannedDays: PlannedDay[];
	plannedSlots: PlannedSlot[];
}

export interface CalendarBounds {
	from: DayKey;
	to: DayKey;
}

export interface CalendarTimeline {
	from: number; // [Claude] minutes from midnight
	to: number; // [Claude] end before start = crosses midnight
}

export interface CellAction {
	type: CellActionType;
	agent: LookupEntity;
	date: DayKey;
	absence?: WfmAbsenceType;
	absenceId?: string;
	shift?: CalendarShift;
	pause?: CalendarPause;
}

// [Claude] One item of the cell menu: the action it asks for and, for absences, the type.
export interface CellMenuOption {
	action: CellActionType;
	absence?: WfmAbsenceType;
	text: string;
	icon?: string;
}

// [Claude] One broken rule, as `Violation` in violation.proto.
export interface Violation {
	agent?: LookupEntity;
	date?: DayKey;
	reason: string;
	schedule?: LookupEntity;
	startAt?: number;
	endAt?: number;
}

export class WfmApiError extends Error {
	constructor(
		public id: string,
		public status: number,
		public violations: Violation[] = [],
	) {
		super(id);
	}
}
