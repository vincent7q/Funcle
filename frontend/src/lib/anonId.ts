/**
 * Stable anonymous identifier for a browser, persisted in localStorage. Lets
 * the backend resume a player's daily session across reloads (§3.1, §5) without
 * requiring an account. Created lazily on first use.
 */
const KEY = 'funcle_uid';

export function getAnonId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
