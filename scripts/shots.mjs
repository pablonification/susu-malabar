// Takes the pictures of the site: whole page at desktop and phone width, and
// the link-preview image (public/og.png) from dist/og-card.html.
//   npm run shots                 -> docs/screenshots/
//   npm run shots -- --out <dir>  -> another folder (e.g. for a review round)
//   npm run shots -- --form       -> also pictures of the form in use at 390 px (phone-*) and
//                                    320 px (small-*): taps on the menu in both sizes, an
//                                    empty send, and 40 cups across five drinks
// Uses the Google Chrome installed on this machine (no browser download).
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { build } from "../build.mjs";

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : join(root, "docs/screenshots");
await mkdir(outDir, { recursive: true });
await build();

const { createServer } = await import("node:http");
const { readFile } = await import("node:fs/promises");
const { extname, normalize } = await import("node:path");
const dist = join(root, "dist");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  try {
    const f = normalize(join(dist, p));
    const body = await readFile(f);
    res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ channel: "chrome" });
try {
  const shoot = async (name, opts, path = "/", fn) => {
    const ctx = await browser.newContext({ ...opts, reducedMotion: "reduce", locale: "id-ID", timezoneId: "Asia/Jakarta" });
    const page = await ctx.newPage();
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if (fn) await fn(page);
    await page.screenshot({ path: join(outDir, name), fullPage: !opts.noFull });
    await ctx.close();
    console.log(join(outDir, name));
  };

  await shoot("desktop.png", { viewport: { width: 1440, height: 900 } });
  await shoot("phone.png", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  if (args.includes("--form")) {
    const toTop = (page, sel) => page.evaluate((s) => scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY - 48), sel);
    const tap = (page, id) => page.locator(`.pick[data-drink="${id}"]`).click();
    const size = (page, id) => page.locator(`.seg-poster input[value="${id}"]`).first().check({ force: true });

    // 40 cups, five drinks, both sizes: three picked on the menu, two in the form.
    const fill = async (page) => {
      await tap(page, "strawberry"); // 14 oz
      await size(page, "22");
      await tap(page, "mangga");
      await tap(page, "strawberry-et-choco");
      for (let row = 1; row <= 3; row++) await page.locator(`.line:nth-child(${row}) [data-step="10"]`).click(); // 10 each
      await page.locator("#add-line").click();
      await page.locator(".line:nth-child(4) select").selectOption("cokelat");
      await page.locator('.line:nth-child(4) .seg input[value="14"]').check({ force: true });
      await page.locator(".line:nth-child(4) .qty input").fill("5");
      await page.locator("#add-line").click();
      await page.locator(".line:nth-child(5) select").selectOption("original");
      await page.locator(".line:nth-child(5) .qty input").fill("5");
      await page.locator("#notes").fill("Buat acara himpunan");
      await page.locator('input[name="shop"][value="cikeruh"]').check({ force: true });
      await page.locator("#date").fill(new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10)); // not today, so the hour is never past
      await page.locator("#time").fill("16:30");
      await page.locator("#name").fill("Raka");
      await page.locator("#name").blur();
    };

    for (const [prefix, width] of [["phone", 390], ["small", 320]]) {
      const phone = { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, noFull: true };

      await shoot(`${prefix}-menu-tapped.png`, phone, "/", async (page) => {
        for (const id of ["strawberry", "strawberry", "mangga"]) await tap(page, id);
        await size(page, "22");
        await tap(page, "original");
        await toTop(page, "#menu");
      });

      await shoot(`${prefix}-empty-send.png`, phone, "/", async (page) => {
        await page.locator("#send").click();
      });

      await shoot(`${prefix}-form-40-drinks.png`, phone, "/", async (page) => {
        await fill(page);
        await toTop(page, "#pesan");
      });
      await shoot(`${prefix}-form-40-send.png`, phone, "/", async (page) => {
        await fill(page);
        await page.locator("#preview summary").click();
        await toTop(page, "#total");
      });
    }
  }

  // Link-preview image, only if the card page exists.
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 } });
  const page = await ctx.newPage();
  const res = await page.goto(`${base}/og-card.html`).catch(() => null);
  if (res?.ok()) {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(root, "public/og.png") });
    console.log(join(root, "public/og.png"));
  }
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}
