// The page. Runs at build time (build.mjs) and returns the whole HTML.
// Every fact comes from data.mjs and goes through mark() so unconfirmed values
// show their mark. Colours and fonts live in tokens.css, layout in site.css,
// the photos' list in photos.mjs, the form's behaviour in site.js.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WHATSAPP_NUMBER,
  brand,
  bundles,
  drinkGroups,
  drinks,
  isTbc,
  order as orderRules,
  shops,
  sizes,
  snackPriceRange,
  snacks,
  story,
  tbc,
  toppings,
  val,
  visit,
} from "./data.mjs";
import { clock, rupiah } from "./order.mjs";
import { esc, mark, markAll } from "./mark.mjs";
import { PHOTO_DIR, drinkPhotos, photoSize, photos, shopPhotos } from "./photos.mjs";

const root = join(import.meta.dirname, "..");
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const tokens = () => readFileSync(join(root, "src/tokens.css"), "utf8");

/**
 * The logo, inlined so it takes the text colour around it. Swap public/brand/logo.svg to
 * change it: any SVG file works, with or without an <?xml?> line on top.
 */
export function logo() {
  return readFileSync(join(root, "public/brand/logo.svg"), "utf8")
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg\b([^>]*)>/, (_, attrs) =>
      /\sclass="/.test(attrs) ? `<svg${attrs.replace(/\sclass="/, ' class="logo-mark ')}>` : `<svg class="logo-mark"${attrs}>`,
    )
    .trim();
}

/** A value from tokens.css, for the few places CSS can't reach (the browser's bar colour). "" if not there. */
export function token(name) {
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens())?.[1].trim() || "";
}

/** The font files named in tokens.css, so the page preloads exactly what the styles use. */
export function fontFiles() {
  const files = [...tokens().matchAll(/@font-face\s*\{[^}]*\}/g)].flatMap(([block]) =>
    [...block.matchAll(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/g)].map((m) => m[1]),
  );
  return [...new Set(files)];
}

// --- Photos and arrows --------------------------------------------------------

const srcset = (name, ext) => photos[name].widths.map((w) => `${PHOTO_DIR}/${name}-${w}.${ext} ${w}w`).join(", ");

/**
 * A photo from photos.mjs: avif, then webp, then jpg, with its size set so the page
 * doesn't jump while it loads. `sizes` is how wide it shows. Only the first photo on
 * the page is `first` (loaded at once, ahead of the rest). `alt: ""` is for a photo
 * inside a button that already names the thing.
 */
export function picture(name, { sizes = "100vw", first = false, cls = "", alt = photos[name].alt } = {}) {
  const { width, height } = photoSize(name);
  const load = first ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  return `<picture class="photo${cls ? ` ${cls}` : ""}"><source type="image/avif" srcset="${srcset(name, "avif")}" sizes="${esc(sizes)}"><source type="image/webp" srcset="${srcset(name, "webp")}" sizes="${esc(sizes)}"><img src="${PHOTO_DIR}/${name}-${photos[name].widths.at(-1)}.jpg" srcset="${srcset(name, "jpg")}" sizes="${esc(sizes)}" width="${width}" height="${height}" alt="${esc(alt)}" ${load}></picture>`;
}

/** Where a link goes, drawn to sit with the type: `down` is further down this page, `out` leaves it. */
const ARROWS = { down: "M8 2.5v10M3.5 8.5 8 13l4.5-4.5", out: "M4 12l8-8M5.5 4H12v6.5" };
const arrow = (kind) =>
  `<svg class="arrow" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${ARROWS[kind]}" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="square"/></svg>`;

// --- Small formatters ---------------------------------------------------------

/** One price format everywhere: "Rp13.000". A range says Rp once: "Rp8.000–19.500". */
const range = ([low, high]) => `${rupiah(low)}–${rupiah(high).replace("Rp", "")}`;
const span = ([open, close]) => `${clock(open)}–${clock(close)}`;

/** The days a shop keeps other hours, said as the exception they are: "Jumat baru buka 14.00". */
function oddDays(h) {
  return Object.entries(h.byDay || {})
    .map(([day, [open, close]]) => {
      if (close === h.default[1]) return `${DAYS[day]} baru buka ${clock(open)}`;
      if (open === h.default[0]) return `${DAYS[day]} sudah tutup ${clock(close)}`;
      return `${DAYS[day]} ${span([open, close])}`;
    })
    .join(", ");
}

/** ["Tunai", "QRIS"] -> "tunai atau QRIS" (a short name in capitals stays as it is). */
const payWith = () => visit.payment.map((p) => (p === p.toUpperCase() ? p : p.toLowerCase())).join(" atau ");

// --- Menu ---------------------------------------------------------------------

/**
 * The menu's sections, for the poster and for the form's list. A group with a single
 * drink is not a section of its own: the drink joins the section before it and
 * carries its group's name (`kind`).
 */
function menuSections() {
  const out = [];
  for (const group of drinkGroups) {
    const list = drinks.filter((d) => d.group === group.id);
    if (list.length === 1 && out.length) out.at(-1).list.push({ ...list[0], kind: group.name });
    else if (list.length) out.push({ ...group, list });
  }
  return out;
}

/** "22 oz saja" for a drink not sold in every size, else "". */
function onlySizes(drink) {
  const sold = sizes.filter((s) => drink.prices[s.id] != null);
  return sold.length < sizes.length ? `${sold.map((s) => s.label).join(", ")} saja` : "";
}

/** True when every drink of a group costs the same, so the price is said once. */
function samePrices(list) {
  const key = (d) => sizes.map((s) => val(d.prices[s.id]) ?? "").join("|");
  return list.every((d) => key(d) === key(list[0]));
}

/** The size a tap adds before anyone has touched a switch: the first one the drink is sold in. */
const firstSize = (drink) => sizes.find((s) => drink.prices[s.id] != null);

/**
 * What the menu's one size switch covers. Groups whose drinks all cost the same (Buah,
 * Rasa) are `flat`: their price is said once, in the switch above them. The others
 * (`own`) keep a price on every row.
 */
function menuParts() {
  const sections = menuSections();
  const lead = sections.find((g) => g.list.length > 1 && samePrices(g.list));
  const covered = (g) => Boolean(lead) && samePrices([lead.list[0], ...g.list]);
  return { price: lead?.list[0].prices, flat: sections.filter(covered), own: sections.filter((g) => !covered(g)) };
}

/**
 * The menu's one size switch. It picks the size a tap on any drink adds, and carries
 * the price of the groups that share one, so that price is on the poster once.
 */
function sizeSwitch({ price, flat }) {
  const sold = sizes.filter((s) => drinks.some((d) => d.prices[s.id] != null));
  const what = flat.length ? ` dan harga ${flat.map((g) => g.name).join(" dan ")}` : "";
  const part = (s, i) =>
    `<label><input type="radio" name="menu-size" value="${esc(s.id)}"${i === 0 ? " checked" : ""}><span><span class="size">${esc(s.label)}</span>${price?.[s.id] != null ? ` <span class="price price-all">${mark(price[s.id], rupiah)}</span>` : ""}</span></label>`;
  return `<div class="seg seg-poster" role="radiogroup" aria-label="Ukuran${esc(what)}">${sold.map(part).join("")}</div>`;
}

/**
 * A drink on the menu: a button that adds one cup to the order, in the size picked in
 * the menu's switch. site.js fills in the count and keeps the size it reads out current.
 */
function pick(drink, inner, extraClass = "") {
  return `<button type="button" class="pick${extraClass}" data-drink="${esc(drink.id)}"><span class="sr">Tambah </span>${inner} <span class="pick-n" aria-hidden="true">+</span><span class="sr pick-sr">, ukuran ${esc(firstSize(drink)?.label || "")}</span></button>`;
}

/**
 * A drink with its own prices. A size it isn't sold in leaves no dash: the name takes
 * that room. The price of the size a tap adds is the bold one. The row's prices share
 * one mark, so no dot sits between two prices like a separator.
 */
function drinkRow(drink) {
  const notes = [drink.kind, onlySizes(drink), drink.note].filter(Boolean).map(esc).join(" · ");
  const lead = sizes.findIndex((s) => drink.prices[s.id] != null); // sizes missing before the first sold one
  const cell = (s) =>
    drink.prices[s.id] == null
      ? '<span class="price"></span>'
      : `<span class="price${s === firstSize(drink) ? "" : " price-off"}" data-size="${esc(s.id)}"><span class="sr">${esc(s.label)} </span>${esc(rupiah(val(drink.prices[s.id])))}</span>`;
  const name = `<span class="row-name"><span class="pick-name">${esc(drink.name)}</span>${notes ? ` <small>${notes}</small>` : ""}</span> `;
  const prices = markAll(Object.values(drink.prices), sizes.slice(lead).map(cell).join(" "), "prices");
  return `<li>${pick(drink, name + prices, " pick-row cols")}</li>`;
}

/** The best seller's strip: the cup in a hand, its name, and the shop's own line about it. The menu's one big picture. */
function bestPick(drink) {
  const photo = drinkPhotos[drink.id];
  const line = ["Paling laris", photo?.line].filter(Boolean).join(". ");
  return pick(
    drink,
    `${photo ? picture(photo.photo, { sizes: "(min-width: 56rem) 11rem, 9rem", cls: "pick-photo", alt: "" }) : ""}<span class="pick-words"><span class="pick-name">${esc(drink.name)}</span> <span class="pick-tag">${esc(line)}</span></span>`,
    " pick-best",
  );
}

/** A group under the switch's price: names only, the best seller on its own strip. */
function flatSection({ name, list }) {
  const best = list.filter((d) => d.bestSeller);
  const rest = list.filter((d) => !d.bestSeller);
  return `
          <section class="grp">
            <div class="grp-head"><h3>${esc(name)}</h3></div>
            <ul class="picks">
              ${best.map((d) => `<li class="picks-wide">${bestPick(d)}</li>`).join("")}
              ${rest.map((d) => `<li>${pick(d, `<span class="pick-name">${esc(d.name)}</span>`)}</li>`).join("")}
            </ul>
          </section>`;
}

/**
 * A group whose drinks have their own prices: a price column per size, named in the
 * header. The names are plain words, not a second switch. site.js lights the picked one.
 */
function ownSection({ name, list }) {
  const head = (s, i) =>
    list.some((d) => d.prices[s.id] != null)
      ? `<span class="size${i === 0 ? "" : " price-off"}" data-size="${esc(s.id)}" aria-hidden="true">${esc(s.label)}</span>`
      : "<span></span>";
  return `
          <section class="grp">
            <div class="grp-head cols">
              <h3>${esc(name)}</h3>
              <span class="prices">${sizes.map(head).join("")}</span>
            </div>
            <ul class="rows">
              ${list.map(drinkRow).join("")}
            </ul>
          </section>`;
}

/**
 * The menu as two posters: the switch with the drinks it prices, then everything that
 * has a price of its own. On a phone they are one column, in this order.
 */
function menu() {
  const parts = menuParts();
  const [left, right] = parts.flat.length ? [parts.flat, parts.own] : [parts.own, []];
  return `
        <div class="menu">
          <div class="menu-col">
            ${sizeSwitch(parts)}
            ${left.map((g) => (parts.flat.includes(g) ? flatSection(g) : ownSection(g))).join("")}
          </div>
          <div class="menu-col">
            ${right.map(ownSection).join("")}
            ${packs()}
            ${extras()}
          </div>
        </div>`;
}

/** How wide a photo shows: the whole phone screen, or one column of the page on a wide screen. */
const WIDE = "(min-width: 56rem) 32rem, 100vw";
const SHOP = "(min-width: 56rem) 30rem, 100vw";

/** A row with a price that the form doesn't take: a bundle, a topping, the snacks. `what` is the small line under the name. */
const extraRow = ([name, what, price]) =>
  `<li class="extra"><span class="row-name">${name}${what}</span><span class="price">${price}</span></li>`;
const under = (what) => (what ? ` <small>${what}</small>` : "");

/** Bundles of drinks: with the drinks, above the snacks. */
function packs() {
  if (!bundles.length) return "";
  const rows = bundles.map((b) => [esc(b.name), under(esc(b.what)), b.priceRange ? mark(b.priceRange, range) : mark(b.price, rupiah)]);
  return `
          <section class="grp">
            <div class="grp-head"><h3>Paket</h3></div>
            <ul class="rows">
              ${rows.map(extraRow).join("")}
            </ul>
          </section>`;
}

/** Snacks and toppings. The snack's photo is a small square beside the shop's line about it: the menu's big picture is a drink. */
function extras() {
  const rows = [];
  // A two-word name stays whole when the list wraps ("Whipped cream").
  const names = (list) => list.map((x) => esc(x.name).replace(/ /g, "&nbsp;")).join(", ");
  const plus = (n) => `+${rupiah(n)}`;
  if (snacks.length) {
    rows.push([names(snacks).replace(/, ([^,]+)$/, " dan $1"), "", mark(snackPriceRange, range)]);
  }
  const sameTopping = toppings.every((t) => val(t.price) === val(toppings[0].price));
  if (toppings.length && sameTopping) {
    rows.push(["Topping", under(names(toppings)), mark(toppings[0].price, plus)]);
  } else {
    for (const t of toppings) rows.push([`Topping ${esc(t.name)}`, "", mark(t.price, plus)]);
  }
  if (!rows.length) return "";
  return `
          <section class="grp grp-extras">
            <div class="grp-head"><h3>Teman minum</h3></div>
            ${snacks.length ? `<figure class="snack">${picture("corndog", { sizes: "5rem" })}<figcaption class="cap">Corndog dong, baru diangkat.</figcaption></figure>` : ""}
            <ul class="rows">
              ${rows.map(extraRow).join("")}
            </ul>
          </section>`;
}

// --- Shops --------------------------------------------------------------------

/**
 * A shop's short name, the way the shop itself says it: "Susu Malabar depan Griya" ->
 * "Depan Griya". The brand name is already at the top of the page.
 */
function shopLabel(name) {
  const short = name.replace(brand.name, "").trim().replace(/^\((.*)\)$/, "$1") || name;
  return short[0].toUpperCase() + short.slice(1);
}

/** The hours every shop keeps, if they all keep the same ones. Said once, above the list. */
function sharedHours() {
  const all = shops.map((s) => val(s.hours).default);
  if (!all.length || !all.every((h) => span(h) === span(all[0]))) return null;
  const notes = [...new Set(shops.map((s) => s.hours).filter(isTbc).map((h) => h.note))];
  return notes.length ? tbc(all[0], notes.join(". ")) : all[0];
}

/** True when no shop keeps other hours on some day, so the shared hours can be called "every day". */
const everyDay = () => !shops.some((s) => Object.keys(val(s.hours).byDay || {}).length);
const openLine = (shared) => mark(shared, (h) => `${everyDay() ? "Buka tiap hari" : "Buka"} ${span(h)}`);

/**
 * False while a shop's place is not known (`located: false` in data.mjs). Such a shop
 * stays in the list, but has no map or GoFood button and can't be picked for pickup.
 */
export const isLocated = (shop) => shop.located !== false;

/**
 * The GoFood link, when every shop that has one has the same one. Then it is one way
 * to order (the "cara pesan" list), not a button on each shop.
 */
function sharedGofood() {
  const links = shops.filter(isLocated).map((s) => s.gofoodUrl).filter(Boolean);
  if (!links.length || !links.every((l) => val(l) === val(links[0]))) return null;
  return links[0];
}

/**
 * One shop: its name, its street, its map. `gofoodHere: false` leaves its GoFood button
 * out (the link is shown once, elsewhere). The shops' fronts are shown as a set beside
 * the list (shopFronts), so every row is the same whether or not its shop has a photo.
 */
export function shopRow(shop, shared, gofoodHere = true) {
  const h = val(shop.hours);
  // With shared hours a shop only says where it differs. Without, it says its own.
  const own = shared ? oddDays(h) : [`Tiap hari ${span(h.default)}`, oddDays(h)].filter(Boolean).join(", ");
  return `
        <li class="shop">
          <div class="shop-what">
            <h3>${mark(shop.name, shopLabel)}</h3>
            <p${isLocated(shop) ? "" : ' class="shop-soon"'}>${mark(shop.address)}</p>
            ${own ? `<p class="shop-odd">${mark(shop.hours, () => own)}</p>` : ""}
          </div>${
            isLocated(shop)
              ? `
          <div class="shop-go">
            <a class="btn" href="${esc(val(shop.mapUrl))}" target="_blank" rel="noopener">${mark(shop.mapUrl, () => "Buka peta")}${arrow("out")}</a>
            ${gofoodHere && shop.gofoodUrl ? `<a class="btn" href="${esc(val(shop.gofoodUrl))}" target="_blank" rel="noopener">${mark(shop.gofoodUrl, () => "GoFood")}${arrow("out")}</a>` : ""}
          </div>`
              : ""
          }
        </li>`;
}

/** The fronts of the shops that have a photo, each under its shop's name. */
function shopFronts() {
  const fronts = shops.filter((s) => shopPhotos[s.id]);
  if (!fronts.length) return "";
  return `
          <ul class="fronts">${fronts
            .map((s) => `
            <li><figure>${picture(shopPhotos[s.id], { sizes: SHOP, cls: "bleed" })}<figcaption class="cap">${mark(s.name, shopLabel)}</figcaption></figure></li>`)
            .join("")}
          </ul>`;
}

function shopList() {
  const shared = sharedHours();
  const gofoodHere = !sharedGofood();
  return `
        <div class="shops-in">
          <div class="shops-words">
            <h2 class="quiet">${story.shops} toko di Jatinangor</h2>
            <p class="shops-when">${shared ? `<span>${openLine(shared)}</span> ` : ""}<span>Paling ramai ${esc(visit.busiest)}</span></p>
            <ul class="shops">${shops.map((s) => shopRow(s, shared, gofoodHere)).join("")}
            </ul>
          </div>${shopFronts()}
        </div>`;
}

// --- Ways to order ---------------------------------------------------------------

/** Walk in, GoFood, or pre-order on WhatsApp: each row goes to the real thing. */
function ways() {
  const gofood = sharedGofood();
  const anyGofood = shops.some((s) => isLocated(s) && s.gofoodUrl);
  const row = (attrs, name, what, kind) =>
    `<li><a class="way" ${attrs}><span class="way-name">${name}</span><span class="way-what">${what}</span>${arrow(kind)}</a></li>`;
  return `
        <div class="ways">
          ${picture("pickup", { sizes: WIDE, cls: "bleed" })}
          <div>
            <h2>Mau pesan lewat mana?</h2>
            <ul class="way-list">
              ${row('href="#toko"', "Mampir ke toko", `Bayar ${esc(payWith())}`, "down")}
              ${
                gofood
                  ? row(`href="${esc(val(gofood))}" target="_blank" rel="noopener"`, mark(gofood, () => "GoFood"), "Diantar ojol", "out")
                  : anyGofood
                    ? row('href="#toko"', "GoFood", "Pilih tokonya dulu", "down")
                    : ""
              }
              ${row('href="#pesan"', "Pre-order WhatsApp", "Buat acara atau pesanan banyak", "down")}
            </ul>
          </div>
        </div>`;
}

// --- Pre-order form -------------------------------------------------------------

/** The drinks to pick from. A size a drink isn't sold in is switched off beside it, so the name says nothing about sizes. */
function drinkOptions() {
  return menuSections()
    .map((g) => `<optgroup label="${esc(g.name)}">${g.list.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("")}</optgroup>`)
    .join("");
}

/** The shops an order can be picked up at, as the form's choices. */
export function pickupChoices(list = shops) {
  return list
    .filter(isLocated)
    .map((s) => `<label><input type="radio" name="shop" value="${esc(s.id)}"><span>${mark(s.name, shopLabel)}</span></label>`)
    .join("");
}

function orderForm() {
  return `
      <form id="order" class="form" novalidate>
        <div class="form-col">
          <fieldset class="field">
            <legend>Minuman</legend>
            <ol id="lines" class="lines"></ol>
            <button type="button" class="btn" id="add-line">Tambah minuman lain</button>
          </fieldset>

          <div class="field">
            <label for="notes">Catatan <span class="optional">kalau ada</span></label>
            <textarea id="notes" name="notes" rows="2" placeholder="Misal pakai whipped cream"></textarea>
          </div>
        </div>

        <div class="form-col">
          <div class="field">
            <span class="label" id="label-shop">Ambil di</span>
            <div class="seg seg-fill" id="field-shop" role="radiogroup" aria-labelledby="label-shop" aria-describedby="err-shop">
              ${pickupChoices()}
            </div>
            <p class="err" id="err-shop" hidden></p>
          </div>

          <div class="pair">
            <div class="field">
              <label for="date">Tanggal ambil</label>
              <input type="date" id="date" name="date" aria-describedby="err-date">
              <p class="err" id="err-date" hidden></p>
            </div>
            <div class="field">
              <label for="time">Jam ambil</label>
              <input type="time" id="time" name="time" aria-describedby="err-time warn-time">
              <p class="err" id="err-time" hidden></p>
              <p class="warn" id="warn-time" hidden></p>
            </div>
          </div>

          <div class="field">
            <label for="name">Nama pemesan</label>
            <input type="text" id="name" name="name" autocomplete="name" autocapitalize="words" enterkeyhint="done" aria-describedby="err-name">
            <p class="err" id="err-name" hidden></p>
          </div>
        </div>

        <div class="send">
          <div class="send-go">
            <p class="total" id="total" hidden><span class="sr">Total </span><span id="total-cups"></span><span id="total-price"></span></p>
            <a class="btn btn-send" id="send" href="#pesan">${mark(WHATSAPP_NUMBER, () => "Kirim lewat WhatsApp")}</a>
            <p class="sent" id="sent" role="status" hidden>Lanjut di WhatsApp, tinggal tekan kirim.</p>
          </div>
          <div class="send-more">
            <p class="hint">Harganya masih perkiraan, pastinya dari toko. Bisa bayar ${esc(payWith())}.</p>
            <details class="preview" id="preview" hidden>
              <summary>Lihat pesan</summary>
              <pre class="bubble" id="preview-text" tabindex="0"></pre>
              <button type="button" class="link" id="copy">Salin pesan</button>
            </details>
            <noscript><p class="err">Form ini butuh JavaScript. Sementara, pesan lewat GoFood dulu.</p></noscript>
          </div>
        </div>
      </form>

      <template id="line">
        <li class="line">
          <div class="line-what">
            <label class="sr">Rasa</label>
            <span class="select"><select><option value="">Pilih rasa</option>${drinkOptions()}</select></span>
            <div class="seg" role="radiogroup" aria-label="Ukuran">
              ${sizes.map((s) => `<label><input type="radio" value="${esc(s.id)}"><span>${esc(s.label)}</span></label>`).join("")}
            </div>
          </div>
          <p class="err err-drink" hidden></p>
          <div class="line-count">
            <div class="qty">
              <label class="sr">Jumlah gelas</label>
              <button type="button" data-step="-1" aria-label="Kurangi satu">&minus;</button>
              <input type="number" inputmode="numeric" min="1" max="${orderRules.maxQtyPerLine}" value="1">
              <button type="button" data-step="1" aria-label="Tambah satu">+</button>
              <button type="button" data-step="10" aria-label="Tambah sepuluh">+10</button>
            </div>
            <span class="line-end">
              <span class="line-price"></span>
              <button type="button" class="link line-remove">Hapus<span class="sr"> minuman ini</span></button>
            </span>
          </div>
          <p class="err err-qty" hidden></p>
        </li>
      </template>`;
}

// --- A running promo ---------------------------------------------------------------
// Nothing shows while brand.promo is null. The shape is described beside it in data.mjs.
// Laid out like the shop's promo posters: black ground, the price huge, the usual
// price crossed out.

export function promoBand(promo) {
  if (!promo) return "";
  const facts = [promo.what, promo.when, promo.where].filter(Boolean);
  return `
    <aside class="band band-ink promo" id="promo" aria-label="Promo">
      <div class="wrap promo-in">
        <p class="promo-what"><strong>${mark(promo.title)}</strong>${facts.map((f) => ` <span>${mark(f)}</span>`).join("")}</p>
        <p class="promo-price">${promo.was != null ? `<s><span class="sr">Biasanya </span>${mark(promo.was, rupiah)}</s> ` : ""}<strong>${mark(promo.price, rupiah)}</strong></p>
      </div>
    </aside>`;
}

// --- Loyalty stamp card ---------------------------------------------------------
// Nothing shows while brand.stampCard is null. When its rules are decided, put
// them in data.mjs as { title, lines: ["...", "..."] } and this section appears
// between the form and the story. Change the shape here if the rules need more.

function stampCard(card) {
  if (!card) return "";
  return `
    <section class="band band-paper" id="kartu">
      <div class="wrap">
        <h2>${mark(card.title)}</h2>
        ${(card.lines || []).map((line) => `<p>${mark(line)}</p>`).join("")}
      </div>
    </section>`;
}

// --- Head ---------------------------------------------------------------------

const DESCRIPTION =
  "Susu segar diblender bareng buah asli di Jatinangor. Cek menu dan harga, cari toko terdekat, atau pre-order lewat WhatsApp.";

/**
 * The link-preview picture, made by `npm run shots` from card.mjs. A JPEG, so it stays
 * well under the size WhatsApp will still show (about 300 KB).
 */
export const OG_IMAGE = "og.jpg";

/** How wide the first photo shows: the phone's width, or its column on a wide screen. */
const HERO_SIZES = "(min-width: 56rem) 30rem, 100vw";

function head() {
  const site = val(brand.siteUrl).replace(/\/$/, "");
  // The page's own address (canonical, og:url) waits until the real one is known:
  // a placeholder there would tell search engines the page lives somewhere else.
  const address = isTbc(brand.siteUrl)
    ? ""
    : `
  <link rel="canonical" href="${esc(site)}/">
  <meta property="og:url" content="${esc(site)}/">`;
  // Only confirmed facts go here: no prices, no site URL yet. The hours go in once
  // every shop keeps the same ones on every day and none of them is marked.
  const hours = sharedHours();
  const ld = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: brand.name,
    slogan: brand.tagline,
    description: DESCRIPTION,
    address: { "@type": "PostalAddress", addressLocality: "Jatinangor", addressRegion: "Jawa Barat", addressCountry: "ID" },
    ...(hours && !isTbc(hours) && everyDay() ? { openingHours: `Mo-Su ${hours[0]}-${hours[1]}` } : {}),
    paymentAccepted: visit.payment.join(", "),
    sameAs: [brand.instagram.url, brand.tiktok.url],
  };
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(brand.title)}</title>
  <meta name="description" content="${esc(DESCRIPTION)}">
  <meta name="theme-color" content="${esc(token("poster"))}">${address}
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  ${fontFiles().map((file) => `<link rel="preload" href="${esc(file)}" as="font" type="font/woff2" crossorigin>`).join("\n  ")}
  <link rel="preload" as="image" type="image/avif" imagesrcset="${srcset("hero", "avif")}" imagesizes="${HERO_SIZES}" fetchpriority="high">
  <link rel="stylesheet" href="tokens.css">
  <link rel="stylesheet" href="site.css">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="id_ID">
  <meta property="og:site_name" content="${esc(brand.name)}">
  <meta property="og:title" content="${esc(brand.title)}">
  <meta property="og:description" content="${esc(DESCRIPTION)}">
  <meta property="og:image" content="${esc(site)}/${OG_IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(brand.name)}, ${esc(brand.tagline)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(brand.title)}">
  <meta name="twitter:description" content="${esc(DESCRIPTION)}">
  <meta name="twitter:image" content="${esc(site)}/${OG_IMAGE}">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <script type="module" src="site.js"></script>`;
}

// --- Page ---------------------------------------------------------------------

/** The headline, shared with the link-preview card. */
export const HEADLINE = "Susu segar, buah asli.";

export default function page() {
  const hours = sharedHours();
  const body = `
  <a class="skip" href="#menu">Langsung ke menu</a>

  <header class="band band-poster top">
    <div class="wrap hero">
      <div class="hero-words">
        <a class="logo" href="#top" aria-label="${esc(brand.title)}"><span class="logo-disc">${logo()}</span><span class="logo-words"><span class="logo-name">${esc(brand.name)}</span> <span class="logo-tag">${esc(brand.tagline)}</span></span></a>
        <h1>${esc(HEADLINE)}</h1>
      </div>
      ${picture("hero", { sizes: HERO_SIZES, first: true, cls: "bleed hero-photo" })}
      ${hours ? `<p class="hero-open">${openLine(hours)}</p>` : ""}
    </div>
  </header>

  <nav class="jump" aria-label="Bagian halaman">
    <div class="wrap">
      <a href="#menu">Menu</a>
      <a href="#toko">Toko</a>
      <a class="jump-go" href="#pesan"><span>Pre-order</span></a>
    </div>
  </nav>

  <main>${promoBand(brand.promo)}
    <section class="band band-poster" id="menu">
      <div class="wrap">
        <h2 class="sr">Menu</h2>${menu()}
      </div>
    </section>

    <section class="band band-paper band-photo" id="cara">
      <div class="wrap">${ways()}
      </div>
    </section>

    <section class="band band-banner" id="toko">
      <div class="wrap">${shopList()}
      </div>
    </section>

    <section class="band band-paper band-photo" id="pesan" style="--head-photo: ${(photoSize("bungkus").height / photoSize("bungkus").width).toFixed(3)}">
      <div class="order-head">
        <div class="wrap">
          ${picture("bungkus", { sizes: WIDE, cls: "bleed" })}
          <div class="order-words">
            <h2>Borong buat sepanitia</h2>
            <p class="lead">Buat sendiri juga bisa.</p>
          </div>
        </div>
      </div>
      <div class="wrap">
        ${orderForm()}
      </div>
    </section>
    ${stampCard(brand.stampCard)}
    <section class="band band-poster band-photo" id="cerita">
      <div class="wrap story">
        <figure class="story-photo">${picture("kedai", { sizes: WIDE, cls: "bleed" })}<figcaption class="cap">Toko depan Griya</figcaption></figure>
        <div class="story-words">
          <h2 class="quiet">${story.ownerAtCounter ? "Pemiliknya masih ikut jaga toko" : "Cerita"}</h2>
          <p>${esc(story.started)}${story.since ? `, tahun ${story.since}` : ""}. Toko pertama buka tahun ${story.firstShopYear}, dan sekarang ${story.staff} orang kerja di sini.${story.growsSlowly ? " Tumbuhnya pelan-pelan, memang sengaja." : ""}</p>
        </div>
        <figure class="reviews">
          <figcaption class="rating">${esc(brand.google.rating)} di Google, dari ${esc(brand.google.reviews)} ulasan</figcaption>
          ${brand.reviewQuotes.map((q) => `<blockquote class="quiet" lang="en">“${esc(q)}”</blockquote>`).join("")}
        </figure>
      </div>
    </section>
  </main>

  <footer class="band band-ink foot">
    <div class="wrap">
      <p class="foot-brand"><img class="foot-badge" src="brand/logo.svg" width="64" height="64" alt="" loading="lazy" decoding="async"><span class="foot-name">${esc(brand.title)}</span></p>
      <ul class="foot-links">
        <li><a href="https://wa.me/${esc(val(WHATSAPP_NUMBER))}" target="_blank" rel="noopener">${mark(WHATSAPP_NUMBER, () => "Chat WhatsApp")}</a></li>
        <li><a href="${esc(brand.instagram.url)}" target="_blank" rel="noopener">Instagram @${esc(brand.instagram.handle)}</a></li>
        <li><a href="${esc(brand.tiktok.url)}" target="_blank" rel="noopener">TikTok @${esc(brand.tiktok.handle)}</a></li>
        <li>${mark(brand.siteUrl, (url) => url.replace(/^https?:\/\//, ""))}</li>
      </ul>
      <!--tbc-count-->
    </div>
  </footer>

  <div class="bar" id="bar" hidden>
    <p role="status"><strong><span id="bar-cups"></span> · <span id="bar-price"></span></strong><span class="sr" id="bar-last"></span></p>
    <a class="btn btn-fill" href="#pesan">Lanjut<span class="sr"> pre-order</span></a>
  </div>`;

  // The footer says how many marks are on the page, and wears the mark itself.
  const marks = (body.match(/class="tbc[ "]/g) || []).length;
  const count = marks
    ? `<p class="foot-draft"><span class="tbc" title="Yang bertitik kuning belum dicek pemilik">${marks} hal di halaman ini belum dicek pemilik</span></p>`
    : "";

  return `<!doctype html>
<html lang="id" id="top">
<head>${head()}
</head>
<body>${body.replace("<!--tbc-count-->", count)}
</body>
</html>
`;
}
