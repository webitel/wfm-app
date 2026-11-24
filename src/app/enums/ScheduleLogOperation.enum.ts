// [Claude] What a record of the schedule's history says was done (prototype, see wire.ts).
export const ScheduleLogOperation = {
	AgentsAdded: 'agents_added',
	AgentsDeleted: 'agents_deleted',
	StateChanged: 'state_changed',
	Planned: 'planned',
	ShiftsCleared: 'shifts_cleared',
} as const;

export type ScheduleLogOperation =
	(typeof ScheduleLogOperation)[keyof typeof ScheduleLogOperation];
