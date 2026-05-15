import { createAssetServer } from 'remix/assets'

export const assets = createAssetServer({
  basePath: '/assets',
  rootDir: new URL('../../..', import.meta.url).pathname,
  fileMap: {
    'app/*path': 'apps/frontend/app/*path',
    'node_modules/*path': 'node_modules/*path',
  },
  allow: ['apps/frontend/app/assets/**', 'apps/frontend/app/ui/prompt-button.tsx', 'node_modules/**'],
  deny: ['apps/frontend/app/**/*.server.*'],
  sourceMaps: process.env.NODE_ENV === 'development' ? 'external' : undefined,
  scripts: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    },
  },
})
