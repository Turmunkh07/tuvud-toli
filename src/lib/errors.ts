/**
 * An error whose message is written for an admin to read and is safe to show
 * in the UI. Anything else thrown out of a data-layer function (a libsql
 * driver error, a constraint violation naming internal columns) must NOT have
 * its raw `.message` rendered, so callers check for this type before
 * surfacing text and fall back to a generic message otherwise.
 *
 * Not marked server-only: it is a plain class with no data access, and the
 * seed script and other non-Next contexts may need to catch it.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/**
 * The message to show an admin for a caught error: the author's own wording
 * when it was raised deliberately, otherwise the caller's generic fallback.
 */
export function userFacingMessage(error: unknown, fallback: string): string {
  return error instanceof UserFacingError ? error.message : fallback;
}
