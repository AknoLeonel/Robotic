'use strict';
/**
 * Arena Robótica 26 — API de Conversões da Meta (servidor)
 * Recebe os eventos de /tracking/tracking.js, criptografa os dados pessoais (SHA-256)
 * e reenvia para a Meta com o mesmo event_id do Pixel (deduplicação).
 *
 * Node 18+ (usa fetch nativo). Sem dependências.
 *
 * Variáveis de ambiente (ver .env.example):
 *   META_PIXEL_ID, META_CAPI_TOKEN, META_API_VERSION, META_TEST_EVENT_CODE, ALLOWED_ORIGINS
 */
const crypto = require('crypto');


const ALLOWED_EVENTS = new Set([
  'PageView', 'ViewContent', 'InitiateCheckout', 'Contact', 'Lead',
  'CompleteRegistration', 'Schedule', 'Subscribe', 'Search'
]);
const CUSTOM_EVENT_RE = /^[A-Za-z][A-Za-z0-9_]{1,49}$/;


// ---------------------------------------------------------------------------
// Normalização + hash (regras da Meta)
// ---------------------------------------------------------------------------
const sha256 = (v) => crypto.createHash('sha256').update(v, 'utf8').digest('hex');


function normEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}
function normPhone(v) {
  let p = String(v || '').replace(/\D/g, '');
  if (!p) return null;
  if (p.startsWith('00')) p = p.slice(2);
  if (p.length === 10 || p.length === 11) p = '55' + p; // número brasileiro sem DDI
  return p.length >= 12 && p.length <= 15 ? p : null;
}
function normName(v) {
  const n = String(v || '').trim().toLowerCase().replace(/[^\p{L}]/gu, '');
  return n || null;
}
const isHashed = (v) => /^[a-f0-9]{64}$/.test(String(v || ''));
const hashIf = (v, norm) => {
  if (!v) return undefined;
  if (isHashed(v)) return [v];
  const n = norm(v);
  return n ? [sha256(n)] : undefined;
};


function clean(obj) {
  Object.keys(obj).forEach((k) => (obj[k] === undefined || obj[k] === null || obj[k] === '') && delete obj[k]);
  return obj;
}


function clientIp(headers, remoteAddress) {
  const xff = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  if (xff) return String(xff).split(',')[0].trim();
  return headers['x-real-ip'] || remoteAddress || undefined;
}


// ---------------------------------------------------------------------------
// Limite simples por IP (60 eventos/min) — troque por algo distribuído se tiver várias instâncias
// ---------------------------------------------------------------------------
const hits = new Map();
function rateLimited(ip, max = 60) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 5000) hits.clear();
  return rec.n > max;
}


// ---------------------------------------------------------------------------
// Núcleo (independente de framework)
// ---------------------------------------------------------------------------
function createMetaCapi(options = {}) {
  const pixelId = options.pixelId || process.env.META_PIXEL_ID;
  const token = options.accessToken || process.env.META_CAPI_TOKEN;
  const version = options.apiVersion || process.env.META_API_VERSION || 'v26.0';
  const testEventCode = options.testEventCode || process.env.META_TEST_EVENT_CODE || undefined;
  const allowedOrigins = (options.allowedOrigins || process.env.ALLOWED_ORIGINS || '')
    .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);


  if (!pixelId || !token) {
    console.warn('[meta-capi] META_PIXEL_ID ou META_CAPI_TOKEN ausente — eventos serão ignorados.');
  }


  function originAllowed(origin, sourceUrl) {
    if (!allowedOrigins.length) return true;
    const check = (u) => {
      try { return allowedOrigins.includes(new URL(u).origin); } catch (e) { return false; }
    };
    return (!origin || check(origin)) && (!sourceUrl || check(sourceUrl));
  }


  function buildEvent(body, ctx) {
    const name = String(body.event_name || '');
    if (!ALLOWED_EVENTS.has(name) && !CUSTOM_EVENT_RE.test(name)) throw new Error('event_name inválido');


    const now = Math.floor(Date.now() / 1000);
    let time = parseInt(body.event_time, 10) || now;
    if (time > now + 60 || time < now - 7 * 86400) time = now; // Meta aceita até 7 dias


    const u = body.user_data || {};
    const userData = clean({
      em: hashIf(u.email || u.em, normEmail),
      ph: hashIf(u.phone || u.ph, normPhone),
      fn: hashIf(u.first_name || u.fn, normName),
      ln: hashIf(u.last_name || u.ln, normName),
      country: [sha256('br')],
      client_ip_address: ctx.ip,
      client_user_agent: ctx.userAgent,
      fbp: typeof u.fbp === 'string' ? u.fbp.slice(0, 200) : undefined,
      fbc: typeof u.fbc === 'string' ? u.fbc.slice(0, 300) : undefined
    });


    const customData = {};
    const cd = body.custom_data && typeof body.custom_data === 'object' ? body.custom_data : {};
    Object.keys(cd).slice(0, 25).forEach((k) => {
      const v = cd[k];
      if (['string', 'number', 'boolean'].includes(typeof v)) customData[k] = typeof v === 'string' ? v.slice(0, 500) : v;
    });


    return clean({
      event_name: name,
      event_time: time,
      event_id: String(body.event_id || crypto.randomUUID()).slice(0, 100),
      event_source_url: typeof body.event_source_url === 'string' ? body.event_source_url.slice(0, 1000) : undefined,
      referrer_url: typeof body.referrer_url === 'string' ? body.referrer_url.slice(0, 1000) : undefined,
      action_source: 'website',
      user_data: userData,
      custom_data: Object.keys(customData).length ? customData : undefined
    });
  }


  async function send(events) {
    const url = `https://graph.facebook.com/${version}/${pixelId}/events`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean({ data: events, test_event_code: testEventCode, access_token: token }))
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (json.error && json.error.message) || res.statusText;
      throw new Error(`Meta respondeu ${res.status}: ${msg}`);
    }
    return json; // { events_received, fbtrace_id }
  }


  /**
   * @param {object} body     JSON recebido do navegador
   * @param {object} ctx      { headers, remoteAddress }
   * @returns {Promise<{status:number, body?:object}>}
   */
  async function handle(body, ctx) {
    const headers = ctx.headers || {};
    const ip = clientIp(headers, ctx.remoteAddress);
    if (!pixelId || !token) return { status: 204 };
    if (!body || typeof body !== 'object') return { status: 400, body: { error: 'json inválido' } };
    if (!originAllowed(headers.origin, body.event_source_url)) return { status: 403, body: { error: 'origem não permitida' } };
    if (ip && rateLimited(ip)) return { status: 429, body: { error: 'muitas requisições' } };


    let event;
    try {
      event = buildEvent(body, { ip, userAgent: headers['user-agent'] });
    } catch (e) {
      return { status: 400, body: { error: e.message } };
    }


    try {
      const r = await send([event]);
      return { status: 200, body: { ok: true, events_received: r.events_received } };
    } catch (e) {
      console.error('[meta-capi]', e.message);
      return { status: 502, body: { error: 'falha ao enviar para a Meta' } };
    }
  }


  return { handle, buildEvent, send };
}


// ---------------------------------------------------------------------------
// Adaptador Express
//   const { expressHandler } = require('./meta-capi');
//   app.post('/api/meta-events', express.json({ limit: '20kb' }), expressHandler());
// ---------------------------------------------------------------------------
function expressHandler(options) {
  const capi = createMetaCapi(options);
  return async (req, res) => {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
    const r = await capi.handle(body, { headers: req.headers, remoteAddress: req.socket && req.socket.remoteAddress });
    if (r.status === 204) return res.status(204).end();
    res.status(r.status).json(r.body || {});
  };
}


module.exports = { createMetaCapi, expressHandler, _test: { normEmail, normPhone, normName, sha256 } };
