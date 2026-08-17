/**
 * Headwords typed from ten different books by ten different people will not
 * agree byte-for-byte. This produces the key entries are merged on, so the same
 * word from different sources lands on one page instead of splitting into
 * near-identical duplicates.
 *
 * Normalised away:
 *   - Unicode composition differences (NFC), e.g. precomposed vs combining marks
 *   - any whitespace, which Tibetan does not use between syllables
 *   - trailing tsheg (་) and shad (།), which sources include inconsistently
 *
 * The original spelling is still stored and displayed; this is only the key.
 * Not marked server-only: the seed script imports it outside the Next runtime.
 */
export function normalizeTibetanTerm(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\s+/gu, "")
    // U+0F0B tsheg, U+0F0C non-breaking tsheg, U+0F0D/U+0F0E shad — trailing only.
    .replace(/[་༌།༎]+$/u, "")
    .trim();
}

/** The 30 consonants in traditional order — the shelf a word is filed under. */
export const TIBETAN_LETTERS = [
  "ཀ", "ཁ", "ག", "ང",
  "ཅ", "ཆ", "ཇ", "ཉ",
  "ཏ", "ཐ", "ད", "ན",
  "པ", "ཕ", "བ", "མ",
  "ཙ", "ཚ", "ཛ", "ཝ",
  "ཞ", "ཟ", "འ", "ཡ",
  "ར", "ལ", "ཤ", "ས",
  "ཧ", "ཨ",
] as const;

const BASE_FIRST = 0x0f40;
const BASE_LAST = 0x0f6c;
const SUBJOINED_FIRST = 0x0f90;
const SUBJOINED_LAST = 0x0fbc;
/** Distance between a consonant and its subjoined form: ཀ U+0F40 → ྐ U+0F90. */
const SUBJOINED_OFFSET = 0x50;

/** Only these five may stand before the root as སྔོན་འཇུག. */
const PREFIXES = new Set(["ག", "ད", "བ", "མ", "འ"]);
/** Only these three may sit above it as མགོ་ཅན. */
const SUPERSCRIPTS = new Set(["ར", "ལ", "ས"]);
/** Only these may follow it as རྗེས་འཇུག. */
const SUFFIXES = new Set(["ག", "ང", "ད", "ན", "བ", "མ", "འ", "ར", "ལ", "ས"]);
/** Subjoined letters that hang *below* the root without displacing it. */
const SUBSCRIPTS = new Set([0x0fad, 0x0fb1, 0x0fb2, 0x0fb3]); // ྭ ྱ ྲ ླ

function isVowelSign(cp: number): boolean {
  return (cp >= 0x0f71 && cp <= 0x0f7d) || cp === 0x0f80 || cp === 0x0f81;
}

type Stack = { base: string; subjoined: number[]; hasVowel: boolean };

/**
 * A syllable is a run of stacks: each a full-form consonant plus whatever is
 * subjoined beneath it. Unicode already encodes the distinction we need —
 * a prefix sits *beside* the root and stays a full-form letter, whereas a
 * superscript's root is written subjoined underneath it.
 */
function parseStacks(syllable: string): Stack[] {
  const stacks: Stack[] = [];
  for (const char of syllable) {
    const cp = char.codePointAt(0)!;
    if (cp >= BASE_FIRST && cp <= BASE_LAST) {
      stacks.push({ base: char, subjoined: [], hasVowel: false });
    } else if (cp >= SUBJOINED_FIRST && cp <= SUBJOINED_LAST) {
      stacks[stacks.length - 1]?.subjoined.push(cp);
    } else if (isVowelSign(cp)) {
      const last = stacks[stacks.length - 1];
      if (last) last.hasVowel = true;
    }
  }
  return stacks;
}

function rootOfStack(stack: Stack): string {
  // A superscript is written first but is not the root; the letter subjoined
  // beneath it is. Subscripts (ya/ra/la/wa btags) hang below without taking
  // that role, so they are skipped when looking for a displaced root.
  const displaced = stack.subjoined.find((cp) => !SUBSCRIPTS.has(cp));
  if (displaced !== undefined && SUPERSCRIPTS.has(stack.base)) {
    return String.fromCodePoint(displaced - SUBJOINED_OFFSET);
  }
  return stack.base;
}

/**
 * The མིང་གཞི་ (root letter) a word files under — what a Tibetan dictionary
 * alphabetises by, ignoring prefixes, superscripts, subscripts and suffixes.
 * `བཀྲ་ཤིས་` belongs under ཀ, not བ.
 *
 * Returns null for input with no Tibetan consonant at all.
 *
 * Known limit: a two-letter syllable carrying no written vowel — `གད` — is
 * genuinely ambiguous in the script itself, readable as either root+suffix or
 * prefix+root. The far commoner root+suffix reading is chosen. Everything
 * with a written vowel, or a third stack, is decided rather than guessed.
 */
export function tibetanRootLetter(term: string): string | null {
  const firstSyllable = normalizeTibetanTerm(term).split(/[་༌།༎]/u)[0] ?? "";
  const stacks = parseStacks(firstSyllable);
  if (stacks.length === 0) return null;
  if (stacks.length === 1) return rootOfStack(stacks[0]);

  // A written vowel sits on the root stack, which settles it outright.
  const vowelStack = stacks.findIndex((stack) => stack.hasVowel);
  if (vowelStack >= 0) return rootOfStack(stacks[vowelStack]);

  if (!PREFIXES.has(stacks[0].base)) return rootOfStack(stacks[0]);

  // Leading letter *could* be a prefix. With a third stack it must be one
  // (prefix-root-suffix); with only two it is likelier a root plus its suffix,
  // unless the second letter is one that can never be a suffix.
  if (stacks.length > 2) return rootOfStack(stacks[1]);
  return SUFFIXES.has(stacks[1].base) ? rootOfStack(stacks[0]) : rootOfStack(stacks[1]);
}

/**
 * Orders words the way a Tibetan dictionary does: by root letter first, then
 * by spelling. Plain codepoint order would scatter a root's words across the
 * alphabet according to whichever prefix each happens to carry.
 */
/**
 * Every derived index column for a headword, produced together so a caller
 * can never write one and forget another — a word with a stale sortKey files
 * itself under the wrong letter silently.
 */
export function wordIndexFields(term: string) {
  return {
    termKey: normalizeTibetanTerm(term),
    rootLetter: tibetanRootLetter(term),
    sortKey: tibetanSortKey(term),
  };
}

export function tibetanSortKey(term: string): string {
  const root = tibetanRootLetter(term);
  const index = root ? TIBETAN_LETTERS.indexOf(root as (typeof TIBETAN_LETTERS)[number]) : -1;
  // Unknown roots sort last rather than colliding with ཀ at index 0.
  const bucket = String(index < 0 ? 99 : index).padStart(2, "0");
  return `${bucket}:${normalizeTibetanTerm(term)}`;
}
