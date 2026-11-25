// [Claude] Where the date navigation of the schedule table moves.
export const StepDirection = {
	Prev: 'prev',
	Next: 'next',
} as const;

export type StepDirection = (typeof StepDirection)[keyof typeof StepDirection];
