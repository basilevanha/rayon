const LETTER = /\p{L}/gu;
const MIN_LETTERS_FOR_PLURAL = 4;

function stripPlural(word: string): string {
  const letters = word.match(LETTER)?.length ?? 0;
  if (letters < MIN_LETTERS_FOR_PLURAL) return word;
  return /[sx]$/.test(word) ? word.slice(0, -1) : word;
}

/** Normalized form used to compare names and searches (REC-02). */
export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replaceAll("œ", "oe")
    .replaceAll("æ", "ae")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(stripPlural)
    .join(" ");
}
