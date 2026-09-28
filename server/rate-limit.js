// Einfacher Sperr-Zähler gegen Erraten (Einrichtungscode, Login, Registrierung):
// nach maxAttempts Fehlversuchen für einen Schlüssel (z. B. IP-Adresse, oder
// IP+Benutzername) gesperrt für lockoutMs. Nur im Arbeitsspeicher (wie die
// Sitzungen in auth.js) - ein Serverneustart setzt alle Sperren zurück, was für
// eine kleine, selbst gehostete App unkritisch ist.
function makeAttemptLimiter({ maxAttempts, lockoutMs }) {
  const state = new Map(); // key -> { count, lockedUntil }

  function check(key) {
    const entry = state.get(key);
    if (!entry) return { allowed: true };
    if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
      return { allowed: false, retryAfterMs: entry.lockedUntil - Date.now() };
    }
    if (entry.lockedUntil) {
      // Sperre abgelaufen - wieder bei 0 Fehlversuchen anfangen.
      state.delete(key);
    }
    return { allowed: true };
  }

  function recordFailure(key) {
    const entry = state.get(key) || { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= maxAttempts) {
      entry.lockedUntil = Date.now() + lockoutMs;
      entry.count = 0;
    }
    state.set(key, entry);
  }

  function recordSuccess(key) {
    state.delete(key);
  }

  return { check, recordFailure, recordSuccess };
}

module.exports = { makeAttemptLimiter };
