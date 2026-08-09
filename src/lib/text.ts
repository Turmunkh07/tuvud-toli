/**
 * Tidies a user-supplied filename for storage and display in the audit log.
 *
 * Truncation iterates code points rather than slicing the string directly:
 * `String.prototype.slice` counts UTF-16 code units, so cutting a name that
 * contains an astral-plane character (an emoji, say) can land between the two
 * halves of a surrogate pair and leave a lone surrogate behind — which is
 * then lossily replaced on the way to the database.
 */
export function cleanFileName(raw: string, maxLength = 200): string {
  const cleaned = raw.normalize("NFC").replace(/\s+/gu, " ").trim();
  const codePoints = Array.from(cleaned);
  if (codePoints.length <= maxLength) return cleaned;
  return `${codePoints.slice(0, maxLength).join("")}…`;
}
