// Saves one rig page as one self-contained HTML file (plan.md § 3, ADR 0001, ADR 0003).
// Usage: tsx --env-file-if-exists=.env scripts/save-page.ts <path> <out-file>
// e.g.   pnpm save-page /digest/2026-10-28 var/preview/index.html
// The banner shows LANE_MARKER from the environment; unset it to save the clean copy (§ 4).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const [path, out] = process.argv.slice(2);
if (!path || !out) {
  console.error('usage: save-page <path> <out-file>');
  process.exit(2);
}

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`save-page: ${path} answered ${res.status}`);
  process.exit(1);
}
const html = await res.text();
if (/<script|<link\b/i.test(html)) {
  console.error('save-page: page is not self-contained (script or link tag)');
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`save-page: ${path} -> ${out} (${html.length} bytes, marker ${process.env.LANE_MARKER?.trim() ? 'set' : 'not set'})`);
