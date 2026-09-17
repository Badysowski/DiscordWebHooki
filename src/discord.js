// Jedyny modul gadajacy z Discordem. fetch wstrzykiwany, zeby dalo sie testowac.

const API = 'https://discord.com/api/v10';

class DiscordError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'DiscordError';
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Zapytanie z ponawianiem. Respektuje retry_after przy 429,
 * przy 5xx czeka 1s, 3s, 9s. Bledy 4xx nie sa ponawiane — to bledy konfiguracji,
 * ponowienie ich nie naprawi.
 */
async function request(url, options, { fetchImpl = fetch, attempts = 3, sleepImpl = sleep } = {}) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt++) {
    let res;
    try {
      res = await fetchImpl(url, options);
    } catch (err) {
      lastError = new DiscordError(`Brak polaczenia z Discordem: ${err.message}`, 0);
      await sleepImpl(1000 * 3 ** attempt);
      continue;
    }

    if (res.ok) return res;

    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const waitMs = Math.ceil((body.retry_after ?? 1) * 1000);
      lastError = new DiscordError(`Rate limit, czekam ${waitMs}ms`, 429);
      await sleepImpl(waitMs);
      continue;
    }

    if (res.status >= 500) {
      lastError = new DiscordError(`Discord zwrocil ${res.status}`, res.status);
      await sleepImpl(1000 * 3 ** attempt);
      continue;
    }

    throw new DiscordError(explain(res.status), res.status);
  }

  throw lastError;
}

/** Zamienia kod HTTP na komunikat, ktory mowi co zrobic. */
function explain(status) {
  if (status === 401) return 'Token bota odrzucony (401). Zresetuj token i podmien sekret DISCORD_BOT_TOKEN.';
  if (status === 403) return 'Bot nie ma dostepu do kanalu (403). Sprawdz uprawnienia roli: Wyswietlanie kanalow + Czytanie historii czatu.';
  if (status === 404) return 'Kanal nie istnieje albo bot go nie widzi (404). Sprawdz channelId w config.json.';
  return `Discord odrzucil zadanie (${status}).`;
}

/**
 * Pobiera wiadomosci wstecz az do granicy czasowej.
 * Stronicuje, bo na gadatliwym kanale 100 ostatnich wiadomosci moze nie siegnac 5 rano.
 * maxPages chroni przed zapetleniem.
 */
export async function fetchMessagesSince({ token, channelId, since, maxPages = 5, deps = {} }) {
  const collected = [];
  let before;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`${API}/channels/${channelId}/messages`);
    url.searchParams.set('limit', '100');
    if (before) url.searchParams.set('before', before);

    const res = await request(url.toString(), {
      headers: { Authorization: `Bot ${token}`, 'User-Agent': 'DiscordDailyBots (github.com/kimonzo/DiscordWebHooki, 1.0)' },
    }, deps);

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    let reachedLimit = false;
    for (const msg of batch) {
      if (new Date(msg.timestamp) < since) { reachedLimit = true; break; }
      collected.push(msg);
    }

    if (reachedLimit || batch.length < 100) break;
    before = batch[batch.length - 1].id;
  }

  return collected;
}

/** Wysyla wiadomosc webhookiem. */
export async function sendWebhook({ url, payload, deps = {} }) {
  await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, deps);
}

export { DiscordError };
