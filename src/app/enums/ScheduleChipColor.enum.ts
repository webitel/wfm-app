// [Claude] Colour of a chip in a schedule table cell (Figma "PrimeVue Schedules Powered"):
// [Claude] a tinted background with a darker marker. Pauses take one of the first four by
// [Claude] their cause; absences have their own.
export const ScheduleChipColor = {
	Orange: 'orange',
	Teal: 'teal',
	Blue: 'blue',
	Purple: 'purple',
	Red: 'red',
	Coral: 'coral',
} as const;

export type ScheduleChipColor =
	(typeof ScheduleChipColor)[keyof typeof ScheduleChipColor];
