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
//   soft    true for a picture that is soft as posted: a still from a video, or a small
//           dark photo. Those only ever show as a small square beside a line (5rem),
//           never across the page.
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
  // The shops' fronts: a small square each, in the shop's row. The one in front of Griya is
  // soft and dark as posted (lettering smears when it is shown wide), so it is cut close to
  // what tells the shop apart: the turquoise awning with its name, and the doorway under it.
  // Lifted more than the others: it was posted under a dark overlay, and its doorway is deep.
  "toko-griya": {
    from: "shop-front-griya",
    crop: [100, 0, 220, 220],
    widths: [220, 160],
    soft: true,
    levels: [4, 132, 1.4],
    alt: "Awning hijau toska bertulisan SUSU MALABAR di atas pintu toko depan Griya",
  },
  // The one in front of Ikopin is sharp, and cut to the same square so the shops read as one
  // list: the photo's whole height, from its left: the menu posters, the counter, the stools.
  "toko-ikopin": {
    from: "shop-front-ikopin",
    crop: [255, 0, 433, 433],
    widths: [320, 160],
    levels: [12, 112, 1.1],
    alt: "Poster menu hijau tua, konter seng, dan bangku plastik di toko depan Ikopin",
  },
};

/**
 * The photo of each shop's front, by the shop's id in data.mjs. It sits inside its shop's
 * row as a small square. A shop with no photo here is the same row without one.
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
