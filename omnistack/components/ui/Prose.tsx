import { Fragment } from "react";

/**
 * Lightweight, dependency-free renderer for article bodies. Supports:
 *   ## Heading      -> h2
 *   ### Heading     -> h3
 *   - bullet        -> <ul><li>
 *   blank line      -> new paragraph
 * Everything is rendered as text into React elements (no raw HTML), so it's
 * safe from injection.
 */
export function Prose({ body }: { body: string }) {
  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5 text-lg leading-relaxed text-muted">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());

        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                  <span>{l.replace(/^-\s+/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.startsWith("### ")) {
          return (
            <h3 key={i} className="pt-2 text-xl font-semibold tracking-tight text-fg">
              {block.replace(/^###\s+/, "")}
            </h3>
          );
        }

        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="pt-4 text-2xl font-semibold tracking-tight text-fg">
              {block.replace(/^##\s+/, "")}
            </h2>
          );
        }

        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {l}
                {j < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
