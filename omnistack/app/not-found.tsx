import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LogoMark } from "@/components/site/Logo";

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page text-center">
      <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2" aria-hidden />
      <Container className="py-24">
        <Link href="/" className="mx-auto inline-flex" aria-label="Home">
          <LogoMark className="h-9 w-9" />
        </Link>
        <p className="mt-8 font-mono text-sm uppercase tracking-[0.18em] text-gold">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          This page took a detour.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-full border border-gold/60 bg-gold-soft px-5 py-2.5 text-sm font-medium text-fg transition-all hover:border-gold hover:bg-gold/15"
          >
            Back to home
          </Link>
          <Link href="/work" className="text-sm text-muted transition-colors hover:text-fg">
            View our work →
          </Link>
        </div>
      </Container>
    </div>
  );
}
