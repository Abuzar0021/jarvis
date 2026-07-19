import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ActivityEntry,
  Faq,
  Industry,
  Lead,
  Post,
  Project,
  Redirect,
  Service,
  SiteContent,
  Testimonial,
} from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(CONTENT_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(CONTENT_DIR, file),
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
}

/* ---------------------------------------------------------------- Site --- */

const FALLBACK_SITE: SiteContent = {
  brand: "OmniStack Digital",
  tagline: "Products that feel inevitable.",
  description:
    "The senior team that owns brand, design, engineering, and AI - so your product ships fast and feels like it was always meant to exist.",
  founder: "Zar",
  about: { heading: "", story: "" },
  announcement: { enabled: false, text: "", linkLabel: "", linkHref: "" },
  hero: {
    eyebrow: "Digital product studio",
    headline: "Products that feel inevitable.",
    highlight: "inevitable",
    subhead:
      "We're the senior team that owns brand, design, engineering, and AI - so your product ships fast and feels like it was always meant to exist.",
    primaryCta: { label: "Book a Call", href: "/contact" },
    secondaryCta: { label: "See our work", href: "/work" },
  },
  trustLabel: "Trusted by founders, agencies, and teams shipping at scale.",
  valuePillars: [],
  servicesIntro: "",
  aiShowcase: { eyebrow: "", title: "", body: "", points: [] },
  process: { intro: "", steps: [] },
  techStack: [],
  stats: [],
  cta: {
    headline: "Let's build something inevitable.",
    body: "",
    reassurance: "We reply within one business day.",
    button: { label: "Book a Call", href: "/contact" },
  },
  pricing: { intro: "", note: "", models: [] },
  newsletter: { title: "", body: "" },
  booking: { enabled: false, calendarUrl: "", heading: "", intro: "", expectations: [] },
  contact: {
    email: "abuzarelahi01@gmail.com",
    whatsapp: "353896050083",
    whatsappDisplay: "+353 89 605 0083",
    locations: [
      { city: "Dublin", country: "Ireland" },
      { city: "Jakarta", country: "Indonesia" },
    ],
    hours: "Mon-Fri",
    responseTime: "We reply within one business day.",
  },
  social: [],
  footerTagline: "Brand, product, and AI, built by one senior team.",
};

export async function getSite(): Promise<SiteContent> {
  return readJson<SiteContent>("site.json", FALLBACK_SITE);
}

export async function saveSite(site: SiteContent): Promise<void> {
  await writeJson("site.json", site);
}

/* ------------------------------------------------------------ Projects --- */

export async function getProjects(): Promise<Project[]> {
  const list = await readJson<Project[]>("projects.json", []);
  return [...list].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
  );
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
}

export async function getFeaturedProjects(limit = 3): Promise<Project[]> {
  const all = await getProjects();
  const featured = all.filter((p) => p.featured);
  return (featured.length ? featured : all).slice(0, limit);
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await writeJson("projects.json", projects);
}

/* ------------------------------------------------------------ Services --- */

export async function getServices(): Promise<Service[]> {
  return readJson<Service[]>("services.json", []);
}

export async function getService(slug: string): Promise<Service | undefined> {
  return (await getServices()).find((s) => s.slug === slug);
}

export async function saveServices(services: Service[]): Promise<void> {
  await writeJson("services.json", services);
}

/* -------------------------------------------------------- Testimonials --- */

export async function getTestimonials(): Promise<Testimonial[]> {
  return readJson<Testimonial[]>("testimonials.json", []);
}

export async function saveTestimonials(items: Testimonial[]): Promise<void> {
  await writeJson("testimonials.json", items);
}

/* ---------------------------------------------------------------- FAQs --- */

export async function getFaqs(): Promise<Faq[]> {
  return readJson<Faq[]>("faqs.json", []);
}

export async function saveFaqs(items: Faq[]): Promise<void> {
  await writeJson("faqs.json", items);
}

/* --------------------------------------------------------------- Posts --- */

export async function getPosts(): Promise<Post[]> {
  const list = await readJson<Post[]>("posts.json", []);
  return [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPost(slug: string): Promise<Post | undefined> {
  return (await getPosts()).find((p) => p.slug === slug);
}

export async function getFeaturedPosts(limit = 3): Promise<Post[]> {
  return (await getPosts()).slice(0, limit);
}

export async function savePosts(items: Post[]): Promise<void> {
  await writeJson("posts.json", items);
}

/* ---------------------------------------------------------- Industries --- */

export async function getIndustries(): Promise<Industry[]> {
  const list = await readJson<Industry[]>("industries.json", []);
  return [...list].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export async function getIndustry(slug: string): Promise<Industry | undefined> {
  return (await getIndustries()).find((i) => i.slug === slug);
}

export async function saveIndustries(items: Industry[]): Promise<void> {
  await writeJson("industries.json", items);
}

/* --------------------------------------------------------------- Leads --- */

export async function getLeads(): Promise<Lead[]> {
  const list = await readJson<Lead[]>("leads.json", []);
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addLead(lead: Lead): Promise<void> {
  const list = await readJson<Lead[]>("leads.json", []);
  list.push(lead);
  await writeJson("leads.json", list);
}

export async function saveLeads(items: Lead[]): Promise<void> {
  await writeJson("leads.json", items);
}

/* ----------------------------------------------------------- Redirects --- */

export async function getRedirects(): Promise<Redirect[]> {
  return readJson<Redirect[]>("redirects.json", []);
}

export async function saveRedirects(items: Redirect[]): Promise<void> {
  await writeJson("redirects.json", items);
}

/* ------------------------------------------------------------ Activity --- */

export async function getActivity(): Promise<ActivityEntry[]> {
  const list = await readJson<ActivityEntry[]>("activity.json", []);
  return [...list].sort((a, b) => b.at.localeCompare(a.at));
}

export async function addActivity(action: string, detail: string): Promise<void> {
  const list = await readJson<ActivityEntry[]>("activity.json", []);
  list.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    detail,
    at: new Date().toISOString(),
  });
  // Keep the most recent 200 entries.
  await writeJson("activity.json", list.slice(-200));
}

/* -------------------------------------------------------------- Backup --- */

export async function getContentBundle() {
  const [site, projects, services, testimonials, faqs, posts, industries, redirects, leads] =
    await Promise.all([
      getSite(),
      getProjects(),
      getServices(),
      getTestimonials(),
      getFaqs(),
      getPosts(),
      getIndustries(),
      getRedirects(),
      getLeads(),
    ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    site,
    projects,
    services,
    testimonials,
    faqs,
    posts,
    industries,
    redirects,
    leads,
  };
}

type Bundle = Awaited<ReturnType<typeof getContentBundle>>;

export async function restoreContentBundle(bundle: Partial<Bundle>): Promise<void> {
  if (bundle.site) await saveSite(bundle.site);
  if (Array.isArray(bundle.projects)) await saveProjects(bundle.projects);
  if (Array.isArray(bundle.services)) await saveServices(bundle.services);
  if (Array.isArray(bundle.testimonials)) await saveTestimonials(bundle.testimonials);
  if (Array.isArray(bundle.faqs)) await saveFaqs(bundle.faqs);
  if (Array.isArray(bundle.posts)) await savePosts(bundle.posts);
  if (Array.isArray(bundle.industries)) await saveIndustries(bundle.industries);
  if (Array.isArray(bundle.redirects)) await saveRedirects(bundle.redirects);
  if (Array.isArray(bundle.leads)) await saveLeads(bundle.leads);
}
