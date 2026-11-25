import { ForecastLevel } from '../../../enums';

// [Claude] Level of a "planned" bar against the forecast, see ForecastLevel.

export const forecastLevel = (planned: number, forecast: number) => {
	if (!forecast) return planned ? ForecastLevel.High : ForecastLevel.None;
	const percent = (planned / forecast) * 100;
	if (percent <= 25) return ForecastLevel.Low;
	if (percent <= 50) return ForecastLevel.Medium;
	return ForecastLevel.High;
};
