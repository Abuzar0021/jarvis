/**
 * Privacy-friendly, cookieless analytics via self-hosted Umami.
 * Renders nothing unless NEXT_PUBLIC_UMAMI_SRC and NEXT_PUBLIC_UMAMI_WEBSITE_ID
 * are configured, so it's a no-op by default.
 */
export function Analytics() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return null;
  return <script defer src={src} data-website-id={websiteId} />;
}
