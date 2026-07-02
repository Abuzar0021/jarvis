import type { Metadata } from "next";
import { buildSearchIndex } from "@/lib/search";
import { PageHeader } from "@/components/site/PageHeader";
import { Container } from "@/components/ui/Container";
import { SearchClient } from "@/components/search/SearchClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Search",
  description: "Search across work, services, industries, and insights.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const index = await buildSearchIndex();

  return (
    <>
      <PageHeader eyebrow="Search" title={<>Find anything.</>} />
      <Container className="pb-20">
        <div className="mx-auto max-w-2xl">
          <SearchClient index={index} initialQuery={q ?? ""} />
        </div>
      </Container>
    </>
  );
}
