# Drop shop photos here

Originals go in this folder. Any size, any format, straight off a phone or
saved from the Facebook page. Nothing here is served to visitors — it's the
source pile.

Then run, from the project root:

```
php tools/lookbook.php
```

That writes optimised copies to `public/images/lookbook/` and prints a ready
LOOKBOOK array to paste into `resources/js/Pages/Storefront/Home.jsx`.

## Before you paste

The script guesses `alt` and `caption` from the filename. **Rewrite both.**
`alt` is what a screen reader announces and what shows if the image fails;
"Test Tall" tells a visitor nothing.

Name files descriptively and most of that work disappears —
`kickflip-daraga-plaza.jpg` beats `IMG_20250824_113045.jpg`.

## Two things worth knowing

- The script strips EXIF, which includes **GPS coordinates**. Phone photos
  taken at the shop carry its exact location; publishing those is not
  something to do by accident.
- Keep a **mix of tall, square and wide** shots. The varied heights are what
  make the masonry grid stagger — nine photos of identical ratio render as a
  plain boring grid.

## Permission

These are the client's photos. Fine to use on the client's own site, but if
any shot was taken by someone else (a photographer, a customer's repost),
check before it ships.
