import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
let loaded = false;

function parseEnvFile(source) {
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex < 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key) {
      continue;
    }

    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function loadDotEnv({ cwd = projectRoot } = {}) {
  if (loaded) {
    return;
  }

  const envPath = resolve(cwd, '.env');

  try {
    const source = readFileSync(envPath, 'utf8');
    parseEnvFile(source);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  loaded = true;
}
