import nodemailer from "nodemailer";
import type { Lead, SiteContent } from "./types";

/**
 * Sends new-lead notifications over SMTP when SMTP_* env vars are configured.
 * If email is not configured, this is a graceful no-op - the lead is still
 * stored and visible in /admin, so nothing ever errors.
 */
function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function esc(s: string): string {
  return String(s).replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
  );
}

export async function sendLeadEmail(
  lead: Lead,
  site: SiteContent,
): Promise<{ sent: boolean; error?: string }> {
  const transport = getTransport();
  if (!transport) return { sent: false };

  const to = process.env.CONTACT_TO || site.contact.email;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || to;

  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Company", lead.company],
    ["Service", lead.service],
    ["Budget", lead.budget],
    ["Source", lead.source],
  ];

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2 style="margin:0 0 4px">New enquiry - ${esc(site.brand)}</h2>
    <p style="color:#666;margin:0 0 16px">A new requirement was submitted on your website.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows
        .filter(([, v]) => v)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 8px;color:#888;width:110px">${k}</td><td style="padding:6px 8px;font-weight:600">${esc(v)}</td></tr>`,
        )
        .join("")}
    </table>
    <div style="margin:16px 0;padding:14px 16px;background:#f6f6f6;border-radius:8px;white-space:pre-wrap;font-size:14px">${esc(lead.message)}</div>
    <p style="color:#999;font-size:12px">Received ${new Date(lead.createdAt).toUTCString()}</p>
  </div>`;

  try {
    await transport.sendMail({
      from: `"${site.brand} Website" <${from}>`,
      to,
      replyTo: lead.email,
      subject: `New enquiry from ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
      html,
      text: `New enquiry\n\n${rows
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}\n\n${lead.message}`,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
