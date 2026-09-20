import { Reveal } from "@/components/motion/Reveal";
import type { ProcessStep } from "@/lib/types";

/**
 * The design's process block: a sticky left column against a hairline-ruled
 * list of steps that tilt in alternately as they rise.
 *
 * The design draws four steps; the real process has five, so the list maps the
 * array and the last row gets the lit gold numeral.
 */
export function Process({
  steps,
  intro,
}: {
  steps: ProcessStep[];
  intro: string;
}) {
  if (!steps.length) return null;

  return (
    <section
      id="process"
      className="relative px-5 pb-[clamp(90px,15vh,170px)] pt-[clamp(80px,12vh,150px)] sm:px-8 lg:px-16"
    >
      <div className="mx-auto grid max-w-[1240px] items-start gap-[clamp(40px,6vw,90px)] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <div className="lg:sticky lg:top-[clamp(110px,18vh,190px)]">
          <Reveal>
            <div className="eyebrow mb-[18px]">The build</div>
            <h2 className="display-serif m-0 mb-[22px] text-[clamp(34px,5vw,68px)] text-fg">
              {steps.length} steps,
              <br />
              then it&rsquo;s <span className="serif-accent text-gold">yours</span>.
            </h2>
            <p className="m-0 max-w-[24em] text-pretty text-sm leading-[1.7] text-muted">
              {intro}
            </p>
          </Reveal>
        </div>

        <div className="flex flex-col">
          {steps.map((s, i) => {
            const last = i === steps.length - 1;
            return (
              <Reveal
                key={s.title}
                delay={i * 0.12}
                y={34}
                rotate={i % 2 ? -1.2 : 1.2}
              >
                <div
                  className={`flex gap-[clamp(18px,3vw,34px)] border-t border-hair py-[clamp(24px,3vh,34px)] ${
                    last ? "border-b" : ""
                  }`}
                >
                  <span
                    className={`min-w-[2.2em] font-serif text-[clamp(30px,3.4vw,46px)] leading-none ${
                      last ? "text-gold" : "text-gold/40"
                    }`}
                    style={
                      last
                        ? { textShadow: "0 0 30px rgba(198,161,91,.5)" }
                        : undefined
                    }
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="m-0 mb-2.5 text-[15px] font-semibold uppercase tracking-[0.16em] text-fg">
                      {s.title}
                    </h3>
                    <p className="m-0 max-w-[34em] text-pretty text-sm leading-[1.7] text-muted">
                      {s.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
