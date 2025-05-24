import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/exports/index.ts',
    testing: 'src/exports/testing.ts',
  },
  format: ['esm', 'cjs'],
  sourcemap: true,
  dts: true,
  clean: true,
  minify: true,
  shims: true,
  cjsInterop: true,
  keepNames: true,
});
