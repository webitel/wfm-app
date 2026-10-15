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
			template: 'Mẫu',
			start: 'Bắt đầu',
			end: 'Kết thúc',
			duration: 'Thời gian (giờ:phút)',
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
		forecastCalculation: {
			forecastCalculation: 'Tính toán dự báo | Tính toán dự báo',
			procedure: 'Thủ tục SQL',
			arguments: 'Đối số',
			executeDescription: 'Thực thi thủ tục để kiểm tra tính toán dự báo',
			execute: 'Thực thi',
			executeTestProcedure: 'Thực thi thủ tục kiểm tra',
			periodFrom: 'Khoảng thời gian tính toán: Từ',
			testResult: 'Kiểm tra tính toán dự báo',
			timestamp: 'Dấu thời gian',
			agents: 'Nhân viên',
			executeError: 'Đã xảy ra lỗi khi thực thi thủ tục',
		},
	},
};
