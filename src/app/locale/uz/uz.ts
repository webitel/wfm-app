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
};
