// Lightweight environment validation. Returns warnings rather than throwing,
// so the site still boots in development with sensible defaults.

export function validateEnv(): string[] {
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!process.env.ADMIN_PASSWORD) {
      warnings.push("ADMIN_PASSWORD is not set — the admin login uses an insecure default. Set it before launch.");
    }
    if (!process.env.ADMIN_SECRET && !process.env.AUTH_SECRET) {
      warnings.push("ADMIN_SECRET is not set — the session cookie is signed with an insecure default. Set it before launch.");
    }
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      warnings.push("NEXT_PUBLIC_SITE_URL is not set — canonical URLs and the sitemap fall back to http://localhost:3000.");
    }
    const smtpPartial =
      process.env.SMTP_HOST || process.env.SMTP_USER || process.env.SMTP_PASS;
    const smtpComplete =
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    if (smtpPartial && !smtpComplete) {
      warnings.push("SMTP_* is partially configured — email notifications need SMTP_HOST, SMTP_USER, and SMTP_PASS together.");
    }
  }

  return warnings;
}
