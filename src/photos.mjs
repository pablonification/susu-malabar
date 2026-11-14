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
  // The best seller's strip on the menu: the lid from above, straight off the blender.
  lid: {
    from: "strawberry-milk-topdown",
    crop: [8, 108, 560, 560],
    widths: [560, 320],
    alt: "Susu stroberi yang baru diblender, dilihat dari atas tutup gelasnya",
  },
  corndog: {
    from: "corndog-fryer",
    crop: [0, 70, 1000, 560],
    widths: [1000, 640],
    levels: [2, 216, 1.12],
    alt: "Corndog kentang diangkat dari keranjang penggorengan",
  },
  // The Griya counter with its "PICK UP HERE" sign.
  pickup: {
    from: "counter-griya-wide",
    crop: [0, 45, 853, 480],
    widths: [853, 640],
    levels: [3, 222, 1.04],
    alt: "Pembeli dilayani di konter toko depan Griya, di samping papan hijau bertulisan PICK UP HERE",
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
  // Bagging a big order.
  bungkus: {
    from: "staff-griya",
    crop: [0, 0, 1000, 720],
    widths: [1000, 640],
    alt: "Pegawai tersenyum sambil membungkus tumpukan gelas putih pesanan",
  },
};

/** A drink with a photo of its own on the menu, and the shop's own line about it (from a caption on its TikTok). */
export const drinkPhotos = {
  strawberry: { photo: "lid", line: "Nungguin kamu, iya kamu." },
};

/** The photo of each shop's front, by the shop's id in data.mjs. A shop not listed here shows none. */
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
