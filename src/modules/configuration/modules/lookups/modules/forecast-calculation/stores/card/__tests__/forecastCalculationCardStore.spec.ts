import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useForecastCalculationCardStore } from '../forecastCalculationCardStore';

describe('useForecastCalculationCardStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('starts empty, not loading, with no item selected', () => {
		const store = useForecastCalculationCardStore();

		expect(store.itemId).toBeUndefined();
		expect(store.isLoading).toBe(false);
		expect(store.isSaving).toBe(false);
	});
});
