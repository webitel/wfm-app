import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
  startPage: {
    [WfmSections.MySchedules]: {
      name: 'Moje harmonogramy',
      text: 'Możesz zobaczyć swój harmonogram',
    },
    [WfmSections.Agents]: {
      name: 'Agenci',
      text: 'Możesz zobaczyć listę wszystkich agentów i ich harmonogramy',
    },
    [WfmSections.Schedules]: {
      name: 'Harmonogramy',
      text: 'Możesz tworzyć i zarządzać harmonogramami',
    },
  }

}
