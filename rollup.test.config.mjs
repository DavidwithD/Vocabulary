import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/content/lemmatizer.ts',
  output: {
    file: 'dist/lemmatizer.test.js',
    format: 'esm',
    sourcemap: true,
  },
  external: ['compromise'], // Don't bundle compromise
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
    }),
  ],
};
