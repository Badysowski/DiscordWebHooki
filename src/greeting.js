// Rozpoznawanie powitan. Wejscie: string. Wyjscie: boolean.
// Ten modul nie wie, ze istnieje Discord.

/**
 * Sprowadza tekst do porownywalnej postaci:
 * male litery, ogonki sciete, wszystko poza literami i cyframi na spacje.
 * "Dzień DOBRY!!!" i "dzien dobry" daja ten sam wynik.
 */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')            // 'l' z kreska nie rozklada sie w NFD
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Czy tekst zawiera ktorekolwiek powitanie jako osobne slowo (lub fraze).
 * Dopasowanie po granicy slowa, zeby "hej" nie trafialo w "hejt".
 */
export function isGreeting(text, greetings) {
  const haystack = ` ${normalize(text)} `;
  return greetings.some((g) => {
    const needle = normalize(g);
    return needle.length > 0 && haystack.includes(` ${needle} `);
  });
}

/** Pierwsza wiadomosc z listy, ktora jest powitaniem. undefined jesli brak. */
export function findGreeting(messages, greetings) {
  return messages.find((m) => isGreeting(m.content, greetings));
}
