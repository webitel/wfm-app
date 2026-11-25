// [Claude] What a click (or a drag) in the schedule calendar asks the page to do.
export enum CellActionType {
	AddAbsence = 'add-absence',
	ChangeAbsence = 'change-absence',
	DeleteAbsence = 'delete-absence',
	AddShift = 'add-shift',
	EditShift = 'edit-shift',
	DeleteShift = 'delete-shift',
	// [Claude] A shift moved or resized in the Day view; the action carries the changed shift.
	MoveShift = 'move-shift',
	DeletePause = 'delete-pause',
	DeleteAgent = 'delete-agent',
}
