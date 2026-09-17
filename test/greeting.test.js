import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, isGreeting, findGreeting } from '../src/greeting.js';

const G = ['dzien dobry', 'dzd', 'siema', 'hej', 'elo', 'czesc', 'gm', 'wstalem'];

test('normalizacja scina ogonki, wielkosc liter i interpunkcje', () => {
  assert.equal(normalize('Dzień DOBRY!!!'), 'dzien dobry');
  assert.equal(normalize('Cześć, świecie'), 'czesc swiecie');
  assert.equal(normalize('ŁÓDŹ żółw'), 'lodz zolw');
  assert.equal(normalize(null), '');
});

test('powitanie w roznych zapisach', () => {
  for (const t of ['dzień dobry', 'Dzien Dobry', 'DZIEŃ DOBRY!', 'dzd', 'Siema', 'elo 😎']) {
    assert.equal(isGreeting(t, G), true, t);
  }
});

test('powitanie w srodku zdania tez sie liczy', () => {
  assert.equal(isGreeting('no to dzień dobry wszystkim, jak tam weekend', G), true);
});

test('granica slowa: podciag nie wystarcza', () => {
  assert.equal(isGreeting('ale hejt', G), false);
  assert.equal(isGreeting('elokwentny', G), false);
  assert.equal(isGreeting('wstalemowy', G), false);
});

test('zwykla wiadomosc bez powitania', () => {
  assert.equal(isGreeting('ktos ma link do tego repo', G), false);
  assert.equal(isGreeting('', G), false);
});

test('ZNANE OGRANICZENIE: zaprzeczenie nie jest wykrywane', () => {
  // Dopasowanie jest leksykalne, nie semantyczne.
  // Swiadoma decyzja: patrz sekcja "Znane ograniczenia" w README.
  assert.equal(isGreeting('nie powiem dzień dobry', G), true);
});

test('findGreeting zwraca pierwsza pasujaca wiadomosc', () => {
  const msgs = [{ content: 'ehh' }, { content: 'siema' }, { content: 'dzień dobry' }];
  assert.equal(findGreeting(msgs, G).content, 'siema');
  assert.equal(findGreeting([{ content: 'nic' }], G), undefined);
});
