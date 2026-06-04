import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'hobapcook',
  brand: {
    displayName: '혼밥쿡',
    primaryColor: '#FF6B35',
    icon: 'https://honbap-recipe.vercel.app/icons.svg',
  },
  web: {
    host: 'localhost',
    port: 5175,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
});
