# OmniStack Digital - Website + Built-in CMS

A premium, black-and-gold marketing site for **OmniStack Digital** (Dublin & Jakarta),
built with **Next.js 16 + React 19 + TypeScript + Tailwind CSS v4**.

Everything on the site - projects, services, testimonials, FAQs, the hero, the
about page, contact details, WhatsApp number, announcement bar, stats and more -
is editable from a built-in **no-code admin** at `/admin`. **No coding required to
run the business.**

---

## 1. Run it locally

> You need [Node.js 20+](https://nodejs.org) and [pnpm](https://pnpm.io) (`npm i -g pnpm`).

```bash
cd omnistack
pnpm install
pnpm dev
```

Open **http://localhost:3000** - that's your website.

Open **http://localhost:3000/admin** - that's your dashboard.
The default password is **`omnistack-admin`** (change it - see below).

---

## 2. Edit your website (no code)

Go to `/admin` and sign in. From the sidebar you can:

| Section | What you can do |
| --- | --- |
| **Site content** | Edit the hero, about story, value pillars, process, stats, industries, AI section, final CTA, newsletter text, **contact email, WhatsApp number, locations**, social links, and the announcement bar. |
| **Projects** | **Add / edit / reorder / delete** portfolio projects. Upload a cover image (or paste a URL), write the case study, set tags, results, and feature it on the homepage. |
| **Services** | Add/edit/remove services and choose which appear on the homepage. |
| **Industries** | Manage industry landing pages (pain points, tailored services, SEO). |
| **Insights** | Write and manage blog articles. |
| **Testimonials** | Manage client quotes (replace the samples with real ones before launch). |
| **FAQs** | Manage the homepage FAQ. |
| **Leads** | Every contact/booking/newsletter submission lands here with source + UTM and a status workflow (new → contacted → qualified → won/lost). |
| **Media** | Upload, browse, copy URLs, and delete images. |
| **Redirects** | Manage URL redirects (applied on the next build). |
| **Tools** | Download/restore a full content backup and view the activity log. |

Public pages: home, work + case studies, **services + details**, **industries + details**, **pricing**, **insights + articles**, **about**, **contact**, **/book** (consultation), **/search**, plus legal pages. SEO: per-page metadata, JSON-LD (Organization, Service, CreativeWork, BlogPosting, FAQ, Breadcrumb), canonicals, sitemap, robots, RSS (`/feed.xml`), and a web manifest.

> **Deployment:** see [`SETUP.md`](./SETUP.md) for Docker, VPS, env, and CI details.

Click **Save changes** in any section and it goes live on the site instantly.

---

## 3. Receiving enquiries by email

When someone submits the contact form, the enquiry is **always saved** and shown in
**Admin → Leads**. To also get it emailed to you (`abuzarelahi01@gmail.com`), set SMTP
credentials in `.env.local`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=abuzarelahi01@gmail.com
SMTP_PASS=your-gmail-app-password   # Google Account → Security → App passwords
SMTP_FROM=abuzarelahi01@gmail.com
CONTACT_TO=abuzarelahi01@gmail.com
```

If these aren't set, the site still works - you just read enquiries in the admin
Leads board instead of by email.

---

## 4. Environment variables

Copy `.env.example` to `.env.local` and adjust. Sensible defaults mean the site runs
with nothing set, **but before going live you should set**:

- `ADMIN_PASSWORD` - your admin login password.
- `ADMIN_SECRET` - a long random string used to sign the login cookie.
- `NEXT_PUBLIC_SITE_URL` - your real domain (for canonical URLs + sitemap).

---

## 5. Build for production

```bash
pnpm build
pnpm start
```

### Where to deploy

Content and uploaded images are stored on disk (in `content/` and `public/uploads/`),
so deploy to a host with a **persistent filesystem** and a long-running Node server:

- **Recommended:** a VPS (e.g. Contabo), **Railway**, **Render**, or **Fly.io**.
- Run `pnpm build` then `pnpm start`.

> On serverless platforms (e.g. Vercel) the filesystem is read-only at runtime, so
> live editing/uploads won't persist there. For Vercel, edit content locally and
> redeploy, or move content to a database/object store. A VPS or Railway gives you
> the full no-code editing experience out of the box.

---

## 6. Project structure

```
omnistack/
├─ app/
│  ├─ (site)/            # public website (home, work, services, about, contact, legal)
│  ├─ (admin)/admin/     # no-code CMS dashboard
│  ├─ api/               # contact, newsletter, and admin endpoints
│  ├─ sitemap.ts robots.ts not-found.tsx layout.tsx globals.css
├─ components/           # ui, sections, site chrome, motion, admin
├─ content/              # editable JSON: site, projects, services, testimonials, faqs, leads
├─ lib/                  # content loader, auth, validation, email, utils
└─ public/uploads/       # images uploaded from the admin
```

## 7. Tech & design

- **Brand:** matte black `#050505` + rich gold `#D4AF37`, Geist typeface.
- **Motion:** reveal-on-scroll, count-up stats, marquee, nav frost, mobile overlay -
  all respecting `prefers-reduced-motion`.
- **Accessibility:** semantic HTML, visible gold focus rings, keyboard-friendly menus.
- **SEO:** per-page metadata, JSON-LD on case studies and services, sitemap & robots.
