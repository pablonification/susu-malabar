# Susu Malabar Jatinangor

Website for Susu Malabar, the fresh-milk shop in Jatinangor: the menu, the three shops, and a
pre-order form that sends the order to the shop on WhatsApp.

## Run it

Needs Node 22 or newer.

```sh
npm install      # only needed for screenshots
npm run dev      # http://localhost:4321, rebuilt on every page load
npm run build    # static files into dist/
npm test         # the order form's logic
```

## Before launch

Everything not yet confirmed with the owner is in `src/data.mjs`, wrapped in `tbc()`, and shows
on the page with a mark. List them with:

```sh
grep -n "tbc(" src/data.mjs
```
