import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
const line = (job: string, status = 'ok') =>
  JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job, status, owner: null });
const night = (id: string, lines: string[]) => writeFileSync(join(dir, `${id}.jsonl`), lines.join('\n') + '\n');

night('2026-01-01', [line('zeta'), line('alpha', 'retry'), line('alpha')]);
night('2026-01-02', []);
night('2026-01-03', [line('alpha'), 'not json']);

const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
const json = async (id: string) => (await app.request(`/api/digest/${id}`)).json() as Promise<Night>;

describe('digest routes', () => {
  it('200 for a normal night', async () => {
    expect((await app.request('/digest/2026-01-01')).status).toBe(200);
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(200);
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-02-02')).status).toBe(404);
    expect((await app.request('/api/digest/2026-02-02')).status).toBe(404);
  });

  it('empty night: page says nothing ran, JSON has no rows', async () => {
    const page = await app.request('/digest/2026-01-02');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    expect((await json('2026-01-02')).rows).toEqual([]);
  });

  it('bad line: still 200, badLines 1', async () => {
    expect((await app.request('/digest/2026-01-03')).status).toBe(200);
    const res = await app.request('/api/digest/2026-01-03');
    expect(res.status).toBe(200);
    expect(((await res.json()) as Night).badLines).toBe(1);
  });

  it('page and JSON list the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-01-01')).text();
    const pageJobs = [...html.matchAll(/<tbody>.*?<\/tbody>/gs)][0][0]
      .split('<tr').slice(1)
      .map((tr) => /<td>(.*?)<\/td>/.exec(tr)![1]);
    const apiJobs = (await json('2026-01-01')).rows.map((r) => r.job);
    expect(apiJobs).toEqual(['alpha', 'zeta']);
    expect(pageJobs).toEqual(apiJobs);
  });
});
