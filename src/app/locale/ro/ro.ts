import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
  startPage: {
    [WfmSections.MySchedules]: {
      name: 'Programele mele',
      text: 'Poți vedea programul tău',
    },
    [WfmSections.Agents]: {
      name: 'Agenți',
      text: 'Poți vedea lista tuturor agenților și programele lor',
    },
    [WfmSections.Schedules]: {
      name: 'Programe',
      text: 'Poți crea și gestiona programe',
    },
  }

}
