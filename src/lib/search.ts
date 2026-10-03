import { foldName, normalizeName } from "@/lib/normalize";

export type SearchArticle = {
  id: string;
  name: string;
};

export type SearchResult<A extends SearchArticle> = {
  article: A;
  /** false: matched with one typo (REC-03). */
  exact: boolean;
};

type Entry<A extends SearchArticle> = {
  article: A;
  normalized: string;
  tokens: string[];
};

export type SearchIndex<A extends SearchArticle> = {
  entries: Entry<A>[];
  normalizedNames: Set<string>;
};

const MIN_LETTERS_FOR_TYPO = 4;
const LETTER = /\p{L}/gu;
// Words are compared one by one; an apostrophe or a hyphen also separates words (§16.1).
const SEPARATOR = /[\s'’-]+/u;

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

function tokenize(normalized: string): string[] {
  return normalized.split(SEPARATOR).filter(Boolean);
}

/** Built once per article list, so that each keystroke only compares strings (REC-04). */
export function createSearchIndex<A extends SearchArticle>(articles: readonly A[]): SearchIndex<A> {
  const entries = articles.map((article) => {
    const normalized = normalizeName(article.name);
    return { article, normalized, tokens: tokenize(normalized) };
  });
  return { entries, normalizedNames: new Set(entries.map((e) => e.normalized)) };
}

/** At most one substitution, insertion, deletion or transposition between a and b. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  const restA = a.slice(i + 1);
  const restB = b.slice(i + 1);
  if (a.length === b.length) {
    if (restA === restB) return true; // substitution
    // transposition
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return a.length > b.length ? restA === b.slice(i) : a.slice(i) === restB;
}

/**
 * A query word matches a word of the name by prefix, or by prefix with one typo when the
 * typed word has at least 4 letters, counted before the plural is removed (REC-02, REC-03).
 */
function matchWord(
  word: string,
  typedLetters: number,
  tokens: readonly string[],
): "exact" | "approx" | null {
  if (tokens.some((t) => t.startsWith(word))) return "exact";
  if (typedLetters < MIN_LETTERS_FOR_TYPO) return null;
  const fuzzy = tokens.some((t) =>
    [word.length - 1, word.length, word.length + 1].some(
      (length) => length <= t.length && withinOneEdit(word, t.slice(0, length)),
    ),
  );
  return fuzzy ? "approx" : null;
}

// Exact before approximate (REC-03); then the same name, then names starting with the query.
function rank(exact: boolean, normalized: string, query: string): number {
  if (!exact) return 3;
  if (normalized === query) return 0;
  return normalized.startsWith(query) ? 1 : 2;
}

/** Search over every non-deleted article of the list, whatever its status (REC-01 to REC-07). */
export function searchArticles<A extends SearchArticle>(
  index: SearchIndex<A>,
  query: string,
): { results: SearchResult<A>[]; canCreate: boolean } {
  const normalizedQuery = normalizeName(query);
  const words = tokenize(normalizedQuery);
  if (words.length === 0) return { results: [], canCreate: false };
  // Same split as `words`, before the plural rule: « piis » keeps its 4 letters.
  const typedLetters = tokenize(foldName(query)).map((w) => w.match(LETTER)?.length ?? 0);

  const ranked: { result: SearchResult<A>; rank: number }[] = [];
  for (const entry of index.entries) {
    let exact = true;
    let matched = true;
    for (const [i, word] of words.entries()) {
      const match = matchWord(word, typedLetters[i] ?? 0, entry.tokens);
      if (match === null) {
        matched = false;
        break;
      }
      if (match === "approx") exact = false;
    }
    if (matched) {
      ranked.push({
        result: { article: entry.article, exact },
        rank: rank(exact, entry.normalized, normalizedQuery),
      });
    }
  }

  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      collator.compare(a.result.article.name, b.result.article.name) ||
      (a.result.article.id < b.result.article.id ? -1 : 1),
  );
  return {
    results: ranked.map((r) => r.result),
    // REC-07 : « Créer » only when no article has exactly the same normalized name.
    canCreate: !index.normalizedNames.has(normalizedQuery),
  };
}
