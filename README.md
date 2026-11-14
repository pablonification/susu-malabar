# Susu Malabar Jatinangor

Website for Susu Malabar, the fresh-milk shop in Jatinangor: the menu, three ways to order,
the three shops, and a pre-order form that sends the order to the shop on WhatsApp. It is
built around the shop's own photos, badge and poster colours.

## Run it

Needs Node 22 or newer.

```sh
npm install      # only needed for screenshots
npm run dev      # http://localhost:4321, rebuilt on every page load
npm run build    # static files into dist/
npm test         # the order form's logic, and what must stay true of the built page
npm run shots -- --form --out /tmp/shots   # also the form in use, at 390 px and 320 px
npm run photos   # only after changing a photo or its crop (see "Change the look")
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
The dot hangs after the value and takes no room, so nothing moves when a value is confirmed.
A menu row with two prices wears one dot for both (`markAll()`).
It comes from one helper, `mark()` in `src/mark.mjs`, and the `.tbc` rules in `src/site.css`.
The footer counts them. When the owner confirms a value, unwrap it in `src/data.mjs` and its
mark goes away.

A shop with `located: false` in `src/data.mjs` stays in the list with its marked lines, but has
no map or GoFood button and is not offered for pickup. Set it to `true` (or delete the line)
once its place is known and all of that turns on.

Two things wait for the real site address (`brand.siteUrl`):

- The page leaves out its canonical link and `og:url` while the address is a placeholder. They
  come back by themselves once it is confirmed.
- `og:image` already points at `<siteUrl>/og.jpg`, so link previews show no picture until the
  real address is in. Check a preview in WhatsApp after that. The picture is a JPEG of about
  100 KB: WhatsApp shows none for a preview image much over 300 KB, and a test keeps it under.

## Change the look

The look comes from the shop's own posts: `docs/brand-notes.md` says what they look like and
where each colour was sampled. Logo, colours, fonts and photos each have one place.

- **Logo:** replace `public/brand/logo.svg`. Today it is the shop's real badge (the drawn shop
  front), traced in one colour. It is put into the page as it is, so `fill="currentColor"`
  makes it take the colour of where it sits. On the page it is black on a white disc, the
  way it is printed on the cups and worn on Instagram. The tab icon (`dist/favicon.svg`) is
  drawn from the same file at build time by `src/favicon.mjs`, green on pink the way the shop
  wears it on TikTok.
  `npm run shots` remakes `public/apple-touch-icon.png` and the link-preview image from it.
- **Colours:** `src/tokens.css`. The names say where a colour comes from in the shop (poster,
  banner, badge). `--petal` is the one pink on the page, the soft pink of the petals in the shop's
  feed. It means two things and nothing else: strawberry (`--flavor-strawberry`, the best
  seller's strip) and what is in the visitor's order (`--order`: the cups added, the size and
  shop picked, the total). Buttons that move the order on are black. The browser bar colour
  follows `--poster`.
- **Fonts:** two voices, like the shop's feed. `--font-display` and `--font-body` are the loud
  one (Plus Jakarta Sans: headlines, menu, form). `--font-quiet` is the serif italic of the
  location posts (Cormorant Garamond Italic: shop names, the story, review quotes, captions).
  To swap one, put the `.woff2` in `public/fonts/`, add an `@font-face` at the top of
  `src/tokens.css` with `src: url("fonts/<file>.woff2")` (no leading slash), and change the
  variable. The page preloads whatever files are named there. If the new face has a normal
  space between words, set `--display-word-gap` and `--body-word-gap` to `0`. Both fonts have
  an open licence (`public/fonts/OFL-*.txt`), cut down to the letters Indonesian needs.
- **Photos:** the list is `src/photos.mjs`: which original each photo is cut from, the crop,
  the sizes, and its words for screen readers. The originals are in `public/assets/real/`
  (`SOURCES.md` there says where each came from). To change a crop or add a photo, edit the
  list and run `npm run photos` (needs `ffmpeg`, `cwebp` and `avifenc`:
  `brew install ffmpeg webp libavif`). It writes avif, webp and jpg into
  `public/assets/photos/`, which is what the page loads. Rules the tests keep: only photos
  the shop posted itself, never made bigger than the original, no retouching, no words over
  a photo. A new original needs a line in `SOURCES.md`. Which photo goes with which shop or
  drink is at the bottom of the same file (`shopPhotos`, `drinkPhotos`).

Then run `npm run shots` to remake the pictures in `docs/screenshots/`, the link-preview image
(`public/og.jpg`, drawn by `src/card.mjs`) and the home-screen icon, and `npm run check`.
`test/site.test.mjs` fails on gradients, blur, shadows, purple, emoji, a font named outside
`tokens.css`, a photo without its size or files, and any unconfirmed value shown without its mark.

## Ways to order, and a promo

"Mau pesan lewat mana?" lists three ways: walk in, GoFood, pre-order on WhatsApp. While every
shop has the same GoFood link it is one row there. Give the shops different links in
`src/data.mjs` and each shop gets its own GoFood button instead.

`brand.promo` in `src/data.mjs` is `null`, so nothing shows. When a promo runs, fill it in
from the shop's own post (the shape is in the comment beside it): a black strip appears under
the first screen with the price large and the usual price crossed out, like the shop's promo
posters. Set it back to `null` when the promo ends.

## How the menu adds to the order

The menu has one size switch at its top (14 oz or 22 oz). It carries the price of the groups
that share one (Buah and Rasa), so that price is on the page once. Drinks with their own
prices show both at full strength, and the picked size's column is the bold one. A tap on a drink adds one
cup in the picked size. The rules are in `src/pick.mjs` (which size, which row of the form)
and tested in `test/site.test.mjs`.

## Later: the stamp card

`brand.stampCard` in `src/data.mjs` is `null`, so nothing shows. Once its rules are decided,
fill it in (`{ title, lines: [...] }`) and the section appears between the form and the story.
The place is `stampCard()` in `src/page.mjs`.
