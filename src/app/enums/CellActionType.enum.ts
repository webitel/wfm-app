// [Claude] What the cell menu of the schedule table asks the page to do.
export const CellActionType = {
	AddAbsence: 'add-absence',
	ChangeAbsence: 'change-absence',
	DeleteAbsence: 'delete-absence',
	AddShift: 'add-shift',
	EditShift: 'edit-shift',
	DeleteShift: 'delete-shift',
	DeletePause: 'delete-pause',
	// [Claude] The trash icon of an agent row (US_05.07): the agent leaves the schedule.
	DeleteAgent: 'delete-agent',
} as const;

export type CellActionType =
	(typeof CellActionType)[keyof typeof CellActionType];
