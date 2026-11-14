// Takes the pictures of the site: whole page at desktop and phone width, and
// the link-preview image (public/og.png) from dist/og-card.html.
//   npm run shots                 -> docs/screenshots/
//   npm run shots -- --out <dir>  -> another folder (e.g. for a review round)
//   npm run shots -- --form       -> also phone pictures of the form in use: a tap on the
//                                    menu, an empty send, and 40 cups across two drinks
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
    const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, noFull: true };
    const toTop = (page, sel) => page.evaluate((s) => scrollTo(0, document.querySelector(s).getBoundingClientRect().top + scrollY - 48), sel);

    await shoot("phone-menu-tapped.png", phone, "/", async (page) => {
      for (const id of ["strawberry", "strawberry", "mangga"]) await page.locator(`.pick[data-drink="${id}"]`).click();
      await toTop(page, "#menu");
    });

    await shoot("phone-empty-send.png", phone, "/", async (page) => {
      await page.locator("#send").click();
    });

    const fill = async (page) => {
      await page.locator(".line select").first().selectOption("strawberry");
      for (let i = 0; i < 3; i++) await page.locator('.line [data-step="10"]').first().click(); // 1, 10, 20, 30
      await page.locator("#add-line").click();
      await page.locator(".line select").nth(1).selectOption("original");
      await page.locator('.line:nth-child(2) .seg input[value="22"]').check({ force: true });
      await page.locator('.line:nth-child(2) [data-step="10"]').click(); // 10
      await page.locator("#notes").fill("Buat acara himpunan");
      await page.locator('input[name="shop"][value="cikeruh"]').check({ force: true });
      await page.locator("#date").fill(new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10)); // not today, so the hour is never past
      await page.locator("#time").fill("16:30");
      await page.locator("#name").fill("Raka");
      await page.locator("#name").blur();
    };
    await shoot("phone-form-40-drinks.png", phone, "/", async (page) => {
      await fill(page);
      await toTop(page, "#pesan");
    });
    await shoot("phone-form-40-send.png", phone, "/", async (page) => {
      await fill(page);
      await page.locator("#preview summary").click();
      await toTop(page, "#field-shop");
    });
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
