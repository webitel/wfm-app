import { fillIconsRepository } from '@webitel/ui-sdk';
import wfmApproved from './wfm-approved.svg?raw';
import wfmDayOff from './wfm-day-off.svg?raw';
import wfmLookups from './wfm-lookups.svg?raw';
import wfmSickLeave from './wfm-sick-leave.svg?raw';
import wfmVacation from './wfm-vacation.svg?raw';

const icons = {
	'wfm-lookups': wfmLookups,
	// [Claude] Absence types and the confirmation mark of the schedule calendar (Figma WFM).
	'wfm-day-off': wfmDayOff,
	'wfm-sick-leave': wfmSickLeave,
	'wfm-vacation': wfmVacation,
	'wfm-approved': wfmApproved,
};

fillIconsRepository({
	icons: Object.entries(icons).map(([iconName, svg]) => ({
		iconName,
		svg,
	})),
});
