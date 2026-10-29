import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { DigestPage } from './views/digest.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  // the regex is the path-traversal guard: only a bare date reaches the filesystem
  const load = (id: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(id) ? readNight(config.runsDir, id) : null;

  app.get('/api/digest/:night', (c) => {
    const id = c.req.param('night');
    const night = load(id);
    return night ? c.json(night) : c.json({ error: 'no run log', night: id }, 404);
  });

  app.get('/digest/:night', (c) => {
    const id = c.req.param('night');
    const night = load(id);
    if (!night) {
      return c.html(
        <Layout title={`digest ${id}`} lane={lane()}>
          <p class="mute">no run log for {id}</p>
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest ${id}`} lane={lane()}>
        <DigestPage night={night} />
      </Layout>,
    );
  });

  return app;
}
