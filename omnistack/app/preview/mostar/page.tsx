import type { Metadata } from "next";
import { Mostar } from "@/components/templates/Mostar";

/**
 * Full bleed template preview. Deliberately outside the (site) route group so
 * it inherits only the root layout: no nav, no footer, nothing framing the
 * template except the browser window.
 *
 * noindex because this is a demo surface, not a page anybody should land on
 * from search. /templates/mostar is the indexable page that describes it.
 */
export const metadata: Metadata = {
  title: "Mostar template preview",
  robots: { index: false, follow: false },
};

export default function MostarPreviewPage() {
  return <Mostar />;
}
