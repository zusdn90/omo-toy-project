import { execFileSync } from 'node:child_process';

import { loadDotEnv } from '../src/env';

loadDotEnv();
execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { stdio: 'inherit' });
