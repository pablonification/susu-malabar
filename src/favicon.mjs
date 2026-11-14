// The tab icon (dist/favicon.svg), drawn at build time from the logo file: the badge in
// its green on its pink disc, the way the shop wears it on TikTok. Swap
// public/brand/logo.svg and this follows. `npm run shots` photographs it into
// public/apple-touch-icon.png.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { token } from "./page.mjs";

export default function favicon() {
  const logo = readFileSync(join(import.meta.dirname, "../public/brand/logo.svg"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const [, x, y, w, h] = /viewBox="([\d.-]+)[ ,]+([\d.-]+)[ ,]+([\d.]+)[ ,]+([\d.]+)"/.exec(logo).map(Number);
  const art = /<svg\b[^>]*>([\s\S]*)<\/svg>/.exec(logo)[1].trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}">
  <circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) / 2}" fill="${token("badge-pink")}"/>
  <g style="color: ${token("badge-green")}">${art}</g>
</svg>
`;
}
