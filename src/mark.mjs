// The one place a value from data.mjs turns into HTML, for the build (page.mjs)
// and for the browser (site.js).
//
// A value wrapped in tbc() comes out inside <span class="tbc" title="the note">,
// which the `.tbc` rule in site.css shows as a dashed underline. On a button, a
// link or a heading an underline would read as a link, so those ask for a dot:
// mark(x, show, "dot"). A confirmed value comes out bare.

import { isTbc, val } from "./data.mjs";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** Text made safe to put into HTML. */
export function esc(text) {
  return String(text).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/**
 * HTML for a value. `show` turns the plain value into the words to display.
 * `as` is "line" (a plain value) or "dot" (the label of a button, link or heading).
 * For a link whose address is the unconfirmed part, mark its label:
 *   `<a href="${esc(val(url))}">${mark(url, () => "Buka peta", "dot")}</a>`
 */
export function mark(x, show = (v) => v, as = "line") {
  const html = esc(show(val(x)));
  if (!isTbc(x)) return html;
  return `<span class="tbc${as === "dot" ? " tbc-dot" : ""}" title="${esc(x.note)}">${html}</span>`;
}

/** Every tbc() value inside a piece of data, however deep. */
export function findTbc(data, found = []) {
  if (isTbc(data)) found.push(data);
  else if (data && typeof data === "object") for (const v of Object.values(data)) findTbc(v, found);
  return found;
}
