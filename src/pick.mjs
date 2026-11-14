// What a tap on the menu puts into the order, with no DOM, so it can be tested.
// The menu has a size switch in each group's header. A tap on a drink adds one
// cup of it in the picked size.

import { sizes } from "./data.mjs";
import { unitPrice } from "./order.mjs";

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
