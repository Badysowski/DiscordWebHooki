import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { daysSince, interest, plural, pln, int, pickFor, shoppingLine, buildMessage } from '../src/licznik.js';

const config = {
  ...JSON.parse(readFileSync(new URL('../config-obraz.json', import.meta.url), 'utf8')),
  mentionUserId: '222222222222222222', name: 'Testowy', artist: 'Malarka', artistGen: 'Malarki',
};
const products = JSON.parse(readFileSync(new URL('../data/zakupy.json', import.meta.url), 'utf8')).produkty;

test('dni od startu: 2026-09-15 to dzien 339', () => {
  assert.equal(daysSince('2025-10-11', '2026-09-15'), 339);
  assert.equal(daysSince('2025-10-11', '2025-10-11'), 0);
  assert.equal(daysSince('2025-10-11', '2025-10-12'), 1);
});

test('odsetki: 5000 zl, 18,5 %, 339 dni = 859,11 zl', () => {
  assert.equal(interest(5000, 18.5, 339), 859.11);
  assert.equal(interest(5000, 18.5, 0), 0);
  assert.equal(interest(5000, 18.5, 365), 925);
});

test('odmiana polska', () => {
  const f = ['kebab', 'kebaby', 'kebabów'];
  const expect = { 1: 'kebab', 2: 'kebaby', 4: 'kebaby', 5: 'kebabów', 11: 'kebabów', 12: 'kebabów', 14: 'kebabów', 21: 'kebabów', 22: 'kebaby', 25: 'kebabów', 112: 'kebabów', 122: 'kebaby', 0: 'kebabów' };
  for (const [n, form] of Object.entries(expect)) assert.equal(plural(Number(n), f), form, `n=${n}`);
});

test('formatowanie kwot po polsku z separatorem tysiecy', () => {
  assert.equal(pln(5859.11), '5 859,11 zł');
  assert.equal(pln(5000), '5 000,00 zł');
  assert.equal(pln(0.9), '0,90 zł');
  assert.equal(int(1234567), '1 234 567');
});

test('cennik: kazdy produkt ma 3 formy i cene > 0; drogie maja dopelniacz', () => {
  for (const p of products) {
    assert.equal(p.formy.length, 3, JSON.stringify(p));
    assert.ok(p.cena > 0, JSON.stringify(p));
    if (p.cena > 5000) assert.ok(p.gen, `brak "gen" dla drogiego: ${p.formy[0]}`);
  }
});

test('produkt drozszy niz suma -> szablon "brakuje"', () => {
  const data = { products: [{ formy: ['Teslę', 'Tesle', 'Tesli'], cena: 200000, gen: 'Tesli Model 3' }], templates: ['ZLE {zakup}'], templatesExpensive: ['Do {gen} brakuje {brakuje} ({percent})'] };
  const line = shoppingLine(0, data, 5859.11, '339');
  assert.equal(line, 'Do Tesli Model 3 brakuje 194 140,89 zł (2,9 %)');
});

test('produkt tanszy niz suma -> liczba sztuk z odmiana', () => {
  const data = { products: [{ formy: ['kebab', 'kebaby', 'kebabów'], cena: 26 }], templates: ['{zakup}!'], templatesExpensive: [] };
  assert.equal(shoppingLine(0, data, 5859.11, '339'), '225 kebabów!');
});

test('obraz od artystki za 5000: dzis 1 obraz, kiedys 2', () => {
  const obraz = products.find((p) => p.formy[0] === 'obraz od {artistGen}');
  const data = { products: [obraz], templates: ['{zakup}'], templatesExpensive: [] };
  const v = { artistGen: 'Malarki' };
  assert.equal(shoppingLine(0, data, 5859, '1', v), '1 obraz od Malarki');
  assert.equal(shoppingLine(0, data, 10000, '1', v), '2 obrazy od Malarki');
});

test('KAZDY dzien do 2030-12-31 daje inna wiadomosc', () => {
  const seen = new Map();
  const start = Date.parse('2026-09-15'), end = Date.parse(config.endDate);
  let count = 0;
  for (let t = start; t <= end; t += 86_400_000) {
    const key = new Date(t).toISOString().slice(0, 10);
    const { content } = buildMessage({ todayKey: key, config, products });
    assert.ok(!seen.has(content), `${key} powtarza wiadomosc z ${seen.get(content)}`);
    seen.set(content, key);
    count++;
  }
  assert.ok(count > 1500, `sprawdzono ${count} dni`);
});

test('kazdy dzien do 2030 ma wypelnione wszystkie {placeholdery}', () => {
  const start = Date.parse('2026-09-15'), end = Date.parse(config.endDate);
  for (let t = start; t <= end; t += 86_400_000) {
    const key = new Date(t).toISOString().slice(0, 10);
    const { content, footer } = buildMessage({ todayKey: key, config, products });
    assert.doesNotMatch(content + footer, /\{\w+\}/, `${key}: ${content}`);
  }
});

test('po endDate: stala wiadomosc, bez losowania, z licznikiem', () => {
  const a = buildMessage({ todayKey: '2031-01-01', config, products });
  const b = buildMessage({ todayKey: '2031-01-02', config, products });
  assert.equal(a.after, true);
  assert.match(a.content, /emeryturę/);
  assert.match(a.content, /dzień 1 908/);
  assert.notEqual(a.content, b.content, 'licznik dni dalej rosnie');
  assert.equal(a.content.split('\n').length, 2, 'bez wiersza z podsumowaniem zakupow');
});

test('szablony i produkty: para nie powtarza sie przez caly okres (NWW >= dni)', () => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const P = products.length, T = config.templates.length;
  const lcm = P * T / gcd(P, T);
  assert.ok(lcm >= 1600, `NWW(${P}, ${T}) = ${lcm} — za malo na okres do 2030`);
});

test('cennik: kazdy produkt ma haslo gif', () => {
  for (const p of products) assert.ok(p.gif && p.gif.length > 1, `brak gif: ${p.formy[0]}`);
});

test('buildMessage zwraca produkt dnia (do gifa), a po 2030 — null', () => {
  assert.ok(buildMessage({ todayKey: '2026-09-15', config, products }).product.gif);
  assert.equal(buildMessage({ todayKey: '2031-01-01', config, products }).product, null);
});

test('nazwy z env trafiaja do szablonow, zadnych {name}/{artist} w wyniku', () => {
  const m = buildMessage({ todayKey: '2026-09-15', config, products });
  assert.match(m.content, /Malarki/);
  assert.doesNotMatch(m.content, /\{(name|artist|artistGen)\}/);
});

test('szablony nie zawieraja prawdziwych nazwisk — te sa w sekretach', () => {
  const raw = readFileSync(new URL('../config-obraz.json', import.meta.url), 'utf8') + readFileSync(new URL('../data/zakupy.json', import.meta.url), 'utf8');
  assert.doesNotMatch(raw, /Blitz|blizz|Czarn|Tomci|toomciox/i);
});
