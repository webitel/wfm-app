// [Claude] Agents of the table come in pages (page / size / next of protos#532): the first page
// [Claude] is drawn at once, the next ones are added as the user scrolls down.
import type { CalendarRow } from '../types';

export const AGENTS_PAGE_SIZE = 50;

// [Claude] A reload of the same query keeps the pages already shown (one request of all of
// [Claude] them), so a save does not throw the user back to the top; a new query starts over.
export const reloadSize = (pagesLoaded: number) =>
	Math.max(pagesLoaded, 1) * AGENTS_PAGE_SIZE;

// [Claude] Rows of the next page, without agents already shown (the list may shift between pages).
export const appendRows = (rows: CalendarRow[], next: CalendarRow[]) => {
	const ids = new Set(rows.map((r) => r.agent.id));
	return [
		...rows,
		...next.filter((r) => !ids.has(r.agent.id)),
	];
};
