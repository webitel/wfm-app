// [Claude] Background of an agent's day (Figma "PrimeVue Schedules Powered"): a shift is
// [Claude] green, an absence peach, a day locked by another schedule light blue, an empty
// [Claude] weekend or holiday pink, an empty day white. Also the modifier class of the cell.
export const DayCellType = {
	Working: 'working',
	Absence: 'absence',
	Locked: 'locked',
	Off: 'off',
	Empty: 'empty',
} as const;

export type DayCellType = (typeof DayCellType)[keyof typeof DayCellType];
