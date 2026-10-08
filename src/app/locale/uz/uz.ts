import { WfmSections } from '@webitel/ui-sdk/enums';

export default {
	wfm: 'WFM',
	startPage: {
		configuration: {
			name: 'Sozlamalar',
			text: "Ushbu bo'limda modulning boshlang'ich sozlamalari mavjud",
		},
		[WfmSections.Agents]: {
			name: 'Agentlar',
			text: 'Barcha agentlar ro‘yxatini va ularning jadvalini ko‘rishingiz mumkin',
		},
		[WfmSections.Schedules]: {
			name: 'Jadvalar',
			text: 'Siz jadval yaratishingiz va boshqarishingiz mumkin',
		},
	},
	configuration: {
		lookups: 'Kutubxonalar',
	},
	lookups: {
		pauseTemplates: {
			pauseTemplates: "To'xtash shablonlari | To'xtash shablonlari",
			template: 'Shablon',
			pauseReason: "To'xtash sababi",
			notSelected: 'Tanlanmagan',
			duration: 'Davomiyligi (daqiqa)',
		},
		shiftTemplates: {
			shiftTemplates: 'Smena shabloni | Smena shablonlari',
			template: 'Shablon',
			start: 'Boshlanish',
			end: 'Tugash',
			duration: 'Davomiyligi (soat:daqiqa)',
		},
		workingConditions: {
			workingConditions: 'Ish shartlari',
			workdayDuration: 'Ish kuni davomiyligi (soat)',
			workdaysPerMonth: 'Oyiga ish kunlari',
			vacationDaysPerYear: "Yiliga ta'til kunlari",
			sickLeavesPerYear: 'Yiliga kasallik kunlari',
			daysOffPerYear: 'Yiliga dam olish kunlari',
			pauseDuration: "To'xtash davomiyligi (daqiqa)",
		},
	},
};
