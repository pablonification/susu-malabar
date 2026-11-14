// The link-preview picture (1200 x 630). `npm run shots` photographs this page
// into public/og.png. It is never linked from the site. Confirmed facts only.
//
// Chat apps show it small, and some crop it to a square, so everything sits in
// the middle 630 px and nothing is smaller than the tagline.

import { brand, drinks } from "./data.mjs";
import { esc } from "./mark.mjs";
import { logo } from "./page.mjs";

export default function card() {
  const best = drinks.find((d) => d.bestSeller);
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
      display: grid;
      grid-template-rows: 1fr auto;
      background: var(--banner);
      color: var(--ink);
      font-family: var(--font-body);
      text-align: center;
    }
    main { display: grid; align-content: center; justify-items: center; }
    .logo-mark { display: block; height: 50px; width: auto; }
    .tag { margin-top: 10px; font-size: 30px; font-weight: 600; }
    h1, .best strong {
      font-family: var(--font-display);
      font-stretch: var(--display-stretch);
      font-weight: var(--display-weight);
      word-spacing: var(--display-word-gap);
    }
    h1 { margin-top: 30px; font-size: 144px; line-height: 0.9; letter-spacing: -0.01em; }
    .best {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 24px;
      padding: 22px 0 30px;
      background: var(--flavor-strawberry);
      color: var(--flavor-strawberry-ink);
      font-size: 40px;
      font-weight: 600;
      line-height: 1;
    }
    .best strong { font-size: 88px; }
  </style>
</head>
<body>
  <main>
    ${logo()}
    <p class="tag">${esc(brand.tagline)}</p>
    <h1>Susu segar,<br>buah asli.</h1>
  </main>
  ${best ? `<p class="best"><strong>${esc(best.name)}</strong> paling laris</p>` : ""}
</body>
</html>
`;
}
