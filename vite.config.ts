import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default ({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const isStagingEnv = env.VITE_STAGING_ENV === 'true';

	return defineConfig({
		base: '/wfm',
		build: {
			sourcemap: isStagingEnv,
			minify: !isStagingEnv, // Disable minification for readable debugging
		},
		server: {
			// host: true,  // uncomment me to enable localhost access by IP (including from other devices in the network)
		},
		optimizeDeps: {
			// exclude: ['@webitel/ui-sdk'],
			include: [
				'clipboard-copy',
				// [Claude] webitel-sdk depends on CJS-only `ee-ts`; without prebundling it,
				// [Claude] vite serves both raw and the browser fails on the named import
				'webitel-sdk',
				'deep-equal',
				'deepmerge',
				// [Claude] CJS-only, default-imported by ui-datalist filters and ui-sdk table column select.
				'deep-copy',
			],
		},
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'lodash/fp': 'lodash-es',
				lodash: 'lodash-es',
				/* vue-datepicker v4 relies on date-fns v2
       where "/esm" dir still exists. need to update vue-datepicker to v8 at least */
				'date-fns/esm': 'date-fns',
			},
			dedupe: [
				'vue',
				'zod',
				'pinia',
			],
		},
		plugins: [
			vue(),
			checker({
				typescript: false,
				vueTsc: false,
			}),
			vueDevTools({
				launchEditor: 'webstorm',
			}),
		],
	});
};
