// Tozsamosc (ID kanalow, ID i nicki ludzi) NIE siedzi w repo — przychodzi z sekretow.
// Repo jest publiczne; GitHub maskuje wartosci sekretow w logach.

/** Zwraca obiekt z wartosciami; brakujace zbiera i zglasza wszystkie naraz. */
export function requireEnv(env, names) {
  const missing = names.filter((n) => !env[n]);
  if (missing.length) {
    throw new Error(
      `Brakuje sekretow: ${missing.join(', ')}. Ustaw je w Settings -> Secrets and variables -> Actions.`,
    );
  }
  return Object.fromEntries(names.map((n) => [n, env[n]]));
}
