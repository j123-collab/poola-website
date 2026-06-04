# Poola — relaunch website

Static, multi-page early-access site for the Poola relaunch.
*All crowd-sourcing. One powerful audience. — Make waves.*

## Pages
- `index.html` — Home + waitlist
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

## ⚙️ Waitlist form — one step to go live
The email form is wired in `main.js` (`WAITLIST_ENDPOINT`). Until it's set it
validates + shows the success state but does **not** store emails.

To collect real signups, create a free [Formspree](https://formspree.io) form and
replace the placeholder:
```js
var WAITLIST_ENDPOINT = "https://formspree.io/f/your-id";
```
(Or ask Claude to wire it to the existing Firebase/Firestore project instead.)

## Deploy
GitHub Pages from `main`. Live at `https://j123-collab.github.io/poola-website/`.
The `poola.io` domain can be pointed here later via a `CNAME` file + DNS.

## Assets
Source brand + app imagery comes from `~/Desktop/CV DATA/Poola/`
(logos, illustration, and the Oct 2025 pitch deck). Originals are untouched;
working copies live in `assets/`.
