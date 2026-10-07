import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initRouter } from '../index';

// [Claude] hoisted together with vi.mock factories below
const { Stub } = vi.hoisted(() => ({
	Stub: {
		template: '<router-view />',
	},
}));

// [Claude] replace real pages with stubs: the guard logic doesn't depend on them
vi.mock('../../components/the-wfm-workspace.vue', () => ({
	default: Stub,
}));
vi.mock('../../components/utils/access-denied-component.vue', () => ({
	default: Stub,
}));
vi.mock('../../../modules/start-page/router', () => ({
	default: [
		{
			path: '/start-page',
			name: 'the-start-page',
			component: Stub,
		},
	],
}));
vi.mock('../../../modules/agents/router', () => ({
	default: [
		{
			path: 'agents',
			name: 'agents',
			component: Stub,
		},
	],
}));
vi.mock('../../../modules/schedules/router', () => ({
	default: [],
}));

describe('router', () => {
	beforeEach(() => {
		localStorage.setItem('access-token', 'token');
	});

	afterEach(() => {
		localStorage.clear();
	});

	it('lets navigation through when access token is stored', async () => {
		const router = await initRouter();

		await router.push('/agents');

		expect(router.currentRoute.value.name).toBe('agents');
	});

	it('removes accessToken from query and keeps the rest of it', async () => {
		const router = await initRouter();

		await router.push('/agents?accessToken=token&tab=list');

		expect(router.currentRoute.value.name).toBe('agents');
		expect(router.currentRoute.value.query).toEqual({
			tab: 'list',
		});
	});

	it('applies guards passed via beforeEach option', async () => {
		const router = await initRouter({
			beforeEach: [
				(to) =>
					to.name === 'agents'
						? {
								path: '/access-denied',
							}
						: true,
			],
		});

		await router.push('/agents');

		expect(router.currentRoute.value.name).toBe('access-denied');
	});
});
