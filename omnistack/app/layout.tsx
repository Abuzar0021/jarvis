import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { getSite } from "@/lib/content";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-base text-fg antialiased">{children}</body>
    </html>
  );
}
