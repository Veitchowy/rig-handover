import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

function isWarn(r: DigestRow): boolean {
  return r.retries >= 3 || r.fails > 0;
}

function statusText(r: DigestRow): string {
  const parts: string[] = [r.lastStatus];
  if (r.retries >= 3) parts.push(`${r.retries} retries`);
  if (r.fails > 0 && r.lastStatus !== 'fail') parts.push(`${r.fails} fail${r.fails === 1 ? '' : 's'}`);
  return parts.join(' · ') + (isWarn(r) ? ' ⚠' : '');
}

function orDash(v: string | null): string {
  return v === null || v === '' ? dash : v;
}

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((r) => (
              <tr class={isWarn(r) ? 'warn' : undefined}>
                <td>{orDash(r.job)}</td>
                <td>{orDash(r.owner)}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{statusText(r)}</td>
                <td>{orDash(r.lastError)}</td>
                <td>{orDash(r.firstAt)}</td>
                <td>{orDash(r.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 && (
        <p class="mute">
          {night.badLines} {night.badLines === 1 ? 'line' : 'lines'} did not parse
        </p>
      )}
    </>
  );
}
