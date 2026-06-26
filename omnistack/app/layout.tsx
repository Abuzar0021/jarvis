import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { getSite } from "@/lib/content";
import { Analytics } from "@/components/site/Analytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${site.brand} — ${site.tagline}`,
      template: `%s — ${site.brand}`,
    },
    description: site.description,
    applicationName: site.brand,
    keywords: [
      "digital product agency",
      "full stack development agency",
      "AI automation agency",
      "web design Dublin",
      "Next.js development agency",
    ],
    authors: [{ name: site.brand }],
    openGraph: {
      type: "website",
      siteName: site.brand,
      title: `${site.brand} — ${site.tagline}`,
      description: site.description,
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.brand} — ${site.tagline}`,
      description: site.description,
    },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = await getSite();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: site.brand,
      url: siteUrl,
      description: site.description,
      email: site.contact.email,
      address: site.contact.locations.map((l) => ({
        "@type": "PostalAddress",
        addressLocality: l.city,
        addressCountry: l.country,
      })),
      sameAs: site.social.map((s) => s.href),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.brand,
      url: siteUrl,
    },
  ];

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-base text-fg antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
