'use strict';
/**
 * Função da Vercel: POST /api/meta-events
 * Recebe os eventos de /tracking/tracking.js e repassa à API de Conversões da Meta
 * usando server/meta-capi.js. Variáveis de ambiente no painel da Vercel (ver .env.example).
 */
const { createMetaCapi } = require('../server/meta-capi');

const capi = createMetaCapi();
const MAX_BYTES = 20 * 1024;

function readBody(req) {
  // a Vercel já entrega o corpo parseado quando é JSON; o sendBeacon manda text/plain
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(parse(req.body));
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BYTES) { resolve(null); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(parse(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', () => resolve(null));
  });
}
function parse(text) {
  if (!text || text.length > MAX_BYTES) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'use POST' });
  }
  const body = await readBody(req);
  const r = await capi.handle(body, { headers: req.headers, remoteAddress: req.socket && req.socket.remoteAddress });
  if (r.status === 204) return res.status(204).end();
  return res.status(r.status).json(r.body || {});
};
