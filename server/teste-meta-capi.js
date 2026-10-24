'use strict';
// Teste local da API de Conversões: npm test (dentro de server/). Não chama a Meta.
const test = require('node:test');
const assert = require('node:assert');
const { createMetaCapi, _test } = require('./meta-capi');
const { normEmail, normPhone, normName, sha256 } = _test;

test('normaliza e-mail, telefone e nome', () => {
  assert.strictEqual(normEmail('  Fulano@Exemplo.COM '), 'fulano@exemplo.com');
  assert.strictEqual(normEmail('sem-arroba'), null);
  assert.strictEqual(normPhone('(61) 99999-8888'), '5561999998888');
  assert.strictEqual(normPhone('+55 61 3333-4444'), '556133334444');
  assert.strictEqual(normPhone('123'), null);
  assert.strictEqual(normName(' João '), 'joão');
});

test('monta o evento com dados criptografados e filtra o resto', () => {
  const capi = createMetaCapi({ pixelId: '1', accessToken: 't' });
  const ev = capi.buildEvent({
    event_name: 'Lead', event_id: 'abc', event_source_url: 'https://www.arenarobotica.com.br/',
    user_data: { email: 'A@B.com', phone: '61999998888', fbp: 'fb.1.1.1' },
    custom_data: { posicao: 'hero', objeto: { x: 1 } }
  }, { ip: '1.2.3.4', userAgent: 'UA' });
  assert.strictEqual(ev.event_id, 'abc');
  assert.strictEqual(ev.action_source, 'website');
  assert.deepStrictEqual(ev.user_data.em, [sha256('a@b.com')]);
  assert.deepStrictEqual(ev.user_data.ph, [sha256('5561999998888')]);
  assert.strictEqual(ev.user_data.client_ip_address, '1.2.3.4');
  assert.deepStrictEqual(ev.custom_data, { posicao: 'hero' });
});

test('recusa nome de evento inválido, origem não permitida e envio sem token', async () => {
  const capi = createMetaCapi({ pixelId: '1', accessToken: 't', allowedOrigins: 'https://www.arenarobotica.com.br' });
  assert.throws(() => capi.buildEvent({ event_name: '<script>' }, {}));
  const r = await capi.handle({ event_name: 'PageView', event_source_url: 'https://golpe.example/' }, { headers: { origin: 'https://golpe.example' } });
  assert.strictEqual(r.status, 403);
  const semToken = createMetaCapi({ pixelId: '', accessToken: '' });
  assert.strictEqual((await semToken.handle({ event_name: 'PageView' }, { headers: {} })).status, 204);
});
