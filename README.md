# Susu Malabar Jatinangor

Website for Susu Malabar, the fresh-milk shop in Jatinangor: the menu, the three shops, and a
pre-order form that sends the order to the shop on WhatsApp.

## Run it

Needs Node 22 or newer.

```sh
npm install      # only needed for screenshots
npm run dev      # http://localhost:4321, rebuilt on every page load
npm run build    # static files into dist/
npm test         # the order form's logic, and what must stay true of the built page
npm run shots -- --form --out /tmp/shots   # also the form in use, at 390 px and 320 px
```

## Before launch

Everything not yet confirmed with the owner is in `src/data.mjs`, wrapped in `tbc()`, and shows
on the page with a mark. List them with:

```sh
grep -n "tbc(" src/data.mjs
```

To see the page without the marks (for a demo), set `--tbc-mark: 0` in `src/tokens.css`.
The mark is one small amber dot after the value: the same dot on a price, an address, a heading
or a button, and never a line under it (a line reads as a link). The reason is in the tooltip.
It comes from one helper, `mark()` in `src/mark.mjs`, and the `.tbc` rules in `src/site.css`.
The footer counts them. When the owner confirms a value, unwrap it in `src/data.mjs` and its
mark goes away.

A shop with `located: false` in `src/data.mjs` stays in the list with its marked lines, but has
no map or GoFood button and is not offered for pickup. Set it to `true` (or delete the line)
once its place is known and all of that turns on.

Two things wait for the real site address (`brand.siteUrl`):

- The page leaves out its canonical link and `og:url` while the address is a placeholder. They
  come back by themselves once it is confirmed.
- `og:image` already points at `<siteUrl>/og.png`, so link previews show no picture until the
  real address is in. Check a preview in WhatsApp after that.

## Change the look

A new logo, colours and fonts are coming. Each has one place:

- **Logo:** replace `public/brand/logo.svg`. It is put into the page as it is, so
  `fill="currentColor"` makes it follow the text colour. Today it is a plain wordmark.
  `public/favicon.svg` and `public/apple-touch-icon.png` (180 px) are the same wordmark's
  initials. Replace both too.
- **Colours:** `src/tokens.css`. The names say where a colour comes from in the shop (banner,
  poster, wall). `--flavor-strawberry` is the best seller's strip on the menu. `--order` (the
  same pink) marks what is in the visitor's order. The browser bar colour follows `--banner`.
- **Fonts:** put the `.woff2` files in `public/fonts/`, add an `@font-face` at the top of
  `src/tokens.css` with `src: url("fonts/<file>.woff2")` (no leading slash), and change
  `--font-display` and `--font-body`. The page preloads whatever files are named there. If the
  new heading font is not a narrow one, set `--display-stretch: 100%` and `--display-word-gap: 0`.
  The font today is Archivo (open licence, `public/fonts/OFL-Archivo.txt`).

Then run `npm run shots` to remake the pictures and the link-preview image (`public/og.png`,
drawn by `src/card.mjs`), and `npm run check`. `test/site.test.mjs` fails on gradients, blur,
shadows, purple, emoji, and any unconfirmed value shown without its mark.

## How the menu adds to the order

Each group of drinks has a size switch in its header (14 oz or 22 oz, with the price when the
whole group shares one). A tap on a drink adds one cup in the picked size, and the switch is
the same in every group. The rules are in `src/pick.mjs` (which size, which row of the form)
and tested in `test/site.test.mjs`.

## Later: the stamp card

`brand.stampCard` in `src/data.mjs` is `null`, so nothing shows. Once its rules are decided,
fill it in (`{ title, lines: [...] }`) and the section appears between the form and the story.
The place is `stampCard()` in `src/page.mjs`.
