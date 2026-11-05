import { createPinia, setActivePinia, storeToRefs } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useForecastCalculationDatalistStore } from '../forecastCalculationDatalistStore';

describe('useForecastCalculationDatalistStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('exposes the configured columns', () => {
		const { headers } = storeToRefs(useForecastCalculationDatalistStore());

		const fields = headers.value.map((header) => header.field);
		expect(fields).toEqual([
			'name',
			'description',
		]);
	});

	it('starts with an empty, unloaded data list', () => {
		const store = useForecastCalculationDatalistStore();

		expect(store.dataList).toEqual([]);
		expect(store.isLoading).toBe(false);
	});
});
