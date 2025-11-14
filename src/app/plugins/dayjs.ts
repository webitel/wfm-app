import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

// extend dayjs once
dayjs.extend(utc);
dayjs.extend(isoWeek);
dayjs.extend(relativeTime);

export default {
  install(app) {
    app.config.globalProperties.$dayjs = dayjs;
    app.provide('dayjs', dayjs);
  },
};

export { dayjs };
