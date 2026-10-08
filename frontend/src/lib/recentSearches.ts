// Ҷустуҷӯҳои охирини корбар дар localStorage (танҳо дар ҳамин браузер).

const STORAGE_KEY = "recent-searches";
const LIMIT = 8;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return value.filter((x): x is string => typeof x === "string").slice(0, LIMIT);
  } catch {
    return [];
  }
}

function write(list: string[]): string[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage дастрас нест — рӯйхат танҳо дар хотираи саҳифа мемонад.
  }
  return list;
}

export function loadRecentSearches(): string[] {
  return read();
}

export function addRecentSearch(term: string): string[] {
  const lower = term.toLowerCase();
  const rest = read().filter((x) => x.toLowerCase() !== lower);
  return write([term, ...rest].slice(0, LIMIT));
}

export function removeRecentSearch(term: string): string[] {
  return write(read().filter((x) => x !== term));
}

export function clearRecentSearches(): string[] {
  return write([]);
}
