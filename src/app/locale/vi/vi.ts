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
	configuration: {
		lookups: 'Tra cứu',
	},
	lookups: {
		pauseTemplates: {
			pauseTemplates: 'Mẫu tạm dừng',
			template: 'Mẫu',
			pauseReason: 'Lý do tạm dừng',
			notSelected: 'Chưa chọn',
			duration: 'Thời gian (phút)',
		},
		shiftTemplates: {
			shiftTemplates: 'Mẫu ca làm việc',
		},
		workingConditions: {
			workingConditions: 'Điều kiện làm việc',
			workdayDuration: 'Thời gian làm việc trong ngày (giờ)',
			workdaysPerMonth: 'Số ngày làm việc trong tháng',
			vacationDaysPerYear: 'Số ngày nghỉ phép trong năm',
			sickLeavesPerYear: 'Số ngày nghỉ ốm trong năm',
			daysOffPerYear: 'Số ngày nghỉ trong năm',
			pauseDuration: 'Thời gian tạm dừng (phút)',
		},
	},
};
