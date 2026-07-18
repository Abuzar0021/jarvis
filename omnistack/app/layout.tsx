import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import "@fontsource-variable/archivo";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { getSite } from "@/lib/content";
import { Analytics } from "@/components/site/Analytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${site.brand} - ${site.tagline}`,
      template: `%s - ${site.brand}`,
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
      url: siteUrl,
      // title/description intentionally omitted so each page's own
      // title + description cascade into og:title / og:description.
    },
    twitter: {
      card: "summary_large_image",
      // title/description cascade from each page as above.
    },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#f2efe6",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = await getSite();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: site.brand,
      url: siteUrl,
      description: site.description,
      email: site.contact.email,
      telephone: `+${site.contact.whatsapp}`,
      image: `${siteUrl}/opengraph-image`,
      address: site.contact.locations.map((l) => ({
        "@type": "PostalAddress",
        addressLocality: l.city,
        addressCountry: l.country,
      })),
      areaServed: site.contact.locations.map((l) => ({
        "@type": "City",
        name: l.city,
      })),
      // schema.org needs strict day-code format, so this is written by hand
      // from site.hours ("Mon-Fri, 9:00-18:00") rather than parsed from it -
      // update both together if the hours ever change.
      openingHours: "Mo-Fr 09:00-18:00",
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
      className={`${GeistMono.variable} h-full`}
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
