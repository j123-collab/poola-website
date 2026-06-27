# Poola — relaunch website

Static Astro site for the Poola relaunch.
*All crowd-sourcing. One powerful audience.*

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run deploy
```

Local dev and preview run at `http://localhost:8080`.

## Pages

- `index.html` — Home, About + downloads
- `how-it-works.html` — Product (Pools, People Power, toolkit)
- `features.html` — Competitive feature map and product operating system story
- `pricing.html` — Fee examples, multi-currency calculator and cost transparency
- `pool-starters.html` — Pool Starter CRM, commitments, scheduling and fee clarity
- `partners.html` — Partner matching, widgets, First Responder Pools and metrics
- `trust-status.html` — Transparent Pool states and trust language
- `investors.html` — Market wedge, moat, launch strategy and funding narrative
- `shop.html` — Free maker library preview
- `contact.html` — Support, partnerships, press and security contact paths
- `press.html` — Press overview and story angles
- `careers.html` — Future roles and hiring placeholder
- `terms.html` — Terms and conditions
- `privacy.html` — Privacy policy
- `cookies.html` — Cookie policy
- `refund-policy.html` — Funding and refunds
- `safety.html` — Safety center
- `community-guidelines.html` — Community rules
- `security.html` — Security and disclosure
- `accessibility.html` — Accessibility commitment
- `delete-account.html` — Account deletion instructions

## Structure

- `src/layouts/BaseLayout.astro` owns the document head, progress layer, shared nav, footer, CSS and JS.
- `src/components/Nav.astro` is the one canonical top navigation.
- `src/components/Footer.astro` is the one canonical footer.
- `src/pages/*.astro` are the route bodies converted from the previous HTML pages.
- `public/assets/` is copied through to `/assets/...` in the built site.

## Deploy

`npm run build` writes static output to `dist/`.

Pushes to `main` build and publish the site through GitHub Actions at
`https://j123-collab.github.io/poola-website/`.

`wrangler.jsonc` also points Cloudflare Workers static assets at `./dist`, so
`npm run deploy` remains available for a direct Cloudflare deployment.
