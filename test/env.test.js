import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireEnv } from '../src/env.js';

test('zglasza WSZYSTKIE brakujace sekrety naraz, nie pierwszy z brzegu', () => {
  assert.throws(() => requireEnv({ A: '1' }, ['A', 'B', 'C']), /Brakuje sekretow: B, C/);
});

test('pusty string liczy sie jako brak', () => {
  assert.throws(() => requireEnv({ A: '' }, ['A']), /Brakuje sekretow: A/);
});

test('komplet -> zwraca wartosci', () => {
  assert.deepEqual(requireEnv({ A: 'x', B: 'y' }, ['A', 'B']), { A: 'x', B: 'y' });
});
