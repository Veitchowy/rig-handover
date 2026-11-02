import type { Night, ReadNight } from './types.js';

// Stub so § 2 can import and typecheck now; issue #2 replaces the body.
export const readNight: ReadNight = (_runsDir: string, _night: string): Night | null => {
  throw new Error('readNight: not implemented (issue #2)');
};
