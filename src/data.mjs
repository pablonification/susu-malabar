// Every fact the site shows lives here.
//
// Anything wrapped in tbc() is NOT confirmed with the owner yet. The page shows
// it with a visible "cek" mark so it is easy to spot before launch. Once the
// owner confirms a value, replace `tbc(x, "...")` with plain `x`.
//
//   grep -n "tbc(" src/data.mjs     lists everything still to confirm.
//
// Facts here come from Arqila's research. Do not add facts that are not in it
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
export const WHATSAPP_NUMBER = tbc("6280000000000", "Nomor WhatsApp toko untuk pre-order belum ada");

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
};

export const story = {
  started: "Dimulai dari stan di acara kampus oleh mahasiswa Unpad",
  firstShopYear: 2020,
  shops: 3,
  staff: 13,
  ownerAtCounter: true,
  growsSlowly: true,
};

// --- Shops ----------------------------------------------------------------------
// GrabFood and ShopeeFood are not confirmed for any shop, so they are left out.
// Days use JavaScript's numbering: 0 Minggu, 1 Senin, ... 5 Jumat, 6 Sabtu.

export const shops = [
  {
    id: "cikeruh",
    name: "Susu Malabar Cikeruh",
    area: "Jl. Kolonel Achmad Syam, Cikeruh",
    address: tbc("Jl. Kolonel Achmad Syam, Cikeruh, Jatinangor", "Alamat lengkap belum dicek"),
    hours: tbc(
      { default: ["12:00", "22:00"], byDay: { 5: ["14:00", "22:00"] } },
      "Jam dari daftar GoFood lama",
    ),
    mapUrl: tbc("https://maps.google.com/?q=Susu+Malabar+Jatinangor", "Link Google Maps belum dicek"),
    gofoodUrl: tbc("https://gofood.co.id/", "Link GoFood toko ini belum dicek"),
  },
  {
    id: "sayang",
    name: "Susu Malabar Sayang",
    area: "Jl. Sayang, Desa Sayang",
    address: tbc("Jl. Sayang, Desa Sayang, Jatinangor", "Alamat lengkap belum dicek"),
    hours: tbc({ default: ["12:00", "22:00"], byDay: {} }, "Jam toko ini belum dicek"),
    mapUrl: tbc("https://maps.google.com/?q=Susu+Malabar+Jatinangor", "Link Google Maps belum dicek"),
    gofoodUrl: tbc("https://gofood.co.id/", "Link GoFood toko ini belum dicek"),
  },
  {
    id: "toko-3",
    name: tbc("Susu Malabar (toko ketiga)", "Nama dan letak toko ketiga belum pasti"),
    area: tbc("Ujung selatan Jl. Kolonel Achmad Syam", "Letak toko ketiga belum pasti"),
    address: tbc("Belum diketahui", "Alamat toko ketiga belum ada"),
    hours: tbc({ default: ["12:00", "22:00"], byDay: {} }, "Jam toko ini belum dicek"),
    mapUrl: tbc("https://maps.google.com/?q=Susu+Malabar+Jatinangor", "Link Google Maps belum dicek"),
    gofoodUrl: tbc("https://gofood.co.id/", "Link GoFood toko ini belum dicek"),
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
