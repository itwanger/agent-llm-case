#!/usr/bin/env node
/**
 * 零依赖静态服务器 —— 用于本地运行锦鲤池页面。
 *   node server.mjs [port]
 * 默认 http://127.0.0.1:4173
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const started = Date.now();
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const target = resolve(join(ROOT, normalize(pathname)));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let stat;
  try {
    stat = statSync(target);
    if (stat.isDirectory()) throw new Error('dir');
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 Not Found');
    console.log(`${req.method} ${pathname} 404`);
    return;
  }

  res.writeHead(200, {
    'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': 'no-cache, no-store, must-revalidate',
    'access-control-allow-origin': '*',
  });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(target).pipe(res);
  console.log(`${req.method} ${pathname} 200 ${stat.size}b ${Date.now() - started}ms`);
});

server.listen(PORT, HOST, () => {
  console.log(`\n  🐟  锦鲤池运行中  →  http://${HOST}:${PORT}\n`);
  console.log(`  根目录: ${ROOT}`);
  console.log('  按 Ctrl+C 停止\n');
});
