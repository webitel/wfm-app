// [Claude] Colour of a fact bar against the forecast (US_05.11): red 0–25 %, yellow 26–50 %,
// [Claude] green 51–100 % and above.
export enum ForecastLevel {
	Low = 'low',
	Medium = 'medium',
	High = 'high',
	None = 'none',
}

const LOW_PERCENT = 25;
const MEDIUM_PERCENT = 50;

export const forecastLevel = (
	planned: number,
	forecast: number,
): ForecastLevel => {
	if (!forecast) return ForecastLevel.None;
	const percent = (planned / forecast) * 100;
	if (percent <= LOW_PERCENT) return ForecastLevel.Low;
	if (percent <= MEDIUM_PERCENT) return ForecastLevel.Medium;
	return ForecastLevel.High;
};
