import { flushPromises, mount } from '@vue/test-utils';
import { WfmAbsenceType } from '@webitel/api-services/gen/models';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import { searchAgentsWorkingSchedule } from '../../../api/wfm/wfmCalendarApi';
import { CalendarView, CellActionType } from '../../../enums';
import en from '../../../locale/en/en';
import { resetMockDb } from '../../../mocks/schedule-table/mockServer';
import TheScheduleTable from '../the-schedule-table.vue';
import { type DayKey } from '../types';
import {
	daysBetween,
	rangeForView,
	startOfMonth,
	todayKey,
} from '../utils/date';

// [Claude] Smoke test of the QCalendar wiring: real QCalendarScheduler / QCalendarResource,
// [Claude] ui-sdk components stubbed. Checks that slots get our rows and cells in every view.

// [Claude] jsdom has no ResizeObserver and no layout. QCalendar renders its grid only once
// [Claude] it has a width, so the fake observer reports a 1200 px wide box.
globalThis.ResizeObserver = class {
	constructor(private callback: ResizeObserverCallback) {}
	observe() {
		this.callback(
			[
				{
					contentRect: {
						width: 1200,
						height: 800,
					},
				} as ResizeObserverEntry,
			],
			this as unknown as ResizeObserver,
		);
	}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

// [Claude] QCalendar debounces the size callback by 100 ms.
const waitForLayout = () => new Promise((resolve) => setTimeout(resolve, 150));

const i18n = createI18n({
	legacy: false,
	locale: 'en',
	messages: {
		en,
	},
	missingWarn: false,
	fallbackWarn: false,
});

const stubs = {
	WtCheckbox: true,
	WtIcon: true,
	WtIconBtn: true,
	WtButton: {
		template: '<button><slot /></button>',
	},
	WtLoader: true,
	WtPopover: {
		template: '<div />',
		methods: {
			show() {},
			hide() {},
		},
	},
};

const loadRows = async (view: CalendarView, date: DayKey) => {
	const response = await searchAgentsWorkingSchedule('1', {
		date: rangeForView(view, date),
	});
	return response;
};

const mountCalendar = async (view: CalendarView, date: DayKey) => {
	const response = await loadRows(view, date);
	const wrapper = mount(TheScheduleTable, {
		props: {
			view,
			date,
			rows: response.items,
			holidays: response.holidays,
			timeZone: response.calendar.timeZone,
			timeline: {
				from: 7 * 60,
				to: 22 * 60,
			},
			shifts: true,
			isDayView: true,
			forecast: {
				hours: [],
				plannedDays: [],
				plannedSlots: [],
			},
		},
		global: {
			plugins: [
				i18n,
			],
			stubs,
		},
	});
	await waitForLayout();
	await flushPromises();
	return {
		wrapper,
		rows: response.items,
	};
};

describe('schedule-table', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		resetMockDb(12);
	});

	it('renders a cell per agent and day in the week view, plus the forecast row', async () => {
		const date = startOfMonth(todayKey());
		const { wrapper, rows } = await mountCalendar(CalendarView.Week, date);
		expect(wrapper.findAll('.schedule-table-day-cell')).toHaveLength(
			rows.length * 7,
		);
		expect(wrapper.findAll('.schedule-table-forecast-day')).toHaveLength(7);
		expect(wrapper.find('.schedule-table-forecast-title').exists()).toBe(true);
	});

	it('renders every day of the month in the month view', async () => {
		const date = startOfMonth(todayKey());
		const { wrapper, rows } = await mountCalendar(CalendarView.Month, date);
		const days = daysBetween(
			rangeForView(CalendarView.Month, date).from,
			rangeForView(CalendarView.Month, date).to,
		).length;
		expect(wrapper.findAll('.schedule-table-day-cell')).toHaveLength(
			rows.length * days,
		);
	});

	it('shows a chip per pause and absence of the week in the cells', async () => {
		const date = startOfMonth(todayKey());
		const { wrapper, rows } = await mountCalendar(CalendarView.Week, date);
		const cells = rows.flatMap((row) => Object.values(row.cells));
		const chips =
			cells.filter((cell) => cell.absence).length +
			cells
				.filter((cell) => !cell.absence)
				.flatMap((cell) => cell.shifts.flatMap((shift) => shift.pauses)).length;
		expect(
			wrapper.findAll('.schedule-table-day-cell .schedule-table-chip'),
		).toHaveLength(chips);
	});

	it('draws shift bands on the day timeline', async () => {
		const { wrapper: week, rows } = await mountCalendar(
			CalendarView.Month,
			startOfMonth(todayKey()),
		);
		week.unmount();
		const day = Object.values(rows[0].cells).find((c) => c.shifts.length)?.date;
		expect(day).toBeTruthy();
		const { wrapper } = await mountCalendar(CalendarView.Day, day);
		expect(
			wrapper.findAll('.schedule-table-day-timeline__shift').length,
		).toBeGreaterThan(0);
		expect(wrapper.find('.schedule-table-forecast-hours').exists()).toBe(true);
	});

	it('emits an add-absence action from the cell menu', async () => {
		const date = startOfMonth(todayKey());
		const { wrapper } = await mountCalendar(CalendarView.Week, date);
		const menu = wrapper.findComponent({
			name: 'schedule-table-menu',
		});
		const addDayOff = {
			action: CellActionType.AddAbsence,
			absence: WfmAbsenceType.AbsenceTypeDayoff,
			text: 'Day-off',
		};
		menu.vm.$emit('select', addDayOff);
		// [Claude] Without an opened cell there is no context, so nothing is emitted.
		expect(wrapper.emitted('action')).toBeUndefined();

		await wrapper.find('.schedule-table-day-cell--empty').trigger('click');
		menu.vm.$emit('select', addDayOff);
		const [[action]] = wrapper.emitted('action') as [
			[
				{
					type: string;
				},
			],
		];
		expect(action.type).toBe(CellActionType.AddAbsence);
	});
});
