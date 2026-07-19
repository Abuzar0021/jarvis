import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio CMS",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-page text-fg">{children}</div>;
}
