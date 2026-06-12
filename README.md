# Poola — relaunch website

Static, multi-page download site for the Poola relaunch.
*All crowd-sourcing. One powerful audience.*

## Pages
- `index.html` — Home + downloads
- `how-it-works.html` — Product (Pools, People Power, toolkit)
- `about.html` — Story, vision & contact

## Stack
Plain HTML / CSS / JS — no build step. Fonts via Google Fonts (Space Grotesk + Inter),
icons via Font Awesome 6.5.1 CDN. App imagery cropped from the Oct 2025 pitch deck.

## Local preview
```bash
cd poola-website
python3 -m http.server 8080
# open http://localhost:8080
```

## Downloads
The homepage includes platform cards for iOS, Android, Windows, macOS and Linux.
Until real store URLs or app files exist, the buttons show an honest "coming soon"
state rather than linking to fake downloads. Add real links in `index.html` when
the builds are ready.

## Deploy
GitHub Pages from `main`. Live at `https://j123-collab.github.io/poola-website/`.
The `poola.io` domain can be pointed here later via a `CNAME` file + DNS.

## Assets
Source brand + app imagery comes from the Poola brand files and product stills.
Working copies live in `assets/`.
