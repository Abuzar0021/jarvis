"use client";

import { useState } from "react";
import type { SiteContent } from "@/lib/types";
import { Card, Field, SaveBar, StringList, TextArea, Toggle } from "./fields";

export function ContentEditor({ initial }: { initial: SiteContent }) {
  const [site, setSite] = useState<SiteContent>(initial);

  const set = (patch: Partial<SiteContent>) => setSite((s) => ({ ...s, ...patch }));

  async function save() {
    const res = await fetch("/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, error: data.error };
  }

  return (
    <div className="space-y-5">
      <Card title="Brand">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand name" value={site.brand} onChange={(v) => set({ brand: v })} />
            <Field label="Founder" value={site.founder} onChange={(v) => set({ founder: v })} />
          </div>
          <Field label="Tagline" value={site.tagline} onChange={(v) => set({ tagline: v })} />
          <TextArea label="Description (SEO + intro)" value={site.description} onChange={(v) => set({ description: v })} rows={2} />
          <Field label="Footer tagline" value={site.footerTagline} onChange={(v) => set({ footerTagline: v })} />
          <Field label="Trust strip label" value={site.trustLabel} onChange={(v) => set({ trustLabel: v })} />
        </div>
      </Card>

      <Card title="Announcement bar">
        <div className="space-y-4">
          <Toggle label="Show announcement bar" checked={site.announcement.enabled} onChange={(v) => set({ announcement: { ...site.announcement, enabled: v } })} />
          <Field label="Text" value={site.announcement.text} onChange={(v) => set({ announcement: { ...site.announcement, text: v } })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link label" value={site.announcement.linkLabel} onChange={(v) => set({ announcement: { ...site.announcement, linkLabel: v } })} />
            <Field label="Link URL" value={site.announcement.linkHref} onChange={(v) => set({ announcement: { ...site.announcement, linkHref: v } })} mono />
          </div>
        </div>
      </Card>

      <Card title="Hero">
        <div className="space-y-4">
          <Field label="Eyebrow" value={site.hero.eyebrow} onChange={(v) => set({ hero: { ...site.hero, eyebrow: v } })} />
          <Field label="Headline" value={site.hero.headline} onChange={(v) => set({ hero: { ...site.hero, headline: v } })} />
          <Field label="Highlighted word (shown in gold)" value={site.hero.highlight} onChange={(v) => set({ hero: { ...site.hero, highlight: v } })} hint="Must be part of the headline above." />
          <TextArea label="Subhead" value={site.hero.subhead} onChange={(v) => set({ hero: { ...site.hero, subhead: v } })} rows={2} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary button label" value={site.hero.primaryCta.label} onChange={(v) => set({ hero: { ...site.hero, primaryCta: { ...site.hero.primaryCta, label: v } } })} />
            <Field label="Primary button link" value={site.hero.primaryCta.href} onChange={(v) => set({ hero: { ...site.hero, primaryCta: { ...site.hero.primaryCta, href: v } } })} mono />
            <Field label="Secondary button label" value={site.hero.secondaryCta.label} onChange={(v) => set({ hero: { ...site.hero, secondaryCta: { ...site.hero.secondaryCta, label: v } } })} />
            <Field label="Secondary button link" value={site.hero.secondaryCta.href} onChange={(v) => set({ hero: { ...site.hero, secondaryCta: { ...site.hero.secondaryCta, href: v } } })} mono />
          </div>
        </div>
      </Card>

      <Card title="About page">
        <div className="space-y-4">
          <Field label="Heading" value={site.about.heading} onChange={(v) => set({ about: { ...site.about, heading: v } })} />
          <TextArea label="Story" value={site.about.story} onChange={(v) => set({ about: { ...site.about, story: v } })} rows={7} hint="Separate paragraphs with a blank line." />
        </div>
      </Card>

      <Card title="Value pillars">
        <PairList
          items={site.valuePillars}
          onChange={(items) => set({ valuePillars: items })}
          addLabel="+ Add pillar"
        />
      </Card>

      <Card title="Services intro">
        <TextArea label="Intro line above services" value={site.servicesIntro} onChange={(v) => set({ servicesIntro: v })} rows={2} />
      </Card>

      <Card title="AI showcase">
        <div className="space-y-4">
          <Field label="Eyebrow" value={site.aiShowcase.eyebrow} onChange={(v) => set({ aiShowcase: { ...site.aiShowcase, eyebrow: v } })} />
          <Field label="Title" value={site.aiShowcase.title} onChange={(v) => set({ aiShowcase: { ...site.aiShowcase, title: v } })} />
          <TextArea label="Body" value={site.aiShowcase.body} onChange={(v) => set({ aiShowcase: { ...site.aiShowcase, body: v } })} rows={3} />
          <StringList label="Points" values={site.aiShowcase.points} onChange={(points) => set({ aiShowcase: { ...site.aiShowcase, points } })} />
        </div>
      </Card>

      <Card title="Process">
        <div className="space-y-4">
          <Field label="Intro" value={site.process.intro} onChange={(v) => set({ process: { ...site.process, intro: v } })} />
          <PairList
            items={site.process.steps}
            onChange={(steps) => set({ process: { ...site.process, steps } })}
            addLabel="+ Add step"
          />
        </div>
      </Card>

      <Card title="Tech stack">
        <TechStackEditor groups={site.techStack} onChange={(techStack) => set({ techStack })} />
      </Card>

      <Card title="Stats">
        <StatsEditor stats={site.stats} onChange={(stats) => set({ stats })} />
      </Card>

      <Card title="Industries">
        <NameSlugEditor items={site.industries} onChange={(industries) => set({ industries })} addLabel="+ Add industry" />
      </Card>

      <Card title="Final CTA">
        <div className="space-y-4">
          <Field label="Headline" value={site.cta.headline} onChange={(v) => set({ cta: { ...site.cta, headline: v } })} />
          <TextArea label="Body" value={site.cta.body} onChange={(v) => set({ cta: { ...site.cta, body: v } })} rows={2} />
          <Field label="Reassurance line" value={site.cta.reassurance} onChange={(v) => set({ cta: { ...site.cta, reassurance: v } })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button label" value={site.cta.button.label} onChange={(v) => set({ cta: { ...site.cta, button: { ...site.cta.button, label: v } } })} />
            <Field label="Button link" value={site.cta.button.href} onChange={(v) => set({ cta: { ...site.cta, button: { ...site.cta.button, href: v } } })} mono />
          </div>
        </div>
      </Card>

      <Card title="Pricing">
        <div className="space-y-4">
          <TextArea label="Intro" value={site.pricing.intro} onChange={(v) => set({ pricing: { ...site.pricing, intro: v } })} rows={2} />
          <Field label="Note" value={site.pricing.note} onChange={(v) => set({ pricing: { ...site.pricing, note: v } })} />
          <div>
            <span className="mb-2 block text-sm font-medium text-fg/90">Engagement models</span>
            <PricingModels models={site.pricing.models} onChange={(models) => set({ pricing: { ...site.pricing, models } })} />
          </div>
        </div>
      </Card>

      <Card title="Newsletter">
        <div className="space-y-4">
          <Field label="Title" value={site.newsletter.title} onChange={(v) => set({ newsletter: { ...site.newsletter, title: v } })} />
          <TextArea label="Body" value={site.newsletter.body} onChange={(v) => set({ newsletter: { ...site.newsletter, body: v } })} rows={2} />
        </div>
      </Card>

      <Card title="Contact details">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email (enquiries sent here)" value={site.contact.email} onChange={(v) => set({ contact: { ...site.contact, email: v } })} />
            <Field label="WhatsApp (digits only)" value={site.contact.whatsapp} onChange={(v) => set({ contact: { ...site.contact, whatsapp: v } })} hint="e.g. 353896050083" mono />
            <Field label="WhatsApp display" value={site.contact.whatsappDisplay} onChange={(v) => set({ contact: { ...site.contact, whatsappDisplay: v } })} />
            <Field label="Hours" value={site.contact.hours} onChange={(v) => set({ contact: { ...site.contact, hours: v } })} />
          </div>
          <Field label="Response time line" value={site.contact.responseTime} onChange={(v) => set({ contact: { ...site.contact, responseTime: v } })} />
          <div>
            <span className="mb-2 block text-sm font-medium text-fg/90">Locations</span>
            <LocationsEditor items={site.contact.locations} onChange={(locations) => set({ contact: { ...site.contact, locations } })} />
          </div>
        </div>
      </Card>

      <Card title="Social / contact links">
        <LabelHrefEditor items={site.social} onChange={(social) => set({ social })} addLabel="+ Add link" />
      </Card>

      <SaveBar onSave={save} />
    </div>
  );
}

/* ---- nested editors ---- */

function rowBtn(onClick: () => void, label: string) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-hair px-3 text-muted hover:border-red-500/50 hover:text-red-400" aria-label={label}>
      ×
    </button>
  );
}

const ipt = "w-full rounded-lg border border-hair bg-card px-3 py-2 text-sm focus:border-gold/60 focus:outline-none";

function PairList({
  items,
  onChange,
  addLabel,
}: {
  items: { title: string; body: string }[];
  onChange: (i: { title: string; body: string }[]) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-hair bg-card/50 p-3">
          <div className="flex gap-2">
            <input value={it.title} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))} placeholder="Title" className={ipt} />
            {rowBtn(() => onChange(items.filter((_, idx) => idx !== i)), "Remove")}
          </div>
          <textarea value={it.body} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, body: e.target.value } : x)))} placeholder="Body" rows={2} className={ipt} />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { title: "", body: "" }])} className="text-sm text-gold hover:underline">
        {addLabel}
      </button>
    </div>
  );
}

function StatsEditor({
  stats,
  onChange,
}: {
  stats: { value: string; suffix: string; label: string }[];
  onChange: (s: { value: string; suffix: string; label: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {stats.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input value={s.value} onChange={(e) => onChange(stats.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))} placeholder="98" className={`${ipt} w-20`} />
          <input value={s.suffix} onChange={(e) => onChange(stats.map((x, idx) => (idx === i ? { ...x, suffix: e.target.value } : x)))} placeholder="+ / %" className={`${ipt} w-16`} />
          <input value={s.label} onChange={(e) => onChange(stats.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} placeholder="Projects shipped" className={ipt} />
          {rowBtn(() => onChange(stats.filter((_, idx) => idx !== i)), "Remove")}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...stats, { value: "", suffix: "", label: "" }])} className="text-sm text-gold hover:underline">
        + Add stat
      </button>
    </div>
  );
}

function NameSlugEditor({
  items,
  onChange,
  addLabel,
}: {
  items: { name: string; slug: string }[];
  onChange: (i: { name: string; slug: string }[]) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input value={it.name} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} placeholder="Name" className={ipt} />
          <input value={it.slug} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, slug: e.target.value } : x)))} placeholder="slug" className={`${ipt} font-mono`} />
          {rowBtn(() => onChange(items.filter((_, idx) => idx !== i)), "Remove")}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { name: "", slug: "" }])} className="text-sm text-gold hover:underline">
        {addLabel}
      </button>
    </div>
  );
}

function LocationsEditor({
  items,
  onChange,
}: {
  items: { city: string; country: string }[];
  onChange: (i: { city: string; country: string }[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input value={it.city} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, city: e.target.value } : x)))} placeholder="City" className={ipt} />
          <input value={it.country} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, country: e.target.value } : x)))} placeholder="Country" className={ipt} />
          {rowBtn(() => onChange(items.filter((_, idx) => idx !== i)), "Remove")}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { city: "", country: "" }])} className="text-sm text-gold hover:underline">
        + Add location
      </button>
    </div>
  );
}

function LabelHrefEditor({
  items,
  onChange,
  addLabel,
}: {
  items: { label: string; href: string }[];
  onChange: (i: { label: string; href: string }[]) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input value={it.label} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} placeholder="Label" className={`${ipt} w-40`} />
          <input value={it.href} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, href: e.target.value } : x)))} placeholder="https://…" className={`${ipt} font-mono`} />
          {rowBtn(() => onChange(items.filter((_, idx) => idx !== i)), "Remove")}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { label: "", href: "" }])} className="text-sm text-gold hover:underline">
        {addLabel}
      </button>
    </div>
  );
}

function TechStackEditor({
  groups,
  onChange,
}: {
  groups: { group: string; items: string[] }[];
  onChange: (g: { group: string; items: string[] }[]) => void;
}) {
  return (
    <div className="space-y-3">
      {groups.map((g, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-hair bg-card/50 p-3">
          <div className="flex gap-2">
            <input value={g.group} onChange={(e) => onChange(groups.map((x, idx) => (idx === i ? { ...x, group: e.target.value } : x)))} placeholder="Group (e.g. Frontend)" className={ipt} />
            {rowBtn(() => onChange(groups.filter((_, idx) => idx !== i)), "Remove")}
          </div>
          <StringList label="Items" values={g.items} onChange={(items) => onChange(groups.map((x, idx) => (idx === i ? { ...x, items } : x)))} placeholder="e.g. Next.js" />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...groups, { group: "", items: [] }])} className="text-sm text-gold hover:underline">
        + Add group
      </button>
    </div>
  );
}

type PricingModel = {
  name: string;
  tagline: string;
  priceLabel: string;
  features: string[];
  highlighted: boolean;
};

function PricingModels({
  models,
  onChange,
}: {
  models: PricingModel[];
  onChange: (m: PricingModel[]) => void;
}) {
  const patch = (i: number, p: Partial<PricingModel>) =>
    onChange(models.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-3">
      {models.map((m, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-hair bg-card/50 p-3">
          <div className="flex gap-2">
            <input value={m.name} onChange={(e) => patch(i, { name: e.target.value })} placeholder="Name" className={ipt} />
            <input value={m.priceLabel} onChange={(e) => patch(i, { priceLabel: e.target.value })} placeholder="Price label" className={ipt} />
            {rowBtn(() => onChange(models.filter((_, idx) => idx !== i)), "Remove")}
          </div>
          <input value={m.tagline} onChange={(e) => patch(i, { tagline: e.target.value })} placeholder="Tagline" className={ipt} />
          <StringList label="Features" values={m.features} onChange={(features) => patch(i, { features })} placeholder="e.g. Fixed quote" />
          <Toggle label="Highlight as most popular" checked={m.highlighted} onChange={(highlighted) => patch(i, { highlighted })} />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...models, { name: "", tagline: "", priceLabel: "", features: [], highlighted: false }])} className="text-sm text-gold hover:underline">
        + Add model
      </button>
    </div>
  );
}
