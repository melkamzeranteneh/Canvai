import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.env.CONTENT_SERVER_PORT ? Number(process.env.CONTENT_SERVER_PORT) : 5177;
const CONTENT_PATH = path.resolve(process.cwd(), 'Content.json');

const sendJSON = (res, obj, code = 200) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.url === '/content' && req.method === 'GET') {
    fs.readFile(CONTENT_PATH, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') return sendJSON(res, { nodes: [], edges: [] });
        return sendJSON(res, { error: err.message }, 500);
      }
      try {
        const parsed = JSON.parse(data);
        return sendJSON(res, parsed);
      } catch (e) {
        return sendJSON(res, { error: 'invalid JSON on disk' }, 500);
      }
    });
    return;
  }

  if (req.url === '/content' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        fs.writeFile(CONTENT_PATH, JSON.stringify(parsed, null, 2), 'utf8', err => {
          if (err) return sendJSON(res, { error: err.message }, 500);
          return sendJSON(res, { ok: true });
        });
      } catch (e) {
        return sendJSON(res, { error: 'invalid json body' }, 400);
      }
    });
    return;
  }

  res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Content server listening on http://localhost:${PORT} (Content.json at ${CONTENT_PATH})`);
});
