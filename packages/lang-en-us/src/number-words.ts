// packages/lang-en-us/src/number-words.ts
//
// Count-word spelling for list/count rendering (ADR-190): spell out 1–10
// ("one".."ten"), use numerals for 11 and above. Used by the count formatter and
// by list count-grouping.

const SMALL = [
  'zero', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
];

/**
 * Render a count as a word for 1–10, or a numeral for 0 and 11+.
 *
 * @param n a non-negative integer count
 * @returns "one".."ten" for 1–10, otherwise the numeral as a string
 */
export function countWord(n: number): string {
  if (n >= 1 && n <= 10) return SMALL[n];
  return String(n);
}

// --- full cardinal speller (ADR-198 Numeral atom) --------------------------

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES: Array<[number, string]> = [
  [1_000_000_000, 'billion'],
  [1_000_000, 'million'],
  [1_000, 'thousand'],
];

/** Spell 0–999 ("one hundred and five"). */
function under1000(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const o = n % 10;
    return o ? `${t}-${ONES[o]}` : t;
  }
  const h = `${ONES[Math.floor(n / 100)]} hundred`;
  const rest = n % 100;
  return rest ? `${h} and ${under1000(rest)}` : h;
}

/**
 * Spell an integer in words: ones/teens/tens, hundreds with "and", and the
 * thousand/million/billion scales. Negatives prefix "minus"; non-integers fall
 * back to digits. The general speller for the `Numeral` atom (ADR-198) —
 * distinct from {@link countWord}, which caps at ten for list grouping.
 *
 * @param value the number to spell
 * @returns the cardinal words, e.g. 105 → "one hundred and five"
 */
export function numberToWords(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (!Number.isInteger(value)) return String(value);
  if (value === 0) return 'zero';
  if (value < 0) return `minus ${numberToWords(-value)}`;

  const parts: string[] = [];
  let remainder = value;
  for (const [scale, name] of SCALES) {
    if (remainder >= scale) {
      parts.push(`${numberToWords(Math.floor(remainder / scale))} ${name}`);
      remainder %= scale;
    }
  }
  if (remainder > 0) {
    // British-style "and" before a trailing <100 group when there is a higher group.
    parts.push(parts.length && remainder < 100 ? `and ${under1000(remainder)}` : under1000(remainder));
  }
  return parts.join(' ');
}

/**
 * The ordinal surface of an integer: digits + suffix, handling the 11–13
 * exception (1st, 2nd, 3rd, 4th, 11th, 21st). Non-integers fall back to digits.
 *
 * @param value the number to ordinalize
 * @returns e.g. 3 → "3rd", 11 → "11th"
 */
export function ordinalString(value: number): string {
  if (!Number.isInteger(value)) return String(value);
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  let suffix = 'th';
  if (abs < 11 || abs > 13) {
    suffix = last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th';
  }
  return `${value}${suffix}`;
}
