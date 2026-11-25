import { WfmAbsenceType } from '@webitel/api-services/gen/models';
import { ScheduleChipColor } from './ScheduleChipColor.enum';

// [Claude] i18n key (scheduleTable.absence.*) of each absence type, the one place that maps
// [Claude] them. The type itself is WfmAbsenceType of @webitel/api-services (agent_absence.proto).
export const ABSENCE_KEYS: Partial<Record<WfmAbsenceType, string>> = {
	[WfmAbsenceType.AbsenceTypeDayoff]: 'dayOff',
	[WfmAbsenceType.AbsenceTypeVacation]: 'vacation',
	[WfmAbsenceType.AbsenceTypeSickday]: 'sickLeave',
};

// [Claude] Icon of each absence type, Figma WFM: day-off cross, sick-leave heart, vocation-leave waves.
export const ABSENCE_ICONS: Partial<Record<WfmAbsenceType, string>> = {
	[WfmAbsenceType.AbsenceTypeDayoff]: 'wfm-day-off',
	[WfmAbsenceType.AbsenceTypeSickday]: 'wfm-sick-leave',
	[WfmAbsenceType.AbsenceTypeVacation]: 'wfm-vacation-leave',
};

// [Claude] Marker colour of an absence chip (Figma: sick day coral, vacation purple, day off red).
export const ABSENCE_CHIP_COLORS: Partial<
	Record<WfmAbsenceType, ScheduleChipColor>
> = {
	[WfmAbsenceType.AbsenceTypeDayoff]: ScheduleChipColor.Red,
	[WfmAbsenceType.AbsenceTypeSickday]: ScheduleChipColor.Coral,
	[WfmAbsenceType.AbsenceTypeVacation]: ScheduleChipColor.Purple,
};
