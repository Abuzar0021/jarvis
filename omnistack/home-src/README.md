# Homepage source

`index.html` here is the whole homepage (the Strawberry scroll film). It is not a React page.

- `scripts/build-home.mjs` turns it into `lib/home-html.ts` on every `pnpm build`, and writes the
  FAQ structured data from the visible question cards.
- `app/route.ts` serves it at `/`.
- CSS, JavaScript, fonts, paintings and the film frames live in `public/home/` (cached for 30 days).
- The brief form posts to `/api/contact`, so every lead appears in `/admin/leads` and is emailed.

To change the design, edit the standalone Strawberry site and copy it in again; do not hand-edit
`lib/home-html.ts` or the HTML in `public/home/`.
