// Small front for Supergateway on Railway: caps concurrent MCP requests by the
// container's memory limit (stateless mode starts the MCP servers once per request),
// queues the rest, and exits non-zero when the gateway dies so Railway restarts it.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.PORT || 8000);
const UPSTREAM = 8001;
const PER_REQUEST_MB = Number(process.env.SUPERGATEWAY_MB_PER_REQUEST || 80);

function limitMB() {
  try {
    const v = readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
    if (v !== 'max') return Number(v) / 1048576;
  } catch {}
  return 1024;
}
const MAX = Number(process.env.SUPERGATEWAY_MAX_CONCURRENT) ||
  Math.max(1, Math.min(32, Math.floor((limitMB() - 150) / PER_REQUEST_MB)));
const QUEUE = 256;
console.log(`[limiter] ${Math.round(limitMB())} MB limit: at most ${MAX} MCP requests at once, the rest wait`);

const child = spawn('supergateway', [...process.argv.slice(2), '--port', String(UPSTREAM), '--host', '127.0.0.1'],
  { stdio: ['ignore', 'inherit', 'inherit'] });
child.on('exit', (code, sig) => {
  console.error(`[limiter] supergateway exited (${code ?? sig}), stopping`);
  process.exit(code || 1);
});
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { child.kill(s); setTimeout(() => process.exit(0), 3000).unref(); });

let active = 0;
const waiting = [];
function release() { active--; const next = waiting.shift(); if (next) next(); }

function forward(req, res, done) {
  const headers = { ...req.headers, host: `127.0.0.1:${UPSTREAM}` };
  const up = http.request({ host: '127.0.0.1', port: UPSTREAM, method: req.method, path: req.url, headers }, (ur) => {
    res.writeHead(ur.statusCode, ur.headers);
    ur.pipe(res);
  });
  let finished = false;
  const end = () => { if (!finished) { finished = true; done(); } };
  res.on('close', () => { up.destroy(); end(); });
  up.on('error', () => { if (!res.headersSent) { res.writeHead(502); } res.end(); end(); });
  req.pipe(up);
}

http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url.startsWith('/healthz?')) return forward(req, res, () => {});
  const go = () => { active++; forward(req, res, release); };
  if (active < MAX) return go();
  if (waiting.length >= QUEUE) { res.writeHead(503, { 'Retry-After': '5' }); return res.end('busy'); }
  waiting.push(go);
  req.on('close', () => { const i = waiting.indexOf(go); if (i >= 0) waiting.splice(i, 1); });
}).listen(PORT, '::', () => console.log(`[limiter] listening on ${PORT}`));
