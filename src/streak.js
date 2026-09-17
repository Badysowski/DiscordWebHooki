// Stan miedzy uruchomieniami. Trzymany w repo jako state.json.
import { readFile, writeFile } from 'node:fs/promises';

const EMPTY = { streak: 0, lastRunDate: null, lastResult: null, bestStreak: 0 };

export async function load(path) {
  try {
    return { ...EMPTY, ...JSON.parse(await readFile(path, 'utf8')) };
  } catch (err) {
    if (err.code === 'ENOENT') return { ...EMPTY };   // pierwszy przebieg
    throw new Error(`state.json jest uszkodzony: ${err.message}`);
  }
}

export async function save(path, state) {
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/** Nowy stan po dzisiejszym sprawdzeniu. Czysta funkcja. */
export function advance(state, todayKey, greeted) {
  const streak = greeted ? state.streak + 1 : 0;
  return {
    streak,
    bestStreak: Math.max(state.bestStreak ?? 0, streak),
    lastRunDate: todayKey,
    lastResult: greeted ? 'greeted' : 'missed',
  };
}

/** Czy dzisiaj juz sprawdzalismy. Chroni przed zdublowanym cronem. */
export function alreadyRanToday(state, todayKey) {
  return state.lastRunDate === todayKey;
}
