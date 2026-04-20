import { mkdir, rm, copyFile } from 'node:fs/promises';
import { cp } from 'node:fs/promises';

const distDir = new URL('../dist/', import.meta.url);

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await copyFile(new URL('../index.html', import.meta.url), new URL('../dist/index.html', import.meta.url));
await copyFile(new URL('../styles.css', import.meta.url), new URL('../dist/styles.css', import.meta.url));
await cp(new URL('../src', import.meta.url), new URL('../dist/src', import.meta.url), { recursive: true });

console.log('Build succeeded: dist/ generated.');
