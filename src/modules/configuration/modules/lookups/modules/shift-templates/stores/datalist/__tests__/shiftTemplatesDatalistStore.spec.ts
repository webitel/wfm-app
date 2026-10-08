import { createPinia, setActivePinia, storeToRefs } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useShiftTemplatesDatalistStore } from '../shiftTemplatesDatalistStore';

describe('useShiftTemplatesDatalistStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('exposes the configured columns', () => {
		const { headers } = storeToRefs(useShiftTemplatesDatalistStore());

		const fields = headers.value.map((header) => header.field);
		expect(fields).toEqual([
			'name',
			'description',
		]);
	});

	it('starts with an empty, unloaded data list', () => {
		const store = useShiftTemplatesDatalistStore();

		expect(store.dataList).toEqual([]);
		expect(store.isLoading).toBe(false);
	});
});
