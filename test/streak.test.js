import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load, save, advance, alreadyRanToday } from '../src/streak.js';

const tmp = async () => join(await mkdtemp(join(tmpdir(), 'budzik-')), 'state.json');

test('brak pliku to czysty start, nie blad', async () => {
  assert.deepEqual(await load(await tmp()), { streak: 0, lastRunDate: null, lastResult: null, bestStreak: 0 });
});

test('uszkodzony state.json mowi wprost co jest nie tak', async () => {
  const p = await tmp();
  await writeFile(p, '{to nie jest json');
  await assert.rejects(load(p), /state\.json jest uszkodzony/);
});

test('zapis i odczyt w obie strony', async () => {
  const p = await tmp();
  const s = advance({ streak: 4, bestStreak: 9 }, '2027-07-15', true);
  await save(p, s);
  assert.deepEqual(await load(p), s);
});

test('trafienie podbija serie, pudlo zeruje', () => {
  assert.equal(advance({ streak: 11, bestStreak: 11 }, '2027-07-15', true).streak, 12);
  assert.equal(advance({ streak: 11, bestStreak: 11 }, '2027-07-15', false).streak, 0);
});

test('rekord serii przezywa wyzerowanie', () => {
  const zeroed = advance({ streak: 30, bestStreak: 30 }, '2027-07-15', false);
  assert.equal(zeroed.streak, 0);
  assert.equal(zeroed.bestStreak, 30);
});

test('pierwszy dzien dziala z pustego stanu', () => {
  const s = advance({ streak: 0, bestStreak: 0 }, '2027-07-15', true);
  assert.deepEqual(s, { streak: 1, bestStreak: 1, lastRunDate: '2027-07-15', lastResult: 'greeted' });
});

test('bramka idempotencji lapie ten sam dzien', () => {
  assert.equal(alreadyRanToday({ lastRunDate: '2027-07-15' }, '2027-07-15'), true);
  assert.equal(alreadyRanToday({ lastRunDate: '2027-07-14' }, '2027-07-15'), false);
  assert.equal(alreadyRanToday({ lastRunDate: null }, '2027-07-15'), false);
});
