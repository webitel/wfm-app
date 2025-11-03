import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
  startPage: {
    [WfmSections.MySchedules]: {
      name: 'Lịch trình của tôi',
      text: 'Bạn có thể xem lịch trình của mình',
    },
    [WfmSections.Agents]: {
      name: 'Đại lý',
      text: 'Bạn có thể xem danh sách tất cả các đại lý và lịch trình của họ',
    },
    [WfmSections.Schedules]: {
      name: 'Lịch trình',
      text: 'Bạn có thể tạo và quản lý lịch trình',
    },
  }
}
