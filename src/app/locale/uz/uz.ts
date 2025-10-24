import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
  wfm: 'WFM',
  startPage: {
    [WfmSections.MySchedules]: {
      name: 'Mening jadvalarim',
      text: 'Siz jadvalingizni ko‘rishingiz mumkin',
    },
    [WfmSections.Agents]: {
      name: 'Agentlar',
      text: 'Barcha agentlar ro‘yxatini va ularning jadvalini ko‘rishingiz mumkin',
    },
    [WfmSections.Schedules]: {
      name: 'Jadvalar',
      text: 'Siz jadval yaratishingiz va boshqarishingiz mumkin',
    },
  }

}
