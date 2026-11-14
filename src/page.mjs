// The page. Runs at build time (build.mjs) and returns the whole HTML.
// Every fact comes from data.mjs and goes through mark() so unconfirmed values
// show their mark. Colours and fonts live in tokens.css, layout in site.css,
// the form's behaviour in site.js.

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
import { esc, mark } from "./mark.mjs";

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

// --- Small formatters ---------------------------------------------------------

/** One price format everywhere: "Rp13.000". A range says Rp once: "Rp8.000–19.500". */
const range = ([low, high]) => `${rupiah(low)}–${rupiah(high).replace("Rp", "")}`;
const span = ([open, close]) => `${clock(open)}–${clock(close)}`;

/** The days a shop keeps other hours, said as the difference: "Jumat buka mulai 14.00". */
function oddDays(h) {
  return Object.entries(h.byDay || {})
    .map(([day, [open, close]]) => {
      if (close === h.default[1]) return `${DAYS[day]} buka mulai ${clock(open)}`;
      if (open === h.default[0]) return `${DAYS[day]} tutup ${clock(close)}`;
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
 * The size switch in a group's header: it names the sizes and picks which one a tap
 * on a drink adds. With `price` it also carries the price the whole group shares.
 * site.js keeps every group's switch on the same size.
 */
function sizeSwitch(group, price) {
  const sold = sizes.filter((s) => group.list.some((d) => d.prices[s.id] != null));
  if (sold.length < 2) return "";
  const part = (s, i) =>
    `<label><input type="radio" name="size-${esc(group.id)}" value="${esc(s.id)}"${i === 0 ? " checked" : ""}><span><span class="size">${esc(s.label)}</span>${price ? ` <span class="price price-all">${mark(price[s.id], rupiah)}</span>` : ""}</span></label>`;
  return `<div class="seg seg-poster${price ? "" : " seg-heads"}" role="radiogroup" aria-label="Ukuran ${esc(group.name)}">${sold.map(part).join("")}</div>`;
}

/**
 * A drink on the menu: a button that adds one cup to the order, in the size picked in
 * the group's header. site.js fills in the count and keeps the size it reads out current.
 */
function pick(drink, inner, extraClass = "") {
  return `<button type="button" class="pick${extraClass}" data-drink="${esc(drink.id)}"><span class="sr">Tambah </span>${inner} <span class="pick-n" aria-hidden="true">+</span><span class="sr pick-sr">, ukuran ${esc(firstSize(drink)?.label || "")}</span></button>`;
}

/**
 * A drink with its own prices. A size it isn't sold in leaves no dash: the name takes
 * that room. The price of the size a tap adds is the bold one.
 */
function drinkRow(drink) {
  const notes = [drink.kind, onlySizes(drink), drink.note].filter(Boolean).map(esc).join(" · ");
  const lead = sizes.findIndex((s) => drink.prices[s.id] != null); // sizes missing before the first sold one
  const cell = (s) =>
    drink.prices[s.id] == null
      ? '<span class="price"></span>'
      : `<span class="price${s === firstSize(drink) ? "" : " price-off"}" data-size="${esc(s.id)}"><span class="sr">${esc(s.label)} </span>${mark(drink.prices[s.id], rupiah)}</span>`;
  const name = `<span class="row-name"${lead > 0 ? ` style="grid-column: span ${lead + 1}"` : ""}><span class="pick-name">${esc(drink.name)}</span>${notes ? ` <small>${notes}</small>` : ""}</span> `;
  return `<li>${pick(drink, name + sizes.slice(lead).map(cell).join(" "), " pick-row cols")}</li>`;
}

function menuSection(group) {
  const { name, list } = group;
  if (list.length > 1 && samePrices(list)) {
    const best = list.filter((d) => d.bestSeller);
    const rest = list.filter((d) => !d.bestSeller);
    return `
        <section class="grp">
          <div class="grp-head">
            <h3>${esc(name)}</h3>
            ${sizeSwitch(group, list[0].prices) || sizes.map((s) => (list[0].prices[s.id] == null ? "" : `<span class="price price-all">${mark(list[0].prices[s.id], rupiah)}</span>`)).join("")}
          </div>
          <ul class="picks">
            ${best.map((d) => `<li class="picks-wide">${pick(d, `<span class="pick-name">${esc(d.name)}</span> <span class="pick-tag">paling laris</span>`, " pick-best")}</li>`).join("")}
            ${rest.map((d) => `<li>${pick(d, `<span class="pick-name">${esc(d.name)}</span>`)}</li>`).join("")}
          </ul>
        </section>`;
  }
  return `
        <section class="grp">
          <div class="grp-head">
            <h3>${esc(name)}</h3>
            ${sizeSwitch(group)}
          </div>
          <ul class="rows">
            ${list.map(drinkRow).join("")}
          </ul>
        </section>`;
}

/** Toppings, snacks and bundles: things with a price that the form doesn't take. */
function extras() {
  const rows = [];
  // A two-word name stays whole when the list wraps ("Whipped cream").
  const names = (list) => list.map((x) => esc(x.name).replace(/ /g, "&nbsp;")).join(", ");
  const plus = (n) => `+${rupiah(n)}`;
  const sameTopping = toppings.every((t) => val(t.price) === val(toppings[0].price));
  if (toppings.length && sameTopping) {
    rows.push(["Topping", names(toppings), mark(toppings[0].price, plus)]);
  } else {
    for (const t of toppings) rows.push([`Topping ${esc(t.name)}`, "", mark(t.price, plus)]);
  }
  if (snacks.length) rows.push([names(snacks).replace(/, ([^,]+)$/, " dan $1"), "", mark(snackPriceRange, range)]);
  for (const b of bundles) rows.push([esc(b.name), esc(b.what), b.priceRange ? mark(b.priceRange, range) : mark(b.price, rupiah)]);
  return `
        <section class="grp grp-extras">
          <div class="grp-head"><h3>Teman minum</h3></div>
          <ul class="rows">
            ${rows.map(([name, what, price]) => `<li class="extra"><span class="row-name">${name}${what ? ` <small>${what}</small>` : ""}</span><span class="price">${price}</span></li>`).join("")}
          </ul>
        </section>`;
}

// --- Shops --------------------------------------------------------------------

/**
 * A shop's short name: "Susu Malabar Cikeruh" -> "Cikeruh", "Susu Malabar (toko ketiga)"
 * -> "Toko ketiga". The brand name is already at the top of the page.
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

/**
 * False while a shop's place is not known (`located: false` in data.mjs). Such a shop
 * stays in the list, but has no map or GoFood button and can't be picked for pickup.
 */
export const isLocated = (shop) => shop.located !== false;

export function shopRow(shop, shared) {
  const h = val(shop.hours);
  // With shared hours a shop only says where it differs. Without, it says its own.
  const own = shared ? oddDays(h) : [`Tiap hari ${span(h.default)}`, oddDays(h)].filter(Boolean).join(", ");
  return `
        <li class="shop">
          <div class="shop-what">
            <h3>${mark(shop.name, shopLabel)}</h3>
            <p>${mark(shop.address)}</p>
            ${own ? `<p class="shop-odd">${mark(shop.hours, () => own)}</p>` : ""}
          </div>${
            isLocated(shop)
              ? `
          <div class="shop-go">
            <a class="btn" href="${esc(val(shop.mapUrl))}" target="_blank" rel="noopener">${mark(shop.mapUrl, () => "Buka peta")}</a>
            ${shop.gofoodUrl ? `<a class="btn" href="${esc(val(shop.gofoodUrl))}" target="_blank" rel="noopener">${mark(shop.gofoodUrl, () => "GoFood")}</a>` : ""}
          </div>`
              : ""
          }
        </li>`;
}

function shopList() {
  const shared = sharedHours();
  return `
        <h2>${story.shops} toko di Jatinangor</h2>
        <p class="lead">${shared ? `Buka tiap hari ${mark(shared, span)}. ` : ""}Paling ramai ${esc(visit.busiest)}.</p>
        <ul class="shops">${shops.map((s) => shopRow(s, shared)).join("")}
        </ul>`;
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
          <p class="total" id="total" hidden><span class="sr">Total </span><span id="total-cups"></span><span id="total-price"></span></p>
          <a class="btn btn-send" id="send" href="#pesan">${mark(WHATSAPP_NUMBER, () => "Kirim lewat WhatsApp")}</a>
          <p class="sent" id="sent" role="status" hidden>Lanjut di WhatsApp, tinggal tekan kirim.</p>
          <p class="hint">Harganya masih perkiraan, pastinya dari toko. Bisa bayar ${esc(payWith())}.</p>
          <details class="preview" id="preview" hidden>
            <summary>Lihat pesan</summary>
            <pre class="bubble" id="preview-text" tabindex="0"></pre>
            <button type="button" class="link" id="copy">Salin pesan</button>
          </details>
          <noscript><p class="err">Form ini butuh JavaScript. Sementara, pesan lewat GoFood dulu.</p></noscript>
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

function head() {
  const site = val(brand.siteUrl).replace(/\/$/, "");
  // The page's own address (canonical, og:url) waits until the real one is known:
  // a placeholder there would tell search engines the page lives somewhere else.
  const address = isTbc(brand.siteUrl)
    ? ""
    : `
  <link rel="canonical" href="${esc(site)}/">
  <meta property="og:url" content="${esc(site)}/">`;
  // Only confirmed facts go here: no address, hours, prices, or site URL yet.
  const ld = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: brand.name,
    slogan: brand.tagline,
    description: DESCRIPTION,
    address: { "@type": "PostalAddress", addressLocality: "Jatinangor", addressRegion: "Jawa Barat", addressCountry: "ID" },
    paymentAccepted: visit.payment.join(", "),
    sameAs: [brand.instagram.url, brand.tiktok.url],
  };
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(brand.title)}</title>
  <meta name="description" content="${esc(DESCRIPTION)}">
  <meta name="theme-color" content="${esc(token("banner"))}">${address}
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  ${fontFiles().map((file) => `<link rel="preload" href="${esc(file)}" as="font" type="font/woff2" crossorigin>`).join("\n  ")}
  <link rel="stylesheet" href="tokens.css">
  <link rel="stylesheet" href="site.css">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="id_ID">
  <meta property="og:site_name" content="${esc(brand.name)}">
  <meta property="og:title" content="${esc(brand.title)}">
  <meta property="og:description" content="${esc(DESCRIPTION)}">
  <meta property="og:image" content="${esc(site)}/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(brand.name)}, ${esc(brand.tagline)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(brand.title)}">
  <meta name="twitter:description" content="${esc(DESCRIPTION)}">
  <meta name="twitter:image" content="${esc(site)}/og.png">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <script type="module" src="site.js"></script>`;
}

// --- Page ---------------------------------------------------------------------

export default function page() {
  const body = `
  <a class="skip" href="#menu">Langsung ke menu</a>

  <header class="band band-banner">
    <div class="wrap hero">
      <a class="logo" href="#top" aria-label="${esc(brand.title)}">${logo()}<span class="logo-tag">${esc(brand.tagline)}</span></a>
      <h1>Susu segar, diblender bareng buah asli.</h1>
      <div class="hero-foot">
        <p class="lead">Porsi gede, harga mahasiswa.</p>
        <p class="rating"><strong>${esc(brand.google.rating)}</strong> <span>di Google, dari ${esc(brand.google.reviews)} ulasan</span></p>
      </div>
    </div>
  </header>

  <nav class="jump" aria-label="Bagian halaman">
    <div class="wrap">
      <a href="#menu">Menu</a>
      <a href="#toko">Toko</a>
      <a class="jump-go" href="#pesan"><span>Pre-order</span></a>
    </div>
  </nav>

  <main>
    <section class="band band-poster" id="menu">
      <div class="wrap">
        <h2 class="sr">Menu</h2>
        <div class="menu">
          ${menuSections().map(menuSection).join("")}
          ${extras()}
        </div>
      </div>
    </section>

    <section class="band band-paper" id="toko">
      <div class="wrap">${shopList()}
      </div>
    </section>

    <section class="band band-banner" id="pesan">
      <div class="wrap">
        <h2><span class="keep">Buat sendiri</span> <span class="keep">atau sepanitia</span></h2>
        ${orderForm()}
      </div>
    </section>
    ${stampCard(brand.stampCard)}
    <section class="band band-wall" id="cerita">
      <div class="wrap story">
        <div>
          <h2>${story.ownerAtCounter ? "Pemiliknya masih ikut jaga toko" : "Cerita"}</h2>
          <p>${esc(story.started)}. Toko pertama buka tahun ${story.firstShopYear}, dan sekarang ${story.staff} orang kerja di sini.${story.growsSlowly ? " Tumbuhnya pelan-pelan, memang sengaja." : ""}</p>
        </div>
        <figure class="quotes">
          ${brand.reviewQuotes.map((q) => `<blockquote lang="en">“${esc(q)}”</blockquote>`).join("")}
          <figcaption>Kata ulasan di Google</figcaption>
        </figure>
      </div>
    </section>
  </main>

  <footer class="band band-poster foot">
    <div class="wrap">
      <p class="foot-name">${esc(brand.title)}</p>
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
    <p role="status"><strong><span id="bar-cups"></span> · <span id="bar-price"></span></strong><span id="bar-last"></span></p>
    <a class="btn btn-fill" href="#pesan">Lanjut pre-order</a>
  </div>`;

  // The footer says how many marks are on the page, and wears the mark itself.
  const marks = (body.match(/class="tbc"/g) || []).length;
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
