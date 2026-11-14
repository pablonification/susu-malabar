// Every photo on the page: which real picture it is cut from, how it is cut, and the
// words a screen reader says for it.
//
// The originals are in public/assets/real/ (see SOURCES.md there: all posted by the shop).
// `npm run photos` cuts them into public/assets/photos/ as avif, webp and jpg. Nothing is
// made bigger than its original, nothing is retouched or generated. The only change is
// `levels`: [black, white, gamma], a plain brightness lift for pictures the shop posted
// under a dark overlay.
//
//   from    file name in public/assets/real/, without ".jpg"
//   crop    [x, y, width, height] in the original's pixels
//   widths  the sizes to make. The first is the largest, and never wider than the crop.
//   alt     what the picture shows, in Indonesian. Say what is there, nothing more.

export const photos = {
  // First screen: the best seller in a hand, the way the shop shoots it.
  hero: {
    from: "strawberry-milk-2",
    crop: [0, 0, 1080, 600],
    widths: [1080, 720],
    levels: [8, 218, 1.06],
    alt: "Segelas susu stroberi di tangan, difoto dari atas di samping roda sepeda",
  },
  // The best seller's strip on the menu: the same cup, close, so the pink shows.
  cup: {
    from: "strawberry-milk-2",
    crop: [330, 60, 480, 480],
    widths: [480, 240],
    levels: [8, 218, 1.06],
    alt: "Susu stroberi di gelas bening, dipegang satu tangan",
  },
  // The snack's row on the menu: the corndog alone, as a small square.
  corndog: {
    from: "corndog-fryer",
    crop: [330, 80, 500, 500],
    widths: [320, 160],
    levels: [2, 216, 1.12],
    alt: "Corndog kentang diangkat dari keranjang penggorengan",
  },
  // The Griya counter, the whole frame: the "PICK UP HERE" sign, both people serving, and
  // a customer from behind with nothing of him cut off.
  pickup: {
    from: "counter-griya-wide",
    crop: [0, 0, 1280, 525],
    widths: [1280, 800],
    levels: [3, 222, 1.04],
    alt: "Pembeli dilayani dua pegawai di konter toko depan Griya, di samping papan hijau bertulisan PICK UP HERE",
  },
  "toko-griya": {
    from: "shop-front-griya",
    crop: [0, 0, 1080, 444],
    widths: [1080, 720],
    levels: [14, 128, 1.14],
    alt: "Spanduk hijau toska bertulisan SUSU MALABAR di atas konter seng toko depan Griya",
  },
  "toko-ikopin": {
    from: "shop-front-ikopin",
    crop: [0, 0, 1080, 433],
    widths: [1080, 720],
    levels: [12, 112, 1.1],
    alt: "Poster menu hijau tua, bangku plastik, dan pembeli di atas motor di toko depan Ikopin",
  },
  // Inside the Griya shop: "MALABAR" painted on the wall.
  kedai: {
    from: "counter-griya",
    crop: [0, 0, 1000, 720],
    widths: [1000, 640],
    levels: [6, 224, 1.04],
    alt: "Tiga orang meracik pesanan di dalam toko depan Griya, di depan dinding bertulisan MALABAR dan gambar buah",
  },
  // Bagging a big order: one person and the cups. The second person, cut in half by the
  // frame's right edge in the original, is left out.
  bungkus: {
    from: "staff-griya",
    crop: [100, 0, 680, 600],
    widths: [680, 480],
    alt: "Pegawai tersenyum sambil membungkus tumpukan gelas putih pesanan",
  },
};

/** A drink with a photo of its own on the menu, and the shop's own line about it (from a caption on its TikTok). */
export const drinkPhotos = {
  strawberry: { photo: "cup", line: "Nungguin kamu, iya kamu." },
};

/**
 * The photo of each shop's front, by the shop's id in data.mjs. The page shows them as a
 * set beside the list of shops, each named, so a shop with no photo leaves no gap.
 */
export const shopPhotos = {
  sayang: "toko-griya",
  "toko-3": "toko-ikopin",
};

/** Where the cut pictures live, relative to the page. */
export const PHOTO_DIR = "assets/photos";

/** Width and height of one cut of a photo. */
export function photoSize(name, width = photos[name].widths[0]) {
  const [, , w, h] = photos[name].crop;
  return { width, height: Math.round((h * width) / w) };
}
