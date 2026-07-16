/** Small text utilities shared across the scoring/selection stages. */

export function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Count how many of `needles` appear as substrings in `haystack`. */
export function countMatches(haystack: string, needles: string[]): string[] {
  const hay = normalize(haystack);
  const seen = new Set<string>();
  for (const n of needles) {
    const key = normalize(n);
    if (key && hay.includes(key)) seen.add(key);
  }
  return [...seen];
}

/** True if any needle appears in the haystack. */
export function anyMatch(haystack: string, needles: string[]): boolean {
  return countMatches(haystack, needles).length > 0;
}

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
