import type { WtTableHeader } from '@webitel/ui-sdk/src/components/wt-table/types/WtTable';
import { SortSymbols } from '@webitel/ui-sdk/src/scripts/sortQueryAdapters';

export const headers: WtTableHeader[] = [
  {
    value: 'name',
    locale: 'cases.id',
    show: true,
    field: 'name',
    sort: SortSymbols.NONE,
  },
];
