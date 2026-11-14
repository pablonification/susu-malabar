import assert from "node:assert/strict";
import { test } from "node:test";
import { WHATSAPP_NUMBER, isTbc, val } from "../src/data.mjs";
import { buildMessage, checkOrder, longDate, rupiah, todayWib, totals, whatsappLink } from "../src/order.mjs";

// 14 Nov 2026, 13:00 WIB
const NOW = new Date("2026-11-14T06:00:00Z");

const good = {
  lines: [
    { drinkId: "strawberry", size: "22", qty: 3 },
    { drinkId: "cokelat", size: "14", qty: "2" },
    { drinkId: "", size: "22", qty: 1 }, // empty row the person never filled
  ],
  date: "2026-11-21",
  time: "17:00",
  shopId: "cikeruh",
  name: "  Raka  ",
  notes: "Buat acara himpunan & dipisah per rasa",
};

test("rupiah and dates are written the Indonesian way", () => {
  assert.equal(rupiah(17000), "Rp17.000");
  assert.equal(rupiah(1234567), "Rp1.234.567");
  assert.equal(rupiah(0), "Rp0");
  assert.equal(longDate("2026-11-21"), "Sabtu, 21 November 2026");
  assert.equal(longDate("2026-02-31"), "");
  assert.equal(todayWib(new Date("2026-11-14T18:00:00Z")), "2026-11-15"); // 01:00 WIB next day
});

test("a full order passes and totals count only filled rows", () => {
  const r = checkOrder(good, NOW);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(totals(good.lines), { cups: 5, price: 3 * 17000 + 2 * 13000 });
});

test("the message lists drinks, totals, shop, date, time, name and notes", () => {
  const msg = buildMessage(good);
  assert.equal(
    msg,
    [
      "Halo Susu Malabar, aku mau pre-order:",
      "",
      "1. Strawberry 22 oz × 3",
      "2. Cokelat 14 oz × 2",
      "",
      "Total: 5 gelas",
      "Perkiraan harga: Rp77.000",
      "",
      "Ambil di: Susu Malabar Cikeruh (Jl. Kolonel Achmad Syam, Cikeruh)",
      "Tanggal: Sabtu, 21 November 2026",
      "Jam: 17.00",
      "Atas nama: Raka",
      "Catatan: Buat acara himpunan & dipisah per rasa",
    ].join("\n"),
  );
  assert.ok(!buildMessage({ ...good, notes: "  " }).includes("Catatan"));
});

test("the wa.me link carries the number and the whole message, encoded", () => {
  const msg = buildMessage(good);
  const link = whatsappLink(msg);
  const url = new URL(link);
  assert.equal(url.origin + url.pathname, `https://wa.me/${val(WHATSAPP_NUMBER)}`);
  assert.equal(url.searchParams.get("text"), msg);
  assert.ok(!link.includes(" ") && !link.includes("&dipisah"), "spaces and & must be encoded");
  assert.equal(whatsappLink("hi", "+62 812-3456-789"), "https://wa.me/628123456789?text=hi");
});

test("missing or wrong fields are caught", () => {
  const empty = checkOrder({ lines: [], date: "", time: "", shopId: "", name: " " }, NOW);
  assert.deepEqual(empty.errors.map((e) => e.field).sort(), ["date", "lines", "name", "shop", "time"]);

  const past = checkOrder({ ...good, date: "2026-11-13" }, NOW);
  assert.deepEqual(past.errors.map((e) => e.message), ["Tanggalnya sudah lewat"]);

  const earlierToday = checkOrder({ ...good, date: "2026-11-14", time: "12:30" }, NOW);
  assert.deepEqual(earlierToday.errors.map((e) => e.message), ["Jamnya sudah lewat"]);

  const noSize = checkOrder({ ...good, lines: [{ drinkId: "strawberry-et-choco", size: "14", qty: 1 }] }, NOW);
  assert.ok(noSize.errors.some((e) => e.message.includes("tidak ada ukuran 14 oz")));

  const zero = checkOrder({ ...good, lines: [{ drinkId: "kopi", size: "22", qty: 0 }] }, NOW);
  assert.ok(zero.errors.some((e) => e.message === "Jumlah minimal 1"));

  const half = checkOrder({ ...good, lines: [{ drinkId: "kopi", size: "22", qty: 1.5 }] }, NOW);
  assert.deepEqual(half.errors.map((e) => e.message), ["Jumlahnya harus angka bulat"]);

  const unlocated = checkOrder({ ...good, shopId: "toko-3" }, NOW);
  assert.deepEqual(unlocated.errors.map((e) => e.message), ["Toko ini belum bisa dipilih"]);

  const huge = checkOrder({ ...good, lines: [{ drinkId: "kopi", size: "22", qty: 500 }] }, NOW);
  assert.ok(huge.errors.some((e) => e.message.startsWith("Maksimal")));
});

test("outside shop hours only warns, since hours are not confirmed", () => {
  const friday = checkOrder({ ...good, date: "2026-11-20", time: "13:00" }, NOW); // Cikeruh opens 14:00 on Friday
  assert.ok(friday.ok);
  assert.deepEqual(friday.warnings.map((w) => w.message), ["Toko ini biasanya buka 14.00–22.00"]);
  assert.equal(friday.warnings[0].tbc, true, "unconfirmed hours must be marked on the page");
  assert.deepEqual(checkOrder(good, NOW).warnings, []);
});

test("the WhatsApp number is still marked as a placeholder until confirmed", () => {
  // Remove this test once the owner gives the real number.
  assert.ok(isTbc(WHATSAPP_NUMBER));
});
