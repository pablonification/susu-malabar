// The pre-order form's logic, with no DOM: check an order, write the WhatsApp
// message, and build the wa.me link. The page script (site.js) only reads the
// form into an `order` object and shows what these functions return.
//
// order = {
//   lines: [{ drinkId, size: "14" | "22", qty }],
//   date: "2026-11-21",   // yyyy-mm-dd, from <input type="date">
//   time: "17:00",        // hh:mm, from <input type="time">
//   shopId: "cikeruh",
//   name: "Raka",
//   notes: "buat acara himpunan",
// }

import { WHATSAPP_NUMBER, drinks, isTbc, order as orderRules, shops, sizes, val } from "./data.mjs";

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** 17000 -> "Rp17.000" */
export function rupiah(n) {
  return `Rp${Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** "2026-11-21" -> "Sabtu, 21 November 2026". Returns "" for a bad date. */
export function longDate(iso) {
  const d = parseDate(iso);
  if (!d) return "";
  return `${DAY_NAMES[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "17:00" -> "17.00" (how times are written in Indonesian). */
export function clock(hhmm) {
  return String(hhmm).replace(":", ".");
}

function parseDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) return null; // 2026-02-31 and friends
  return d;
}

function minutes(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return +m[1] * 60 + +m[2];
}

/** Today's date in Jatinangor (WIB, UTC+7) as yyyy-mm-dd. */
export function todayWib(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function findDrink(id) {
  return drinks.find((d) => d.id === id) || null;
}

export function findShop(id) {
  return shops.find((s) => s.id === id) || null;
}

/** Opening hours of a shop on a date, as ["12:00", "22:00"], or null if unknown. */
export function hoursOn(shop, iso) {
  const d = parseDate(iso);
  const h = val(shop?.hours);
  if (!d || !h) return null;
  return h.byDay?.[d.getUTCDay()] || h.default || null;
}

/** Price of one cup, or null if that drink isn't sold in that size. */
export function unitPrice(drinkId, size) {
  const drink = findDrink(drinkId);
  const price = drink?.prices?.[size];
  return price == null ? null : val(price);
}

/** Lines that actually hold something: a known drink, a sold size, qty >= 1. */
export function filledLines(lines) {
  return (lines || []).filter((l) => unitPrice(l.drinkId, l.size) != null && Number(l.qty) >= 1);
}

/** Total cups and estimated price of the filled lines. */
export function totals(lines) {
  let cups = 0;
  let price = 0;
  for (const l of filledLines(lines)) {
    const qty = Math.floor(Number(l.qty));
    cups += qty;
    price += qty * unitPrice(l.drinkId, l.size);
  }
  return { cups, price };
}

/**
 * Checks an order. `errors` block sending; `warnings` are shown but allowed
 * (shop hours are not confirmed yet, so they only warn).
 * Each problem is { field, message } with the message in Indonesian.
 */
export function checkOrder(order, now = new Date()) {
  const errors = [];
  const warnings = [];
  const lines = order?.lines || [];

  lines.forEach((l, i) => {
    if (l.drinkId && unitPrice(l.drinkId, l.size) == null) {
      errors.push({ field: `line-${i}`, message: `${findDrink(l.drinkId)?.name || "Minuman ini"} tidak ada ukuran ${l.size} oz` });
    }
    const qty = Number(l.qty);
    if (l.drinkId && !Number.isInteger(qty)) {
      errors.push({ field: `line-${i}`, message: "Jumlahnya harus angka bulat" });
    } else if (l.drinkId && qty < 1) {
      errors.push({ field: `line-${i}`, message: "Jumlah minimal 1" });
    } else if (qty > orderRules.maxQtyPerLine) {
      errors.push({ field: `line-${i}`, message: `Maksimal ${orderRules.maxQtyPerLine} gelas per baris` });
    }
  });
  if (filledLines(lines).length === 0) errors.push({ field: "lines", message: "Pilih minimal satu minuman" });

  const shop = findShop(order?.shopId);
  if (!shop) errors.push({ field: "shop", message: "Pilih toko tempat ambil" });
  else if (shop.located === false) errors.push({ field: "shop", message: "Toko ini belum bisa dipilih" });

  const date = parseDate(order?.date);
  if (!date) errors.push({ field: "date", message: "Isi tanggal ambil" });
  else if (order.date < todayWib(now)) errors.push({ field: "date", message: "Tanggalnya sudah lewat" });

  const t = minutes(order?.time);
  if (t == null) errors.push({ field: "time", message: "Isi jam ambil" });
  else if (date && order.date === todayWib(now)) {
    const nowWib = new Date(now.getTime() + 7 * 3600_000);
    if (t < nowWib.getUTCHours() * 60 + nowWib.getUTCMinutes()) {
      errors.push({ field: "time", message: "Jamnya sudah lewat" });
    }
  }
  if (shop && date && t != null) {
    const h = hoursOn(shop, order.date);
    if (h && (t < minutes(h[0]) || t > minutes(h[1]))) {
      // `tbc`/`note` tell the page to mark this, since the hours come from unconfirmed data.
      warnings.push({
        field: "time",
        message: `Toko ini biasanya buka ${clock(h[0])}–${clock(h[1])}`,
        ...(isTbc(shop.hours) ? { tbc: true, note: shop.hours.note } : {}),
      });
    }
  }

  if (!String(order?.name || "").trim()) errors.push({ field: "name", message: "Isi nama pemesan" });

  return { ok: errors.length === 0, errors, warnings };
}

/** The WhatsApp message for an order. Assumes checkOrder(order).ok. */
export function buildMessage(order) {
  const shop = findShop(order.shopId);
  const sizeLabel = (id) => sizes.find((s) => s.id === id)?.label || `${id} oz`;
  const lines = filledLines(order.lines).map((l, i) => {
    const qty = Math.floor(Number(l.qty));
    return `${i + 1}. ${findDrink(l.drinkId).name} ${sizeLabel(l.size)} × ${qty}`;
  });
  const { cups, price } = totals(order.lines);
  const notes = String(order.notes || "").trim();

  return [
    "Halo Susu Malabar, aku mau pre-order:",
    "",
    ...lines,
    "",
    `Total: ${cups} gelas`,
    `Perkiraan harga: ${rupiah(price)}`,
    "",
    `Ambil di: ${val(shop.name)} (${val(shop.address)})`,
    `Tanggal: ${longDate(order.date)}`,
    `Jam: ${clock(order.time)}`,
    `Atas nama: ${String(order.name).trim()}`,
    ...(notes ? [`Catatan: ${notes}`] : []),
  ].join("\n");
}

/** The wa.me link that opens WhatsApp with the message filled in. */
export function whatsappLink(message, number = val(WHATSAPP_NUMBER)) {
  const digits = String(number).replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
