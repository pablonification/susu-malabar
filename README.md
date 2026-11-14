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
npm run shots -- --form --out /tmp/shots   # also the form in use, on a phone
```

## Before launch

Everything not yet confirmed with the owner is in `src/data.mjs`, wrapped in `tbc()`, and shows
on the page with a mark. List them with:

```sh
grep -n "tbc(" src/data.mjs
```

To see the page without the marks (for a demo), set `--tbc-mark: 0` in `src/tokens.css`.
A plain value gets a dashed underline. The label of a button, link or heading gets a small dot
instead (`mark(x, show, "dot")`), since an underline there reads as a link. The reason is in the
tooltip. Both come from one helper, `mark()` in `src/mark.mjs`, and the `.tbc` rules in
`src/site.css`. The footer counts them. When the owner confirms a value, unwrap it in
`src/data.mjs` and its mark goes away.

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
  poster, wall). A fruit has its own colour, `--flavor-<drink id>`, and a drink without one
  shows no dot. `--order` (the strawberry pink) marks what is in the visitor's order. The
  browser bar colour follows `--banner`.
- **Fonts:** put the `.woff2` files in `public/fonts/`, add an `@font-face` at the top of
  `src/tokens.css` with `src: url("fonts/<file>.woff2")` (no leading slash), and change
  `--font-display` and `--font-body`. The page preloads whatever files are named there. If the
  new heading font is not a narrow one, set `--display-stretch: 100%` and `--display-word-gap: 0`.
  The font today is Archivo (open licence, `public/fonts/OFL-Archivo.txt`).

Then run `npm run shots` to remake the pictures and the link-preview image (`public/og.png`,
drawn by `src/card.mjs`), and `npm run check`. `test/site.test.mjs` fails on gradients, blur,
shadows, purple, emoji, and any unconfirmed value shown without its mark.

## Later: the stamp card

`brand.stampCard` in `src/data.mjs` is `null`, so nothing shows. Once its rules are decided,
fill it in (`{ title, lines: [...] }`) and the section appears between the form and the story.
The place is `stampCard()` in `src/page.mjs`.
