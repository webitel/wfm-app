// [Claude] Fill colour of a "planned" bar against the forecast (US_05.11):
// [Claude] 0–25 % red, 26–50 % yellow, 51–100 % (and more) green.
export const ForecastLevel = {
	None: 'none',
	Low: 'low',
	Medium: 'medium',
	High: 'high',
} as const;

export type ForecastLevel = (typeof ForecastLevel)[keyof typeof ForecastLevel];
