import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * `cubejs` uses top-level `this.Cube` inside its UMD wrappers
 * (`lib/solve.js`, `lib/async.js`, `lib/cube.js`). When Vite pre-bundles the
 * dependency for dev, modules are wrapped as ESM where top-level `this` is
 * `undefined`, so the page crashes before React mounts. Production bundling
 * rewrites those references, but dev does not — normalise them to
 * `globalThis`, which is correct in every environment.
 *
 * The plugin is registered both as a regular plugin and inside
 * `optimizeDeps.rolldownOptions` because Vite does not run regular plugins on
 * pre-bundled dependencies.
 */
const cubejsGlobalThisFix = {
  name: 'cubejs-globalthis-fix',
  transform(code: string, id: string) {
    if (!id.includes('cubejs') || !id.endsWith('.js')) return null
    if (!code.includes('this.Cube')) return null
    return code.replace(/\bthis\.Cube\b/g, 'globalThis.Cube')
  },
}

export default defineConfig({
  plugins: [cubejsGlobalThisFix as unknown as Plugin, react(), tailwindcss()],
  optimizeDeps: {
    rolldownOptions: {
      plugins: [cubejsGlobalThisFix],
    },
  },
})
