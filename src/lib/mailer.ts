import "server-only";
import nodemailer from "nodemailer";
import { smtpConfigFromEnv } from "@/lib/smtp-config";

/**
 * SMTP is optional. When it isn't configured the invite still succeeds and the
 * generated password is shown to the inviter to pass on by hand — better than
 * silently reporting "sent" for mail that never left.
 */
export { isMailConfigured } from "@/lib/smtp-config";

function buildTransport() {
  const config = smtpConfigFromEnv();
  if (!config) throw new Error("SMTP is not configured.");
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}

export type InviteEmail = {
  to: string;
  name: string;
  password: string;
  invitedBy: string;
  loginUrl: string;
};

export async function sendInviteEmail(invite: InviteEmail): Promise<void> {
  const transport = buildTransport();

  const text = [
    `Сайн байна уу, ${invite.name}.`,
    "",
    `${invite.invitedBy} таныг Төвөд-Монгол толь бичгийн хамтран ажиллагч болгон урьлаа.`,
    "",
    "Нэвтрэх мэдээлэл:",
    `  Хаяг:     ${invite.loginUrl}`,
    `  Имэйл:    ${invite.to}`,
    `  Нууц үг:  ${invite.password}`,
    "",
    "Энэ нууц үгийг бусдад бүү дамжуулна уу.",
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;line-height:1.6;color:#1b1b1b">
      <p>Сайн байна уу, ${escapeHtml(invite.name)}.</p>
      <p>${escapeHtml(invite.invitedBy)} таныг <strong>Төвөд-Монгол толь</strong> бичгийн хамтран ажиллагч болгон урьлаа.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#5b6360">Хаяг</td><td><a href="${escapeHtml(invite.loginUrl)}" style="color:#2e7d32">${escapeHtml(invite.loginUrl)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#5b6360">Имэйл</td><td>${escapeHtml(invite.to)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#5b6360">Нууц үг</td><td><code style="background:#f8f9fa;padding:2px 6px;border-radius:4px">${escapeHtml(invite.password)}</code></td></tr>
      </table>
      <p style="color:#5b6360;font-size:14px">Энэ нууц үгийг бусдад бүү дамжуулна уу.</p>
    </div>
  `;

  await transport.sendMail({
    from: smtpConfigFromEnv()!.from,
    to: invite.to,
    subject: "Төвөд-Монгол толь — хамтран ажиллах урилга",
    text,
    html,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
