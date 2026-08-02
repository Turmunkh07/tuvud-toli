import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  TURSO_DATABASE_URL: required("TURSO_DATABASE_URL"),
  TURSO_AUTH_TOKEN: required("TURSO_AUTH_TOKEN"),
  // JSON array of admins, e.g. [{"name":"Turmunkh","password":"..."}]
  ADMIN_USERS: required("ADMIN_USERS"),
  // Signing key for admin session cookies. Generate with `openssl rand -base64 32`.
  AUTH_SECRET: required("AUTH_SECRET"),
} as const;
