// Content model for OmniStack Digital. Everything here is editable from /admin
// (no code required) and persisted to JSON files in /content.

export type CTA = { label: string; href: string };

export type ValuePillar = { title: string; body: string };

export type ProcessStep = { title: string; body: string };

export type Stat = { value: string; suffix: string; label: string };

export type TechGroup = { group: string; items: string[] };

export interface Industry {
  id: string;
  name: string;
  slug: string;
  summary: string;
  painPoints: string[];
  services: string[]; // service slugs to feature
  body: string;
  cover: string;
  featured: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
}

export type SocialLink = { label: string; href: string };

export type Location = { city: string; country: string };

export type ServiceGroup = "Build" | "AI" | "Design" | "Grow";

export interface Service {
  id: string;
  name: string;
  slug: string;
  group: ServiceGroup;
  summary: string;
  body: string;
  deliverables: string[];
  featured: boolean;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  client: string;
  category: string;
  year: string;
  summary: string;
  body: string;
  // Structured case-study narrative (preferred). Falls back to `body` if empty.
  challenge: string;
  approach: string;
  outcome: string;
  gallery: string[]; // additional image URLs
  testimonialId: string; // optional linked testimonial
  cover: string; // image URL (optional) — falls back to a branded gradient
  url: string; // live site link
  tags: string[];
  services: string[];
  results: { label: string; value: string }[];
  featured: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorRole: string;
  company: string;
  featured: boolean;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string; // supports ## headings, - bullets, and blank-line paragraphs
  cover: string;
  category: string;
  author: string;
  publishedAt: string; // YYYY-MM-DD
  featured: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  service: string;
  budget: string;
  message: string;
  source: string;
  page: string; // path the form was submitted from
  utm: string; // compact UTM string, e.g. "source=google&medium=cpc"
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  createdAt: string;
}

export interface SiteContent {
  brand: string;
  tagline: string;
  description: string;
  founder: string;

  about: {
    heading: string;
    story: string; // paragraphs separated by blank lines
  };

  announcement: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkHref: string;
  };

  hero: {
    eyebrow: string;
    headline: string;
    highlight: string; // the gold word/phrase inside the headline
    subhead: string;
    primaryCta: CTA;
    secondaryCta: CTA;
  };

  trustLabel: string;

  valuePillars: ValuePillar[];

  servicesIntro: string;

  aiShowcase: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  };

  process: {
    intro: string;
    steps: ProcessStep[];
  };

  techStack: TechGroup[];

  stats: Stat[];

  cta: {
    headline: string;
    body: string;
    reassurance: string;
    button: CTA;
  };

  pricing: {
    intro: string;
    note: string;
    models: {
      name: string;
      tagline: string;
      priceLabel: string;
      features: string[];
      highlighted: boolean;
    }[];
  };

  newsletter: {
    title: string;
    body: string;
  };

  booking: {
    enabled: boolean; // show the calendar embed
    calendarUrl: string; // Cal.com / Calendly embed URL
    heading: string;
    intro: string;
    expectations: string[];
  };

  contact: {
    email: string;
    whatsapp: string; // digits only, e.g. 353896050083
    whatsappDisplay: string; // +353 89 605 0083
    locations: Location[];
    hours: string;
    responseTime: string;
  };

  social: SocialLink[];

  footerTagline: string;
}

export type ContentBundle = {
  site: SiteContent;
  projects: Project[];
  services: Service[];
  testimonials: Testimonial[];
  faqs: Faq[];
};
