import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default [
  // Content script bundle
  {
    input: 'src/content/main.ts',
    output: {
      file: 'dist/content.bundle.js',
      format: 'iife',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
    ],
  },
  // Popup script bundle
  {
    input: 'src/popup/popup.ts',
    output: {
      file: 'dist/popup.bundle.js',
      format: 'iife',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
    ],
  },
];

// Note: The data/*.js files (cefr-words.js, etc.) are loaded separately via manifest.json
// before the content script bundle. The TypeScript code imports placeholder types
// but the actual data comes from the existing JS files at runtime.
