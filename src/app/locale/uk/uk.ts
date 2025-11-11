import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
  startPage: {
    [WfmSections.MySchedules]: {
      name: 'Мої розклади',
      text: 'Ви можете переглянути свій розклад',
    },
    [WfmSections.Agents]: {
      name: 'Агенти',
      text: 'Ви можете переглянути список усіх агентів і їхні розклади',
    },
    [WfmSections.Schedules]: {
      name: 'Розклади',
      text: 'Ви можете створювати та керувати розкладами',
    },
  },
  [WfmSections.Agents]: {
    name: ({ linked }) => linked(`startPage.${WfmSections.Agents}.name`),
  },
}
