import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { ReadNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

// readNight is another worker's stub on this branch: the board gets a fake.
const read: ReadNight = (_dir, night) => ({
  night,
  badLines: 0,
  rows: [
    { job: 'a', owner: null, runs: 12, retries: 4, fails: 1, lastStatus: 'ok', lastError: null, firstAt: '', lastAt: '' },
    { job: 'b', owner: 'x', runs: 3, retries: 0, fails: 0, lastStatus: 'ok', lastError: null, firstAt: '', lastAt: '' },
  ],
});

describe('status board', () => {
  it('shows the lane banner and the nights on disk', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config, read).request('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('2026-10-28');
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('ok 10 · retry 4 · fail 1');
  });

  it('health answers with the lane id', async () => {
    const res = await createApp(config).request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });
});
