// The one place a value from data.mjs turns into HTML, for the build (page.mjs)
// and for the browser (site.js).
//
// A value wrapped in tbc() comes out inside <span class="tbc" title="the note">,
// which the `.tbc` rule in site.css shows as one small amber dot after the value:
// the same dot on a price, an address, a heading or a button. The dot hangs after
// the value and takes no room, so nothing moves when a value is confirmed. A
// confirmed value comes out bare.

import { isTbc, val } from "./data.mjs";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** Text made safe to put into HTML. */
export function esc(text) {
  return String(text).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/**
 * HTML for a value. `show` turns the plain value into the words to display.
 * For a link whose address is the unconfirmed part, mark its label:
 *   `<a href="${esc(val(url))}">${mark(url, () => "Buka peta")}</a>`
 */
export function mark(x, show = (v) => v) {
  const html = esc(show(val(x)));
  if (!isTbc(x)) return html;
  return `<span class="tbc" title="${esc(x.note)}">${html}</span>`;
}

/**
 * One mark around several values that show together, like the two prices of a menu row.
 * `html` is that part's finished HTML. It is wrapped once, and wears the dot once, when
 * any of the values is unconfirmed. `cls` names the wrapper for the layout.
 */
export function markAll(values, html, cls = "") {
  const notes = [...new Set(values.filter(isTbc).map((v) => v.note))];
  const classes = [notes.length ? "tbc" : "", cls].filter(Boolean).join(" ");
  return `<span class="${esc(classes)}"${notes.length ? ` title="${esc(notes.join(". "))}"` : ""}>${html}</span>`;
}

/** Every tbc() value inside a piece of data, however deep. */
export function findTbc(data, found = []) {
  if (isTbc(data)) found.push(data);
  else if (data && typeof data === "object") for (const v of Object.values(data)) findTbc(v, found);
  return found;
}
