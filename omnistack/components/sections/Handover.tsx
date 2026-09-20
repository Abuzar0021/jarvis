import { Reveal } from "@/components/motion/Reveal";

/**
 * "Own the code" is the central promise of the whole site, and until now it was
 * only ever stated. This turns it into an itemised list of what actually
 * changes hands, which is the difference between a claim and evidence.
 *
 * Every item here is already promised elsewhere in the site copy (the Handover
 * process step and the Own the code pillar). Nothing new is claimed.
 */
const ITEMS: { title: string; body: string }[] = [
  {
    title: "The repository",
    body: "Full git history, transferred to your account. Hire anyone next, or nobody.",
  },
  {
    title: "The domain",
    body: "Registered in your name, with the registrar login handed over.",
  },
  {
    title: "The hosting account",
    body: "Your account, your card, a few dollars a month. Never billed through me.",
  },
  {
    title: "Analytics",
    body: "Set up and connected, reporting to an account you control.",
  },
  {
    title: "A walkthrough",
    body: "A short recorded video of how to edit, deploy and roll back.",
  },
];

export function Handover() {
  return (
    <section
      id="handover"
      className="relative border-t border-hair px-5 py-[clamp(70px,11vh,130px)] sm:px-8 lg:px-16"
    >
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="max-w-[38em]">
            <div className="eyebrow mb-4">Handover day</div>
            <h2 className="display-serif m-0 text-[clamp(28px,3.6vw,48px)] text-fg">
              What actually lands{" "}
              <span className="serif-accent text-gold">in your name</span>.
            </h2>
          </div>
        </Reveal>

        <ul className="mt-[clamp(32px,5vh,56px)] grid gap-px overflow-hidden rounded-[3px] border border-hair bg-hair sm:grid-cols-2 lg:grid-cols-5">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={0.06 + i * 0.06}>
              <li className="flex h-full flex-col gap-2.5 bg-page p-6">
                <span
                  className="block h-[9px] w-[9px] rotate-45 border border-gold shadow-[0_0_12px_rgba(198,161,91,.5)]"
                  aria-hidden
                />
                <h3 className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg">
                  {item.title}
                </h3>
                <p className="m-0 text-pretty text-[13.5px] leading-[1.65] text-muted">
                  {item.body}
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
