import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import type { ReadNight } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

// Line counts for one night; null counts = file vanished, render as "—".
export type NightStatus = { night: string; ok: number; retry: number; fail: number; badLines: number } | { night: string; ok: null };

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightStatus[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function nightStatus(runsDir: string, night: string, read: ReadNight): NightStatus {
  const n = read(runsDir, night);
  if (!n) return { night, ok: null };
  const { rows } = n;
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  return {
    night,
    ok: sum((r) => r.runs - r.retries - r.fails),
    retry: sum((r) => r.retries),
    fail: sum((r) => r.fails),
    badLines: n.badLines,
  };
}

export function readStatus(config: RigConfig, read: ReadNight = readNight): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((n) => nightStatus(config.runsDir, n, read)),
  };
}
