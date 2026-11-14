// The page's behaviour: the pre-order form, and adding a flavour to it from the menu.
// All rules (checking, the message, the wa.me link) are in order.mjs. This file only
// reads the form into an `order` object and shows what those functions return.

import { order as rules, isTbc, sizes, tbc } from "./data.mjs";
import { buildMessage, checkOrder, findDrink, rupiah, todayWib, totals, unitPrice, whatsappLink } from "./order.mjs";
import { esc, mark } from "./mark.mjs";
import { rowFor, sizeToAdd, soldSizes } from "./pick.mjs";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const form = $("#order");
const list = $("#lines");
const template = $("#line");
const send = $("#send");
const bar = $("#bar");
const fields = { shop: $("#field-shop"), date: $("#date"), time: $("#time"), name: $("#name") };

let lineCount = 0; // only for unique ids
let tried = false; // true once the person pressed send, so every problem shows
const touched = new Set(); // fields the person has already left
let formOnScreen = false;
let lastAdded = ""; // what the last tap on the menu put in, e.g. "Strawberry 14 oz"
let menuSize = sizes[0].id; // the size picked in the menu's headers: what a tap on a drink adds
const sizeName = (id) => sizes.find((s) => s.id === id)?.label || "";

// --- Lines ----------------------------------------------------------------------

function addLine({ drinkId = "", size = "", qty = 1 } = {}) {
  const n = ++lineCount;
  const li = template.content.firstElementChild.cloneNode(true);
  const select = $("select", li);
  const qtyInput = $(".qty input", li);

  select.id = `drink-${n}`;
  $(".line-what label", li).htmlFor = select.id;
  $(".err-drink", li).id = `err-drink-${n}`;
  select.setAttribute("aria-describedby", `err-drink-${n}`);

  for (const radio of $$(".seg input", li)) radio.name = `line-size-${n}`;

  qtyInput.id = `qty-${n}`;
  $(".qty label", li).htmlFor = qtyInput.id;
  $(".err-qty", li).id = `err-qty-${n}`;
  qtyInput.setAttribute("aria-describedby", `err-qty-${n}`);

  select.value = drinkId;
  qtyInput.value = qty;
  const want = size || soldSizes(drinkId)[0];
  for (const radio of $$(".seg input", li)) radio.checked = radio.value === want;

  list.append(li);
  return li;
}

function readLine(li) {
  const raw = $(".qty input", li).value.trim();
  return {
    drinkId: $("select", li).value,
    size: $(".seg input:checked", li)?.value || "",
    qty: raw === "" ? 0 : Number(raw),
  };
}

function readOrder() {
  return {
    lines: $$(".line", list).map(readLine),
    shopId: $('input[name="shop"]:checked', form)?.value || "",
    date: fields.date.value,
    time: fields.time.value,
    name: fields.name.value,
    notes: $("#notes").value,
  };
}

/** Sizes not sold are switched off, and the row says what its cups come to. */
function fitSizes(li) {
  const select = $("select", li);
  const drinkId = select.value;
  select.classList.toggle("is-empty", !drinkId); // "Pilih rasa" reads as a hint, not as a choice made
  const sold = soldSizes(drinkId);
  for (const radio of $$(".seg input", li)) {
    radio.disabled = !sold.includes(radio.value);
    if (radio.disabled && radio.checked) radio.checked = false;
  }
  if (!$(".seg input:checked", li)) {
    const first = $$(".seg input", li).find((r) => !r.disabled);
    if (first) first.checked = true;
  }
  const { size, qty } = readLine(li);
  const price = findDrink(drinkId)?.prices?.[size];
  const sum = (Math.floor(qty) || 0) * (unitPrice(drinkId, size) || 0);
  $(".line-price", li).innerHTML = sum > 0 ? `<span class="sr">Subtotal </span>${mark(isTbc(price) ? tbc(sum, price.note) : sum, rupiah)}` : "";
}

/** One step on the quantity buttons. "+10" makes the first cup ten, then adds ten: 1, 10, 20, 30, 40. */
function step(li, by) {
  const input = $(".qty input", li);
  const now = Math.max(0, Math.floor(Number(input.value) || 0));
  const next = by === 10 && now <= 1 ? 10 : now + by;
  input.value = Math.min(rules.maxQtyPerLine, Math.max(1, next));
}

/** From the menu: one more cup in the row with that drink and size, or the empty row, or a new one. */
function addFromMenu(drinkId, size) {
  const rows = $$(".line", list);
  const { row, how } = rowFor(rows.map(readLine), drinkId, size);
  if (how === "new") return addLine({ drinkId, size });
  const li = rows[row];
  if (how === "more") {
    step(li, 1);
    return li;
  }
  $("select", li).value = drinkId;
  $(".qty input", li).value = 1;
  for (const radio of $$(".seg input", li)) {
    radio.disabled = false;
    radio.checked = radio.value === size;
  }
  return li;
}

/** The menu's size switch: every group's header shows the same pick, and each drink the price it adds at. */
function showMenuSize() {
  for (const radio of $$(".seg-poster input")) radio.checked = radio.value === menuSize;
  for (const button of $$(".pick")) {
    const adds = sizeToAdd(button.dataset.drink, menuSize);
    for (const price of $$(".price[data-size]", button)) price.classList.toggle("price-off", price.dataset.size !== adds);
  }
}

// --- Showing the state ------------------------------------------------------------

/** An estimate made from prices that are still placeholders wears the mark too. */
function estimate(order, price) {
  const old = order.lines.map((l) => findDrink(l.drinkId)?.prices?.[l.size]).find(isTbc);
  return mark(old ? tbc(price, old.note) : price, rupiah);
}

/**
 * Shows a problem from checkOrder in its place, or clears it. A problem that comes
 * from unconfirmed data (`tbc`) wears the mark. An error also turns its field red.
 */
function show(el, input, problem) {
  el.innerHTML = !problem ? "" : problem.tbc ? mark(tbc(problem.message, problem.note)) : esc(problem.message);
  el.hidden = !problem;
  if (!input) return;
  if (problem) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function refresh() {
  const rows = $$(".line", list);
  rows.forEach(fitSizes); // first, so the order is read with sizes the drinks are sold in
  const order = readOrder();
  $$(".line-remove", list).forEach((b) => (b.hidden = rows.length < 2));

  const result = checkOrder(order);
  const first = (kind, field) => result[kind].find((p) => p.field === field);

  // A problem with a row's amount shows right away, under the amount. "Pick a
  // drink" shows under the first drink field, once the person has pressed send.
  // The rest wait until the person has left that field or pressed send.
  const nothingPicked = !order.lines.some((l) => l.drinkId);
  rows.forEach((li, i) => {
    show($(".err-qty", li), $(".qty input", li), first("errors", `line-${i}`));
    show($(".err-drink", li), $("select", li), tried && nothingPicked && i === 0 ? first("errors", "lines") : null);
  });
  for (const field of ["shop", "date", "time", "name"]) {
    const waiting = !(tried || touched.has(field));
    show($(`#err-${field}`), fields[field], waiting ? null : first("errors", field));
  }
  show($("#warn-time"), null, first("warnings", "time"));

  // The total stays above the button as long as there is a drink. A complete
  // order also offers the message itself, and the button becomes a real link.
  const { cups, price } = totals(order.lines);
  $("#total").hidden = cups === 0;
  $("#total-cups").textContent = `${cups} gelas`;
  $("#total-price").innerHTML = estimate(order, price);

  $("#preview").hidden = !result.ok;
  if (result.ok) {
    const message = buildMessage(order);
    $("#preview-text").textContent = message;
    send.href = whatsappLink(message);
    send.target = "_blank";
    send.rel = "noopener";
  } else {
    send.href = "#pesan";
    send.removeAttribute("target");
    $("#sent").hidden = true;
  }
  $("#copy").textContent = "Salin pesan";

  // On the menu, a flavour's plus becomes how many cups of it are in the order.
  for (const button of $$(".pick")) {
    const n = order.lines.filter((l) => l.drinkId === button.dataset.drink).reduce((sum, l) => sum + (Math.floor(l.qty) || 0), 0);
    $(".pick-n", button).textContent = n || "+";
    $(".pick-sr", button).textContent = `, ukuran ${sizeName(sizeToAdd(button.dataset.drink, menuSize))}${n ? `, ${n} gelas di pesanan` : ""}`;
    if (n) button.dataset.count = n;
    else delete button.dataset.count;
  }

  // The bar answers a tap on the menu: what went in, the total so far, the way on.
  $("#bar-cups").textContent = `${cups} gelas`;
  $("#bar-price").innerHTML = estimate(order, price);
  $("#bar-last").textContent = lastAdded ? `${lastAdded} masuk` : "";
  bar.hidden = cups === 0 || formOnScreen;
  // Room for the bar at the end of the page, and when the browser scrolls to whatever
  // has focus, so nothing lands underneath it.
  const room = bar.hidden ? "" : `${bar.offsetHeight}px`;
  document.body.style.paddingBottom = room;
  document.documentElement.style.scrollPaddingBottom = room;

  return result;
}

/** A change made in the form itself: the bar no longer speaks of the last menu tap. */
function edited() {
  lastAdded = "";
  return refresh();
}

/** After a failed send: go to the first thing that needs fixing. */
function focusFirstProblem(result) {
  const field = result.errors[0]?.field || "";
  const row = /^line-(\d+)$/.exec(field);
  const target = row
    ? $(".qty input", $$(".line", list)[Number(row[1])])
    : field === "lines"
      ? $("select", list)
      : field === "shop"
        ? $('input[name="shop"]', form)
        : fields[field];
  target?.focus({ preventScroll: true });
  // The middle of the screen is clear of the sticky links on top.
  (target?.closest(".line, .field") || target)?.scrollIntoView({ block: "center" });
}

// --- Wiring -----------------------------------------------------------------------

list.addEventListener("click", (e) => {
  const li = e.target.closest(".line");
  if (!li) return;
  const stepBy = e.target.closest("[data-step]")?.dataset.step;
  if (stepBy) step(li, Number(stepBy));
  else if (e.target.closest(".line-remove")) li.remove();
  else return;
  edited();
});

$("#add-line").addEventListener("click", () => {
  const li = addLine();
  edited();
  $("select", li).focus();
});

form.addEventListener("input", edited);
form.addEventListener("change", (e) => {
  if (e.target.name === "shop") touched.add("shop");
  edited();
});
for (const field of ["date", "time", "name"]) {
  fields[field].addEventListener("blur", () => {
    touched.add(field);
    refresh();
  });
}

// The button is a real link once the order is complete, so the phone opens
// WhatsApp without blocking it. Until then a press shows what is missing.
send.addEventListener("click", (e) => {
  tried = true;
  const result = refresh();
  if (!result.ok) {
    e.preventDefault();
    focusFirstProblem(result);
    return;
  }
  $("#sent").hidden = false;
});

$("#copy").addEventListener("click", async (e) => {
  try {
    await navigator.clipboard.writeText($("#preview-text").textContent);
    e.target.textContent = "Tersalin";
  } catch {
    // No clipboard here: select the message so it can be copied by hand.
    getSelection().selectAllChildren($("#preview-text"));
  }
});

// A tap on a flavour in the menu adds one cup of it, in the size picked in the header.
document.addEventListener("click", (e) => {
  const pick = e.target.closest(".pick");
  if (!pick) return;
  const drinkId = pick.dataset.drink;
  const size = sizeToAdd(drinkId, menuSize);
  addFromMenu(drinkId, size);
  lastAdded = `${findDrink(drinkId).name} ${sizeName(size)}`.trim();
  refresh();
});

// A size picked in one group's header is the size for the whole menu.
document.addEventListener("change", (e) => {
  if (!e.target.closest(".seg-poster")) return;
  menuSize = e.target.value;
  showMenuSize();
  refresh();
});

new IntersectionObserver(([entry]) => {
  formOnScreen = entry.isIntersecting;
  refresh();
}).observe(form);

// --- Start ------------------------------------------------------------------------

fields.date.min = todayWib();
fields.date.value = todayWib();
addLine();
showMenuSize();
refresh();
