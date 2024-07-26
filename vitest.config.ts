import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './test/wrangler.toml' },
        main: './test/worker.ts',
      },
    },
  },
})
