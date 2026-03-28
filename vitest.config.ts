import { fileURLToPath } from 'node:url';
import type { ConfigEnv, UserConfig } from 'vite';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig(async (env: ConfigEnv) => {
	const base: UserConfig =
		typeof viteConfig === 'function'
			? await viteConfig(env)
			: await Promise.resolve(viteConfig);

	return mergeConfig(base, {
		test: {
			environment: 'jsdom',
			exclude: [
				...configDefaults.exclude,
				'e2e/**',
			],
			root: fileURLToPath(new URL('./', import.meta.url)),
		},
	});
});
