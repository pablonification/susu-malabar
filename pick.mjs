// What a tap on the menu puts into the order or takes out of it, with no DOM, so it can
// be tested. The menu has one size switch. A tap on a drink adds one cup of it in the
// picked size. A drink's count on the menu is its cups in that size, and the minus beside
// it takes one of those off: the count and both buttons are always about one size.

import { sizes } from "./data.mjs";
import { filledLines, unitPrice } from "./order.mjs";

/** The size ids a drink is sold in. With no drink, all of them. */
export function soldSizes(drinkId) {
  return sizes.filter((s) => !drinkId || unitPrice(drinkId, s.id) != null).map((s) => s.id);
}

/** The size a tap adds: the picked one, or the drink's own size when it isn't sold in that. */
export function sizeToAdd(drinkId, picked) {
  const sold = soldSizes(drinkId);
  return sold.includes(picked) ? picked : sold[0] || "";
}

/**
 * Which row of the form a cup from the menu goes to. `lines` is what the form holds now.
 *   { row: 2, how: "more" }  one more cup in the row that has this drink in this size
 *   { row: 0, how: "fill" }  the first row with no drink picked yet
 *   { row: -1, how: "new" }  a new row
 */
export function rowFor(lines, drinkId, size) {
  const same = lines.findIndex((l) => l.drinkId === drinkId && l.size === size);
  if (same >= 0) return { row: same, how: "more" };
  const empty = lines.findIndex((l) => !l.drinkId);
  return empty >= 0 ? { row: empty, how: "fill" } : { row: -1, how: "new" };
}

/**
 * How many cups of a drink the order holds in one size: the count beside the drink on the
 * menu. Counts what the total counts (order.mjs), so cups in another size are not in it.
 */
export function cupsOf(lines, drinkId, size) {
  return filledLines(lines)
    .filter((l) => l.drinkId === drinkId && l.size === size)
    .reduce((sum, l) => sum + Math.floor(Number(l.qty)), 0);
}

/**
 * Which row of the form the menu's minus takes a cup from: the drink's row in the picked
 * size. -1 when the drink has no cup in that size: cups in another size are left alone.
 */
export function rowToTake(lines, drinkId, size) {
  return lines.findIndex((l) => l.drinkId === drinkId && l.size === size && Math.floor(Number(l.qty)) >= 1);
}

/**
 * The cups in the order by size, in the menu's order of sizes, for the order bar:
 *   [{ size: "14", cups: 3 }, { size: "22", cups: 1 }]
 * Counts what the total counts (order.mjs: a known drink, a size it is sold in, 1 or more).
 */
export function cupsBySize(lines) {
  const filled = filledLines(lines);
  const cupsIn = (id) => filled.filter((l) => l.size === id).reduce((sum, l) => sum + Math.floor(Number(l.qty)), 0);
  return sizes.map((s) => ({ size: s.id, cups: cupsIn(s.id) })).filter((s) => s.cups > 0);
}
