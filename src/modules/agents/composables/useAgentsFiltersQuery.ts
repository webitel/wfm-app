import { WfmSections } from '@webitel/ui-sdk/enums';
import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAgentsCalendarStore } from '../stores/agentsCalendarStore';

// [Claude] Agents filters in the URL query, as ui-datalist keeps them for its tables
// [Claude] (`<namespace>/filters` = filtersManager.toString()): a filtered page can be
// [Claude] reloaded or shared. ui-datalist does not export its persistence, so it is here.
const QUERY_KEY = `${WfmSections.Agents}/filters`;

export const useAgentsFiltersQuery = () => {
	const route = useRoute();
	const router = useRouter();
	const store = useAgentsCalendarStore();
	const { filtersManager, isFiltersRestoring, filterValues } =
		storeToRefs(store);

	const restore = () => {
		const snapshot = route.query[QUERY_KEY];
		if (typeof snapshot !== 'string') return;
		isFiltersRestoring.value = true;
		try {
			filtersManager.value.fromString(snapshot);
		} catch {
			// [Claude] A broken link opens the page without filters.
			filtersManager.value.reset();
		} finally {
			isFiltersRestoring.value = false;
		}
	};

	watch(
		filterValues,
		() => {
			const query = {
				...route.query,
			};
			const snapshot = filtersManager.value.toString();
			// [Claude] No filters = a clean URL.
			if (snapshot === '{}') delete query[QUERY_KEY];
			else query[QUERY_KEY] = snapshot;
			router.replace({
				query,
			});
		},
		{
			deep: true,
		},
	);

	return {
		restore,
	};
};
