// The link-preview picture (1200 x 630). `npm run shots` photographs this page
// into public/og.png. It is never linked from the site. Confirmed facts only.

import { brand, story } from "./data.mjs";
import { esc } from "./mark.mjs";
import { logo } from "./page.mjs";

export default function card() {
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
    }
    main { padding: 56px 72px 0; }
    .logo-mark { display: block; height: 54px; width: auto; }
    .tag { margin-top: 10px; font-size: 28px; font-weight: 600; }
    h1 {
      margin-top: 40px;
      font-family: var(--font-display);
      font-stretch: var(--display-stretch);
      font-weight: var(--display-weight);
      font-size: 164px;
      line-height: 0.9;
      letter-spacing: -0.01em;
    }
    ul {
      display: grid;
      grid-template-columns: repeat(3, auto);
      justify-content: start;
      gap: 48px;
      padding: 0 72px;
      list-style: none;
      background: var(--ink);
      color: var(--paper);
      white-space: nowrap;
      font-size: 30px;
      font-weight: 700;
      line-height: 96px;
    }
  </style>
</head>
<body>
  <main>
    ${logo()}
    <p class="tag">${esc(brand.tagline)}</p>
    <h1>Susu segar,<br>buah asli.</h1>
  </main>
  <ul>
    <li>Menu dan harga</li>
    <li>${story.shops} toko di Jatinangor</li>
    <li>Pre-order lewat WhatsApp</li>
  </ul>
</body>
</html>
`;
}
