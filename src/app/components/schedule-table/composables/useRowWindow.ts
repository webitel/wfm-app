// [Claude] Row virtualization for QCalendar, which draws every resource it gets: only the
// [Claude] agent rows near the viewport go to the calendar, the rows above and below are
// [Claude] replaced by two spacer resources of their height, so the scroll stays the same.
// [Claude] Heights of drawn rows are measured; rows never drawn count as the default one.
//
// [Claude] QCalendar keys a row by `id-index`: with agent ids every move of the window would
// [Claude] remount all drawn rows. So a drawn row gets the id of its place in the window
// [Claude] (`row-0`, `row-1`, …) and Vue only patches it with the next agent; slots take the
// [Claude] agent id from `row.agent.id`. The window also moves in whole chunks of rows.
import {
	type ComputedRef,
	computed,
	nextTick,
	onBeforeUnmount,
	type Ref,
	ref,
	shallowReactive,
	watch,
} from 'vue';
import type { ScheduleTableResource } from '../types';

// [Claude] Rows the window moves by; rows drawn past each edge of the viewport.
const CHUNK_ROWS = 10;
const OVERSCAN_ROWS = 10;

// [Claude] The row elements of QCalendarScheduler (Week / Month) and QCalendarResource (Day).
const ROW_SELECTOR =
	'.q-calendar-scheduler__resource--row, .q-calendar-resource__resource';
const ROW_ID_ATTRIBUTE = 'data-row-id';

export const useRowWindow = ({
	resources,
	scroller,
	rowHeight,
	resetKey,
}: {
	resources: ComputedRef<ScheduleTableResource[]>;
	scroller: Ref<HTMLElement | null>;
	// [Claude] px of an agent row not measured yet.
	rowHeight: number;
	// [Claude] A change (view, period) changes row heights: measure them again.
	resetKey: () => unknown;
}) => {
	const scrollTop = ref(0);
	const viewportHeight = ref(0);
	// [Claude] The height of most rows (the first one measured) and the rows that differ.
	// [Claude] Rows of the usual height are not stored, so drawing new ones of that height
	// [Claude] changes no offset and does not rebuild the window a second time.
	const typicalHeight = ref(rowHeight);
	const heights = shallowReactive(new Map<string, number>());
	let isTypicalMeasured = false;

	const pinned = computed(() =>
		resources.value.filter((r) => 'isForecast' in r && r.isForecast),
	);
	const agents = computed(() => resources.value.filter((r) => 'row' in r));

	// [Claude] Top of every agent row from the first one, and the bottom of the last.
	const offsets = computed(() => {
		const tops = [
			0,
		];
		agents.value.forEach((r, i) => {
			tops.push(tops[i] + (heights.get(r.id) ?? typicalHeight.value));
		});
		return tops;
	});

	// [Claude] px of the head and the Forecast row above the first agent row.
	const agentsTop = ref(0);

	const firstRowAt = (px: number) => {
		const tops = offsets.value;
		let low = 0;
		let high = tops.length - 1;
		while (low < high) {
			const middle = (low + high + 1) >> 1;
			if (tops[middle] <= px) low = middle;
			else high = middle - 1;
		}
		return low;
	};

	// [Claude] Two numbers, not an object: a scroll inside the same chunk changes neither,
	// [Claude] so the window and QCalendar are not rebuilt on every scroll frame.
	const viewportTop = computed(() =>
		Math.max(scrollTop.value - agentsTop.value, 0),
	);
	const start = computed(() =>
		Math.max(
			Math.floor((firstRowAt(viewportTop.value) - OVERSCAN_ROWS) / CHUNK_ROWS) *
				CHUNK_ROWS,
			0,
		),
	);
	// [Claude] The end moves with the start (a fixed number of rows), not on its own: every
	// [Claude] new window rebuilds the whole QCalendar tree, so it must change once per chunk.
	const windowRows = computed(
		() =>
			Math.ceil(
				(Math.ceil(viewportHeight.value / typicalHeight.value) +
					2 * OVERSCAN_ROWS) /
					CHUNK_ROWS,
			) * CHUNK_ROWS,
	);
	const end = computed(() =>
		Math.min(start.value + windowRows.value, agents.value.length),
	);

	const windowed = computed<ScheduleTableResource[]>(() => {
		const tops = offsets.value;
		const above = tops[start.value];
		const below = tops[tops.length - 1] - tops[end.value];
		return [
			...pinned.value,
			...(above > 0
				? [
						{
							id: 'spacer-top',
							isSpacer: true as const,
							height: above,
						},
					]
				: []),
			...agents.value.slice(start.value, end.value).map((r, place) => ({
				...r,
				id: `row-${place}`,
			})),
			...(below > 0
				? [
						{
							id: 'spacer-bottom',
							isSpacer: true as const,
							height: below,
						},
					]
				: []),
		];
	});

	// [Claude] Reads the heights of the drawn rows and where the agent rows start.
	const measure = () => {
		const root = scroller.value;
		if (!root) return;
		const rootTop = root.getBoundingClientRect().top - root.scrollTop;
		let firstTop: number | undefined;
		root
			.querySelectorAll<HTMLElement>(`[${ROW_ID_ATTRIBUTE}]`)
			.forEach((label) => {
				const row = label.closest<HTMLElement>(ROW_SELECTOR);
				const id = label.getAttribute(ROW_ID_ATTRIBUTE);
				if (!row || !id) return;
				const height = row.offsetHeight;
				if (!height) return;
				if (!isTypicalMeasured) {
					isTypicalMeasured = true;
					typicalHeight.value = height;
				}
				const known = heights.get(id) ?? typicalHeight.value;
				if (height !== known) {
					if (height === typicalHeight.value) heights.delete(id);
					else heights.set(id, height);
				}
				if (id === agents.value[start.value]?.id) {
					firstTop = row.getBoundingClientRect().top - rootTop;
				}
			});
		if (firstTop !== undefined) {
			agentsTop.value = firstTop - offsets.value[start.value];
		}
	};

	let frame = 0;
	const onScroll = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			scrollTop.value = scroller.value?.scrollTop ?? 0;
		});
	};

	const resizeObserver = new ResizeObserver(() => {
		viewportHeight.value = scroller.value?.clientHeight ?? 0;
	});

	watch(
		scroller,
		(el, old) => {
			if (old) resizeObserver.unobserve(old);
			if (el) {
				resizeObserver.observe(el);
				viewportHeight.value = el.clientHeight;
			}
		},
		{
			immediate: true,
		},
	);

	// [Claude] A new view or period opens from the top: the old scroll means nothing there.
	watch(resetKey, () => {
		heights.clear();
		isTypicalMeasured = false;
		typicalHeight.value = rowHeight;
		scrollTop.value = 0;
		if (scroller.value) scroller.value.scrollTop = 0;
	});

	// [Claude] After every new window or data, measure what got drawn.
	watch(
		windowed,
		async () => {
			await nextTick();
			measure();
		},
		{
			flush: 'post',
		},
	);

	onBeforeUnmount(() => {
		resizeObserver.disconnect();
		cancelAnimationFrame(frame);
	});

	return {
		windowed,
		onScroll,
	};
};
