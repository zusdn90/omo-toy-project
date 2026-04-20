import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src', 'tests', 'scripts'];
const files = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath);
      continue;
    }

    if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs')) {
      files.push(fullPath);
    }
  }
}

for (const root of roots) {
  await collectFiles(root);
}

for (const file of files.sort()) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

console.log(`Typecheck passed: ${files.length} files parsed by Node.`);
