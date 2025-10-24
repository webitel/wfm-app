import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
  wfm: 'WFM',
  startPage: {
    [WfmSections.MySchedules]: {
      name: 'Менің кестелерім',
      text: 'Сіз өз кестеңізді көре аласыз',
    },
    [WfmSections.Agents]: {
      name: 'Агенттер',
      text: 'Барлық агенттердің тізімін және олардың кестелерін көре аласыз',
    },
    [WfmSections.Schedules]: {
      name: 'Кестелер',
      text: 'Сіз кестелерді жасай және басқара аласыз',
    },
  },
}
