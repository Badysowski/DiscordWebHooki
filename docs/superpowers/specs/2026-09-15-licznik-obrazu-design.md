# Licznik Obrazu — design

Data: 2026-09-15. Status: zatwierdzony.

## Cel
Codziennie o 8:30 na wyznaczonym kanale wiadomość dla wyznaczona osoba:
który to dzień czekania na obraz od wyznaczona artystka (od 11.10.2025), ile wynoszą odsetki maksymalne
za opóźnienie od 5000 zł, i co mógłby za tę sumę kupić dziś w Polsce. Po 31.12.2030 stała wiadomość.

## Decyzje
- **Tylko pisze** — webhook, bez tokenu bota. Sekret: `OBRAZ_WEBHOOK_URL`.
- **Te same crony** co Budzik (06:30/07:30 UTC), ten sam `graceMinutes`, ta sama bramka
  idempotencji przez `state-obraz.json`.
- **Odsetki:** maksymalne za opóźnienie = 2 × (stopa ref. NBP + 5,5 p.p.). Wrzesień 2026: 3,75 % → 18,5 %.
  Liczone płasko po bieżącej stopie z configu (uproszczenie, świadome).
- **„Inna wiadomość każdego dnia":** pula szablonów × pula produktów, dobór deterministyczny
  po numerze dnia. Test przemiata każdy dzień do 31.12.2030 i wymaga unikalności.
- **Odmiana:** trzy formy biernika w cenniku (kebab / kebaby / kebabów). Produkty droższe niż suma
  mają dodatkowo dopełniacz (`gen`: „Tesli Model 3") i osobne szablony „brakuje jeszcze X".
- **Ceny orientacyjne 2026** — `data/zakupy.json` jest do edycji przez ludzi.

## Struktura
`src/obraz.js` (orkiestracja) → `src/licznik.js` (czyste: dni, odsetki, odmiana, dobór, format),
reużywa `discord.js`, `gif.js`, `window.js`, `streak.js`. Konfiguracja `config-obraz.json`.


## Aktualizacja 2026-09-17
Repo publiczne. Tożsamość (ID kanałów, ID i nicki) przeniesiona z `config*.json` do sekretów; teksty używają `{name}`, `{artist}`, `{artistGen}`. Nazwy botów ustawiane w webhookach.
