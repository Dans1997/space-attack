import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { CONFIG } from '../src/config.js';
import { validateConfig } from '../src/validation.js';

test('default config validates and references only shipped assets', () => {
  validateConfig(CONFIG);
  for (const entries of Object.values(CONFIG.assets)) for (const item of Object.values(entries)) assert.ok(statSync(new URL(`../${item.path}`, import.meta.url)).size > 0);
  const bad = structuredClone(CONFIG); bad.player.spriteId = 'missing';
  assert.throws(() => validateConfig(bad), /sprite/);
  bad.player.spriteId = CONFIG.player.spriteId; bad.player.speedPxSec = NaN;
  assert.throws(() => validateConfig(bad), /speed/);
});

test('asset credits cover every file and total remains below 5 MB', () => {
  const root = new URL('../assets/', import.meta.url);
  const files = readdirSync(root, { recursive: true }).filter(name => statSync(new URL(name.replaceAll('\\', '/'), root)).isFile());
  const credits = readFileSync(new URL('../CREDITS.md', import.meta.url), 'utf8');
  for (const file of files) assert.ok(credits.includes(`assets/${file.replaceAll('\\', '/')}`), file);
  const total = files.reduce((sum, file) => sum + statSync(new URL(file.replaceAll('\\', '/'), root)).size, 0);
  assert.ok(total < 5000000); assert.ok(credits.includes(total.toLocaleString('en-US')));
  const manifest = Object.values(CONFIG.assets).flatMap(group => Object.values(group).map(asset => asset.path));
  for (const file of files.filter(file => !file.endsWith('.txt'))) assert.ok(manifest.includes(`assets/${file.replaceAll('\\', '/')}`), `unused asset: ${file}`);
});

test('all themes provide readable text and focus/control contrast', () => {
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  for (const [name, theme] of Object.entries(CONFIG.tuning.themes)) {
    for (const background of [theme.background, theme.surface]) {
      assert.ok(ratio(theme.text, background) >= 4.5, `${name} primary text`);
      assert.ok(ratio(theme.muted, background) >= 4.5, `${name} secondary text`);
      assert.ok(ratio(theme.accent, background) >= 3, `${name} focus`);
      assert.ok(ratio(theme.border, background) >= 3, `${name} controls`);
    }
    assert.ok(ratio(theme.ink, theme.accent) >= 4.5, `${name} primary button`);
  }
});
