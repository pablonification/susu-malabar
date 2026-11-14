// Builds the site and checks what must stay true of the built page: the title,
// the link-preview tags, the mark on every unconfirmed value, and the looks and
// words that are banned (see AGENTS.md).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "../build.mjs";
import * as data from "../src/data.mjs";
import { clock, rupiah } from "../src/order.mjs";
import { findTbc } from "../src/mark.mjs";

const root = join(import.meta.dirname, "..");
await build();
const read = (path) => readFile(join(root, path), "utf8");
const html = await read("dist/index.html");
const card = await read("dist/og-card.html");
const tokens = await read("dist/tokens.css");
const css = await read("dist/site.css");
const js = await read("dist/site.js");

const head = html.slice(0, html.indexOf("</head>"));
const body = html.slice(html.indexOf("<body"));
// A mark is a dashed line under a value, or (class tbc-dot) a dot after a button, link or heading.
const MARK = /<span class="tbc(?: tbc-dot)?" title="([^"]*)">([^<]*)<\/span>/g;
/** The words a visitor reads: no tags, no marked values. */
const text = (h) =>
  h
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ");
const unmarked = text(body.replace(MARK, " "));
const bare = (n) => rupiah(n).replace("Rp", "");

test("the title names Jatinangor and the page is Indonesian", () => {
  assert.match(html, /<title>Susu Malabar Jatinangor<\/title>/);
  assert.match(html, /<html lang="id"/);
  assert.match(head, /<meta name="description" content="[^"]{50,170}">/);
  assert.match(head, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
});

test("link previews, icon and bar colour are set", async () => {
  const site = data.val(data.brand.siteUrl);
  for (const tag of ["og:title", "og:description", "og:type", "og:image", "og:image:width", "og:image:height", "og:image:alt"]) {
    assert.match(head, new RegExp(`<meta property="${tag}" content="[^"]+">`), tag);
  }
  for (const tag of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
    assert.match(head, new RegExp(`<meta name="${tag}" content="[^"]+">`), tag);
  }
  assert.ok(head.includes(`<meta property="og:image" content="${site}/og.png">`));
  assert.match(head, /<link rel="icon" href="favicon\.svg"/);
  assert.match(head, /<meta name="theme-color" content="#[0-9a-f]{6}">/);

  // The picture itself: a PNG of 1200 x 630 (made by `npm run shots`).
  const png = await readFile(join(root, "dist/og.png"));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  // The card page is only there to be photographed.
  assert.match(card, /<meta name="robots" content="noindex">/);
});

test("the page names its own address only once the real one is known", () => {
  const site = data.val(data.brand.siteUrl);
  if (data.isTbc(data.brand.siteUrl)) {
    assert.doesNotMatch(head, /rel="canonical"/, "a canonical link to a placeholder address");
    assert.doesNotMatch(head, /property="og:url"/, "og:url with a placeholder address");
  } else {
    assert.ok(head.includes(`<link rel="canonical" href="${site}/">`));
    assert.ok(head.includes(`<meta property="og:url" content="${site}/">`));
  }
});

test("the fonts the page preloads are the ones tokens.css uses", async () => {
  const used = [...tokens.matchAll(/@font-face\s*\{[^}]*?url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);
  const preloaded = [...head.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)].map((m) => m[1]);
  assert.ok(used.length > 0);
  assert.deepEqual(preloaded, used);
  for (const file of used) {
    assert.doesNotMatch(file, /^\/|^https?:/, `${file}: font paths are relative, like every other path on the page`);
    await readFile(join(root, "dist", file));
  }
});

test("structured data holds confirmed facts only", () => {
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(head)[1];
  JSON.parse(ld);
  for (const t of findTbc(data)) {
    for (const v of [t.value].flat()) {
      if (typeof v === "string" || typeof v === "number") assert.ok(!ld.includes(String(v)), `unconfirmed value in structured data: ${v}`);
    }
  }
});

test("every unconfirmed value on the page carries the mark", () => {
  const all = findTbc(data);
  assert.ok(all.length > 0, "nothing is marked tbc() any more: delete this test and the .tbc rule");
  const marks = [...body.matchAll(MARK)];
  assert.ok(marks.length >= 20, `only ${marks.length} marks on the page`);
  for (const [, title, inner] of marks) {
    assert.ok(title.trim() && inner.trim(), "a mark needs a note and something inside");
  }
  // The footer counts the marks, itself included.
  assert.ok(body.includes(`${marks.length - 1} hal di halaman ini belum dicek pemilik`));

  const notes = new Set(marks.map((m) => m[1]));
  for (const t of all) {
    const v = t.value;
    if (typeof v === "string" && /^https?:/.test(v)) {
      // A link: every <a> that goes there has the mark inside it.
      const links = [...body.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].filter((m) => m[1] === v);
      for (const [, , inner] of links) assert.match(inner, /class="tbc tbc-dot"/, `link without its dot: ${v}`);
      // The site address is only shown as words.
      assert.ok(!unmarked.includes(v.replace(/^https?:\/\//, "")), `address without mark: ${v}`);
    } else if (typeof v === "string") {
      assert.ok(!unmarked.includes(v), `text without mark: ${v}`);
    } else if (typeof v === "number") {
      assert.ok(!unmarked.includes(bare(v)), `price without mark: ${bare(v)}`);
    } else if (Array.isArray(v)) {
      for (const n of v) assert.ok(!unmarked.includes(bare(n)), `price without mark: ${bare(n)}`);
    } else if (v?.default) {
      for (const times of [v.default, ...Object.values(v.byDay || {})]) {
        for (const time of times) assert.ok(!unmarked.includes(clock(time)), `hours without mark: ${clock(time)}`);
      }
    }
  }
  // What is shown says why it is marked.
  for (const t of [data.WHATSAPP_NUMBER, data.brand.siteUrl, data.drinks[0].prices[14], data.shops[0].hours, data.shops[0].mapUrl, data.shops[0].gofoodUrl, data.shops[2].name]) {
    assert.ok(notes.has(t.note), `no mark for: ${t.note}`);
  }
  // The send button and the chat link go to a placeholder number too.
  assert.match(/<a\b[^>]*id="send"[^>]*>([\s\S]*?)<\/a>/.exec(body)[1], /class="tbc tbc-dot"/);
  for (const [, inner] of body.matchAll(/<a\b[^>]*href="https:\/\/wa\.me\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
    assert.match(inner, /class="tbc tbc-dot"/, "a WhatsApp link without its dot");
  }
  // A line under a link's or heading's own words would read as a link: those get the dot.
  // (A menu row is a button too, but its prices are plain values and keep the line.)
  for (const [, tag, inner] of body.matchAll(/<(a|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    assert.doesNotMatch(inner, /class="tbc"/, `a dashed line inside <${tag}>`);
  }
});

test("the mark has one helper and one switch", () => {
  // Three rules draw it: the line, and the dot that replaces the line.
  const rules = (css.match(/\.tbc\b[^{]*\{/g) || []).map((r) => r.replace(/\s*\{$/, ""));
  assert.deepEqual(rules, [".tbc", ".tbc-dot", ".tbc-dot::after"]);
  // Both the line and the dot go away when --tbc-mark is 0.
  assert.match(css, /\.tbc \{[^}]*text-decoration:[^;]*var\(--tbc-mark\)/);
  assert.match(css, /\.tbc-dot::after \{[^}]*font-size:[^;]*var\(--tbc-mark\)/);
  assert.match(tokens, /--tbc-mark: 1;/);
  assert.ok(js.includes('from "./mark.mjs"'), "the form's script uses the same helper");
});

test("the stamp card shows nothing until it has rules", () => {
  assert.equal(data.brand.stampCard, null);
  assert.ok(!html.includes('id="kartu"'));
});

// --- What the first review found, kept fixed --------------------------------------

/** One section of the page, by its id. */
const section = (id) => new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`).exec(body)[0];

test("nothing is said twice in the shop list", () => {
  const toko = text(section("toko"));
  assert.ok(!toko.includes(data.brand.name), "the brand name again in the shop list");
  assert.ok(!toko.includes("Pre-order"), "a pre-order button on every shop");
  // Hours every shop shares are said once, above the list.
  const shared = `${clock("12:00")}–${clock("22:00")}`;
  assert.equal(section("toko").split(shared).length - 1, 1, "the shared hours more than once");
  // The form asks only which shop, by its short name.
  const pickup = /<div class="seg seg-fill"[\s\S]*?<\/div>/.exec(body)[0];
  assert.ok(!text(pickup).includes(data.brand.name));
  for (const shop of data.shops) assert.ok(!text(pickup.replace(MARK, " ")).includes(data.val(shop.area)));
});

test("a section's name is not shown twice, and size names once per poster", () => {
  const nav = [...body.matchAll(/<nav[\s\S]*?<\/nav>/g)].flatMap(([n]) => [...n.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]));
  for (const [, attrs, title] of body.matchAll(/<h2([^>]*)>([\s\S]*?)<\/h2>/g)) {
    if (nav.includes(text(title).trim())) assert.match(attrs, /class="sr"/, `"${text(title).trim()}" is both a jump link and a visible title`);
  }
  const menu = section("menu");
  for (const size of data.sizes) {
    assert.equal(menu.split(`<span class="size">${size.label}</span>`).length - 1, 2, `${size.label} heads each poster column once`);
  }
});

test("menu buttons keep their words for screen readers", () => {
  const picks = [...body.matchAll(/<button type="button" class="pick[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
  assert.equal(picks.length, data.drinks.length);
  for (const b of picks) {
    assert.doesNotMatch(b, /aria-label/, "aria-label would hide the price and notes");
    assert.match(b, /<span class="sr">Tambah <\/span>/);
  }
  assert.doesNotMatch(js, /toggleAttribute\("aria-invalid"/, 'aria-invalid must be "true", not empty');
  assert.doesNotMatch(js, /window\.\w+ =/, "no debugging hook on window");
});

test("one price format, and nothing about when to pay", () => {
  // Every price on the page is written by rupiah(): "Rp13.000".
  for (const [, , inner] of body.matchAll(MARK)) {
    if (/\d\.\d{3}/.test(inner)) assert.match(inner, /^\+?Rp\d/, `a price without Rp: ${inner}`);
  }
  assert.doesNotMatch(text(body), /bayar di toko/i, "when to pay is not confirmed");
});

// --- Banned looks and words ----------------------------------------------------

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

/** Hue (0-360) and saturation (0-1) of #rgb or #rrggbb. */
function hueOf(hex) {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join("") : hex.slice(1, 7);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return { hue: 0, sat: 0 };
  const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const light = (max + min) / 2;
  return { hue: hue * 60, sat: d / (1 - Math.abs(2 * light - 1)) };
}

test("no AI-made look in the styles or the page", async () => {
  const favicon = await read("public/favicon.svg");
  const logo = await read("public/brand/logo.svg");
  const styles = { "tokens.css": tokens, "site.css": css, "og-card.html": card, "index.html": html };
  for (const [name, source] of Object.entries({ ...styles, "site.js": js, "favicon.svg": favicon, "logo.svg": logo })) {
    assert.ok(!EMOJI.test(source), `emoji in ${name}`);
    assert.doesNotMatch(source, /backdrop-filter|blur\(/, `blur in ${name}`);
    assert.doesNotMatch(source, /gradient\(/, `gradient in ${name}`);
    assert.doesNotMatch(source, /text-transform:\s*uppercase/, `uppercase in ${name}`);
    assert.doesNotMatch(source, /\b(purple|indigo|violet|fuchsia|magenta|lavender)\b/i, `purple in ${name}`);
    assert.doesNotMatch(source, /box-shadow|text-shadow|drop-shadow/, `shadow in ${name}`);
    assert.doesNotMatch(source, /transition:\s*all|animation:[^;]*infinite/, `lazy motion in ${name}`);
    assert.doesNotMatch(source, /rgba?\(|hsla?\(|oklch\(/, `a colour outside tokens.css in ${name}`);
    for (const [, size] of source.matchAll(/letter-spacing:\s*([^;}]+)/g)) {
      assert.ok(parseFloat(size) <= 0.02, `wide letter spacing (${size.trim()}) in ${name}`);
    }
    for (const [hex] of source.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) {
      const { hue, sat } = hueOf(hex);
      assert.ok(!(hue >= 235 && hue <= 300 && sat > 0.15), `${hex} in ${name} is purple or indigo`);
    }
  }
  // Colours live in tokens.css only.
  assert.doesNotMatch(css, /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?=\s*[;,)}!])/i, "a raw colour in site.css");
  // Motion never makes people wait, and steps aside when asked.
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("nothing unconfirmed about the business, and no machine-written punctuation", () => {
  const words = text(body) + text(card);
  assert.doesNotMatch(words, /omzet|pendapatan|penghasilan|sumber uang|gunung|peternakan|\bfarm\b|\bsapi\b/i);
  assert.ok(!words.includes("—"), "an em dash on the page");
  assert.ok(!words.includes("!"), "an exclamation mark on the page");
  assert.ok(!words.includes(";"), "a semicolon on the page");
  assert.doesNotMatch(words, /\b(kami|mohon|silakan|silahkan|Anda)\b/);
});
