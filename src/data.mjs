// Every fact the site shows lives here.
//
// Anything wrapped in tbc() is NOT confirmed with the owner yet. The page shows
// it with a visible "cek" mark so it is easy to spot before launch. Once the
// owner confirms a value, replace `tbc(x, "...")` with plain `x`.
//
//   grep -n "tbc(" src/data.mjs     lists everything still to confirm.
//
// Facts here come from Arqila's research, plus a few read on the shop's own pages
// (Instagram, TikTok, Linktree) and Google Maps on 2026-11-14: each of those has its source
// in a comment beside it. Do not add facts that are not in them
// (no revenue, no "source of money" story, no farm or Mount Malabar link).

/** Marks a value the owner still has to confirm. */
export function tbc(value, note) {
  return { tbc: true, value, note };
}

/** The plain value, whether or not it is marked. */
export function val(x) {
  return x && typeof x === "object" && x.tbc === true ? x.value : x;
}

/** True when a value still needs the owner to confirm it. */
export function isTbc(x) {
  return Boolean(x && typeof x === "object" && x.tbc === true);
}

// --- Ordering -----------------------------------------------------------------

/** WhatsApp number for pre-orders: digits only, starting with 62. */
export const WHATSAPP_NUMBER = "6285161778995"; // "Hubungi kami" on the shop's Linktree (linktr.ee/malabar.milkbar), read 2026-11-14

// --- Brand --------------------------------------------------------------------

export const brand = {
  name: "Susu Malabar",
  // The page title. "Jatinangor" is there because other businesses in Bandung
  // and Bogor use the same name.
  title: "Susu Malabar Jatinangor",
  tagline: "Kemurnian dari Jatinangor",
  // The final site address, for link previews and search engines.
  siteUrl: tbc("https://susumalabar.example", "Alamat website belum ada"),
  instagram: { handle: "susumalabar", url: "https://www.instagram.com/susumalabar/" },
  tiktok: { handle: "malabar.susu", url: "https://www.tiktok.com/@malabar.susu" },
  google: { rating: "4,9", reviews: "280+" },
  // Short phrases reviewers used on Google, as written.
  reviewQuotes: ["the best milk in Jatinangor", "worth to buy"],
  // A loyalty stamp card may come later (a teammate is planning it).
  // Leave null until its rules are decided. The page shows nothing while null.
  stampCard: null,
  // A promo that is running now, shown as a black strip right under the first screen (the shop's
  // promo posters are black with a huge price). Leave null when there is none: the page shows nothing.
  // Fill it in only from the shop's own post, and set it back to null when the promo ends:
  //   { title: "Promo Raksu", what: "Semua menu susu", when: "Rabu–Kamis, 3–4 Juni", where: "Di toko depan Griya", price: 10000, was: 13000 }
  // `what`, `when`, `where` and `was` (the usual price, shown crossed out) can each be left out.
  promo: null,
};

export const story = {
  started: "Dimulai dari stan di acara kampus oleh mahasiswa Unpad",
  firstShopYear: 2020,
  // The shop's own post (IG 2026-04, "2019 itu 7 tahun lalu") counts the brand from 2019, the stall years.
  since: 2019,
  shops: 3,
  staff: 13,
  ownerAtCounter: true,
  growsSlowly: true,
};

// --- Shops ----------------------------------------------------------------------
// `address` is the street only; `area` already names the village.
// GrabFood and ShopeeFood are not confirmed for any shop, so they are left out.
// Days use JavaScript's numbering: 0 Minggu, 1 Senin, ... 5 Jumat, 6 Sabtu.

// The shop's Linktree has one GoFood store ("Malabar Jatinangor", read 2026-11-14). Which shop it
// sends from is not known yet, and the page itself was behind a captcha.
const GOFOOD = "https://gofood.co.id/english/bandung/restaurant/malabar-jatinangor-a4b4df26-3ed6-4a37-809f-f8526640287d";
const GOFOOD_NOTE = "Link GoFood dari Linktree toko, belum jelas untuk toko yang mana";

export const shops = [
  {
    id: "cikeruh",
    // The shop names its outlets by landmark ("depan MST", "depan Griya", "depan Ikopin"): IG post 2026-05-01.
    name: "Susu Malabar depan MST",
    area: "Cikeruh",
    // "Depan MST". Google Maps lists this shop as No.27; the shop's own post says 18A.
    address: "Jl. Kolonel Achmad Syam No. 18A", // IG post 2026-05-01 (outlet list), read 2026-11-14
    hours: { default: ["12:00", "22:00"], byDay: {} }, // "12.00-22.00 (Open Every Day)": IG bio + IG post 2026-05-01 + TikTok bio, read 2026-11-14
    // Google Maps "Toko Susu Malabar, Jatinangor" (pin in front of MST Seblak), read 2026-11-14
    mapUrl: "https://www.google.com/maps/place/?q=place_id:ChIJaVC8vazFaC4RZG_BtFow734",
    gofoodUrl: tbc(GOFOOD, GOFOOD_NOTE),
  },
  {
    id: "sayang",
    name: "Susu Malabar depan Griya",
    // The shop is on the main road in front of Griya, not on Jl. Sayang. IG bio: "Caringin (depan Griya)";
    // Google Maps puts it in Sayang. Read 2026-11-14.
    area: "Sayang",
    address: "Jl. Raya Jatinangor No. 71", // IG post 2026-05-01 (outlet list), read 2026-11-14
    hours: { default: ["12:00", "22:00"], byDay: {} }, // "12.00-22.00 (Open Every Day)": IG bio + IG post 2026-05-01 + TikTok bio, read 2026-11-14
    mapUrl: "https://maps.app.goo.gl/My2KHVXut6Hfn3196", // Google Maps button on the shop's Linktree, read 2026-11-14
    gofoodUrl: tbc(GOFOOD, GOFOOD_NOTE),
  },
  {
    id: "toko-3",
    // Its place is known now (IG post 2026-05-01, "Depan Ikopin"). Set `located: false`
    // again to hide its buttons and keep it out of pickup.
    // The shop calls it by its landmark only; the short name is ours.
    name: "Susu Malabar depan Ikopin",
    area: "Sayang", // IG post 2026-05-01 + IG bio "Sayang (P. Ikopin)", read 2026-11-14
    address: "Jl. Kolonel Achmad Syam No. 246", // IG post 2026-05-01 (outlet list), read 2026-11-14
    hours: { default: ["12:00", "22:00"], byDay: {} }, // "12.00-22.00 (Open Every Day)": IG bio + IG post 2026-05-01 + TikTok bio, read 2026-11-14
    // A Google Maps listing "Susu Malabar" sits on this spot, but has no reviews or owner details yet.
    mapUrl: tbc(
      "https://www.google.com/maps/place/?q=place_id:ChIJE0yjDQDFaC4RGnryD3Fmh-w",
      "Pin Google Maps toko ini belum dicek",
    ),
    gofoodUrl: tbc(GOFOOD, GOFOOD_NOTE),
  },
];

export const visit = {
  busiest: "sekitar jam 5 sore",
  payment: ["Tunai", "QRIS"],
};

// --- Menu ---------------------------------------------------------------------
// Prices are from a 2023 delivery-app listing, so every price is marked.

const OLD = "Harga dari daftar GoFood 2023";
const p = (n) => tbc(n, OLD);

export const sizes = [
  { id: "14", label: "14 oz" },
  { id: "22", label: "22 oz" },
];

/**
 * Drinks. `prices` maps a size id to a price in rupiah; a missing size is not sold.
 * `group`: "buah" (fruit), "rasa" (flavour), "spesial" (house drinks), "istimewa" (two-flavour mix).
 */
export const drinks = [
  { id: "strawberry", name: "Strawberry", group: "buah", bestSeller: true, prices: { 14: p(13000), 22: p(17000) } },
  { id: "pisang", name: "Pisang", group: "buah", prices: { 14: p(13000), 22: p(17000) } },
  { id: "alpukat", name: "Alpukat", group: "buah", prices: { 14: p(13000), 22: p(17000) } },
  { id: "mangga", name: "Mangga", group: "buah", prices: { 14: p(13000), 22: p(17000) } },
  { id: "melon", name: "Melon", group: "buah", prices: { 14: p(13000), 22: p(17000) } },
  { id: "apel", name: "Apel", group: "buah", prices: { 14: p(13000), 22: p(17000) } },
  { id: "semangka", name: "Semangka", group: "buah", prices: { 14: p(13000), 22: p(17000) } },
  { id: "taro", name: "Taro", group: "rasa", prices: { 14: p(13000), 22: p(17000) } },
  { id: "oreo", name: "Oreo", group: "rasa", prices: { 14: p(13000), 22: p(17000) } },
  { id: "regal", name: "Regal", group: "rasa", prices: { 14: p(13000), 22: p(17000) } },
  { id: "cokelat", name: "Cokelat", group: "rasa", prices: { 14: p(13000), 22: p(17000) } },
  { id: "kopi", name: "Kopi", group: "rasa", prices: { 14: p(13000), 22: p(17000) } },
  {
    id: "original",
    name: "Original Malabar",
    group: "spesial",
    note: "Susu dan gula saja",
    prices: { 14: p(13000), 22: p(15000) },
  },
  { id: "matcha", name: "Matcha Malabar", group: "spesial", prices: { 14: p(13000), 22: p(18000) } },
  // New in Feb 2026: "Rasa Baru!" poster on TikTok (2026-02-24), "Cuma 15K aja!". The poster names no size.
  // Almond Malabar and Biscof Malabar (Rp15.000, "rasa baru" poster 2026-02) are left out until
  // the owner says which sizes they come in. See public/assets/real/SOURCES.md.
  // The listing showed two-flavour "Istimewa" mixes; this is the one named in the research.
  { id: "strawberry-et-choco", name: "Strawberry et Choco", group: "istimewa", prices: { 22: p(19000) } },
];

export const drinkGroups = [
  { id: "buah", name: "Buah" },
  { id: "rasa", name: "Rasa" },
  { id: "spesial", name: "Khas Malabar" },
  { id: "istimewa", name: "Istimewa" },
];

export const toppings = [
  { id: "choco-chips", name: "Choco chips", price: p(2000) },
  { id: "rainbow-chips", name: "Rainbow chips", price: p(2000) },
  { id: "whipped-cream", name: "Whipped cream", price: p(2000) },
];

export const snacks = [
  { id: "corndog", name: "Corndog" },
  { id: "hotang", name: "Hotang" },
];
/** One range for all snacks; per-item prices are not known. */
export const snackPriceRange = tbc([8000, 19500], OLD);

export const bundles = [
  {
    id: "traktir-drivermu",
    name: "Traktir Drivermu",
    what: "Satu minuman buat driver ojol yang ngantar pesananmu",
    price: p(10000),
  },
  {
    id: "paket-berduaan",
    name: "Paket Berduaan",
    what: "Dua minuman",
    priceRange: tbc([32000, 34000], OLD),
  },
];

// --- Pre-order form -------------------------------------------------------------

export const order = {
  // Most cups in one line of the form. Big committee orders fit; typos like 500 don't.
  maxQtyPerLine: 200,
};
