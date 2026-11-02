import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';
import type { DigestRow, Night } from '../src/digest/types.js';

function rowOf(night: Night | null, job: string): DigestRow {
  const row = night?.rows.find((r) => r.job === job);
  if (row === undefined) throw new Error(`no row for ${job}`);
  return row;
}

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('gives 5 jobs sorted by job and counts the 1 bad line', () => {
    expect(night?.night).toBe('2026-10-28');
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night?.badLines).toBe(1);
  });

  it('keeps the last error after a retried job ends ok', () => {
    const row = rowOf(night, 'fixtures/refresh');
    expect(row).toMatchObject({ runs: 4, retries: 3, fails: 0, lastStatus: 'ok', lastError: 'upstream 503' });
  });

  it('marks a failed job', () => {
    const row = rowOf(night, 'notes/backup');
    expect(row).toMatchObject({ runs: 1, fails: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    expect(rowOf(night, 'digest/render')).toMatchObject({ owner: null, lastError: null });
  });

  it('keeps the offset of first and last time', () => {
    const row = rowOf(night, 'lane/sync');
    expect(row.firstAt).toBe('2026-10-28T23:00:06+01:00');
    expect(row.lastAt).toBe('2026-10-29T05:00:04+01:00');
    expect(row).toMatchObject({ owner: 'rook', runs: 8, retries: 1, fails: 0, lastStatus: 'ok', lastError: 'lock held' });
  });
});

describe('readNight edge cases', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('returns null when the night has no file', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('reads an empty file as nothing ran', () => {
    writeFileSync(join(dir, '2026-01-02.jsonl'), '');
    expect(readNight(dir, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('skips blank lines and counts each kind of bad line', () => {
    const ok = { at: '2026-01-03T01:00:00+01:00', job: 'a/job', status: 'ok', owner: 'rook' };
    const lines = [
      JSON.stringify(ok),
      '',
      '   ',
      'not json',
      '[1,2]',
      'null',
      JSON.stringify({ ...ok, at: 5 }),
      JSON.stringify({ ...ok, job: undefined }),
      JSON.stringify({ ...ok, status: 'done' }),
      JSON.stringify({ ...ok, owner: undefined }),
      JSON.stringify({ ...ok, owner: 7 }),
      JSON.stringify({ ...ok, error: 503 }),
      JSON.stringify({ ...ok, at: '2026-01-03T02:00:00+01:00', owner: null }),
    ];
    writeFileSync(join(dir, '2026-01-03.jsonl'), lines.join('\r\n') + '\n\n');
    const night = readNight(dir, '2026-01-03');
    expect(night?.badLines).toBe(9);
    expect(night?.rows).toEqual([
      {
        job: 'a/job',
        owner: null,
        runs: 2,
        retries: 0,
        fails: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-01-03T01:00:00+01:00',
        lastAt: '2026-01-03T02:00:00+01:00',
      },
    ]);
  });
});
