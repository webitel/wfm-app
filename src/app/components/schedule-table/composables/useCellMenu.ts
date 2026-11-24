import { WfmAbsenceType } from '@webitel/api-services/gen/models';
import { type MaybeRefOrGetter, type Ref, toValue } from 'vue';
import { useI18n } from 'vue-i18n';

import {
	ABSENCE_ICONS,
	ABSENCE_KEYS,
	CalendarView,
	CellActionType,
} from '../../../enums';
import type {
	CalendarPause,
	CalendarRow,
	CalendarShift,
	CellAction,
	CellMenuOption,
	DayKey,
} from '../types';
import { formatTimeInZone } from '../utils/date';

// [Claude] The menu popover the composable drives: schedule-table-menu.vue.
interface CellMenu {
	open: (event: MouseEvent, options: CellMenuOption[], title?: string) => void;
}

interface UseCellMenuParams {
	menu: Readonly<Ref<CellMenu | null>>;
	view: MaybeRefOrGetter<CalendarView>;
	// [Claude] The day shown in the Day view.
	date: MaybeRefOrGetter<DayKey>;
	timeZone: MaybeRefOrGetter<string>;
	readonly: MaybeRefOrGetter<boolean | undefined>;
	// [Claude] The page has shifts (Schedules): the empty cell offers "Shift".
	shifts: MaybeRefOrGetter<boolean | undefined>;
	onAction: (action: CellAction) => void;
}

const ABSENCE_TYPES = [
	WfmAbsenceType.AbsenceTypeDayoff,
	WfmAbsenceType.AbsenceTypeSickday,
	WfmAbsenceType.AbsenceTypeVacation,
];

// [Claude] What the cell menu offers for a day, a shift or a pause, and the action the
// [Claude] picked item asks the page to do. Each item carries its action, nothing to parse back.
export const useCellMenu = ({
	menu,
	view,
	date,
	timeZone,
	readonly,
	shifts,
	onAction,
}: UseCellMenuParams) => {
	const { t } = useI18n();

	let context: Omit<CellAction, 'type'> | null = null;

	const timeRange = (startAt: number, endAt: number) =>
		`${formatTimeInZone(startAt, toValue(timeZone))}–${formatTimeInZone(endAt, toValue(timeZone))}`;

	const deleteOption = (action: CellActionType): CellMenuOption => ({
		action,
		text: t('scheduleTable.delete'),
		icon: 'bucket',
	});

	const editShiftOption = (): CellMenuOption => ({
		action: CellActionType.EditShift,
		text: t('scheduleTable.editShift'),
		icon: 'edit',
	});

	// [Claude] Other absence types: a day with an absence changes it, an empty day adds one.
	const absenceOptions = (current?: WfmAbsenceType): CellMenuOption[] =>
		ABSENCE_TYPES.filter((type) => type !== current).map((type) => ({
			action: current
				? CellActionType.ChangeAbsence
				: CellActionType.AddAbsence,
			absence: type,
			text: t(`scheduleTable.absence.${ABSENCE_KEYS[type]}`),
			icon: ABSENCE_ICONS[type],
		}));

	const cellOptions = (row: CalendarRow, day: DayKey): CellMenuOption[] => {
		const cell = row.cells[day];
		if (cell?.absence) {
			if (toValue(readonly)) return [];
			return [
				...absenceOptions(cell.absence),
				deleteOption(CellActionType.DeleteAbsence),
			];
		}
		if (cell?.shifts.length) {
			// [Claude] In the Day view the timeline opens the shift and pause menus itself.
			if (toValue(view) === CalendarView.Day || toValue(readonly)) return [];
			return [
				editShiftOption(),
				deleteOption(CellActionType.DeleteShift),
			];
		}
		return [
			...(toValue(shifts)
				? [
						{
							action: CellActionType.AddShift,
							text: t('scheduleTable.shift'),
							icon: 'plus',
						},
					]
				: []),
			...absenceOptions(),
		];
	};

	const openCellMenu = (event: MouseEvent, row: CalendarRow, day: DayKey) => {
		const cell = row.cells[day];
		const options = cellOptions(row, day);
		if (!options.length) return;
		context = {
			agent: row.agent,
			date: day,
			absence: cell?.absence,
			absenceId: cell?.absenceId,
			shift: cell?.shifts[0],
		};
		menu.value?.open(event, options);
	};

	// [Claude] Day view: a shift can be edited, not deleted (US_05.09).
	const openShiftMenu = (
		event: MouseEvent,
		row: CalendarRow,
		shift: CalendarShift,
	) => {
		if (toValue(readonly)) return;
		context = {
			agent: row.agent,
			date: toValue(date),
			shift,
		};
		menu.value?.open(
			event,
			[
				editShiftOption(),
			],
			timeRange(shift.startAt, shift.endAt),
		);
	};

	const openPauseMenu = (
		event: MouseEvent,
		row: CalendarRow,
		shift: CalendarShift,
		pause: CalendarPause,
	) => {
		context = {
			agent: row.agent,
			date: toValue(date),
			shift,
			pause,
		};
		menu.value?.open(
			event,
			toValue(readonly)
				? []
				: [
						deleteOption(CellActionType.DeletePause),
					],
			`${pause.cause?.name || t('scheduleTable.pause')} ${timeRange(pause.startAt, pause.endAt)}`,
		);
	};

	const select = (option: CellMenuOption) => {
		if (!context) return;
		onAction({
			...context,
			type: option.action,
			...(option.absence && {
				absence: option.absence,
			}),
		});
	};

	return {
		openCellMenu,
		openShiftMenu,
		openPauseMenu,
		select,
	};
};
