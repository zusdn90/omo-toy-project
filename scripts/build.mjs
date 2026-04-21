import { mkdir, rm, copyFile, writeFile } from 'node:fs/promises';
import { cp } from 'node:fs/promises';

import { loadDotEnv } from '../src/env.js';

const distDir = new URL('../dist/', import.meta.url);

loadDotEnv();

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await copyFile(new URL('../index.html', import.meta.url), new URL('../dist/index.html', import.meta.url));
await copyFile(new URL('../styles.css', import.meta.url), new URL('../dist/styles.css', import.meta.url));
await cp(new URL('../src', import.meta.url), new URL('../dist/src', import.meta.url), { recursive: true });
await writeFile(
  new URL('../dist/runtime-config.js', import.meta.url),
  `window.__OMO_APP_CONFIG__ = Object.freeze(${JSON.stringify({ kakaoJsKey: process.env.KAKAO_JS_KEY ?? '' })});\n`
);

console.log('Build succeeded: dist/ generated.');
