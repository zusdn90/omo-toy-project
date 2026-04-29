import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const generatedTypeFiles = ['next-env.d.ts', 'tsconfig.json'];
const preservedFiles = new Map(generatedTypeFiles.map((file) => [file, existsSync(file) ? readFileSync(file, 'utf8') : null]));
const testEnv = { ...process.env, NEXT_DIST_DIR: '.next-test' };

function restoreGeneratedTypeFiles() {
  for (const [file, content] of preservedFiles) {
    if (content === null) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
      continue;
    }

    writeFileSync(file, content);
  }
}

function runLocalBin(command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  execFileSync(`node_modules/.bin/${command}`, args, { stdio: 'inherit', env });
}

try {
  runLocalBin('next', ['build'], testEnv);
  restoreGeneratedTypeFiles();

  const testFiles = readdirSync('tests')
    .filter((file) => file.endsWith('.test.ts') || file.endsWith('.test.tsx'))
    .sort()
    .map((file) => `tests/${file}`);

  runLocalBin('tsx', ['--test', ...testFiles], testEnv);
} finally {
  restoreGeneratedTypeFiles();
}
