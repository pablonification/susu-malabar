## Project map

The website of Susu Malabar, a student-run fresh-milk shop in Jatinangor. Indonesian, phone first.
Plain HTML, CSS and a little JavaScript, built by `build.mjs` with no packages.

- `src/data.mjs`: every fact on the page (menu, prices, shops, links, WhatsApp number). Anything not
  confirmed by the owner is wrapped in `tbc()` and shows on the page with a visible mark.
  `grep -n "tbc(" src/data.mjs` lists them. Never add a fact that isn't in Arqila's research.
- `src/order.mjs`: the pre-order form's logic with no DOM (check, message, wa.me link). Tested in
  `test/order.test.mjs`.
- `src/page.mjs`: the page template. `src/card.mjs`: the link-preview card (photographed to `public/og.png`).
- `src/tokens.css`: colours, fonts, sizes. The only place to change the brand look.
- `public/brand/`: the logo (one file). Until the new logo arrives (due 17 Nov) it is a plain wordmark.

Commands: `npm run dev` (http://localhost:4321), `npm run build` (into `dist/`), `npm test`,
`npm run shots` (pictures into `docs/screenshots/`, and `public/og.png`).

## Rules

- Never put on the site: revenue, the "Malabar means source of money" story, Mount Malabar, a dairy
  farm or any farm name. None of it is confirmed.
- No AI-made look: no gradient hero, glassy pills, purple or indigo, emoji as icons, stock marketing
  lines, three identical cards in a row, tiny all-caps labels with wide spacing, a badge on
  everything, decoration with no job, a grey box around everything, a sentence explaining the
  screen, pale rounded icon tiles. The look comes from the shop itself.
- Words follow the `ui-copywriting` skill (casual student Indonesian, short, no em dash).
- Do not deploy anywhere. Push only to github.com/pablonification/susu-malabar.
