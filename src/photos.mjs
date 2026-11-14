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
//   soft    true for a still from a video. Those are soft, so they only ever show as a
//           small square beside a line (5rem), never across the page.
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
  // The snack's row on the menu: the corndog alone, as a small square.
  corndog: {
    from: "corndog-fryer",
    crop: [330, 80, 500, 500],
    widths: [320, 160],
    soft: true,
    levels: [2, 216, 1.12],
    alt: "Corndog kentang diangkat dari keranjang penggorengan",
  },
  // The shop's front, as wide and as low as the photo of the shop in front of Ikopin: the
  // banner with the name, the doorway, the zinc counter. Cut in from both sides, to lose a
  // passer-by on the left and the neighbour's bright sign on the right, and cut off below
  // the counter's top, so the picture is the shop and not the scooter parked in front.
  // Lifted more than the others: it was posted under a dark overlay, and its doorway is deep.
  "toko-griya": {
    from: "shop-front-griya",
    crop: [78, 0, 748, 300],
    widths: [748, 480],
    levels: [4, 132, 1.4],
    alt: "Spanduk hijau toska bertulisan SUSU MALABAR di atas konter seng toko depan Griya",
  },
  "toko-ikopin": {
    from: "shop-front-ikopin",
    crop: [0, 0, 1080, 433],
    widths: [1080, 720],
    levels: [12, 112, 1.1],
    alt: "Poster menu hijau tua, bangku plastik, dan pembeli di atas motor di toko depan Ikopin",
  },
};

/**
 * The photo of each shop's front, by the shop's id in data.mjs. It sits inside its shop's
 * row. A shop with no photo here is the same row without one.
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
