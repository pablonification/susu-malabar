# Where these files come from

All read on 2026-11-14 while logged out (nothing was liked, followed or saved).
Every shipped file was posted by Susu Malabar itself, on its Instagram (@susumalabar)
or TikTok (@malabar.susu). No customer photos from Google Maps are shipped.

Each photo comes as `.webp`, `.avif` and `.jpg` (metadata stripped). Files with `-800`
are the same picture with its long edge at 800 px. No picture was made bigger than its
source, so some are smaller than 1600 px: that is the largest the shop posted.
Text the shop had put over a photo was cropped away, never painted out.

## Shipped

| File | What it shows | Size (webp) | Source | Posted by, date |
| --- | --- | --- | --- | --- |
| `logo-badge-original.jpg` | The real badge: a line drawing of a shop front with a striped awning and a "MALABAR" sign, in a round frame. Pink on green, as the TikTok profile picture. Untouched original. | 999×999, 101 KB (jpg) | https://www.tiktok.com/@malabar.susu (profile picture) | Susu Malabar, profile picture as of 2026-11-14 |
| `logo-badge.png` | The same badge in one ink colour (black) on a transparent background, like it is printed on the white cups. Made from the original by colour, nothing redrawn. | 931×929, 79 KB | from `logo-badge-original.jpg` | derived |
| `logo-badge-256.png` | `logo-badge.png` at 256 px | 256×255, 26 KB | from `logo-badge.png` | derived |
| `logo-badge.svg` | A trace of `logo-badge.png` (`fill="currentColor"`). 98.8% of pixels match the PNG. The tiny chalk scribbles on the board in the right window are lost (the board is a plain shape). Use the PNG where that detail shows. | 36 KB | from `logo-badge.png` | derived |
| `strawberry-milk-1` | Strawberry milk in a clear cup on a round outdoor table, from above, bike behind. Overcast light. | 1080×980, 24 KB | https://www.tiktok.com/@malabar.susu/photo/7603571405539511570 (slide 2, cropped) | Susu Malabar, 2026-02-06 |
| `strawberry-milk-2` | A hand holding strawberry milk next to a bike wheel, from above. | 1080×600, 57 KB | https://www.tiktok.com/@malabar.susu/photo/7603571405539511570 (slide 1, cropped) | Susu Malabar, 2026-02-06 |
| `strawberry-milk-topdown` | Freshly blended strawberry milk with a lid, close, on the steel counter. Still from a video, so small. | 576×800, 13 KB | https://www.tiktok.com/@malabar.susu/video/7604698035595136274 (still at about 0:30) | Susu Malabar, 2026-02-09 |
| `shop-front-griya` | The shop on Jl. Raya Jatinangor No. 71, in front of Griya: teal "SUSU MALABAR" banner, zinc counter. | 1080×444, 19 KB | https://www.instagram.com/susumalabar/p/DXyiFmXE9cj/ (slide 3 "Outlet 2", cropped below the address text) | Susu Malabar, 2026-05-01 |
| `shop-front-ikopin` | The shop on Jl. Kolonel Achmad Syam No. 246, in front of Perumahan Ikopin, at dusk: dark green menu posters on the wall, plastic stools, a rider waiting. | 1080×433, 22 KB | https://www.instagram.com/susumalabar/p/DXyiFmXE9cj/ (slide 4 "Outlet 3", cropped below the address text) | Susu Malabar, 2026-05-01 |
| `counter-griya` | Inside the Griya shop: "MALABAR" painted on the wall with fruit, teal pillar, staff at work, a customer in a helmet. | 1000×720, 28 KB | https://www.instagram.com/susumalabar/reel/DZWg8irCJf9/ (still at about 0:12, promo sticker cropped off) | Susu Malabar, 2026-06-09 |
| `counter-griya-wide` | The Griya counter at night: "PICK UP HERE" sign, the wall lettering, customers from behind. | 1280×525, 23 KB | same reel (still at about 0:31) | Susu Malabar, 2026-06-09 |
| `staff-griya` | A smiling staff member bagging stacked white cups during the Raksu promo. | 1000×720, 21 KB | same reel (still at about 0:30) | Susu Malabar, 2026-06-09 |
| `corndog-fryer` | A potato corndog coming out of the fryer basket. | 1000×720, 59 KB | same reel (still at about 0:21) | Susu Malabar, 2026-06-09 |
| `promo-10k-2026-03` | Promo poster: "PROMO SPESIAL, SELASA-RABU 16-17 Maret 2026, 10K /SEMUA MENU SUSU" (13K crossed out), "berlaku di kedai depan griya dan sayang No.18a". | 1200×1600, 61 KB | https://www.instagram.com/susumalabar/p/DV8q5_2k-m_/ (same poster: https://www.tiktok.com/@malabar.susu/photo/7617855282252958997) | Susu Malabar, 2026-03-16 |
| `promo-rasa-baru-2026-02` | Poster: "RASA BARU!", Almond Malabar 15K and Biscof Malabar 15K, two hands holding white cups against a sky. | 1080×1350, 82 KB | https://www.tiktok.com/@malabar.susu/photo/7610417888171691285 | Susu Malabar, 2026-02-24 |

## Cuts on the site

The page does not use the files above as they are. `npm run photos` cuts them into
`public/assets/photos/` (avif, webp and jpg) from the list in `src/photos.mjs`. A cut is a
crop and a resize, never bigger than its original. Nothing is retouched, sharpened or
generated. The only other change is a plain brightness lift ("levels" in that list) for
pictures that are dark as posted. The two shop fronts were posted under a dark overlay
with the address written on it, so they get the strongest lift.

| Cut | From | Where on the page |
| --- | --- | --- |
| `hero` | `strawberry-milk-2`, whole | First screen, the link-preview card |
| `lid` | `strawberry-milk-topdown`, the lid as a square | The best seller's strip on the menu |
| `corndog` | `corndog-fryer`, a wide strip | Over "Teman minum" on the menu |
| `pickup` | `counter-griya-wide`, left two thirds (the "PICK UP HERE" sign) | "Mau pesan lewat mana?" |
| `toko-griya` | `shop-front-griya`, whole, lifted | The shop "depan Griya" |
| `toko-ikopin` | `shop-front-ikopin`, whole, lifted | The shop "depan Ikopin" |
| `bungkus` | `staff-griya`, whole | Over the pre-order form |
| `kedai` | `counter-griya`, whole | The story |

Not on the page: `strawberry-milk-1` (too soft to show large), the two promo posters (old
promos, and one names prices the owner has not confirmed), and a front of the shop "depan
MST" (the only photo has faces covered with squares, so that shop shows none).

## Reference only (in `docs/reference/`, not for the site)

| File | What it is | Source |
| --- | --- | --- |
| `instagram-grid.png` | Screenshot of the profile while logged out: bio, 4 highlight covers, 12 posts (2 of them are collabs posted by other accounts). | https://www.instagram.com/susumalabar/ |
| `tiktok-grid.jpg` | The covers of all 31 TikTok posts, newest first, put side by side by us. Not a screenshot: the profile page showed a captcha to the headless browser and the screenshot tool timed out. | https://www.tiktok.com/@malabar.susu |
| `menu-tenant-mahasiswa-baru-2026.jpg` | The Linktree profile picture: a cropped menu "MENU TENANT MAHASISWA BARU 2026" (dark green, chalk doodles, every drink 20.000, includes "Kurma Malabar"). An event menu, so its prices were not used. | https://linktr.ee/malabar.milkbar |
| `logo-badge-ig-profile-150.jpg` | Instagram profile picture: the badge in black and white, as on the cups. Only 150 px is public. | https://www.instagram.com/susumalabar/ |
| `sticker-real-milk-real-fruit.png` | A second mark used on 2026 posters and cups: a white round sticker "susu malabar / real milk.real fruit" with a fruit drawing (banana on a yellow dot here, other fruit on other cups). Too small to ship (about 120 px in the source). | crop of https://www.instagram.com/susumalabar/p/DV8q5_2k-m_/ |
| `ig-outlets-2026-05.jpg` | The "Kami ada di mana?" carousel: the 4 outlets with addresses. | https://www.instagram.com/susumalabar/p/DXyiFmXE9cj/ |
| `ig-7-tahun-2026-04.jpg` | "7 TAHUN KAMI ADA UNTUK KAMU DI JATINANGOR" and the 2019 illustration. | https://www.instagram.com/susumalabar/p/DXMDxQwEtEs/ |
| `griya-counter-posters-frame.jpg` | A video still showing the promo and menu posters on the counter. | https://www.instagram.com/susumalabar/reel/DZWg8irCJf9/ |
| `maps-toko-susu-malabar-cikeruh.jpg` | Google Maps listing "Toko Susu Malabar, Jatinangor": Jl. Kolonel Achmad Syam No.27, Cikeruh, 4,9 (172), phone 0889-7147-7700. The customer photo at the top was cropped off. | https://www.google.com/maps/place/?q=place_id:ChIJaVC8vazFaC4RZG_BtFow734 |
| `maps-susu-malabar-sayang.jpg` | Google Maps listing "SUSU MALABAR", Sayang, 4,9 (110), by Griya on the main road. The customer photo at the top was cropped off. | https://maps.app.goo.gl/My2KHVXut6Hfn3196 |

## Looked at, not shipped

- Instagram "Outlet 1" photo (Jl. Kolonel Achmad Syam No. 18A, in front of MST): the shop
  blurred the customers' faces with big squares and put the address over the banner.
- Instagram "Outlet 4" (Jl. Teuku Umar, Bandung): not on the site, and Google Maps lists
  "Susu Malabar - Dipatiukur" on Jl. Teuku Umar as permanently closed.
- Seasonal posts (Idul Adha, Idul Fitri, Ramadan countdown), the "7 tahun" graphics.
- Posts about the milk supplier and cows: IG reel DXtOAjjE8t1, TikTok 7605832416908823815,
  7599192932855450887, 7634076551168003349. Kept out on purpose (no farm on the site).
- The "kenalan" reel (IG DXUAbFlzx5i): a collage of old photos of people.
- Collab posts shown on the profile but posted by @sevillarprod and @mcsfhunpad.
- Most TikTok videos: 576 px wide with text over them.
- Instagram highlights (DELIVERY, MENU, Locations): need a login, not opened.
- Customer photos on Google Maps: not downloaded.
- GoFood store page: a captcha both in the headless browser and the preview browser, not passed.
