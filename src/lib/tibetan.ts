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
