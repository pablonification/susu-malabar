// The link-preview picture (1200 x 630). `npm run shots` photographs this page
// into public/og.jpg. It is never linked from the site. Confirmed facts only.
//
// Chat apps show it small, and some crop it to a square, so the badge, the shop's name
// and the headline sit in the middle 630 px, under the middle of the photo (the cup in
// the hand). The name is the big bold line: it is what has to be readable at thumbnail
// size. The photo is shown at its real size, never bigger.

import { brand } from "./data.mjs";
import { esc } from "./mark.mjs";
import { HEADLINE, logo } from "./page.mjs";
import { PHOTO_DIR, photos } from "./photos.mjs";

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
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background: var(--poster);
      color: var(--poster-ink);
      font-family: var(--font-body);
    }
    /* The photo is 1080 px wide: it runs the card's width with the poster showing at its sides. */
    .photo { display: block; width: ${photo.widths[0]}px; height: 350px; margin: 0 auto; object-fit: cover; object-position: 50% 45%; }
    main { display: flex; align-items: center; justify-content: center; gap: 26px; height: 280px; }
    .disc {
      flex: none;
      display: grid;
      place-items: center;
      width: 152px;
      height: 152px;
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
    h1 { font-size: 68px; line-height: 1; }
    .line { margin-top: 12px; font-size: 37px; line-height: 1.1; color: var(--poster-muted); }
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
