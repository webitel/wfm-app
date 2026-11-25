import type { DatalistTableHeader } from '@webitel/ui-datalist';
import { createTableStore } from '@webitel/ui-datalist';
import { WfmSections } from '@webitel/ui-sdk/enums';
import { SortSymbols } from '@webitel/ui-sdk/src/scripts/sortQueryAdapters';

import {
	deleteWorkingSchedule,
	type SearchWorkingSchedulesParams,
	searchWorkingSchedules,
} from '../../../app/api/wfm/wfmCalendarApi';

// [Claude] Schedules register (US_05.01, Figma "Schedules directory"): Name and Status.
const headers: DatalistTableHeader[] = [
	{
		value: 'name',
		locale: 'reusable.name',
		field: 'name',
		show: true,
		sort: SortSymbols.NONE,
	},
	{
		value: 'state',
		locale: 'reusable.status',
		field: 'state',
		show: true,
		sort: SortSymbols.NONE,
	},
];

// [Claude] The WFM adapter in the apiModule shape of ui-datalist.
const apiModule = {
	getList: (params: SearchWorkingSchedulesParams) =>
		searchWorkingSchedules(params),
	delete: ({ id }: { id: string }) => deleteWorkingSchedule(id),
};

export const useSchedulesDatalistStore = createTableStore(
	`${WfmSections.Schedules}/datalist`,
	{
		apiModule,
		headers,
	},
);
