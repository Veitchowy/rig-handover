import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const tmp = mkdtempSync(join(tmpdir(), 'rig-runs-'));
const app = () =>
  createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: tmp });

beforeAll(() => {
  writeFileSync(join(tmp, '2026-10-28.jsonl'), readFileSync('runs/2026-10-28.jsonl'));
  writeFileSync(join(tmp, '2026-10-30.jsonl'), '');
  writeFileSync(
    join(tmp, '2026-10-31.jsonl'),
    '{"at":"2026-10-31T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}\nnot json at all\n',
  );
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('renders a night on disk with the layout, heading and one table', async () => {
    const res = await app().request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane-07');
    expect(html).toContain('<h1>digest · 2026-10-28</h1>');
    expect(html.match(/<table/g)).toHaveLength(1);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app().request('/digest/2026-10-29');
    expect(res.status).toBe(404);
  });

  it('answers 404 for a night that is not a date', async () => {
    const res = await app().request('/digest/not-a-date');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty file, without a table', async () => {
    const res = await app().request('/digest/2026-10-30');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table');
  });

  it('still renders a night with a bad line and counts it', async () => {
    const res = await app().request('/digest/2026-10-31');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toContain('1 line did not parse');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns night, rows sorted by job, and badLines', async () => {
    const res = await app().request('/api/digest/2026-10-28');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-10-28');
    expect(body.badLines).toBe(0);
    const jobs = body.rows.map((r) => r.job);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs).toEqual([...jobs].sort());
  });

  it('answers 404 with a JSON error for a night with no file', async () => {
    const res = await app().request('/api/digest/2026-10-29');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log', night: '2026-10-29' });
  });

  it('counts a bad line and keeps the good one', async () => {
    const res = await app().request('/api/digest/2026-10-31');
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['lane/sync']);
  });

  it('gives no rows for an empty file', async () => {
    const res = await app().request('/api/digest/2026-10-30');
    expect(await res.json()).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });
});

describe('page and JSON agree', () => {
  it('lists the same jobs in the same order', async () => {
    const html = await (await app().request('/digest/2026-10-28')).text();
    const body = (await (await app().request('/api/digest/2026-10-28')).json()) as Night;
    const positions = body.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
