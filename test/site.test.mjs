// Builds the site and checks what must stay true of the built page: the title,
// the link-preview tags, the mark on every unconfirmed value, and the looks and
// words that are banned (see AGENTS.md).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "../build.mjs";
import * as data from "../src/data.mjs";
import { checkOrder, clock, rupiah } from "../src/order.mjs";
import { findTbc } from "../src/mark.mjs";
import { isLocated, pickupChoices, promoBand, shopRow } from "../src/page.mjs";
import { PHOTO_DIR, drinkPhotos, photos, shopPhotos } from "../src/photos.mjs";
import { rowFor, sizeToAdd, soldSizes } from "../src/pick.mjs";

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
// A mark is one small dot after a value, the same on a price, an address, a heading or a button.
const MARK = /<span class="tbc" title="([^"]*)">([^<]*)<\/span>/g;
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
  assert.ok(marks.length > 0, "no marks on the page although data has tbc() values");
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
      for (const [, , inner] of links) assert.match(inner, /class="tbc"/, `link without its dot: ${v}`);
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
  for (const t of [data.brand.siteUrl, data.drinks[0].prices[14], data.shops[0].gofoodUrl, data.shops[2].mapUrl]) {
    assert.ok(notes.has(t.note), `no mark for: ${t.note}`);
  }
});

test("the mark is one dot, with one helper and one switch", () => {
  // Two rules draw it: room after the value, and the dot in that room.
  const rules = (css.match(/\.tbc\b[^{]*\{/g) || []).map((r) => r.replace(/\s*\{$/, ""));
  assert.deepEqual(rules, [".tbc", ".tbc::after"]);
  const [room, dot] = [/\.tbc \{([^}]*)\}/.exec(css)[1], /\.tbc::after \{([^}]*)\}/.exec(css)[1]];
  // The dot and its room go away when --tbc-mark is 0.
  assert.match(room, /padding-right:[^;]*var\(--tbc-mark\)/);
  assert.match(dot, /width:[^;]*var\(--tbc-mark\)/);
  assert.match(dot, /height:[^;]*var\(--tbc-mark\)/);
  assert.match(dot, /border:[^;]*var\(--tbc-mark\)/);
  assert.match(tokens, /--tbc-mark: 1;/);
  // One size and one colour everywhere: nothing about the dot scales with the text beside it.
  assert.match(dot, /width: calc\(var\(--tbc-size\)/);
  assert.match(dot, /background: var\(--tbc-dot\)/);
  assert.equal((tokens.match(/--tbc-[\w-]+:/g) || []).join(" "), "--tbc-mark: --tbc-dot: --tbc-size:");
  // No line under a marked value (it would read as a link), and nothing for a screen reader to say.
  assert.doesNotMatch(room + dot, /text-decoration/);
  assert.match(dot, /content: "";/);
  assert.ok(js.includes('from "./mark.mjs"'), "the form's script uses the same helper");
});

test("the stamp card shows nothing until it has rules", () => {
  assert.equal(data.brand.stampCard, null);
  assert.ok(!html.includes('id="kartu"'));
});

// --- What the first review found, kept fixed --------------------------------------

/** One section of the page, by its id: from its opening tag to the next section with an id (or the end of <main>). */
function section(id) {
  const from = body.search(new RegExp(`<section[^>]*id="${id}"`));
  const rest = body.slice(from + 1);
  const to = rest.search(/<section[^>]*id="|<\/main>/);
  return body.slice(from, from + 1 + to);
}

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

test("a section's name is not shown twice, and the menu has one size switch", () => {
  const nav = [...body.matchAll(/<nav[\s\S]*?<\/nav>/g)].flatMap(([n]) => [...n.matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]));
  for (const [, attrs, title] of body.matchAll(/<h2([^>]*)>([\s\S]*?)<\/h2>/g)) {
    if (nav.includes(text(title).trim())) assert.match(attrs, /class="sr"/, `"${text(title).trim()}" is both a jump link and a visible title`);
  }
  // One switch for the whole menu, each size in it once. Rows with their own prices get
  // plain column names in their header (not a second switch), and no row repeats them in view.
  const menu = section("menu");
  const switches = [...menu.matchAll(/<div class="seg seg-poster[^"]*" role="radiogroup" aria-label="Ukuran[^"]*">[\s\S]*?<\/div>/g)];
  assert.equal(switches.length, 1, "the size switch is drawn once");
  assert.equal((menu.match(/role="radiogroup"/g) || []).length, 1);
  const heads = [...menu.matchAll(/<div class="grp-head cols">[\s\S]*?<\/div>/g)].map((m) => m[0]);
  assert.ok(heads.length >= 1, "rows with their own prices have their columns named");
  for (const size of data.sizes) {
    assert.equal(switches[0][0].split(`<span class="size">${size.label}</span>`).length - 1, 1, `${size.label} once in the switch`);
    for (const head of heads) assert.equal(head.split(`>${size.label}</span>`).length - 1, 1, `${size.label} once over its column`);
  }
  for (const head of heads) assert.doesNotMatch(head, /<input|<label|<button/, "column names are words, not a control");
  assert.doesNotMatch(/<section class="grp grp-extras">[\s\S]*?<\/section>/.exec(menu)[0], /class="size|seg-poster/, "size names over things with no sizes");
  assert.doesNotMatch(css, /\.sizes\b/, "the sticky strip of size names is gone");
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

// --- What the second review found, kept fixed -------------------------------------

test("a shop is named by its street, and its area is not said again under it", () => {
  for (const shop of data.shops.filter(isLocated)) {
    const address = data.val(shop.address);
    assert.ok(!address.includes(","), `"${address}" is more than the street: the heading already names the area`);
    // A road that is itself called Jatinangor is fine.
    assert.ok(!address.replace("Jl. Raya Jatinangor", "").includes("Jatinangor"), "Jatinangor is in the title above the list");
  }
  assert.equal(text(section("toko")).replaceAll("Jl. Raya Jatinangor", "").split("Jatinangor").length - 1, 1);
});

test("the same shop gets its buttons and its place in the form once it is located", () => {
  // Every shop is located now; the code path stays, so check it on a copy.
  const lost = { ...data.shops.at(-1), located: false };
  const found = { ...lost, located: true };
  assert.doesNotMatch(shopRow(lost, null), /Buka peta|GoFood/);
  const row = shopRow(found, null);
  assert.ok(row.includes(`href="${data.val(found.mapUrl)}"`) && row.includes("Buka peta"));
  assert.ok(row.includes(`href="${data.val(found.gofoodUrl)}"`) && row.includes("GoFood"));
  assert.ok(!pickupChoices([lost]).includes(`value="${lost.id}"`));
  assert.ok(pickupChoices([found]).includes(`value="${found.id}"`));
  // A shop that says nothing about it counts as located.
  assert.ok(isLocated({ id: "x" }) && isLocated({ located: true }) && !isLocated({ located: false }));
});

test("the menu picks the size: one switch, and a tap adds that size", () => {
  const menu = section("menu");
  // The switch is real radio buttons, the first size picked.
  const sw = /<div class="seg seg-poster[\s\S]*?<\/div>/.exec(menu)[0];
  assert.deepEqual([...sw.matchAll(/<input type="radio" name="menu-size" value="(\w+)"( checked)?>/g)].map((m) => m[1] + (m[2] || "")), [`${data.sizes[0].id} checked`, ...data.sizes.slice(1).map((s) => s.id)]);
  // The price Buah and Rasa share sits inside the switch, so the price is what you pick,
  // and it is on the menu once: the groups under it show names only.
  assert.match(sw, /aria-label="Ukuran dan harga Buah dan Rasa"/);
  assert.equal((sw.match(MARK) || []).length, data.sizes.length);
  for (const name of ["Buah", "Rasa"]) {
    const grp = new RegExp(`<section class="grp">\\s*<div class="grp-head"><h3>${name}</h3></div>[\\s\\S]*?</section>`).exec(menu)[0];
    assert.doesNotMatch(grp, /class="price|Rp\d/, `${name} repeats the price that is in the switch`);
  }
  // Every drink's button says which size it adds.
  for (const d of data.drinks) {
    const b = new RegExp(`<button type="button" class="pick[^>]*data-drink="${d.id}">[\\s\\S]*?</button>`).exec(menu)[0];
    const first = data.sizes.find((s) => d.prices[s.id] != null);
    assert.ok(b.includes(`<span class="sr pick-sr">, ukuran ${first.label}</span>`), d.id);
  }

  // The size a tap adds: the picked one, or the drink's own when it isn't sold in that.
  assert.deepEqual(soldSizes("strawberry"), ["14", "22"]);
  assert.deepEqual(soldSizes("strawberry-et-choco"), ["22"]);
  assert.deepEqual(soldSizes(""), ["14", "22"]);
  assert.equal(sizeToAdd("mangga", "14"), "14");
  assert.equal(sizeToAdd("mangga", "22"), "22");
  assert.equal(sizeToAdd("strawberry-et-choco", "14"), "22");
  assert.equal(sizeToAdd("no-such-drink", "14"), "");

  // Where the cup goes: the row with that drink AND size, else the empty row, else a new row.
  const lines = [
    { drinkId: "mangga", size: "14", qty: 2 },
    { drinkId: "", size: "14", qty: 1 },
    { drinkId: "mangga", size: "22", qty: 1 },
  ];
  assert.deepEqual(rowFor(lines, "mangga", "22"), { row: 2, how: "more" });
  assert.deepEqual(rowFor(lines, "mangga", "14"), { row: 0, how: "more" });
  assert.deepEqual(rowFor(lines, "kopi", "14"), { row: 1, how: "fill" });
  assert.deepEqual(rowFor([lines[0]], "mangga", "22"), { row: -1, how: "new" });
  assert.deepEqual(rowFor([], "kopi", "14"), { row: -1, how: "new" });
  assert.ok(js.includes("rowFor(") && js.includes("sizeToAdd("), "the page script uses the tested rules");
});

test("a drink in the form: size and amount without visible labels, but with names", () => {
  const line = /<template id="line">([\s\S]*?)<\/template>/.exec(body)[1];
  assert.doesNotMatch(text(line.replace(/<(\w+) class="sr[^>]*>[\s\S]*?<\/\1>/g, "")), /Ukuran|Jumlah/, "a visible label on size or amount");
  assert.match(line, /<div class="seg" role="radiogroup" aria-label="Ukuran">/);
  assert.match(line, /<label class="sr">Jumlah gelas<\/label>/);
  assert.match(line, /<label class="sr">Rasa<\/label>/);
  for (const name of ["Kurangi satu", "Tambah satu", "Tambah sepuluh"]) assert.ok(line.includes(`aria-label="${name}"`));
  assert.match(js, /class="sr">Subtotal </, "the row's sum is named for screen readers");
});

test("hints in empty fields are short and lighter than typed words", () => {
  for (const [, hint] of body.matchAll(/placeholder="([^"]*)"/g)) assert.ok(hint.length <= 28, `"${hint}" wraps on a small phone`);
  assert.match(css, /::placeholder \{[^}]*color: var\(--field-hint\)/);
  assert.match(css, /select\.is-empty \{[^}]*color: var\(--field-hint\)/);
});

test("nothing is scrolled under the sticky links or the order bar", () => {
  assert.match(css, /html \{[^}]*scroll-padding-top: calc\(var\(--tap-big\) \+/);
  assert.match(js, /scrollPaddingBottom = /);
  // Only the jump links stay on top.
  assert.equal((css.match(/position: sticky/g) || []).length, 1);
});

test("one headline, one section name, and the link preview shows no price", () => {
  assert.doesNotMatch(/<header[\s\S]*?<\/header>/.exec(body)[0], /<h[2-6]/);
  assert.ok(!text(section("pesan").match(/<h2[\s\S]*?<\/h2>/)[0]).includes("Pre-order"), "the form's title repeats its jump link");
  assert.doesNotMatch(text(card), /Rp\s?\d|\d\.\d{3}/, "a price on the card, where it can't carry its mark");
  assert.ok(card.includes('class="logo-mark"'), "the card wears the logo file");
});

// --- What the third review found, kept fixed --------------------------------------

test("a mark never sits between a value and its punctuation, and hours don't contradict", () => {
  assert.doesNotMatch(body, /class="tbc"[^>]*>[^<]*<\/span>\s*[.,:]/, "a dot before a full stop or comma");
  // The hours every shop shares are not called "every day" above a shop that opens later on one.
  const toko = text(section("toko"));
  const odd = data.shops.some((s) => Object.keys(data.val(s.hours).byDay || {}).length);
  if (odd) assert.doesNotMatch(toko, /tiap hari/i, '"every day" above a shop with a different day');
  if (odd) assert.match(toko, /Jumat baru buka/);
});

test("the form's parts share one corner, one picked colour, and the page's margins", () => {
  // Every part of the amount is rounded like the fields around it.
  assert.match(css, /\.qty button\[data-step="-1"\] \{[^}]*border-radius: var\(--radius-control\) 0 0 var\(--radius-control\)/);
  assert.doesNotMatch(css, /\.qty button:first-child/, "the first child of .qty is its label, not a button");
  // One "picked" colour, in the form and on the menu.
  assert.equal((css.match(/input:checked \+ span \{/g) || []).length, 1);
  assert.match(css, /\.seg input:checked \+ span \{[^}]*background: var\(--order\)/);
  // A size a drink isn't sold in is hidden, not drawn as a second kind of "on".
  assert.match(js, /closest\("label"\)\.hidden = radio\.disabled/);
  assert.doesNotMatch(css, /input:disabled \+ span/);
  // The form's columns never grow past the page.
  assert.match(css, /\.form,\s*\.form-col \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
});

test("the order bar says the total and the way on, and reads out what went in", () => {
  const bar = /<div class="bar"[\s\S]*?<\/div>/.exec(body)[0];
  assert.match(bar, /<p role="status">[\s\S]*<span class="sr" id="bar-last"><\/span><\/p>/, "what went in is read out, not shown");
  assert.match(bar, /<a class="btn btn-fill" href="#pesan">Lanjut<span class="sr"> pre-order<\/span><\/a>/);
  // The menu's count is read apart from the size a tap adds.
  assert.ok(js.includes(". Sudah ${n} gelas di pesanan"));
});

// --- The second design: real photos, the real badge ---------------------------------

test("every photo is a real one, cut no bigger than its original, with its three files", async () => {
  const { stat } = await import("node:fs/promises");
  for (const [name, photo] of Object.entries(photos)) {
    await stat(join(root, "public/assets/real", `${photo.from}.jpg`)); // listed in SOURCES.md there
    const sources = await read("public/assets/real/SOURCES.md");
    assert.ok(sources.includes(`\`${photo.from}\``), `${photo.from} has no line in SOURCES.md`);
    assert.ok(sources.includes(`\`${name}\``), `the cut "${name}" is not listed in SOURCES.md`);
    assert.ok(photo.alt.trim().length > 10, `${name} needs words for a screen reader`);
    const [, , cropWidth] = photo.crop;
    for (const width of photo.widths) {
      assert.ok(width <= cropWidth, `${name}-${width} is wider than its ${cropWidth}px crop: photos are never made bigger`);
      for (const ext of ["avif", "webp", "jpg"]) await stat(join(root, "dist", PHOTO_DIR, `${name}-${width}.${ext}`));
    }
    assert.ok(body.includes(`${PHOTO_DIR}/${name}-`), `${name} is cut but not on the page`);
  }
  for (const { photo } of Object.values(drinkPhotos)) assert.ok(photos[photo]);
  for (const [shopId, photo] of Object.entries(shopPhotos)) {
    assert.ok(photos[photo] && data.shops.some((s) => s.id === shopId), `shop photo ${shopId}`);
  }
  // The untouched originals stay in the repo, not on the site.
  await assert.rejects(stat(join(root, "dist/assets/real")));
});

test("photos load light: sized, lazy below the first screen, newest format first", () => {
  const pictures = [...body.matchAll(/<picture[^>]*>([\s\S]*?)<\/picture>/g)].map((m) => m[1]);
  assert.equal(pictures.length, Object.keys(photos).length);
  for (const inner of pictures) {
    assert.match(inner, /^<source type="image\/avif" srcset="[^"]+" sizes="[^"]+"><source type="image\/webp" srcset="[^"]+" sizes="[^"]+"><img /);
  }
  const imgs = [...body.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  for (const img of imgs) {
    assert.match(img, / width="\d+" height="\d+"/, `no size, the page would jump: ${img}`);
    assert.match(img, / alt="[^"]*"/, `no alt: ${img}`);
    assert.match(img, / decoding="async"/);
  }
  // Only the first photo loads at once, and the page asks for it early.
  const eager = imgs.filter((img) => !img.includes('loading="lazy"'));
  assert.equal(eager.length, 1);
  assert.match(eager[0], /hero-[\s\S]*fetchpriority="high"/);
  assert.match(head, /<link rel="preload" as="image" type="image\/avif" imagesrcset="[^"]*hero-[^"]+" imagesizes="[^"]+" fetchpriority="high">/);
  // A photo inside a button says nothing: the button already names the drink.
  for (const [button] of body.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)) {
    for (const [img] of button.matchAll(/<img\b[^>]*>/g)) assert.match(img, / alt=""/);
  }
  // No slideshow, and nothing typed over a photo.
  assert.doesNotMatch(js, /setInterval|autoplay/i);
  assert.doesNotMatch(css + card, /background(-image)?:[^;]*url\(/, "a photo as a background, where words could sit on it");
});

test("the logo is one file: the real badge, and the icons are drawn from it", async () => {
  const logo = await read("public/brand/logo.svg");
  const art = /<path[\s\S]*\/>/.exec(logo)[0];
  assert.match(logo, /fill="currentColor"/);
  assert.ok((await read("public/assets/real/logo-badge.svg")).includes(art.slice(0, 400)), "logo.svg is not the shop's badge");
  assert.ok(head.includes('<link rel="icon" href="favicon.svg" type="image/svg+xml">'));
  const favicon = await read("dist/favicon.svg");
  assert.ok(favicon.includes(art), "the tab icon is not drawn from the logo file");
  assert.ok(html.includes(art) && card.includes(art), "the page and the card wear the logo file");
  // The preview card shows a real photo at its real size.
  assert.match(card, new RegExp(`<img class="photo" src="${PHOTO_DIR}/hero-${photos.hero.widths[0]}\\.jpg"`));
  assert.match(card, new RegExp(`\\.photo \\{[^}]*width: ${photos.hero.widths[0]}px`));
  const png = await readFile(join(root, "public/apple-touch-icon.png"));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [180, 180]);
});

test("three ways to order, each one tap from the real thing, and GoFood said once", () => {
  const cara = section("cara");
  const rows = [...cara.matchAll(/<a class="way" ([^>]*)>([\s\S]*?)<\/a>/g)];
  const gofood = data.shops[0].gofoodUrl;
  assert.deepEqual(
    rows.map((m) => /href="([^"]*)"/.exec(m[1])[1]),
    ["#toko", data.val(gofood), "#pesan"],
  );
  // Every shop shares one GoFood link, so it is one row here and not a button on each shop.
  assert.equal(body.split(`href="${data.val(gofood)}"`).length - 1, 1);
  assert.ok(!text(section("toko")).includes("GoFood"));
  // Each shop is one tap from its map.
  for (const shop of data.shops.filter(isLocated)) assert.ok(section("toko").includes(`href="${data.val(shop.mapUrl)}"`));
  // The first screen is one tap from the menu and from the order form.
  const nav = /<nav[\s\S]*?<\/nav>/.exec(body)[0];
  assert.ok(nav.includes('href="#menu"') && nav.includes('href="#pesan"') && body.includes('id="menu"') && body.includes('id="pesan"'));
});

test("a promo shows only when the shop has one, with its price", () => {
  assert.equal(data.brand.promo, null);
  assert.ok(!html.includes('id="promo"'));
  assert.equal(promoBand(null), "");
  const band = promoBand({ title: "Promo Raksu", when: "Rabu–Kamis", price: data.tbc(10000, "contoh"), was: 13000 });
  assert.ok(band.includes("Promo Raksu") && band.includes("Rabu–Kamis") && band.includes("<s>") && band.includes("Rp13.000"));
  assert.match(band, /<strong><span class="tbc" title="contoh">Rp10\.000<\/span><\/strong>/);
});

test("two voices, set in tokens: the poster's heavy face and the quiet serif", () => {
  assert.match(tokens, /--font-display: "Plus Jakarta Sans"/);
  assert.match(tokens, /--font-quiet: "Cormorant Garamond"/);
  assert.equal((tokens.match(/@font-face \{/g) || []).length, 2);
  assert.doesNotMatch(css + card, /font-family:\s*(?!\s|var\(--font-)/, "a font named outside tokens.css");
  // The serif is for headings and short lines, never small print.
  assert.doesNotMatch(css, /\.cap \{[^}]*font-size: var\(--text-small\)/);
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
  const favicon = await read("dist/favicon.svg");
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
    // A size from tokens.css (var(...)) is checked there, where its number is.
    for (const [, size] of source.matchAll(/(?:letter-spacing|--[\w-]*tracking):\s*([^;}]+)/g)) {
      assert.ok(size.trim().startsWith("var(--") || parseFloat(size) <= 0.02, `wide letter spacing (${size.trim()}) in ${name}`);
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
  // Alt texts are words too: a screen reader says them.
  const alts = [...(body + card).matchAll(/\salt="([^"]*)"/g)].map((m) => m[1]).join(" ");
  assert.doesNotMatch(`${words} ${alts}`, /omzet|pendapatan|penghasilan|sumber uang|gunung|peternak|pemasok|supplier|\bfarm\b|\bsapi\b/i);
  assert.ok(!words.includes("—"), "an em dash on the page");
  assert.ok(!words.includes("!"), "an exclamation mark on the page");
  assert.ok(!words.includes(";"), "a semicolon on the page");
  assert.doesNotMatch(words, /\b(kami|mohon|silakan|silahkan|Anda)\b/);
});
