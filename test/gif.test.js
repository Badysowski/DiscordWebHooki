import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickGif } from '../src/gif.js';

const ok = (body) => async () => ({ ok: true, json: async () => body });
const tenorBody = { results: [{ media_formats: { gif: { url: 'https://tenor/a.gif' } } }, { media_formats: { gif: { url: 'https://tenor/b.gif' } } }] };
const giphyBody = { data: [{ images: { original: { url: 'https://giphy/a.gif' } } }] };

test('bez klucza i bez listy: null, bez bledu', async () => {
  assert.equal(await pickGif({ queries: ['x'], fetchImpl: async () => { throw new Error('nie powinno pytac'); } }), null);
});

test('Tenor: losuje z wynikow', async () => {
  assert.equal(await pickGif({ queries: ['x'], env: { TENOR_API_KEY: 'k' }, rng: () => 0.9, fetchImpl: ok(tenorBody) }), 'https://tenor/b.gif');
});

test('Tenor przekazuje klucz i zapytanie', async () => {
  let seen;
  await pickGif({ queries: ['dzień dobry'], env: { TENOR_API_KEY: 'sekret' }, fetchImpl: async (u) => { seen = new URL(u); return { ok: true, json: async () => tenorBody }; } });
  assert.equal(seen.hostname, 'tenor.googleapis.com');
  assert.equal(seen.searchParams.get('key'), 'sekret');
  assert.equal(seen.searchParams.get('q'), 'dzień dobry');
});

test('Giphy dziala, gdy tylko jego klucz jest ustawiony', async () => {
  assert.equal(await pickGif({ queries: ['x'], env: { GIPHY_API_KEY: 'k' }, fetchImpl: ok(giphyBody) }), 'https://giphy/a.gif');
});

test('Tenor pada -> Giphy przejmuje', async () => {
  let n = 0;
  const fetchImpl = async () => (++n === 1 ? { ok: false, status: 500 } : { ok: true, json: async () => giphyBody });
  const url = await pickGif({ queries: ['x'], env: { TENOR_API_KEY: 'a', GIPHY_API_KEY: 'b' }, fetchImpl });
  assert.equal(url, 'https://giphy/a.gif');
  assert.equal(n, 2);
});

test('wszystko pada -> lista z configu', async () => {
  const url = await pickGif({ queries: ['x'], fallback: ['https://cfg/1.gif'], env: { TENOR_API_KEY: 'a' }, fetchImpl: async () => { throw new Error('ENOTFOUND'); } });
  assert.equal(url, 'https://cfg/1.gif');
});

test('siec rzuca wyjatkiem -> null, wiadomosc i tak pojdzie', async () => {
  const url = await pickGif({ queries: ['x'], env: { TENOR_API_KEY: 'a' }, fetchImpl: async () => { throw new Error('ENOTFOUND'); } });
  assert.equal(url, null);
});

test('brak wynikow u dostawcy -> nastepny dostawca', async () => {
  let n = 0;
  const fetchImpl = async () => (++n === 1 ? { ok: true, json: async () => ({ results: [] }) } : { ok: true, json: async () => giphyBody });
  assert.equal(await pickGif({ queries: ['x'], env: { TENOR_API_KEY: 'a', GIPHY_API_KEY: 'b' }, fetchImpl }), 'https://giphy/a.gif');
});
