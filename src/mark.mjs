// The one place a value from data.mjs turns into HTML, for the build (page.mjs)
// and for the browser (site.js).
//
// A value wrapped in tbc() comes out inside <span class="tbc" title="the note">,
// which the single `.tbc` rule in site.css shows as a dashed underline.
// A confirmed value comes out bare.

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
  return isTbc(x) ? `<span class="tbc" title="${esc(x.note)}">${html}</span>` : html;
}

/** Every tbc() value inside a piece of data, however deep. */
export function findTbc(data, found = []) {
  if (isTbc(data)) found.push(data);
  else if (data && typeof data === "object") for (const v of Object.values(data)) findTbc(v, found);
  return found;
}
