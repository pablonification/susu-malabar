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
import { HEADLINE, OG_IMAGE, OG_SIZE, isLocated, pickupChoices, promoBand, shopRow } from "../src/page.mjs";
import { PHOTO_DIR, photos, shopPhotos } from "../src/photos.mjs";
import { cupsBySize, cupsOf, rowFor, rowToTake, sizeToAdd, soldSizes } from "../src/pick.mjs";

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
// A menu row's prices share one mark: a span with the row's prices inside it.
const ROW_MARK = '<span class="tbc prices" title="';
/** Every row mark in a piece of HTML, as { title, inner }: read to the span that closes it. */
function rowMarks(h) {
  const found = [];
  for (let at = h.indexOf(ROW_MARK); at >= 0; at = h.indexOf(ROW_MARK, at + 1)) {
    const open = h.indexOf(">", at) + 1;
    let depth = 1;
    let i = open;
    while (depth > 0) {
      const next = /<span\b|<\/span>/g;
      next.lastIndex = i;
      const m = next.exec(h);
      depth += m[0] === "</span>" ? -1 : 1;
      i = m.index + m[0].length;
    }
    found.push({ title: h.slice(at + ROW_MARK.length, open - 2), inner: h.slice(open, i - "</span>".length), whole: h.slice(at, i) });
  }
  return found;
}
/** A piece of HTML with everything marked taken out. */
const withoutMarks = (h) => rowMarks(h).reduce((rest, m) => rest.replace(m.whole, " "), h).replace(MARK, " ");
/** The words a visitor reads: no tags, no marked values. */
const text = (h) =>
  h
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ");
const unmarked = text(withoutMarks(body));
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
  assert.ok(head.includes(`<meta property="og:image" content="${site}/${OG_IMAGE}">`));
  assert.ok(head.includes(`<meta name="twitter:image" content="${site}/${OG_IMAGE}">`));
  assert.match(head, /<link rel="icon" href="favicon\.svg"/);
  assert.match(head, /<meta name="theme-color" content="#[0-9a-f]{6}">/);

  // The picture itself: a JPEG (made by `npm run shots`) as wide as the photo in it, so the
  // photo runs edge to edge at its real size, in the usual preview shape (1200 x 630), and
  // light enough for WhatsApp, which shows no picture for a preview image much over 300 KB.
  assert.deepEqual(OG_SIZE, { width: photos.hero.widths[0], height: Math.round((photos.hero.widths[0] * 630) / 1200) });
  assert.ok(head.includes(`<meta property="og:image:width" content="${OG_SIZE.width}">`) && head.includes(`<meta property="og:image:height" content="${OG_SIZE.height}">`));
  const jpg = await readFile(join(root, "dist", OG_IMAGE));
  assert.equal(jpg.readUInt16BE(0), 0xffd8, "the preview image is not a JPEG");
  assert.ok(jpg.length < 300 * 1024, `the preview image is ${Math.round(jpg.length / 1024)} KB: over 300 KB WhatsApp shows none`);
  let at = 2;
  while (jpg[at] === 0xff && ![0xc0, 0xc1, 0xc2].includes(jpg[at + 1])) at += 2 + jpg.readUInt16BE(at + 2); // walk to the frame header
  assert.deepEqual([jpg.readUInt16BE(at + 7), jpg.readUInt16BE(at + 5)], [OG_SIZE.width, OG_SIZE.height]);
  await assert.rejects(readFile(join(root, "dist/og.png")), "the old PNG preview is still shipped");
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
  const rows = rowMarks(body);
  const marks = [...body.matchAll(MARK), ...rows.map((m) => [m.whole, m.title, text(m.inner)])];
  assert.ok(marks.length > 0, "no marks on the page although data has tbc() values");
  for (const [, title, inner] of marks) {
    assert.ok(title.trim() && inner.trim(), "a mark needs a note and something inside");
  }
  // Nothing is marked in a way these tests can't see.
  assert.equal((body.match(/class="tbc[ "]/g) || []).length, marks.length);
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
  // Two rules draw it: the value it hangs on, and the dot after it.
  const rules = (css.match(/\.tbc\b[^{]*\{/g) || []).map((r) => r.replace(/\s*\{$/, ""));
  assert.deepEqual(rules, [".tbc", ".tbc::after"]);
  const [room, dot] = [/\.tbc \{([^}]*)\}/.exec(css)[1], /\.tbc::after \{([^}]*)\}/.exec(css)[1]];
  // The dot takes no room: a button is as wide with it as without, and nothing moves
  // when a value is confirmed.
  assert.doesNotMatch(room, /padding|margin|width/, "the mark makes its value wider");
  assert.match(dot, /position: absolute/);
  // One style on every ground: the same fill and the same edge, with nothing a band can change.
  assert.match(dot, /border:[^;]*solid var\(--ink\)/);
  assert.doesNotMatch(css + tokens, /--tbc-edge/, "a band changes how the dot looks");
  // The dot goes away when --tbc-mark is 0.
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
  // One switch for the whole menu, each size in it once. A group's header is its name and
  // nothing else: a row with a price of its own names the size beside that price.
  const menu = section("menu");
  const switches = [...menu.matchAll(/<div class="seg seg-poster[^"]*" role="radiogroup" aria-label="Ukuran[^"]*">[\s\S]*?<\/div>/g)];
  assert.equal(switches.length, 1, "the size switch is drawn once");
  assert.equal((menu.match(/role="radiogroup"/g) || []).length, 1);
  const heads = [...menu.matchAll(/<div class="grp-head[^"]*">[\s\S]*?<\/div>/g)].map((m) => m[0]);
  assert.ok(heads.length >= 4);
  for (const size of data.sizes) {
    assert.equal(switches[0][0].split(`<span class="size">${size.label}</span>`).length - 1, 1, `${size.label} once in the switch`);
  }
  for (const head of heads) assert.match(head, /^<div class="grp-head"><h3>[^<]+<\/h3><\/div>$/, "a group's header is more than its name");
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
  // Right after each drink's button comes the one that takes a cup off: hidden until the
  // drink is in the order, and named for a screen reader (the drawn minus is not read).
  for (const d of data.drinks) {
    const less = new RegExp(`</button><button type="button" class="less" data-less="${d.id}" hidden><svg class="sign"[^>]*aria-hidden="true">.*?</svg><span class="sr">Kurangi satu ${d.name}</span></button>`);
    assert.match(body, less, `${d.id} has no way to take a cup off`);
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

test("the menu takes a cup off again, and the bar says which sizes its sum is made of", () => {
  // The minus takes from the drink's row in the picked size, and only from that size.
  const lines = [
    { drinkId: "mangga", size: "14", qty: 2 },
    { drinkId: "", size: "14", qty: 1 },
    { drinkId: "mangga", size: "22", qty: 1 },
    { drinkId: "kopi", size: "14", qty: 0 },
  ];
  assert.equal(rowToTake(lines, "mangga", "22"), 2);
  assert.equal(rowToTake(lines, "mangga", "14"), 0);
  assert.equal(rowToTake([lines[0]], "mangga", "22"), -1, "no cup in the picked size: the cups in the other size are left alone");
  assert.equal(rowToTake(lines, "kopi", "14"), -1, "a row with no cups has nothing to take");
  assert.equal(rowToTake(lines, "taro", "14"), -1);
  assert.equal(rowToTake([], "mangga", "14"), -1);

  // The count beside a drink is its cups in the picked size, so it is the number the minus
  // counts down (fourth review of the second design, below).
  assert.equal(cupsOf(lines, "mangga", "14"), 2);
  assert.equal(cupsOf(lines, "mangga", "22"), 1);
  assert.equal(cupsOf([lines[0]], "mangga", "22"), 0);
  assert.equal(cupsOf([...lines, { drinkId: "mangga", size: "14", qty: "3" }], "mangga", "14"), 5, "two rows of one drink and size count together");
  assert.equal(cupsOf(lines, "kopi", "14"), 0);
  assert.equal(cupsOf([{ drinkId: "strawberry-et-choco", size: "14", qty: 3 }], "strawberry-et-choco", "14"), 0, "a size the drink isn't sold in holds no cups");
  assert.equal(cupsOf([], "mangga", "14"), 0);
  for (const size of data.sizes) assert.equal(cupsOf(lines, "mangga", size.id) > 0, rowToTake(lines, "mangga", size.id) >= 0, "a count without a minus, or a minus without a count");

  // The bar's sizes count exactly what the total counts.
  assert.deepEqual(cupsBySize(lines), [
    { size: "14", cups: 2 },
    { size: "22", cups: 1 },
  ]);
  assert.deepEqual(cupsBySize([{ drinkId: "strawberry-et-choco", size: "14", qty: 3 }, { drinkId: "kopi", size: "22", qty: "4" }]), [{ size: "22", cups: 4 }]);
  assert.deepEqual(cupsBySize([]), []);

  assert.ok(js.includes("rowToTake(") && js.includes("cupsBySize(") && js.includes("cupsOf(order.lines, drinkId, adds)"), "the page script uses the tested rules");
  // The count sits between the minus and the plus, and the minus is a full 44px target as tall as its row.
  assert.match(css, /\.less \{[^}]*top: 0;[^}]*bottom: 0;[^}]*width: var\(--tap\)/);
  assert.match(css, /\.picks-wide \.less \{[^}]*height: var\(--tap\)/);
  assert.match(css, /\.pick\[data-count\] \.pick-ctl \{[^}]*padding-left: var\(--tap\)/, "no room kept for the minus before the count");
  // One drink per row on a phone, so every row has that room.
  assert.match(css, /\.picks \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  // What the minus did is read out like what a tap did, and it says which size it takes.
  assert.ok(js.includes('"masuk" : "dikurangi satu"') && js.includes("`Kurangi satu ${findDrink(drinkId).name} ${sizeName(adds)}`"));
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
  // Two things stay on top: the jump links, and under them the menu's size switch while the
  // drinks it prices are on screen (see the third review of the second design, below).
  assert.equal((css.match(/position: sticky/g) || []).length, 2);
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
  assert.ok(body.includes('<p class="sr" role="status" id="tap-said"></p>'), "taking off the last cup hides the bar, so its words need a status of their own");
  assert.match(bar, /<a class="btn btn-fill" href="#pesan">Lanjut<span class="sr"> pre-order<\/span><\/a>/);
  // The sum, then what it is the sum of: the cups, and the sizes they are in, each a part
  // of its own that site.js writes.
  assert.match(bar, /<strong id="bar-price"><\/strong> <span class="bar-what" id="bar-what"><\/span>/);
  assert.ok(js.includes('${piece(`${cups} gelas`)} <span class="bar-sizes">${inSizes.map(piece).join(" ")}</span>'));
  // The menu's count is read apart from the size a tap adds, and says it is in that size.
  assert.ok(js.includes(". Sudah ${n} gelas ukuran ini di pesanan"));
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
  // The serif is upright, like the shop's own, and only for the shop's and its customers'
  // own words: its line about the best seller, its line about the corndog, the reviews.
  assert.doesNotMatch(tokens + css, /italic/, "an italic face");
  assert.match(css, /\.quiet,\s*\.pick-tag \{[^}]*font-family: var\(--font-quiet\)/);
  assert.equal((css.match(/var\(--font-quiet\)/g) || []).length, 1, "the serif is set in one rule");
  const serif = [...body.matchAll(/<(\w+) class="(?:quiet|pick-tag)"[^>]*>([^<]*)</g)].map((m) => m[2]);
  assert.deepEqual(serif, ["Nungguin kamu, iya kamu.", "Corndog dong, baru diangkat.", ...data.brand.reviewQuotes.map((q) => `“${q}”`)]);
  // Shop names and section titles are in the bold sans.
  assert.doesNotMatch(body, /<h[1-3][^>]*class="quiet"/);
  // The serif is never small print.
  assert.doesNotMatch(css, /\.(quiet|pick-tag)[^{]*\{[^}]*font-size: var\(--text-small\)/);
});

// --- What the first review of the second design found, kept fixed -------------------

test("a menu row has one dot, and every unconfirmed price sits inside a mark", () => {
  const menu = section("menu");
  // A drink with a price per size wears one mark around both, not a dot between them.
  const rows = [...menu.matchAll(/<button type="button" class="pick pick-row cols"[\s\S]*?<\/button>/g)].map((m) => m[0]);
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal((row.match(/class="tbc[ "]/g) || []).length, 1, "more than one dot on a menu row");
    assert.equal(rowMarks(row).length, 1);
    assert.equal(rowMarks(row)[0].title, data.drinks[0].prices[14].note, "the row's mark lost its note");
  }
  for (const [li] of menu.matchAll(/<li class="extra">[\s\S]*?<\/li>/g)) assert.equal((li.match(/class="tbc[ "]/g) || []).length, 1);
  // Every price in data.mjs that is still tbc() shows only inside a marked element.
  const left = text(withoutMarks(body));
  const prices = [
    ...data.drinks.flatMap((d) => Object.values(d.prices)),
    ...data.toppings.map((t) => t.price),
    data.snackPriceRange,
    ...data.bundles.map((b) => b.price ?? b.priceRange),
  ].filter(data.isTbc);
  assert.ok(prices.length > 0);
  for (const price of prices) {
    for (const n of [data.val(price)].flat()) assert.ok(!left.includes(bare(n)), `Rp${bare(n)} shows outside a mark`);
  }
  assert.doesNotMatch(left, /Rp\s?\d/, "a price outside a mark");
});

test("both sizes read as for sale, and every menu row is one height", () => {
  // A price in the size not picked is lighter in weight only: grey would read as sold out.
  const off = /\.price-off \{([^}]*)\}/.exec(css)[1];
  assert.match(off, /font-weight: 400/);
  assert.doesNotMatch(off, /color|opacity/);
  // Rows take their height from one number, and no column stretches its rows to fill.
  assert.match(css, /\.pick \{[^}]*min-height: var\(--row\)/);
  assert.match(css, /\.extra \{[^}]*min-height: var\(--row\)/);
  assert.doesNotMatch(css, /\.grp > \.(rows|picks)[^{]*\{[^}]*flex: 1/, "a menu column stretches its rows");
});

test("the best seller is a block of type, and no photo shows twice", () => {
  const menu = section("menu");
  const best = /<li class="picks-wide">[\s\S]*?<\/li>/.exec(menu)[0];
  // The same cup is on the first screen, so the block has no picture: a tag, the name, the shop's line.
  assert.doesNotMatch(best, /<picture|<img/);
  assert.match(best, /<span class="pick-name">Strawberry<\/span><span class="sr">, <\/span><span class="pick-flag">Paling laris<\/span><span class="sr">\. <\/span><span class="pick-tag">Nungguin kamu, iya kamu\.<\/span>/);
  // No original is cut twice, so no picture is on the page twice.
  const from = Object.values(photos).map((p) => p.from);
  assert.equal(new Set(from).size, from.length, "one original is on the page as two photos");
  // The menu's one photo is the snack's small square.
  assert.equal((menu.match(/<picture/g) || []).length, 1);
  assert.match(css, /\.snack \.photo \{[^}]*width: 5rem/);
  // On a wide screen the block lines up with its column, its words inset from the edge.
  const wide = css.slice(css.indexOf("@media (min-width: 56rem)"));
  assert.match(wide, /\.menu \{[^}]*--bleed: 0px;[^}]*--best-inset: var\(--space-4\)/);
  // Bundles of drinks sit with the drinks, not under the snacks.
  const snacks = /<section class="grp grp-extras">[\s\S]*?<\/section>/.exec(menu)[0];
  for (const b of data.bundles) assert.ok(!snacks.includes(b.name) && menu.indexOf(b.name) < menu.indexOf("grp-extras"), `${b.name} is listed with the snacks`);
});

test("a shop's photo is inside its own row, and a shop without one is the same row", () => {
  const toko = section("toko");
  const rows = [...toko.matchAll(/<li class="shop">[\s\S]*?<\/li>/g)].map((m) => m[0]);
  assert.equal(rows.length, data.shops.length);
  rows.forEach((row, i) => {
    const photo = shopPhotos[data.shops[i].id];
    assert.equal((row.match(/<picture/g) || []).length, photo ? 1 : 0);
    if (photo) assert.ok(row.includes(`${PHOTO_DIR}/${photo}-`), `${data.shops[i].id} shows another shop's front`);
    // The words come first and are the same in every row. The photo is the row's last thing.
    assert.match(row, /^<li class="shop">\s*<div class="shop-words">\s*<div class="shop-what">\s*<h3>/);
    if (photo) assert.match(row, /<\/div>\s*<picture class="photo bleed shop-photo">[\s\S]*<\/picture>\s*<\/li>$/);
  });
  assert.ok(Object.keys(shopPhotos).length < data.shops.length, "every shop has a photo now: drop this line");
  // No caption repeats a shop's name under its photo, and no set of photos stands apart from the list.
  assert.doesNotMatch(toko, /<figcaption|<figure|class="fronts"/);
  for (const shop of data.shops) assert.equal(text(withoutMarks(toko)).split(data.val(shop.name).replace(`${data.brand.name} d`, "D")).length - 1, 1, `${data.val(shop.name)} is named twice`);
  // Nothing in the layout waits for the photo.
  assert.doesNotMatch(css, /:has\(\.shop-photo\)|\.shop-seen/);
});

test("pink is an accent: no band, no way in, and one colour for the buttons that move the order on", () => {
  // The only pink is the petal pink, and only strawberry and the order use it.
  assert.match(tokens, /--flavor-strawberry: var\(--petal\);/);
  assert.match(tokens, /--order: var\(--flavor-strawberry\);/);
  assert.doesNotMatch(css, /var\(--(petal|badge-pink)\)/, "pink used for something that is neither strawberry nor the order");
  for (const [rule] of css.matchAll(/[^{}]*\{[^}]*var\(--(?:order|flavor-strawberry)\)[^}]*\}/g)) {
    assert.doesNotMatch(rule.split("{")[0], /\.jump|\.order-head|\.band|\.logo|\.btn/, `pink on ${rule.split("{")[0].trim()}`);
  }
  // The jump link, the order bar's button and the send button are one black button with one text colour.
  assert.match(css, /\.btn-fill,\s*\.btn-send,\s*\.jump-go span \{[^}]*background: var\(--ink\);[^}]*color: var\(--paper\);/);
  // "Lihat pesan" opens with the page's own arrow, not the browser's triangle.
  assert.match(css, /\.preview summary \{[^}]*list-style: none/);
  assert.match(css, /\.preview summary::-webkit-details-marker \{[^}]*display: none/);
  assert.match(css, /\.select::after,\s*\.preview summary::after \{/);
});

test("the form: one red frame, and the page's two columns", () => {
  // One weight for every field with a problem; with keyboard focus it keeps a visible ring in the same red.
  assert.match(css, /input\[aria-invalid="true"\],\s*select\[aria-invalid="true"\],\s*\.seg\[aria-invalid="true"\] \{[^}]*outline: 1\.5px solid var\(--danger\)/);
  assert.match(css, /input\[aria-invalid="true"\]:focus-visible,\s*select\[aria-invalid="true"\]:focus-visible \{[^}]*outline-width: var\(--line-strong\)/, "keyboard users lose the focus ring on a field with a problem");
  // The form's columns are the page's columns, so its right half starts under the photo.
  assert.match(css, /\.form,\s*\.send \{\s*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/);
});

test("words: GoFood has its own line, the rating is a plain line, the card names the shop", () => {
  assert.doesNotMatch(text(section("cara")), /traktir/i, "the GoFood row repeats the Traktir Drivermu bundle");
  // The Google rating is one plain line over the quotes, not a giant number.
  assert.ok(body.includes(`<figcaption class="rating">${data.brand.google.rating} di Google, dari ${data.brand.google.reviews} ulasan</figcaption>`));
  assert.doesNotMatch(css + tokens, /--text-figure|\.rating strong/);
  // The headline's lines keep clear of each other.
  assert.ok(parseFloat(/--h1-leading: ([\d.]+);/.exec(tokens)[1]) >= 1);
  // On the link-preview card the shop's name is the big bold line.
  assert.ok(card.includes(`<h1>${data.brand.name}</h1>`));
  const px = (sel) => parseFloat(new RegExp(`${sel} \\{[^}]*font-size: (\\d+)px`).exec(card)[1]);
  assert.ok(px("h1") >= 60 && px("h1") > px("\\.line"));
  // Under the name, one line about the shop: the page's headline. Not two slogans (fourth
  // review of the second design): the shop's own tagline stays on the page, beside the badge.
  assert.ok(card.includes(`<p class="line">${HEADLINE}</p>`));
  assert.ok(!text(card).includes(data.brand.tagline), "two slogans on the link-preview card");
  assert.ok(body.includes(`<span class="logo-tag">${data.brand.tagline}</span>`) && data.brand.tagline.includes("Jatinangor"));
  assert.ok(head.includes(`<meta property="og:image:alt" content="${data.brand.name}. ${HEADLINE}">`), "the preview picture's words are not the card's");
});

// --- What the second review of the second design found, kept fixed -------------------

test("a jump to the form lands on its title", () => {
  const pesan = section("pesan");
  // The title is the section's first thing, and the jump puts it right under the sticky links.
  assert.match(pesan, /^<section[^>]*id="pesan">\s*<div class="order-head">\s*<div class="wrap order-top">\s*<h2>/);
  assert.match(css, /#pesan \{[^}]*scroll-margin-top: calc\(var\(--space-4\) \* -1\)/);
  assert.doesNotMatch(html + css, /--head-photo/);
});

test("the dot sits at one height everywhere, clear of corners, and after a pair of prices", () => {
  // Level with the middle of its value's box, whatever the size of the letters.
  const dot = /\.tbc::after \{([^}]*)\}/.exec(css)[1];
  assert.match(dot, /top: calc\(50% [^;]*var\(--tbc-size\) \/ 2\)/);
  assert.doesNotMatch(dot, /bottom:/);
  // The form's total keeps room for it inside the bar.
  assert.match(css, /#total-price \{[^}]*margin-right: var\(--space-3\)/);
  // A row's two prices are one pair on one line, as wide as its words, so the one dot hangs
  // right after the last price (third review of the second design, below).
  assert.match(css, /\.prices \{[^}]*display: flex;/);
  assert.doesNotMatch(/\.prices \{([^}]*)\}/.exec(css)[1], /padding|justify-content/);
});

test("small phones: a drink's sum and Hapus get their own line, and no part of the amount is under 44px", () => {
  const small = /@media \(max-width: 23\.5rem\) \{[\s\S]*?\n\}\n/.exec(css)[0];
  assert.match(small, /\.line-end \{[^}]*flex-basis: 100%/);
  // The buttons, and the number between them: 44px wide wherever the form is narrow.
  for (const [rule] of css.matchAll(/\.qty (?:button|input)[^{]*\{[^}]*\}/g)) {
    const width = /(?:^|[\s;])width: ([^;]+);/.exec(rule)?.[1];
    assert.ok(!width || width === "var(--tap)" || parseFloat(width) >= 2.75, `a part of the amount narrower than 44px: ${rule}`);
  }
});

test("the shops' band is the awning's turquoise, and the sticky links have no lone divider", () => {
  // Clearly not a second dark green: much lighter than the poster, with black type on it.
  const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0) / 765;
  const [poster, banner] = ["poster", "banner"].map((n) => new RegExp(`--${n}: (#[0-9a-f]{6});`).exec(tokens)[1]);
  assert.ok(lum(banner) > lum(poster) + 0.2, "the shops' band reads as a second dark green");
  assert.match(tokens, /--banner-ink: var\(--ink\);/);
  for (const [rule] of css.matchAll(/\.jump[^{]*\{[^}]*\}/g)) assert.doesNotMatch(rule, /border-left/);
  // The footer ends soon after its last line.
  assert.match(css, /\.foot \{[^}]*padding-block: var\(--space-6\) var\(--space-5\)/);
});

// --- What the third review of the second design found, kept fixed --------------------

test("a soft photo is only ever a small square: none runs across the page", async () => {
  const sources = await read("public/assets/real/SOURCES.md");
  const pictures = Object.fromEntries([...body.matchAll(/<picture[^>]*>[\s\S]*?<\/picture>/g)].map((m) => [/assets\/photos\/([a-z-]+?)-\d+\./.exec(m[0])[1], m[0]]));
  let soft = 0;
  for (const [name, photo] of Object.entries(photos)) {
    // A still from a video is soft, whatever the list says: SOURCES.md knows which ones are.
    const row = sources.split("\n").find((line) => line.startsWith(`| \`${photo.from}\` |`));
    if (/\(still at/.test(row)) assert.equal(photo.soft, true, `${name} is a video still: mark it soft`);
    if (!photo.soft) continue;
    soft += 1;
    const [, , w, h] = photo.crop;
    assert.equal(w, h, `${name}: a soft photo is a square`);
    assert.ok(photo.widths[0] <= 448, `${name}: a soft photo is cut small`);
    assert.doesNotMatch(/sizes="([^"]*)"/.exec(pictures[name])[1], /vw/, `${name}: a soft photo is sized to the screen`);
    assert.doesNotMatch(pictures[name], /class="photo [^"]*bleed/, `${name}: a soft photo runs edge to edge`);
  }
  assert.ok(soft >= 1);
  // No CSS shows a small square wider than 7rem.
  for (const [, rem] of css.matchAll(/\.snack \.photo \{[^}]*width: ([\d.]+)rem/g)) assert.ok(Number(rem) <= 7);
  // The counter at night (a customer's back over the wall's lettering) is gone, and the
  // ways to order have no photo.
  assert.ok(!("pickup" in photos));
  assert.doesNotMatch(section("cara"), /<picture|<img/);
  assert.doesNotMatch(html + css, /band-photo/);
});

test("the size switch stays in sight over the drinks it prices, and covers nothing focused", () => {
  // Under the jump links, on the poster's own ground, for as long as its column is on screen.
  const sw = /\.seg-poster \{([^}]*)\}/.exec(css)[1];
  assert.match(sw, /position: sticky;/);
  assert.match(sw, /top: calc\(var\(--tap-big\) - 1px\)/);
  assert.match(sw, /background: var\(--bg\)/);
  // It is the first thing in the column of the drinks that share its price, and only theirs.
  const menu = section("menu");
  const first = /<div class="menu-col">([\s\S]*?)<div class="menu-col">/.exec(menu)[1];
  assert.match(first, /^\s*<div class="seg seg-poster"/);
  assert.deepEqual([...first.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]), ["Buah", "Rasa"]);
  assert.doesNotMatch(first, /class="price"|pick-row/, "a drink with its own price under the switch's price");
  // A drink or a minus reached with the keyboard stops below the switch.
  assert.match(css, /\.pick,\s*\.less \{[^}]*scroll-margin-top: var\(--switch\)/);
  assert.match(css, /--switch: [\d.]+rem;/);
  // On a screen too short for it, it scrolls away like the rest.
  assert.match(css, /@media \(max-height: 30rem\) \{\s*\.seg-poster \{\s*position: static;/);
});

test("a row's prices: one line on a phone, the dot right after, and pink for the size picked", () => {
  // The prices run under the name, across the row, on one line. The count keeps to the name's line.
  assert.match(css, /\.pick\.cols \{[^}]*grid-template-areas: "name ctl" "prices prices"/);
  assert.match(css, /\.rows \.less \{[^}]*height: calc\(var\(--ctl-add\) \+ var\(--space-2\) \* 2\)/, "the minus beside a two-line row is not 44px around the plus's line");
  assert.match(tokens, /--tap: 2\.75rem;/);
  assert.match(css, /--ctl-add: 1\.75rem;/); // 1.75rem + 2 x 0.5rem = 44px
  // A price in the picked size is bold and wears the order's pink, like the picked half of the switch.
  assert.match(css, /\.pick \.price\[data-size\]:not\(\.price-off\) \{\s*color: var\(--order\);/);
  // On the best seller's block the count sits in a 44px box on the line of the minus.
  assert.match(css, /\.pick-best \.pick-ctl \{[^}]*align-self: end;[^}]*min-height: var\(--tap\)/);
});

test("the plus and the minus are drawn, and a list's last row has no rule under it", () => {
  // Drawn like the arrows, so each sits in the middle of its button: no typed sign in a count button.
  const signs = [...body.matchAll(/<svg class="sign"[^>]*><path d="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(signs.length, data.drinks.length * 2 + 2); // a plus and a minus per drink, and the form's pair
  assert.equal(new Set(signs).size, 2);
  assert.doesNotMatch(body, /&minus;|−<\/|class="pick-add">\+</);
  assert.match(/<template id="line">([\s\S]*?)<\/template>/.exec(body)[1], /data-step="-1" aria-label="Kurangi satu"><svg class="sign"[\s\S]*?data-step="1" aria-label="Tambah satu"><svg class="sign"/);
  assert.match(css, /\.sign \{[^}]*display: block;/);
  // No thin rule between a list's last row and the end of its band.
  assert.match(css, /\.picks li:last-child,\s*\.rows li:last-child \{\s*border-bottom: 0;/);
  assert.match(css, /\.way-list li:last-child \.way \{\s*border-bottom: 0;/);
  assert.match(css, /\.shop:last-child \{[^}]*padding-bottom: 0;[^}]*border-bottom: 0;/);
});

test("rows with no plus have no button, and promise nothing", () => {
  const menu = section("menu");
  for (const [li] of menu.matchAll(/<li class="extra">[\s\S]*?<\/li>/g)) assert.doesNotMatch(li, /<button|<small>[^<]*toko/);
});

test("narrow phones: no line of the bar ends in a dot, and the shops stack", () => {
  // The bar's parts are whole pieces. The dot before each is drawn in the gap, and cut off
  // where a part starts a new line.
  assert.match(css, /\.bar-what \{[^}]*flex-wrap: wrap;[^}]*overflow: hidden;/);
  assert.match(css, /\.bar-what span \{[^}]*white-space: nowrap;/);
  assert.match(css, /\.bar-what span \+ span::before \{[^}]*content: "·";[^}]*position: absolute;[^}]*left: -/);
  assert.doesNotMatch(js, /join\(" · "\)/);
  const small = /@media \(max-width: 23\.5rem\) \{[\s\S]*?\n\}\n/.exec(css)[0];
  assert.match(small, /\.seg-fill \{\s*flex-direction: column;/);
});

test("the first photo lines up with the words beside it, and the link preview shows the whole cup", () => {
  const wide = css.slice(css.indexOf("@media (min-width: 56rem)"));
  assert.match(wide, /\.hero-photo \{[^}]*align-self: stretch;/);
  assert.match(wide, /\.hero-open \{[^}]*min-height: 0;/);
  // The cup in the first photo is about 307 px tall at the card's size: the photo's window is taller.
  const window = Number(/\.photo \{[^}]*height: (\d+)px/.exec(card)[1]);
  assert.ok(window >= 340 && OG_SIZE.height - window >= 200, `the card's photo is ${window}px tall`);
  // The form's total is its one loud line, sized in tokens.css.
  assert.match(css, /#total-price \{[^}]*font-size: var\(--text-sum\)/);
  assert.match(tokens, /--text-sum: clamp\(/);
});

// --- What the fourth review of the second design found, kept fixed -------------------

/** A piece of HTML as it shows: without the words that are only read out. */
const shown = (h) => text(h.replace(/<span class="sr[^"]*">[^<]*<\/span>/g, " "));

test("no sentence explains the menu", () => {
  const menu = section("menu");
  assert.doesNotMatch(menu, /<p[ >]/, "a paragraph on the menu");
  assert.doesNotMatch(text(body), /Tombol \+|tanya toko/i);
  assert.doesNotMatch(css, /\.menu-note/);
});

test("a price is on the menu once: a row shows only the price that is not the switch's", () => {
  const menu = section("menu");
  const switched = data.drinks.find((d) => d.group === "buah").prices; // the price in the switch
  const own = data.drinks.filter((d) => !["buah", "rasa"].includes(d.group));
  assert.ok(own.length > 0);
  const rowOf = (d) => new RegExp(`<button type="button" class="pick pick-row cols" data-drink="${d.id}">[\\s\\S]*?</button>`).exec(menu)[0];
  for (const d of own) {
    const row = rowOf(d);
    for (const size of data.sizes.filter((s) => d.prices[s.id] != null)) {
      const price = rupiah(data.val(d.prices[size.id]));
      const same = data.val(d.prices[size.id]) === data.val(switched[size.id]);
      // Shown or only read out, a price is inside the row's one mark, with its size.
      assert.ok(rowMarks(row)[0].inner.includes(price), `${d.id} lost its ${size.label} price`);
      assert.equal(shown(row).includes(price), !same, `${d.id} ${size.label}: ${same ? "the switch's price again" : "its own price is hidden"}`);
      if (same) assert.ok(row.includes(`<span class="sr">${size.label} ${price} </span>`));
      else assert.match(row, new RegExp(`data-size="${size.id}"><span class="(?:price-size|sr)">${size.label} </span>${price.replace(".", "\\.")}</span>`));
    }
  }
  for (const size of data.sizes) assert.equal(shown(menu).split(rupiah(data.val(switched[size.id]))).length - 1, 1, `the ${size.label} price shows more than once`);

  // Pink is the picked size and nothing else: a drink sold in 22 oz alone is not pink while 14 oz is picked.
  const oneSize = own.find((d) => d.prices[data.sizes[0].id] == null);
  assert.match(rowOf(oneSize), new RegExp(`<span class="price price-off" data-size="${data.sizes[1].id}">`));
  assert.ok(js.includes('price.classList.toggle("price-off", price.dataset.size !== menuSize)'));

  // The dot hangs right after the number: the row's price is as wide as its words, at the
  // row's end, and no price sits in a column wider than itself.
  const wide = /@media \(min-width: 30rem\) \{[\s\S]*?\n\}\n/.exec(css)[0];
  assert.match(wide, /\.pick\.cols \.prices \{[^}]*justify-self: end;[^}]*margin-right: var\(--space-3\)/);
  assert.doesNotMatch(css, /--col-price|grid-auto-columns|\.prices > \*/);
  // On a map button the dot has room before the arrow.
  assert.match(css, /\.shop-go \.btn \{[^}]*gap: 1\.25rem/);
});

test("no photo of a person nobody can name, and the shop fronts are one shape", async () => {
  // The two soft stills of people at work are gone: the story and the form's title stand alone.
  assert.deepEqual(Object.keys(photos), ["hero", "corndog", "toko-griya", "toko-ikopin"]);
  assert.doesNotMatch(section("pesan") + section("cerita"), /<picture|<img/);
  assert.doesNotMatch(css, /order-aside|story-photo/);
  // No file is left behind for a cut that is gone.
  const { readdir } = await import("node:fs/promises");
  const cuts = Object.entries(photos).flatMap(([name, p]) => p.widths.flatMap((w) => ["avif", "jpg", "webp"].map((ext) => `${name}-${w}.${ext}`)));
  assert.deepEqual((await readdir(join(root, "public", PHOTO_DIR))).sort(), cuts.sort(), "a photo file no cut uses");

  // The fronts are cut to one shape, so they are one size on every screen, and the row
  // without a photo runs the page's width.
  const shapes = Object.values(shopPhotos).map((name) => photos[name].crop[2] / photos[name].crop[3]);
  for (const shape of shapes) assert.ok(Math.abs(shape / shapes[0] - 1) < 0.005, "shop fronts of different shapes");
  const wide = css.slice(css.indexOf("@media (min-width: 56rem)"));
  assert.match(wide, /\.shop-words \{\s*flex: 1;/);
  assert.match(wide, /\.shop-photo \{[^}]*width: calc\(\(100% - var\(--space-8\)\) \/ 2\)/);
  assert.doesNotMatch(css, /\.shop-photo img|max-height: 12rem/);
});

test("the narrowest phone: the best seller's line has air, and the bar's sizes share a line", () => {
  assert.ok(Number(/\.pick-tag \{[^}]*grid-area: tag;[^}]*line-height: ([\d.]+);/.exec(css)[1]) >= 1.15);
  assert.match(css, /\.pick-tag \{[^}]*grid-area: tag;[^}]*padding-block: var\(--space-1\)/);
  // The sizes are one piece that never wraps inside, so no size is alone on a line.
  assert.doesNotMatch(/\.bar-what,\s*\.bar-sizes \{([^}]*)\}/.exec(css)[1], /flex-wrap/);
  assert.match(css, /\.bar-what,\s*\.bar-sizes \{[^}]*display: flex;/);
});

test("the order bar goes by where the form is now, not by the first of several reports", () => {
  // After a fast scroll the browser can report "on screen" and "off again" together. Reading
  // the first one left the bar missing on the menu (found in a real browser, round 4).
  assert.match(js, /formOnScreen = entries\[entries\.length - 1\]\.isIntersecting;/);
  assert.doesNotMatch(js, /IntersectionObserver\(\(\[/);
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
