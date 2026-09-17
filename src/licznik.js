// Czysta logika Licznika Obrazu: dni, odsetki, odmiana, deterministyczny dobor tekstu.
// Zadnych efektow ubocznych. Wszystko testowalne bez sieci i zegara.

const DAY_MS = 86_400_000;

/** Liczba pelnych dni od startDate do todayKey (obie jako "YYYY-MM-DD"). */
export function daysSince(startDate, todayKey) {
  return Math.round((Date.parse(todayKey) - Date.parse(startDate)) / DAY_MS);
}

/** Odsetki proste: kwota * stopa * dni / 365. Zaokraglone do groszy. */
export function interest(amount, annualRatePercent, days) {
  return Math.round(amount * (annualRatePercent / 100) * days / 365 * 100) / 100;
}

/** Polska odmiana po liczebniku: 1 kebab, 2 kebaby, 5 kebabow, 22 kebaby, 112 kebabow. */
export function plural(n, [one, few, many]) {
  if (n === 1) return one;
  const m10 = n % 10, m100 = n % 100;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
  return many;
}

const plnFmt = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
const intFmt = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0, useGrouping: 'always' });

/** "5 859,32 zł" — spacje niełamiące zamienione na zwykle, zeby Discord nie robil dziwnych rzeczy. */
export const pln = (n) => `${plnFmt.format(n)} zł`.replace(/ /g, ' ');
export const int = (n) => intFmt.format(n).replace(/ /g, ' ');

/**
 * Deterministyczny dobor (szablon, produkt) po numerze dnia.
 * Produkt: day mod P. Szablon: day mod T. Para powtarza sie dopiero po NWW(P, T) dniach.
 * Test w test/licznik.test.js sprawdza unikalnosc wiadomosci przez caly okres do endDate.
 */
export function pickFor(day, { products, templates, templatesExpensive }, total) {
  const product = products[day % products.length];
  const affordable = product.cena <= total;
  const pool = affordable ? templates : templatesExpensive;
  const template = pool[day % pool.length];
  return { product, template, affordable };
}

/** Wiersz "co moglby kupic" dla danego dnia. */
export function shoppingLine(day, data, total, days, vars = {}) {
  const { product, template, affordable } = pickFor(day, data, total);
  if (affordable) {
    const count = Math.floor(total / product.cena);
    const zakup = `${int(count)} ${render(plural(count, product.formy), vars)}`;
    return render(template, { ...vars, zakup, days });
  }
  const brakuje = pln(product.cena - total);
  const percent = `${(total / product.cena * 100).toFixed(1).replace('.', ',')} %`;
  return render(template, { ...vars, gen: render(product.gen ?? product.formy[0], vars), brakuje, percent, days });
}

export function render(template, vars) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Pelna wiadomosc na dany dzien. Po endDate — finalMessage. */
export function buildMessage({ todayKey, config, products }) {
  const days = daysSince(config.startDate, todayKey);
  const odsetki = interest(config.amount, config.annualRatePercent, days);
  const total = Math.round((config.amount + odsetki) * 100) / 100;
  const vars = {
    user: `<@${config.mentionUserId}>`,
    name: config.name,
    artist: config.artist,
    artistGen: config.artistGen ?? config.artist,
    days: int(days),
    amount: pln(config.amount),
    rate: `${String(config.annualRatePercent).replace('.', ',')} %`,
    interest: pln(odsetki),
    total: pln(total),
  };
  const after = todayKey > config.endDate;
  const product = after ? null : pickFor(days, { products, templates: config.templates, templatesExpensive: config.templatesExpensive }, total).product;
  const line3 = after
    ? render(config.finalMessage, vars)
    : shoppingLine(days, { products, templates: config.templates, templatesExpensive: config.templatesExpensive }, total, vars.days, vars);

  return {
    days, total, after, product,
    content: after
      ? `${render(config.header, vars)}\n${line3}`
      : `${render(config.header, vars)}\n${render(config.summary, vars)}\n${line3}`,
    footer: render(config.footer, vars),
    color: after ? config.colorFinal : config.color,
  };
}
