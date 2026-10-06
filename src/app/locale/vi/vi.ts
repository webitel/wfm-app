import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Cấu hình',
			text: 'Phần này chứa dữ liệu cấu hình ban đầu của mô-đun',
		},
		[WfmSections.Agents]: {
			name: 'Đại lý',
			text: 'Bạn có thể xem danh sách tất cả các đại lý và lịch trình của họ',
		},
		[WfmSections.Schedules]: {
			name: 'Lịch trình',
			text: 'Bạn có thể tạo và quản lý lịch trình',
		},
	},
};
