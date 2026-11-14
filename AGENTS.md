## Project map

The website of Susu Malabar, a student-run fresh-milk shop in Jatinangor. Indonesian, phone first.
Plain HTML, CSS and a little JavaScript, built by `build.mjs` with no packages.

- `src/data.mjs`: every fact on the page (menu, prices, shops, links, WhatsApp number). Anything not
  confirmed by the owner is wrapped in `tbc()` and shows on the page with a visible mark.
  `grep -n "tbc(" src/data.mjs` lists them. Never add a fact that isn't in Arqila's research.
- `src/order.mjs`: the pre-order form's logic with no DOM (check, message, wa.me link). Tested in
  `test/order.test.mjs`. `src/pick.mjs`: what a tap on the menu adds (which size, which row).
- `src/page.mjs`: the page template. `src/card.mjs`: the link-preview card (photographed to
  `public/og.png`). `src/favicon.mjs`: the tab icon, drawn from the logo file at build time.
- `src/photos.mjs`: every photo on the page (which original, the crop, the sizes, the alt text) and
  which shop or drink it belongs to. `scripts/photos.mjs` (`npm run photos`) cuts them from
  `public/assets/real/` into `public/assets/photos/`. Originals are never edited and not shipped.
- `src/tokens.css`: colours, fonts, sizes. The only place to change the brand look.
- `public/brand/logo.svg`: the logo, one file: the shop's real badge in one colour.
- `docs/brand-notes.md`: how the shop's own posts look and sound. Read it before changing the design.

Commands: `npm run dev` (http://localhost:4321), `npm run build` (into `dist/`), `npm test`,
`npm run shots` (pictures into `docs/screenshots/`, `public/og.png` and `public/apple-touch-icon.png`),
`npm run photos` (only after changing a photo or its crop).

## Rules

- Never put on the site: revenue, the "Malabar means source of money" story, Mount Malabar, cows, a
  dairy farm, the milk supplier or any farm name. The shop's feed has such posts: leave them out.
- Photos: only ones the shop posted itself (listed in `public/assets/real/SOURCES.md`), never made
  bigger than the original, never retouched or generated, no words over a photo, one treatment
  for all (square corners, edge to edge on a phone). No photo grid of equal squares, no slideshow.
- Two voices, one per band of the page: the heavy sans (menu, order) and the serif italic (shops,
  story, quotes). Pink means strawberry and the visitor's order, nothing else.
- No AI-made look: no gradient hero, glassy pills, purple or indigo, emoji as icons, stock marketing
  lines, three identical cards in a row, tiny all-caps labels with wide spacing, a badge on
  everything, decoration with no job, a grey box around everything, a sentence explaining the
  screen, pale rounded icon tiles. The look comes from the shop itself.
- Words follow the `ui-copywriting` skill (casual student Indonesian, short, no em dash).
- Do not deploy anywhere. Push only to github.com/pablonification/susu-malabar.
