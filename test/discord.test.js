import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchMessagesSince, sendWebhook } from '../src/discord.js';

const noSleep = async () => {};
const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const err = (status, body = {}) => ({ ok: false, status, json: async () => body });

const msg = (id, iso, content = 'tekst', author = '111111111111111111') =>
  ({ id, timestamp: iso, content, author: { id: author } });

test('zatrzymuje sie na granicy okna', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return ok([msg('3', '2027-07-15T06:00:00Z'), msg('2', '2027-07-15T03:30:00Z'), msg('1', '2027-07-15T01:00:00Z')]);
  };
  const out = await fetchMessagesSince({
    token: 't', channelId: 'c', since: new Date('2027-07-15T03:00:00Z'),
    deps: { fetchImpl, sleepImpl: noSleep },
  });
  assert.equal(out.length, 2, 'wiadomosc sprzed okna odrzucona');
  assert.equal(calls.length, 1, 'nie stronicuje dalej niz trzeba');
});

test('stronicuje wstecz, gdy pelna strona nie siega okna', async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => msg(String(200 - i), '2027-07-15T06:00:00Z'));
  const page2 = [msg('99', '2027-07-15T05:00:00Z'), msg('98', '2027-07-15T02:00:00Z')];
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(new URL(url).searchParams.get('before'));
    return ok(seen.length === 1 ? page1 : page2);
  };
  const out = await fetchMessagesSince({
    token: 't', channelId: 'c', since: new Date('2027-07-15T03:00:00Z'),
    deps: { fetchImpl, sleepImpl: noSleep },
  });
  assert.equal(out.length, 101);
  assert.deepEqual(seen, [null, '101'], 'druga strona pyta o wiadomosci przed ostatnia z pierwszej');
});

test('maxPages chroni przed zapetleniem na gadatliwym kanale', async () => {
  let n = 0;
  const fetchImpl = async () => {
    n++;
    return ok(Array.from({ length: 100 }, (_, i) => msg(String(1e6 - n * 100 - i), '2027-07-15T06:00:00Z')));
  };
  await fetchMessagesSince({
    token: 't', channelId: 'c', since: new Date('2027-07-15T03:00:00Z'),
    maxPages: 3, deps: { fetchImpl, sleepImpl: noSleep },
  });
  assert.equal(n, 3);
});

test('429 jest ponawiany po czasie, ktory podal Discord', async () => {
  const waits = [];
  let n = 0;
  const fetchImpl = async () => (++n === 1 ? err(429, { retry_after: 2.5 }) : ok([]));
  await fetchMessagesSince({
    token: 't', channelId: 'c', since: new Date('2027-07-15T03:00:00Z'),
    deps: { fetchImpl, sleepImpl: async (ms) => waits.push(ms) },
  });
  assert.equal(n, 2);
  assert.deepEqual(waits, [2500]);
});

test('5xx ponawiany z narastajacym odstepem', async () => {
  const waits = [];
  let n = 0;
  const fetchImpl = async () => (++n < 3 ? err(503) : ok([]));
  await fetchMessagesSince({
    token: 't', channelId: 'c', since: new Date('2027-07-15T03:00:00Z'),
    deps: { fetchImpl, sleepImpl: async (ms) => waits.push(ms) },
  });
  assert.deepEqual(waits, [1000, 3000]);
});

test('403 nie jest ponawiany i mowi co sprawdzic', async () => {
  let n = 0;
  const fetchImpl = async () => { n++; return err(403); };
  await assert.rejects(
    fetchMessagesSince({ token: 't', channelId: 'c', since: new Date(), deps: { fetchImpl, sleepImpl: noSleep } }),
    /uprawnienia roli/,
  );
  assert.equal(n, 1, 'blad konfiguracji nie ma sensu ponawiac');
});

test('401 kieruje do resetu tokenu', async () => {
  await assert.rejects(
    fetchMessagesSince({ token: 'zly', channelId: 'c', since: new Date(), deps: { fetchImpl: async () => err(401), sleepImpl: noSleep } }),
    /Zresetuj token/,
  );
});

test('404 kieruje do channelId', async () => {
  await assert.rejects(
    fetchMessagesSince({ token: 't', channelId: 'zly', since: new Date(), deps: { fetchImpl: async () => err(404), sleepImpl: noSleep } }),
    /channelId w config\.json/,
  );
});

test('brak sieci jest ponawiany, potem poddaje sie z sensownym bledem', async () => {
  const fetchImpl = async () => { throw new Error('ENOTFOUND'); };
  await assert.rejects(
    fetchMessagesSince({ token: 't', channelId: 'c', since: new Date(), deps: { fetchImpl, sleepImpl: noSleep } }),
    /Brak polaczenia z Discordem/,
  );
});

test('webhook wysyla JSON POST-em', async () => {
  let captured;
  await sendWebhook({
    url: 'https://discord.com/api/webhooks/x/y',
    payload: { content: 'czesc' },
    deps: { fetchImpl: async (url, opts) => { captured = { url, opts }; return ok({}); }, sleepImpl: noSleep },
  });
  assert.equal(captured.opts.method, 'POST');
  assert.equal(captured.opts.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(captured.opts.body), { content: 'czesc' });
});

test('token idzie w naglowku Authorization jako Bot', async () => {
  let headers;
  await fetchMessagesSince({
    token: 'sekret', channelId: 'c', since: new Date(),
    deps: { fetchImpl: async (_u, o) => { headers = o.headers; return ok([]); }, sleepImpl: noSleep },
  });
  assert.equal(headers.Authorization, 'Bot sekret');
});
