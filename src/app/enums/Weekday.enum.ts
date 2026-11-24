// [Claude] Days of week as JS Date#getDay, date-fns, QCalendar and the `week` / `days` maps of
// [Claude] the WFM contract count them: 0 = Sunday … 6 = Saturday.
// [Claude] The keys go in display order, the week starts on Monday as in the mockups:
// [Claude] Object.values(Weekday) is the order of the days in a week.
export const Weekday = {
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6,
	Sunday: 0,
} as const;

export type Weekday = (typeof Weekday)[keyof typeof Weekday];
