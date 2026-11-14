// The link-preview picture (1200 x 630). `npm run shots` photographs this page
// into public/og.png. It is never linked from the site. Confirmed facts only.
//
// Chat apps show it small, and some crop it to a square, so the badge, the name and
// the headline sit in the middle 630 px, under the middle of the photo (the cup in the
// hand). The photo is shown at its real size, never bigger.

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
    main { display: flex; align-items: center; justify-content: center; gap: 36px; height: 280px; }
    .disc {
      flex: none;
      display: grid;
      place-items: center;
      width: 190px;
      height: 190px;
      border-radius: 50%;
      background: var(--badge-pink);
      color: var(--badge-green);
    }
    .logo-mark { display: block; width: 94%; height: 94%; }
    h1 {
      font-family: var(--font-display);
      font-weight: var(--display-weight);
      font-size: 82px;
      line-height: 0.92;
      letter-spacing: var(--display-tracking);
      word-spacing: var(--display-word-gap);
    }
    .tag {
      margin-top: 14px;
      font-family: var(--font-quiet);
      font-style: var(--quiet-style);
      font-weight: var(--quiet-weight);
      font-size: 38px;
      line-height: 1;
      color: var(--poster-muted);
    }
  </style>
</head>
<body>
  <img class="photo" src="${PHOTO_DIR}/hero-${photo.widths[0]}.jpg" alt="">
  <main>
    <span class="disc">${logo()}</span>
    <div>
      <h1>${esc(HEADLINE).replace(", ", ",<br>")}</h1>
      <p class="tag">${esc(brand.name)}, ${esc(brand.tagline)}</p>
    </div>
  </main>
</body>
</html>
`;
}
