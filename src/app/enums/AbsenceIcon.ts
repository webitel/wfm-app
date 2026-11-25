import { AbsenceType } from '../api/wfm/types';

// [Claude] Sprite icon and locale key of each absence type (src/app/assets/icons/sprite).
export const ABSENCE_ICON: Record<AbsenceType, string> = {
	[AbsenceType.DayOff]: 'wfm-day-off',
	[AbsenceType.SickDay]: 'wfm-sick-leave',
	[AbsenceType.Vacation]: 'wfm-vacation',
};

export const ABSENCE_LOCALE: Record<AbsenceType, string> = {
	[AbsenceType.DayOff]: 'wfmCalendar.absence.dayOff',
	[AbsenceType.SickDay]: 'wfmCalendar.absence.sickLeave',
	[AbsenceType.Vacation]: 'wfmCalendar.absence.vacation',
};

// [Claude] Order of the absence types in menus and selects (spec: Day-off, Sick leave, Vacation).
export const ABSENCE_TYPES: AbsenceType[] = [
	AbsenceType.DayOff,
	AbsenceType.SickDay,
	AbsenceType.Vacation,
];
