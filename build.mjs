// Builds the site into dist/ with no packages: renders each page template,
// then copies the browser files (src/) and public/ as they are.
//   node build.mjs
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = import.meta.dirname;
const out = join(root, "dist");

// [output file, template module]. A template's default export returns the page's HTML.
const pages = [
  ["index.html", "src/page.mjs"],
  ["og-card.html", "src/card.mjs"], // only photographed for public/og.png, never linked
  ["favicon.svg", "src/favicon.mjs"], // the tab icon, drawn from the logo file
];
// Read while building, not by the browser.
const buildOnly = new Set(["photos.mjs"]);
// The untouched originals stay in the repo. The page uses the cuts in public/assets/photos/.
const originals = join(root, "public/assets/real");

export async function build() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const templates = new Set(pages.map(([, t]) => t.replace("src/", "")));
  const stamp = Date.now(); // fresh imports when serve.mjs rebuilds
  for (const [file, template] of pages) {
    const path = join(root, template);
    if (!existsSync(path)) continue;
    const mod = await import(`${pathToFileURL(path).href}?v=${stamp}`);
    await writeFile(join(out, file), await mod.default());
  }
  for (const name of await readdir(join(root, "src"))) {
    if (!templates.has(name) && !buildOnly.has(name)) await cp(join(root, "src", name), join(out, name), { recursive: true });
  }
  if (existsSync(join(root, "public"))) {
    await cp(join(root, "public"), out, { recursive: true, filter: (from) => !from.startsWith(originals) });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await build();
  console.log("Built into dist/");
}
