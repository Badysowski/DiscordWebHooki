// Licznik Obrazu — orkiestracja. Jedyne miejsce z efektami ubocznymi.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { isCheckTime, localDateKey } from './window.js';
import { buildMessage } from './licznik.js';
import { sendWebhook } from './discord.js';
import { pickGif } from './gif.js';
import { load, save, alreadyRanToday } from './streak.js';
import { requireEnv } from './env.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = join(ROOT, 'state-obraz.json');

export async function run({ argv = [], env = process.env, now = new Date() } = {}) {
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--now');

  const config = JSON.parse(await readFile(join(ROOT, 'config-obraz.json'), 'utf8'));
  const products = JSON.parse(await readFile(join(ROOT, 'data/zakupy.json'), 'utf8')).produkty;
  const id = requireEnv(env, ['OBRAZ_MENTION_USER_ID', 'OBRAZ_MENTION_NAME', 'OBRAZ_ARTIST', 'OBRAZ_ARTIST_GEN']);
  config.mentionUserId = id.OBRAZ_MENTION_USER_ID;
  config.name = id.OBRAZ_MENTION_NAME;
  config.artist = id.OBRAZ_ARTIST;
  config.artistGen = id.OBRAZ_ARTIST_GEN;
  const today = localDateKey(now, config.timezone);

  if (!force && !isCheckTime(now, config)) {
    console.log(`[pomijam] Poza oknem ${config.checkHour}:${String(config.checkMinute).padStart(2, '0')} +${config.graceMinutes} min — to drugi cron od zmiany czasu.`);
    return { skipped: 'wrong-hour' };
  }

  const state = await load(STATE_PATH);
  if (!force && alreadyRanToday(state, today)) {
    console.log(`[pomijam] ${today} juz wyslany.`);
    return { skipped: 'already-ran' };
  }

  const webhookUrl = dryRun ? null : requireEnv(env, [config.webhookSecret])[config.webhookSecret];

  const msg = buildMessage({ todayKey: today, config, products });
  console.log(`[licznik] ${today}: dzien ${msg.days}, razem ${msg.total} zl${msg.after ? ' (po 2030 — stala wiadomosc)' : ''}`);

  // Najpierw gif pasujacy do produktu dnia, potem ogolne hasla z configu.
  const gifUrl = (msg.product?.gif && await pickGif({ queries: [msg.product.gif], env, log: console.log }))
    || await pickGif({ queries: config.gifQueries, fallback: config.gifFallback, env, log: console.log });

  const embed = { color: msg.color, footer: { text: msg.footer } };
  if (gifUrl) embed.image = { url: gifUrl };
  const payload = {
    content: msg.content,
    allowed_mentions: { users: [config.mentionUserId] },
    embeds: [embed],
  };

  if (dryRun) {
    console.log('[dry-run] nic nie wysylam. Tresc:\n' + msg.content);
    return { dryRun: true, days: msg.days };
  }

  await sendWebhook({ url: webhookUrl, payload });
  console.log(`[wyslano] dzien ${msg.days}`);
  await save(STATE_PATH, { lastRunDate: today, lastDay: msg.days });
  return { days: msg.days };
}

const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  run({ argv: process.argv.slice(2) }).catch((err) => {
    console.error(`\n[blad] ${err.message}\n`);
    process.exit(1);
  });
}
