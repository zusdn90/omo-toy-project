import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shellSource = await readFile(new URL('../src/components/neighborhood-explorer-shell.tsx', import.meta.url), 'utf8');
const layoutSource = await readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');

test('mobile app shell prioritizes map, recommendations, and dialog details', () => {
  assert.match(shellSource, /function MobileAppHeader/);
  assert.match(shellSource, /function MobileBottomNavigation/);
  assert.match(shellSource, /function DetailDialog/);
  assert.match(shellSource, /href: '#map'/);
  assert.match(shellSource, /href: '#recommendations'/);
  assert.match(shellSource, /onOpenDetail/);
  assert.match(shellSource, /role="dialog"/);
  assert.match(shellSource, /id="map"/);
  assert.match(shellSource, /id="recommendations"/);
  assert.doesNotMatch(shellSource, /id="ranking"/);
  assert.doesNotMatch(shellSource, /id="report"/);
});

test('layout exposes installable mobile app metadata', async () => {
  const manifest = await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8');
  const icon = await readFile(new URL('../public/icons/app-icon.svg', import.meta.url), 'utf8');

  assert.match(layoutSource, /manifest: '\/manifest\.webmanifest'/);
  assert.match(layoutSource, /appleWebApp/);
  assert.match(layoutSource, /themeColor/);

  const parsedManifest = JSON.parse(manifest) as { display?: string; start_url?: string; icons?: unknown[] };
  assert.equal(parsedManifest.display, 'standalone');
  assert.equal(parsedManifest.start_url, '/');
  assert(Array.isArray(parsedManifest.icons));
  assert.match(icon, /<svg/);
});
