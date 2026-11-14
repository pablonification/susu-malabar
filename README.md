# Susu Malabar Jatinangor

Website for Susu Malabar, the fresh-milk shop in Jatinangor: the menu, the three shops, and a
pre-order form that sends the order to the shop on WhatsApp.

## Run it

Needs Node 22 or newer.

```sh
npm install      # only needed for screenshots
npm run dev      # http://localhost:4321, rebuilt on every page load
npm run build    # static files into dist/
npm test         # the order form's logic
```

## Before launch

Everything not yet confirmed with the owner is in `src/data.mjs`, wrapped in `tbc()`, and shows
on the page with a mark. List them with:

```sh
grep -n "tbc(" src/data.mjs
```

To see the page without the marks (for a demo), set `--tbc-line: none` in `src/tokens.css`.
The marks are a dashed underline with the reason in the tooltip. They come from one helper,
`mark()` in `src/mark.mjs`, and one CSS rule, `.tbc` in `src/site.css`. The footer counts them.
When the owner confirms a value, unwrap it in `src/data.mjs` and its mark goes away.

## Change the look

A new logo, colours and fonts are coming. Each has one place:

- **Logo:** replace `public/brand/logo.svg`. It is put into the page as it is, so
  `fill="currentColor"` makes it follow the text colour. Today it is a plain wordmark.
  `public/favicon.svg` and `public/apple-touch-icon.png` (180 px) are the same wordmark's
  initials. Replace both too.
- **Colours:** `src/tokens.css`. The names say where a colour comes from in the shop (banner,
  poster, wall). Each flavour has its own colour, `--flavor-<drink id>`. The browser bar colour
  follows `--banner`.
- **Fonts:** put the `.woff2` files in `public/fonts/`, add an `@font-face` at the top of
  `src/tokens.css`, and change `--font-display` and `--font-body`. If the new heading font is
  not a narrow one, set `--display-stretch: 100%`. The font today is Archivo (open licence,
  `public/fonts/OFL-Archivo.txt`).

Then run `npm run shots` to remake the pictures and the link-preview image (`public/og.png`,
drawn by `src/card.mjs`), and `npm run check`. `test/site.test.mjs` fails on gradients, blur,
shadows, purple, emoji, and any unconfirmed value shown without its mark.

## Later: the stamp card

`brand.stampCard` in `src/data.mjs` is `null`, so nothing shows. Once its rules are decided,
fill it in (`{ title, lines: [...] }`) and the section appears between the form and the story.
The place is `stampCard()` in `src/page.mjs`.
