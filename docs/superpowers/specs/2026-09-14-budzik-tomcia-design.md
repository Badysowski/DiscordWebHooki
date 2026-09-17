# Budzik — design

Data: 2026-09-14. Status: zatwierdzony, zaimplementowany.

## Cel
Bot na GitHub Actions, który o 7:05 czasu polskiego sprawdza, czy wyznaczona osoba przywitał się
na kanale między 5:00 a 7:05. Tak → losowe powitanie z oznaczeniem i seria+1.
Nie → jedno losowe przypomnienie z oznaczeniem, seria=0. Jedno sprawdzenie dziennie.

## Decyzje
- **Hosting:** GitHub Actions cron, repo prywatne pod `kimonzo`. ~60 min/mies. z 2000.
- **Stack:** Node 22, zero zależności, natywny `fetch`, `node:test`.
- **Czytanie:** token bota + REST `GET /channels/{id}/messages`, stronicowanie do granicy okna.
  Bot ma tylko View Channel + Read Message History (66560). Wymaga Message Content Intent.
- **Pisanie:** webhook kanału (własny nick/avatar). Bot celowo bez prawa Send Messages.
- **DST:** dwa crony (05:05 i 06:05 UTC), skrypt sprawdza godzinę w Europe/Warsaw.
- **Idempotencja:** `state.lastRunDate == dziś` → koniec. Chroni przed zdublowanym cronem.
- **Kolejność:** wyślij → zapisz stan. Zgubiony licznik jest tańszy niż podwójna wiadomość.
- **Dopasowanie:** leksykalne po normalizacji (lowercase, bez ogonków, granica słowa).
  Zaprzeczenia świadomie nie wykrywane — patrz README „Znane ograniczenia".
- **Błędy:** 429 → retry_after; 5xx → 1s/3s/9s; 4xx → stop z komunikatem „co sprawdzić".
  Bez ponawiania o późniejszej porze.

## Struktura
`src/main.js` jedyny z efektami ubocznymi. Reszta czyste funkcje: `window`, `greeting`,
`messages`, `discord` (fetch wstrzykiwany), `streak`. Konfiguracja w `config.json`,
stan w `state.json` commitowany przez workflow.

## Odstępstwa od pierwotnego designu
- Zapowiedziany test „brak fałszywego trafienia na *nie powiem dzień dobry*" zamieniony na
  test dokumentujący, że **to jest** trafienie. Heurystyka negacji po polsku byłaby krucha.


## Aktualizacja 2026-09-17
Repo publiczne. Tożsamość (ID kanałów, ID i nicki) przeniesiona z `config*.json` do sekretów; teksty używają `{name}`, `{artist}`, `{artistGen}`. Nazwy botów ustawiane w webhookach.
