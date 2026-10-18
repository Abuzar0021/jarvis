# Studio source

`index.html` here is the whole site (the OmniStacks Digital 3D studio). It is not a React page.

- It is built in the standalone `osd-studio` folder (`node tools/build.mjs --base=/home/`), which
  writes this file and everything in `public/home/`.
- `scripts/build-home.mjs` turns it into `lib/home-html.ts` on every `pnpm build`: one document per
  route (`/`, `/work`, `/about`, `/contact`, `/privacy`) with its own title and canonical, plus the
  JSON-LD, including FAQ data generated from the visible FAQ card.
- `app/route.ts` and `app/<page>/route.ts` serve them.
- JavaScript and CSS in `public/home/` have hashed names; models, fonts and media never change
  under the same name (cached for 30 days).
- The brief form posts to `/api/contact`, so every lead appears in `/admin/leads` and is emailed.

To change the design, edit the standalone studio and copy it in again; do not hand-edit
`lib/home-html.ts` or the files in `public/home/`.
