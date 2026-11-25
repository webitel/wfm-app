// [Claude] HTML strings for DayPilot boxes (events, row heads, areas, menu items): DayPilot draws
// [Claude] them as they are, so all text from data goes through escapeHtml.
import { AbsenceType } from '../../../api/wfm/types';
import wfmApproved from '../../../assets/icons/sprite/wfm-approved.svg?raw';
import wfmDayOff from '../../../assets/icons/sprite/wfm-day-off.svg?raw';
import wfmSickLeave from '../../../assets/icons/sprite/wfm-sick-leave.svg?raw';
import wfmVacation from '../../../assets/icons/sprite/wfm-vacation.svg?raw';

const ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

export const escapeHtml = (text: string) =>
	text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

// [Claude] The app's own icons; ui-sdk does not export its icon repository, so its icons
// [Claude] (lock, trash, close) are drawn with CSS instead.
const ABSENCE_SVG: Record<AbsenceType, string> = {
	[AbsenceType.DayOff]: wfmDayOff,
	[AbsenceType.SickDay]: wfmSickLeave,
	[AbsenceType.Vacation]: wfmVacation,
};

const icon = (svg: string) => `<span class="wfm-icon">${svg}</span>`;

export const absenceIcon = (absence: AbsenceType) => icon(ABSENCE_SVG[absence]);

export const approvedIcon = () => icon(wfmApproved);

// [Claude] Initials for the avatar circle of an agent row.
export const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0].toUpperCase())
		.join('');
