// The site at http://localhost:4321, rebuilt on every page load.
//   node serve.mjs [--port 4321]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { build } from "./build.mjs";

const port = Number(process.argv[process.argv.indexOf("--port") + 1]) || 4321;
const dist = join(import.meta.dirname, "dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    if (path.endsWith(".html")) await build();
    const file = normalize(join(dist, path));
    if (!file.startsWith(dist)) throw Object.assign(new Error("outside"), { code: "ENOENT" });
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch (e) {
    res.writeHead(e.code === "ENOENT" ? 404 : 500, { "content-type": "text/plain; charset=utf-8" });
    res.end(e.code === "ENOENT" ? "Not found" : String(e.stack || e));
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
