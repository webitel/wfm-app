import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'
import checker from 'vite-plugin-checker'
import createSvgSpritePlugin from 'vite-plugin-svg-sprite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    base: '/wfm',
    build: {
      sourcemap: true,
      minify: true, // Disable minification for readable debugging
    },
    server: {
      host: true,
      port: 8080,
    },
    optimizeDeps: {
      // exclude: ['@webitel/ui-sdk'],
      include: ['clipboard-copy', 'deep-equal', 'deepmerge'],
    },
    resolve: {
      alias: {
        'lodash/fp': 'lodash-es',
        lodash: 'lodash-es',
        '@aliasedDeps/api-services/axios': resolve(__dirname, 'src/app/api/instance'),
        /* vue-datepicker v4 relies on date-fns v2
       where "/esm" dir still exists. need to update vue-datepicker to v8 at least */
        'date-fns/esm': 'date-fns',
      },
      dedupe: ['vue', 'zod'],
    },
    plugins: [
      vue(),
      createSvgSpritePlugin({
        include: '**/sprite/*.svg',
      }),
      checker({
        typescript: false,
        vueTsc: false,
      }),
      vueDevTools({
        launchEditor: 'webstorm',
      }),
    ],
  })
}
