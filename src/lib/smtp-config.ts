/**
 * Single source of truth for SMTP settings, shared by the app and by
 * `npm run test:email`. Deliberately not marked server-only so the CLI script
 * can import it — it reads configuration, never secrets belonging to a request.
 */
export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
};

export function isMailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_FROM,
  );
}

/** Returns null rather than throwing so callers can degrade gracefully. */
export function smtpConfigFromEnv(): SmtpConfig | null {
  if (!isMailConfigured()) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);

  return {
    host: process.env.SMTP_HOST!,
    port,
    // 465 is implicit TLS; 587 and 2525 upgrade via STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    from: process.env.SMTP_FROM!,
  };
}
