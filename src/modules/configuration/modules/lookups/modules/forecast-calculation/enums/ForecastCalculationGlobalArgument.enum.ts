/**
 * [Claude] placeholders the backend substitutes for every procedure; the user
 * may add own arguments next to them.
 */
export const ForecastCalculationGlobalArgument = {
	TeamId: '$__teamId()',
	TimeFrom: '$__timeFrom()',
	TimeTo: '$__timeTo()',
} as const;

export type ForecastCalculationGlobalArgument =
	(typeof ForecastCalculationGlobalArgument)[keyof typeof ForecastCalculationGlobalArgument];
