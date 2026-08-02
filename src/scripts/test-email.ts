/**
 * Verifies SMTP settings without inviting anyone:
 *   npm run test:email -- you@example.com
 *
 * Checks the connection and credentials first, then sends one plain message, so
 * a failure points at the actual cause instead of a generic send error.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import nodemailer from "nodemailer";
import { smtpConfigFromEnv } from "../lib/smtp-config";

const recipient = process.argv[2];

if (!recipient) {
  console.error("Usage: npm run test:email -- you@example.com");
  process.exit(1);
}

const smtp = smtpConfigFromEnv();

if (!smtp) {
  console.error("SMTP is not configured. Set these in .env.local:\n");
  for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]) {
    console.error(`  ${key}=${process.env[key] ? "(set)" : "(missing)"}`);
  }
  process.exit(1);
}

async function main() {
  console.log(`Host:   ${smtp!.host}:${smtp!.port} (secure: ${smtp!.secure})`);
  console.log(`User:   ${smtp!.auth.user}`);
  console.log(`From:   ${smtp!.from}`);
  console.log(`To:     ${recipient}\n`);

  const transport = nodemailer.createTransport({
    host: smtp!.host,
    port: smtp!.port,
    secure: smtp!.secure,
    auth: smtp!.auth,
  });

  console.log("Verifying connection and credentials...");
  await transport.verify();
  console.log("  OK\n");

  console.log("Sending test message...");
  const info = await transport.sendMail({
    from: smtp!.from,
    to: recipient,
    subject: "Төвөд-Монгол толь — SMTP test",
    text: "If you are reading this, invitation emails will work.",
  });

  console.log(`  Sent. Message id: ${info.messageId}`);
  if (info.rejected?.length) {
    console.log(`  Rejected: ${info.rejected.join(", ")}`);
  }
  console.log("\nCheck the inbox (and the spam folder).");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nFailed: ${message}`);
  if (/invalid login|535|authentication/i.test(message)) {
    console.error("→ SMTP_USER / SMTP_PASSWORD are wrong. These are the SMTP");
    console.error("  credentials from your provider, not your account login.");
  } else if (/ENOTFOUND|EAI_AGAIN/i.test(message)) {
    console.error("→ SMTP_HOST is wrong or unreachable.");
  } else if (/ETIMEDOUT|ECONNREFUSED/i.test(message)) {
    console.error("→ Port blocked. Try 2525, or 587, or 465 with implicit TLS.");
  } else if (/sender|from|not verified|550/i.test(message)) {
    console.error("→ SMTP_FROM is not a verified sender with your provider.");
  }
  process.exit(1);
});
