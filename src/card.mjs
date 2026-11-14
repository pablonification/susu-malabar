// The link-preview picture. `npm run shots` photographs this page into public/og.jpg.
// It is never linked from the site. Confirmed facts only.
//
// The card is as wide as the photo (OG_SIZE in page.mjs: 1080 x 567, the usual preview
// shape), so the photo runs from edge to edge at its real size, never bigger. Under it,
// the badge, the shop's name and the page's headline: one line about the shop, not two.
// (Where the shop is comes with the link's title, "Susu Malabar Jatinangor".)
// Chat apps show the card small, and some crop it to a square, so those sit in
// the middle 567 px, under the middle of the photo (the cup in the hand). The name is
// the big bold line: it is what has to be readable at thumbnail size.
// The photo's window is tall enough for the whole cup, from the fingertips over its lid to
// its base, with a little room above and under it: no edge cuts the hand or the cup.

import { brand } from "./data.mjs";
import { esc } from "./mark.mjs";
import { HEADLINE, OG_SIZE, logo } from "./page.mjs";
import { PHOTO_DIR, photos } from "./photos.mjs";

/** How much of the card's height the photo takes. The cup in it is 307 px tall. */
const PHOTO_HEIGHT = 352;

export default function card() {
  const photo = photos.hero;
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <title>${esc(brand.title)}</title>
  <link rel="stylesheet" href="tokens.css">
  <style>
    * { box-sizing: border-box; margin: 0; }
    body {
      width: ${OG_SIZE.width}px;
      height: ${OG_SIZE.height}px;
      overflow: hidden;
      background: var(--poster);
      color: var(--poster-ink);
      font-family: var(--font-body);
    }
    .photo { display: block; width: ${photo.widths[0]}px; height: ${PHOTO_HEIGHT}px; object-fit: cover; object-position: 50% 50%; }
    main { display: flex; align-items: center; justify-content: center; gap: 22px; height: ${OG_SIZE.height - PHOTO_HEIGHT}px; }
    .disc {
      flex: none;
      display: grid;
      place-items: center;
      width: 132px;
      height: 132px;
      border-radius: 50%;
      background: var(--badge-ground);
      color: var(--badge-ink);
    }
    .logo-mark { display: block; width: 94%; height: 94%; }
    h1,
    .line {
      font-family: var(--font-display);
      font-weight: var(--display-weight);
      letter-spacing: var(--display-tracking);
      word-spacing: var(--display-word-gap);
      white-space: nowrap;
    }
    h1 { font-size: 64px; line-height: 1; }
    .line { margin-top: 10px; font-size: 32px; line-height: 1.1; color: var(--poster-muted); }
  </style>
</head>
<body>
  <img class="photo" src="${PHOTO_DIR}/hero-${photo.widths[0]}.jpg" alt="">
  <main>
    <span class="disc">${logo()}</span>
    <div>
      <h1>${esc(brand.name)}</h1>
      <p class="line">${esc(HEADLINE)}</p>
    </div>
  </main>
</body>
</html>
`;
}
