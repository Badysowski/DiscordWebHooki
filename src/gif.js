// Losowy GIF z Tenora albo Giphy — ktorykolwiek klucz jest ustawiony.
// Kazdy blad konczy sie brakiem gifa, nigdy wywaleniem wiadomosci.

const TENOR = 'https://tenor.googleapis.com/v2/search';
const GIPHY = 'https://api.giphy.com/v1/gifs/search';

async function fromTenor(key, query, rng, fetchImpl) {
  const url = new URL(TENOR);
  url.search = new URLSearchParams({ key, q: query, limit: '30', media_filter: 'gif', random: 'true', locale: 'pl_PL', contentfilter: 'medium' });
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Tenor ${res.status}`);
  const { results = [] } = await res.json();
  const urls = results.map((r) => r.media_formats?.gif?.url).filter(Boolean);
  return urls.length ? urls[Math.floor(rng() * urls.length)] : null;
}

async function fromGiphy(key, query, rng, fetchImpl) {
  const url = new URL(GIPHY);
  url.search = new URLSearchParams({ api_key: key, q: query, limit: '30', rating: 'pg-13', lang: 'pl' });
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Giphy ${res.status}`);
  const { data = [] } = await res.json();
  const urls = data.map((g) => g.images?.original?.url).filter(Boolean);
  return urls.length ? urls[Math.floor(rng() * urls.length)] : null;
}

/**
 * Zwraca URL gifa albo null. Kolejnosc: Tenor -> Giphy -> lista z configu -> null.
 * Zapytania (queries) losowane, zeby ten sam dzien nie dawal wciaz tej samej frazy.
 */
export async function pickGif({ queries = [], fallback = [], env = {}, rng = Math.random, fetchImpl = fetch, log = () => {} }) {
  const query = queries.length ? queries[Math.floor(rng() * queries.length)] : null;

  const providers = [
    env.TENOR_API_KEY && ['Tenor', () => fromTenor(env.TENOR_API_KEY, query, rng, fetchImpl)],
    env.GIPHY_API_KEY && ['Giphy', () => fromGiphy(env.GIPHY_API_KEY, query, rng, fetchImpl)],
  ].filter(Boolean);

  if (query) {
    for (const [name, get] of providers) {
      try {
        const url = await get();
        if (url) { log(`[gif] ${name}: "${query}" -> ${url}`); return url; }
        log(`[gif] ${name}: brak wynikow dla "${query}"`);
      } catch (err) {
        log(`[gif] ${name} nie odpowiada (${err.message}), probuje dalej`);
      }
    }
  }

  if (fallback.length) {
    const url = fallback[Math.floor(rng() * fallback.length)];
    log(`[gif] z listy w config.json -> ${url}`);
    return url;
  }
  log('[gif] brak klucza API i pusta lista — wiadomosc bez gifa');
  return null;
}
