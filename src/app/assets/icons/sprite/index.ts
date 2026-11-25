import { fillIconsRepository } from '@webitel/ui-sdk';
// [Claude] Figma "WFM / Approved", "WFM / Not approved": counters under the agents column.
import wfmApproved from './wfm-approved.svg?raw';
// [Claude] Calendar cell icons, as in Figma WFM: "Day" cell set and the icons page.
import wfmDayOff from './wfm-day-off.svg?raw';
import wfmLookups from './wfm-lookups.svg?raw';
import wfmNotApproved from './wfm-not-approved.svg?raw';
import wfmSickLeave from './wfm-sick-leave.svg?raw';
// [Claude] Figma "WFM / Vocation-leave, filled": add absences to one or several agents.
import wfmVacation from './wfm-vacation.svg?raw';
import wfmVacationLeave from './wfm-vacation-leave.svg?raw';

const icons = {
	'wfm-lookups': wfmLookups,
	'wfm-vacation': wfmVacation,
	'wfm-approved': wfmApproved,
	'wfm-not-approved': wfmNotApproved,
	'wfm-day-off': wfmDayOff,
	'wfm-sick-leave': wfmSickLeave,
	'wfm-vacation-leave': wfmVacationLeave,
};

fillIconsRepository({
	icons: Object.entries(icons).map(([iconName, svg]) => ({
		iconName,
		svg,
	})),
});
