// The contract for the morning digest (plan.md § 1). Every part of § 2 codes against this file.
// The implementation lives in `src/digest/read.ts`, which exports `readNight: ReadNight`.
// Routes pass `config.runsDir` (RigConfig) as `runsDir`, so tests can point it at a temp dir.

// One line of runs/<night>.jsonl has `at`, `job`, `status`, `owner` and an optional `error`.
// "Line order" below means the order of lines in the file; blank lines are skipped, not counted.

/** Status of one run line, exactly as written in the log. */
export type RunStatus = 'ok' | 'retry' | 'fail';

/** One row per job for one night. */
export type DigestRow = {
  /** Job name from the log, e.g. "lane/sync". */
  job: string;
  /** Owner from the job's last line; null when the log says null (render as "—"). */
  owner: string | null;
  /** Number of parsed lines for this job. */
  runs: number;
  /** Number of parsed lines for this job with status "retry". */
  retries: number;
  /** Number of parsed lines for this job with status "fail". ok lines = runs - retries - fails. */
  fails: number;
  /** Status of the job's last line. */
  lastStatus: RunStatus;
  /** `error` of the job's latest line that had one; null when no line had one (render as "—"). */
  lastError: string | null;
  /** `at` of the job's first line: the raw ISO string from the log, offset kept, never converted to UTC. */
  firstAt: string;
  /** `at` of the job's last line: the raw ISO string from the log, offset kept, never converted to UTC. */
  lastAt: string;
};

/** One night as a whole. */
export type Night = {
  /** The night asked for, "YYYY-MM-DD" (the file name without .jsonl). */
  night: string;
  /** One row per job, sorted by job ascending; [] for an empty file ("nothing ran"). */
  rows: DigestRow[];
  /** Number of non-blank lines that did not parse into a valid run line; counted, never thrown. */
  badLines: number;
};

/**
 * Reads `<runsDir>/<night>.jsonl`.
 * Returns null when that file does not exist (routes answer 404).
 * An empty file gives `{ night, rows: [], badLines: 0 }` (the page renders "nothing ran").
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
