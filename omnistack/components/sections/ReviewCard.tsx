import type { Testimonial } from "@/lib/types";
import { attribution, cn } from "@/lib/utils";

/**
 * Two different absences, told apart on purpose.
 *
 * A reviewer who ticked "publish this without my name" did ask for anonymity.
 * A record that never captured a name did not. Claiming the first about the
 * second is a small untruth on a page whose whole argument is that its reviews
 * are checked, so the neutral line is used unless the reviewer actually asked.
 */
const WITHHELD_BY_REQUEST = "Name withheld at the client's request";
const NO_NAME_ON_RECORD = "Reviewed by a client";

/**
 * Always rendered, including the empty case. /reviews tells the reader that
 * unmarked reviews are unverified and that the card says so, so the card has
 * to actually say it. A silently absent badge is not a disclosure, and the
 * claim on that page is the one thing here that carries legal weight.
 */
const VERIFICATION: Record<Testimonial["verifiedBy"], string> = {
  "": "Not verified",
  email: "Email confirmed",
  handover: "Verified at handover",
};

/**
 * The monogram stands in for a photo. A stock avatar silhouette is worse than
 * nothing: it implies a face we do not have. With no initial to fall back on,
 * the house diamond mark carries the slot instead.
 */
function Monogram({ initial }: { initial: string }) {
  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] border border-hair bg-card-2"
    >
      {initial ? (
        <span className="font-serif text-[17px] leading-none text-gold">{initial}</span>
      ) : (
        <span className="block h-[9px] w-[9px] rotate-45 border border-gold" />
      )}
    </span>
  );
}

/** "Nov 2025" from a YYYY-MM string, or "" if the field is empty or malformed. */
function monthLabel(value: string): string {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!m) return "";
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return date.toLocaleDateString("en-IE", { month: "short", year: "numeric" });
}

/**
 * The single review presentation, shared by the homepage, /reviews and the
 * case study pages, so attribution can never drift between them.
 *
 * "list" renders as a bare cell on bg-page: it is designed to sit inside a
 * `gap-px bg-hair` grid, which draws the hairlines between cells for it.
 * "featured" is self contained and carries its own border.
 *
 * The card itself is not focusable and holds no interactive content. A card
 * sized tab stop that goes nowhere is noise in the keyboard order.
 */
export function ReviewCard({
  review,
  variant = "list",
  className,
}: {
  review: Testimonial;
  variant?: "featured" | "list";
  className?: string;
}) {
  const { line1, line2 } = attribution(review);
  const featured = variant === "featured";
  const initial = (line1 || review.company || review.authorRole)
    .trim()
    .charAt(0)
    .toUpperCase();
  const delivered = monthLabel(review.deliveredOn);
  const verified = review.verifiedBy !== "";
  const verification = VERIFICATION[review.verifiedBy];
  const meta = [review.projectScope, delivered].filter(Boolean);

  return (
    <figure
      className={cn(
        "relative flex h-full flex-col",
        featured
          ? "rounded-[3px] border border-hair bg-card p-7 sm:p-10"
          : "bg-page p-6 sm:p-7",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "font-serif leading-none text-gold",
          featured ? "text-[44px]" : "text-[30px]",
        )}
      >
        &ldquo;
      </span>

      <blockquote
        className={cn(
          "mt-2 text-pretty text-fg/85",
          featured
            ? "text-[clamp(19px,2.1vw,26px)] leading-[1.45] tracking-[-0.01em]"
            : "text-[15px] leading-[1.7]",
        )}
      >
        {review.quote}
      </blockquote>

      <figcaption className="mt-auto flex items-start gap-3.5 pt-7">
        <Monogram initial={initial} />
        <span className="min-w-0">
          {line1 ? (
            <span className="block text-[14px] font-medium text-fg">{line1}</span>
          ) : (
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
              {review.nameWithheld ? WITHHELD_BY_REQUEST : NO_NAME_ON_RECORD}
            </span>
          )}
          {line2 ? (
            <span className="mt-1 block text-[13px] leading-[1.5] text-muted">{line2}</span>
          ) : null}
          {meta.length > 0 ? (
            <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {meta.map((part, i) => (
                <span key={part}>
                  {i > 0 ? (
                    <span aria-hidden className="px-1.5">
                      &middot;
                    </span>
                  ) : null}
                  {part}
                </span>
              ))}
            </span>
          ) : null}
          {/* The unverified state is stated plainly but not dressed as a
              warning. It is a fact about our records, not a judgement on the
              person who wrote the review. */}
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-2 rounded-[3px] border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em]",
              verified ? "border-hair text-gold" : "border-hair/60 text-muted",
            )}
          >
            {verified ? (
              <span aria-hidden className="block h-[5px] w-[5px] rotate-45 border border-gold" />
            ) : null}
            {verification}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
