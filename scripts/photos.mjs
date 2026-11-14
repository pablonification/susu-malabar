// Cuts the real photos (public/assets/real/) into the sizes the page uses
// (public/assets/photos/), as avif, webp and jpg, with metadata stripped.
//   npm run photos
// The list of cuts is src/photos.mjs. A cut is never wider than its original: the script
// stops if one asks for that. Needs ffmpeg, cwebp and avifenc on this machine
// (brew install ffmpeg webp libavif). Only needed when a photo or a cut changes: the
// results are committed.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PHOTO_DIR, photos, photoSize } from "../src/photos.mjs";

const root = join(import.meta.dirname, "..");
const from = join(root, "public/assets/real");
const out = join(root, "public", PHOTO_DIR);
const tmp = mkdtempSync(join(tmpdir(), "susu-photos-"));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const [name, photo] of Object.entries(photos)) {
  const source = join(from, `${photo.from}.jpg`);
  const [x, y, w, h] = photo.crop;
  const filters = [`crop=${w}:${h}:${x}:${y}`];
  if (photo.levels) {
    const [black, white, gamma] = photo.levels;
    const curve = `clip(255*pow(clip((val-${black})/${white - black}\\,0\\,1)\\,${(1 / gamma).toFixed(4)})\\,0\\,255)`;
    filters.push(`lutrgb=r='${curve}':g='${curve}':b='${curve}'`);
  }
  for (const width of photo.widths) {
    if (width > w) throw new Error(`${name}: ${width}px is wider than its ${w}px crop. Photos are never made bigger.`);
    const { height } = photoSize(name, width);
    const png = join(tmp, `${name}-${width}.png`);
    const base = join(out, `${name}-${width}`);
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-vf", [...filters, `scale=${width}:${height}:flags=lanczos`].join(","), "-frames:v", "1", png]);
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", png, "-map_metadata", "-1", "-pix_fmt", "yuvj420p", "-q:v", "4", `${base}.jpg`]);
    run("cwebp", ["-quiet", "-q", "78", "-m", "6", "-metadata", "none", png, "-o", `${base}.webp`]);
    run("avifenc", ["-q", "56", "-s", "4", png, `${base}.avif`]);
    const kb = (ext) => `${Math.round(statSync(`${base}.${ext}`).size / 1024)} KB`;
    console.log(`${name}-${width}  ${width}×${height}  avif ${kb("avif")}  webp ${kb("webp")}  jpg ${kb("jpg")}`);
  }
}
rmSync(tmp, { recursive: true, force: true });
