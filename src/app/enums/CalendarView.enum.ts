// [Claude] Views of the schedule table: Day is the time axis, Week and Month the day grid.
export const CalendarView = {
	Day: 'day',
	Week: 'week',
	Month: 'month',
} as const;

export type CalendarView = (typeof CalendarView)[keyof typeof CalendarView];
