// Turns home-src/index.html (the studio) into lib/home-html.ts, one document per route: /, /work,
// /about, /contact and /privacy share one page, each with its own title, description and
// canonical. The FAQ structured data is generated from the visible FAQ card, so what search
// engines and AI assistants read can never drift from what visitors see.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://omnistacksdigital.com";
const src = readFileSync(path.join(root, "home-src", "index.html"), "utf8");

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
const text = (s) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const faq = [];
for (const m of src.matchAll(/<details><summary><i>Q\d+<\/i>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)) {
  faq.push({ q: text(m[1]), a: text(m[2]) });
}
if (faq.length < 3) throw new Error("build-home: expected the FAQ entries in home-src/index.html");

const DESC = "OmniStacks Digital builds SaaS websites and iOS and Android apps, then grows them with social media marketing. Step into our studio: every object on the desk opens something.";
const PAGES = {
  home: { path: "/", title: "OmniStacks Digital | SaaS websites, mobile apps and social media marketing", desc: DESC },
  work: { path: "/work", title: "Work | OmniStacks Digital", desc: "Selected work by OmniStacks Digital: Banafee Group, FitPlanCoach and Clovey Kitchen websites, plus launch reels and brand films for social." },
  about: { path: "/about", title: "About | OmniStacks Digital", desc: "A small studio for SaaS websites, mobile apps and social media marketing: what a build includes, and answers to the questions we hear most." },
  contact: { path: "/contact", title: "Contact | OmniStacks Digital", desc: "Tell us what you are building or growing. A person replies within two working days." },
  privacy: { path: "/privacy", title: "Privacy policy | OmniStacks Digital", desc: "What OmniStacks Digital collects through the contact form, and how it is used." },
};

const graph = [
  {
    "@type": "Organization",
    "@id": `${SITE}/#org`,
    name: "OmniStacks Digital",
    alternateName: ["OSD", "OmniStack Digital"],
    url: `${SITE}/`,
    logo: `${SITE}/icon-512.png`,
    email: "omnistacksdigital@gmail.com",
    sameAs: ["https://www.instagram.com/omnistacksdigital/"],
    contactPoint: [{ "@type": "ContactPoint", contactType: "sales", email: "omnistacksdigital@gmail.com", availableLanguage: "English" }],
  },
  { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "OmniStacks Digital", inLanguage: "en", publisher: { "@id": `${SITE}/#org` } },
  {
    "@type": "ProfessionalService",
    "@id": `${SITE}/#service`,
    name: "OmniStacks Digital",
    url: `${SITE}/`,
    description: DESC,
    image: `${SITE}/home/assets/og.jpg`,
    provider: { "@id": `${SITE}/#org` },
    serviceType: ["SaaS website design and development", "iOS and Android mobile app development", "Social media marketing"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: [
        ["SaaS websites", "Marketing sites, pricing pages and onboarding that turn visitors into signups."],
        ["Mobile apps", "iOS and Android apps, cross-platform where it helps and native where it matters."],
        ["Social media marketing", "Strategy, content and paid campaigns, measured in signups and installs."],
      ].map(([name, description]) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name, description } })),
    },
  },
  {
    "@type": "FAQPage",
    "@id": `${SITE}/#faq`,
    mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
];
// the JSON-LD "</" sequence is escaped so it can never close the script tag early
const ld = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;

function render(key) {
  const p = PAGES[key];
  const url = SITE + p.path;
  let html = src;
  const swap = (re, to) => {
    if (!re.test(html)) throw new Error(`build-home: pattern not found: ${re}`);
    html = html.replace(re, to);
  };
  swap(/<title>[\s\S]*?<\/title>/, `<title>${p.title}</title>`);
  swap(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(p.desc)}">`);
  swap(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  swap(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(p.title)}">`);
  swap(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(p.desc)}">`);
  swap(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  swap(/data-page="home"/, `data-page="${key}"`);
  swap(/<form class="brief" data-endpoint=""/, '<form class="brief" data-endpoint="/api/contact"');
  swap(/<!--LD-->/, ld);
  return html;
}

const out = Object.fromEntries(Object.keys(PAGES).map((k) => [k, render(k)]));
writeFileSync(
  path.join(root, "lib", "home-html.ts"),
  `// Generated by scripts/build-home.mjs from home-src/index.html. Do not edit by hand.\nexport const STUDIO_PAGES = ${JSON.stringify(out)} as const;\nexport type StudioPage = keyof typeof STUDIO_PAGES;\n`,
);
console.log(`home-html.ts written: ${Object.keys(out).length} routes, ${out.home.length} bytes each, ${faq.length} FAQ entries`);
