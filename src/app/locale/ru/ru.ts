import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
  wfm: 'WFM',
  startPage: {
    [WfmSections.MySchedules]: {
      name: 'Мои расписания',
      text: 'Вы можете увидеть своё расписание',
    },
    [WfmSections.Agents]: {
      name: 'Агенты',
      text: 'Вы можете увидеть список всех агентов и их расписания',
    },
    [WfmSections.Schedules]: {
      name: 'Расписания',
      text: 'Вы можете создавать и управлять расписаниями',
    },
  }

}
