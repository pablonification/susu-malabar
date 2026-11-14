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
  order as orderRules,
  shops,
  sizes,
  snackPriceRange,
  snacks,
  story,
  toppings,
  val,
  visit,
} from "./data.mjs";
import { clock, rupiah } from "./order.mjs";
import { esc, mark } from "./mark.mjs";

const root = join(import.meta.dirname, "..");
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** The logo, inlined so it takes the text colour around it. Swap public/brand/logo.svg to change it. */
export function logo() {
  return readFileSync(join(root, "public/brand/logo.svg"), "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace("<svg ", '<svg class="logo-mark" ')
    .trim();
}

/** A colour from tokens.css, for the few places CSS can't reach (the browser's bar colour). */
export function token(name) {
  const css = readFileSync(join(root, "src/tokens.css"), "utf8");
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1].trim() || "";
}

// --- Small formatters ---------------------------------------------------------

/** 13000 -> "13.000", the way a menu board writes it. */
const bare = (n) => rupiah(n).replace("Rp", "");
const range = ([low, high]) => `${bare(low)}–${bare(high)}`;
const span = ([open, close]) => `${clock(open)}–${clock(close)}`;

function hoursText(h) {
  const odd = Object.entries(h.byDay || {}).map(([day, times]) => `${DAYS[day]} ${span(times)}`);
  return [`Tiap hari ${span(h.default)}`, ...odd].join(", ");
}

/** ["Tunai", "QRIS"] -> "tunai atau QRIS" (a short name in capitals stays as it is). */
const payWith = () => visit.payment.map((p) => (p === p.toUpperCase() ? p : p.toLowerCase())).join(" atau ");

const dot = (id) => `<i class="dot" style="--dot: var(--flavor-${esc(id)})"></i>`;

// --- Menu ---------------------------------------------------------------------

/** True when every drink of a group costs the same, so the price is said once. */
function samePrices(list) {
  const key = (d) => sizes.map((s) => val(d.prices[s.id]) ?? "").join("|");
  return list.every((d) => key(d) === key(list[0]));
}

function priceCell(drink, size) {
  const p = drink.prices[size.id];
  return p == null
    ? `<span class="price"><span class="sr">${esc(size.label)} tidak ada</span><span aria-hidden="true">-</span></span>`
    : `<span class="price"><span class="sr">${esc(size.label)} </span>${mark(p, bare)}</span>`;
}

function pick(drink, inner, extraClass = "") {
  return `<button type="button" class="pick ${extraClass}" data-drink="${esc(drink.id)}" data-name="${esc(drink.name)}" aria-label="Tambah ${esc(drink.name)} ke pesanan">${inner}<span class="pick-n" aria-hidden="true">+</span></button>`;
}

function drinkGroup(group) {
  const list = drinks.filter((d) => d.group === group.id);
  if (list.length === 0) return "";
  const same = list.length > 1 && samePrices(list);
  const heads = sizes.map((s) => `<span class="size">${esc(s.label)}</span>`).join("");

  if (same) {
    const best = list.filter((d) => d.bestSeller);
    const rest = list.filter((d) => !d.bestSeller);
    return `
      <section class="grp">
        <div class="grp-head grp-head-priced cols">
          <h3>${esc(group.name)}</h3>${heads}
          <span></span>${sizes.map((s) => priceCell(list[0], s).replace('class="price"', 'class="price price-all"')).join("")}
        </div>
        <ul class="picks">
          ${best.map((d) => `<li class="picks-wide">${pick(d, `${dot(d.id)}<span class="pick-name">${esc(d.name)}</span><span class="pick-tag">paling laris</span>`, "pick-best")}</li>`).join("")}
          ${rest.map((d) => `<li>${pick(d, `${dot(d.id)}<span class="pick-name">${esc(d.name)}</span>`)}</li>`).join("")}
        </ul>
      </section>`;
  }

  return `
      <section class="grp">
        <div class="grp-head cols"><h3>${esc(group.name)}</h3>${heads}</div>
        <ul class="rows">
          ${list
            .map(
              (d) =>
                `<li>${pick(
                  d,
                  `<span class="row-name">${dot(d.id)}<span><span class="pick-name">${esc(d.name)}</span>${d.bestSeller ? '<span class="pick-tag">paling laris</span>' : ""}${d.note ? `<small>${esc(d.note)}</small>` : ""}</span></span>${sizes.map((s) => priceCell(d, s)).join("")}`,
                  "pick-row cols",
                )}</li>`,
            )
            .join("")}
        </ul>
      </section>`;
}

/** Toppings, snacks and bundles: things with a price that the form doesn't take. */
function extras() {
  const rows = [];
  const names = (list) => list.map((x) => esc(x.name)).join(", ");
  const sameTopping = toppings.every((t) => val(t.price) === val(toppings[0].price));
  if (toppings.length && sameTopping) {
    rows.push(["Topping", names(toppings), mark(toppings[0].price, (n) => `+${bare(n)}`)]);
  } else {
    for (const t of toppings) rows.push([`Topping ${esc(t.name)}`, "", mark(t.price, (n) => `+${bare(n)}`)]);
  }
  if (snacks.length) rows.push([names(snacks).replace(/, ([^,]+)$/, " dan $1"), "", mark(snackPriceRange, range)]);
  for (const b of bundles) rows.push([esc(b.name), esc(b.what), b.priceRange ? mark(b.priceRange, range) : mark(b.price, bare)]);
  return `
      <section class="grp">
        <div class="grp-head"><h3>Teman minum</h3></div>
        <ul class="rows">
          ${rows.map(([name, what, price]) => `<li class="extra"><span class="row-name"><span>${name}${what ? `<small>${what}</small>` : ""}</span></span><span class="price">${price}</span></li>`).join("")}
        </ul>
      </section>`;
}

// --- Shops --------------------------------------------------------------------

function shopRow(shop) {
  return `
        <li class="shop">
          <div class="shop-what">
            <h3>${mark(shop.name)}</h3>
            <p>${mark(shop.area)}</p>
            <p class="shop-hours">${mark(shop.hours, hoursText)}</p>
          </div>
          <div class="shop-go">
            <a class="btn" href="${esc(val(shop.mapUrl))}" target="_blank" rel="noopener">${mark(shop.mapUrl, () => "Buka peta")}</a>
            ${shop.gofoodUrl ? `<a class="btn" href="${esc(val(shop.gofoodUrl))}" target="_blank" rel="noopener">${mark(shop.gofoodUrl, () => "GoFood")}</a>` : ""}
            <a class="btn" href="#pesan" data-shop="${esc(shop.id)}">Pre-order</a>
          </div>
        </li>`;
}

// --- Pre-order form -------------------------------------------------------------

function drinkOptions() {
  return drinkGroups
    .map((g) => {
      const list = drinks.filter((d) => d.group === g.id);
      if (!list.length) return "";
      const label = (d) => {
        const sold = sizes.filter((s) => d.prices[s.id] != null);
        return esc(d.name) + (sold.length < sizes.length ? ` (${sold.map((s) => esc(s.label)).join(", ")} saja)` : "");
      };
      return `<optgroup label="${esc(g.name)}">${list.map((d) => `<option value="${esc(d.id)}">${label(d)}</option>`).join("")}</optgroup>`;
    })
    .join("");
}

function orderForm() {
  return `
      <form id="order" class="form" novalidate>
        <fieldset class="field-group">
          <legend>Minuman</legend>
          <ol id="lines" class="lines"></ol>
          <p class="err" id="err-lines" hidden></p>
          <button type="button" class="btn" id="add-line">Tambah minuman lain</button>
        </fieldset>

        <fieldset class="field-group" id="field-shop">
          <legend>Ambil di</legend>
          <div class="choices">
            ${shops
              .map(
                (s) => `<label class="choice"><input type="radio" name="shop" value="${esc(s.id)}" aria-describedby="err-shop"><span><strong>${mark(s.name)}</strong><small>${mark(s.area)}</small></span></label>`,
              )
              .join("")}
          </div>
          <p class="err" id="err-shop" hidden></p>
        </fieldset>

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
          <input type="text" id="name" name="name" autocomplete="name" autocapitalize="words" enterkeyhint="next" aria-describedby="err-name">
          <p class="err" id="err-name" hidden></p>
        </div>

        <div class="field">
          <label for="notes">Catatan <span class="optional">kalau ada</span></label>
          <textarea id="notes" name="notes" rows="2" placeholder="Misal buat acara himpunan, pakai whipped cream"></textarea>
        </div>

        <div class="send">
          <dl class="sum" id="sum" hidden>
            <div><dt>Total</dt><dd id="sum-cups">0 gelas</dd></div>
            <div><dt>Perkiraan harga</dt><dd id="sum-price">Rp0</dd></div>
          </dl>
          <div id="preview" hidden>
            <h3 class="preview-title">Pesan yang dikirim</h3>
            <pre class="bubble" id="preview-text" tabindex="0"></pre>
            <button type="button" class="link" id="copy">Salin pesan</button>
          </div>
          <p class="hint">Harganya masih perkiraan, pastinya dari toko. Bayar di toko, ${esc(payWith())}.</p>
          <a class="btn btn-send" id="send" href="#pesan">${mark(WHATSAPP_NUMBER, () => "Kirim lewat WhatsApp")}</a>
          <p class="sent" id="sent" role="status" hidden>Lanjut di WhatsApp, tinggal tekan kirim.</p>
          <noscript><p class="err">Form ini butuh JavaScript. Sementara, pesan lewat GoFood dulu.</p></noscript>
        </div>
      </form>

      <template id="line">
        <li class="line">
          <div class="line-top">
            <label>Rasa</label>
            <button type="button" class="link line-remove">Hapus</button>
          </div>
          <select class="line-drink">
            <option value="">Pilih rasa</option>
            ${drinkOptions()}
          </select>
          <div class="line-how">
            <fieldset class="seg">
              <legend>Ukuran</legend>
              <div class="seg-row">
                ${sizes.map((s) => `<label><input type="radio" value="${esc(s.id)}"><span>${esc(s.label)}<small data-size="${esc(s.id)}"></small></span></label>`).join("")}
              </div>
            </fieldset>
            <div class="qty">
              <label>Jumlah</label>
              <div class="qty-row">
                <button type="button" data-step="-1" aria-label="Kurangi satu">&minus;</button>
                <input type="number" inputmode="numeric" min="1" max="${orderRules.maxQtyPerLine}" value="1">
                <button type="button" data-step="1" aria-label="Tambah satu">+</button>
                <button type="button" data-step="10" aria-label="Tambah sepuluh">+10</button>
              </div>
            </div>
          </div>
          <p class="err" hidden></p>
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
  <meta name="theme-color" content="${esc(token("banner"))}">
  <link rel="canonical" href="${esc(site)}/">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="preload" href="fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="tokens.css">
  <link rel="stylesheet" href="site.css">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="id_ID">
  <meta property="og:site_name" content="${esc(brand.name)}">
  <meta property="og:title" content="${esc(brand.title)}">
  <meta property="og:description" content="${esc(DESCRIPTION)}">
  <meta property="og:url" content="${esc(site)}/">
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
      <div class="hero-side">
        <p class="lead">Porsi gede, harga mahasiswa.</p>
        <p class="rating"><strong>${esc(brand.google.rating)}</strong> <span>di Google, dari ${esc(brand.google.reviews)} ulasan</span></p>
      </div>
    </div>
  </header>

  <nav class="jump" aria-label="Bagian halaman">
    <div class="wrap">
      <a href="#menu">Menu</a>
      <a href="#toko">Toko</a>
      <a href="#pesan">Pre-order</a>
    </div>
  </nav>

  <main>
    <section class="band band-poster" id="menu">
      <div class="wrap">
        <h2>Menu</h2>
        <div class="menu">
          ${drinkGroups.map(drinkGroup).join("")}
          ${extras()}
        </div>
      </div>
    </section>

    <section class="band band-paper" id="toko">
      <div class="wrap">
        <h2>${story.shops} toko di Jatinangor</h2>
        <p class="lead">Paling ramai ${esc(visit.busiest)}.</p>
        <ul class="shops">${shops.map(shopRow).join("")}
        </ul>
      </div>
    </section>

    <section class="band band-banner" id="pesan">
      <div class="wrap">
        <h2>Pre-order, buat sendiri atau sepanitia</h2>
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
        <li><a href="${esc(brand.instagram.url)}" target="_blank" rel="noopener">Instagram @${esc(brand.instagram.handle)}</a></li>
        <li><a href="${esc(brand.tiktok.url)}" target="_blank" rel="noopener">TikTok @${esc(brand.tiktok.handle)}</a></li>
        <li>${mark(brand.siteUrl, (url) => url.replace(/^https?:\/\//, ""))}</li>
      </ul>
      <!--tbc-count-->
    </div>
  </footer>

  <div class="bar" id="bar" hidden>
    <p><strong id="bar-cups"></strong> <span id="bar-price"></span></p>
    <a class="btn btn-fill" href="#pesan">Lanjut pesan</a>
  </div>`;

  // The footer says how many marks are on the page, and wears the mark itself.
  const marks = (body.match(/class="tbc"/g) || []).length;
  const count = marks
    ? `<p class="foot-draft"><span class="tbc" title="Yang bergaris putus-putus belum dicek pemilik">${marks} hal di halaman ini belum dicek pemilik</span></p>`
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
