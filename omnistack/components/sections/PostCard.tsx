import Link from "next/link";
import type { Post } from "@/lib/types";
import { coverGradient, formatDate, readingTime } from "@/lib/utils";
import { Spotlight } from "@/components/motion/Spotlight";

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/insights/${post.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hair bg-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_60px_-30px_rgba(27,22,14,0.14)]"
    >
      <Spotlight />
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{ background: coverGradient(post.slug) }}
      >
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover}
            alt={post.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute left-5 top-5 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
            {post.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-gold">{post.category}</span>
          <span aria-hidden>·</span>
          <span>{readingTime(post.body)} min read</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight">{post.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
        <p className="mt-4 text-xs text-muted">{formatDate(post.publishedAt)}</p>
      </div>
    </Link>
  );
}
