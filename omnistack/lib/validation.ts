import { z } from "zod";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().regex(EMAIL, "Enter a valid email").max(200),
  company: z.string().trim().max(160).optional().default(""),
  service: z.string().trim().max(120).optional().default(""),
  budget: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().min(10, "Tell us a little more").max(5000),
  source: z.string().trim().max(40).optional().default("contact"),
  page: z.string().trim().max(200).optional().default(""),
  utm: z.string().trim().max(400).optional().default(""),
  // Honeypot - must be empty.
  website: z.string().max(0).optional().default(""),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const newsletterSchema = z.object({
  email: z.string().trim().regex(EMAIL, "Enter a valid email").max(200),
  website: z.string().max(0).optional().default(""),
});

export const projectSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(120).optional().default(""),
  client: z.string().trim().max(160).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
  year: z.string().trim().max(12).optional().default(""),
  summary: z.string().trim().max(600).optional().default(""),
  body: z.string().trim().max(8000).optional().default(""),
  challenge: z.string().trim().max(4000).optional().default(""),
  approach: z.string().trim().max(4000).optional().default(""),
  outcome: z.string().trim().max(4000).optional().default(""),
  gallery: z.array(z.string().trim().max(600)).optional().default([]),
  testimonialId: z.string().trim().max(60).optional().default(""),
  cover: z.string().trim().max(600).optional().default(""),
  logo: z.string().trim().max(600).optional().default(""),
  url: z.string().trim().max(400).optional().default(""),
  tags: z.array(z.string().trim().max(60)).optional().default([]),
  services: z.array(z.string().trim().max(80)).optional().default([]),
  results: z
    .array(
      z.object({
        label: z.string().trim().max(80),
        value: z.string().trim().max(40),
      }),
    )
    .optional()
    .default([]),
  featured: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
  seoTitle: z.string().trim().max(160).optional().default(""),
  seoDescription: z.string().trim().max(300).optional().default(""),
});

export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional().default(""),
  group: z.enum(["Build", "AI", "Design", "Grow"]),
  summary: z.string().trim().max(400).optional().default(""),
  body: z.string().trim().max(6000).optional().default(""),
  deliverables: z.array(z.string().trim().max(160)).optional().default([]),
  featured: z.boolean().optional().default(false),
});

export const testimonialSchema = z.object({
  id: z.string().optional(),
  quote: z.string().trim().min(5).max(1000),
  authorName: z.string().trim().max(120).optional().default(""),
  authorRole: z.string().trim().max(120).optional().default(""),
  company: z.string().trim().max(120).optional().default(""),
  featured: z.boolean().optional().default(false),
});

export const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(2).max(3000),
  category: z.string().trim().max(80).optional().default("General"),
});

export const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(120).optional().default(""),
  excerpt: z.string().trim().max(400).optional().default(""),
  body: z.string().trim().max(20000).optional().default(""),
  cover: z.string().trim().max(600).optional().default(""),
  category: z.string().trim().max(80).optional().default("Guides"),
  author: z.string().trim().max(80).optional().default(""),
  publishedAt: z.string().trim().max(40).optional().default(""),
  featured: z.boolean().optional().default(false),
  seoTitle: z.string().trim().max(160).optional().default(""),
  seoDescription: z.string().trim().max(300).optional().default(""),
});

export const industrySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional().default(""),
  summary: z.string().trim().max(400).optional().default(""),
  painPoints: z.array(z.string().trim().max(200)).optional().default([]),
  services: z.array(z.string().trim().max(120)).optional().default([]),
  body: z.string().trim().max(8000).optional().default(""),
  cover: z.string().trim().max(600).optional().default(""),
  featured: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
  seoTitle: z.string().trim().max(160).optional().default(""),
  seoDescription: z.string().trim().max(300).optional().default(""),
});

export const redirectSchema = z.object({
  id: z.string().optional(),
  from: z.string().trim().min(1).max(300),
  to: z.string().trim().min(1).max(400),
  permanent: z.boolean().optional().default(true),
});

const cta = z.object({ label: z.string().max(60), href: z.string().max(200) });

export const siteSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(400),
  founder: z.string().trim().max(80),
  about: z.object({
    heading: z.string().max(160),
    story: z.string().max(4000),
  }),
  announcement: z.object({
    enabled: z.boolean(),
    text: z.string().max(200),
    linkLabel: z.string().max(60),
    linkHref: z.string().max(200),
  }),
  hero: z.object({
    eyebrow: z.string().max(80),
    headline: z.string().max(160),
    highlight: z.string().max(80),
    subhead: z.string().max(400),
    note: z.string().max(120),
    annotations: z.array(z.string().max(80)),
    primaryCta: cta,
    secondaryCta: cta,
  }),
  trustLabel: z.string().max(160),
  valuePillars: z.array(z.object({ title: z.string().max(80), body: z.string().max(300) })),
  servicesIntro: z.string().max(400),
  aiShowcase: z.object({
    eyebrow: z.string().max(80),
    title: z.string().max(160),
    body: z.string().max(600),
    points: z.array(z.string().max(160)),
  }),
  process: z.object({
    intro: z.string().max(300),
    steps: z.array(z.object({ title: z.string().max(80), body: z.string().max(300) })),
  }),
  techStack: z.array(z.object({ group: z.string().max(60), items: z.array(z.string().max(60)) })),
  stats: z.array(
    z.object({ value: z.string().max(20), suffix: z.string().max(10), label: z.string().max(80) }),
  ),
  cta: z.object({
    headline: z.string().max(160),
    body: z.string().max(400),
    reassurance: z.string().max(160),
    button: cta,
  }),
  pricing: z.object({
    intro: z.string().max(400),
    note: z.string().max(300),
    models: z.array(
      z.object({
        name: z.string().max(60),
        tagline: z.string().max(160),
        priceLabel: z.string().max(60),
        features: z.array(z.string().max(160)),
        highlighted: z.boolean(),
      }),
    ),
  }),
  newsletter: z.object({ title: z.string().max(120), body: z.string().max(300) }),
  booking: z.object({
    enabled: z.boolean(),
    calendarUrl: z.string().max(400),
    heading: z.string().max(160),
    intro: z.string().max(400),
    expectations: z.array(z.string().max(200)),
  }),
  contact: z.object({
    email: z.string().regex(EMAIL).max(200),
    whatsapp: z.string().max(20),
    whatsappDisplay: z.string().max(40),
    locations: z.array(z.object({ city: z.string().max(60), country: z.string().max(60) })),
    hours: z.string().max(120),
    responseTime: z.string().max(120),
  }),
  social: z.array(z.object({ label: z.string().max(40), href: z.string().max(200) })),
  footerTagline: z.string().max(200),
});
