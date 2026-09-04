# Part thumbnails

54 real renders — 14 decks + 18 wheel variants + Trucks/Bolts each in all 11
real hardware colours (22) — used by `/parts`
(`PartController::card()`/`imageUrl()`, `Pages/Storefront/Parts/Index.jsx`).
Not photography: these are the actual baked textures/geometry inside
`board.glb`/`wheels.glb`, the same graphics `/customize`'s 3D viewer shows,
rendered once from a fixed angle and saved as flat images.

## Naming

Decks/Wheels: `{prefix}-{mesh_name}.png` — `board-abstract.png`,
`wheels-bbBLUE.png`. `prefix` is `board` for anything on `board.glb` or
`wheels` for `wheels.glb`. `mesh_name` is copied verbatim, case included,
from `SkateboardComponentSeeder` — it's the same load-bearing, typo-fragile
identifier the 3D customizer itself keys off, so the path is computed from
`glb_file` + `mesh_name` at request time (`PartController::imageUrl()`),
never stored as its own column. A missing file just means `file_exists()`
returns false and the card falls back to its placeholder block — nothing
breaks if one is missing.

Trucks/Bolts: `board-{mesh_name}-{hex}.png` — `board-Trucks-e7312f.png` —
one per swatch in `Components/Customizer/hardwareColors.js` (11 colours ×
2 parts = 22 files, no plain uncoloured version; the default shown on page
load is `#2b2b2b`, i.e. `board-Trucks-2b2b2b.png`, matching `/customize`'s
own `DEFAULT_HARDWARE_COLOR`). `hex` is the swatch's hex value with the `#`
stripped and lowercased. Computed **client-side**, not by `PartController` —
`Parts/Index.jsx` builds the path itself from `hardwareColors.js`'s own list
so there's only one real source of truth for which colours exist, not a
second PHP copy that could drift from it. See CLAUDE.md's Current state for
why this is preview-only (doesn't change what ships) and why that had to be
an explicit client decision, not an assumption.

**Trucks and Bolts each show TWO clusters, diagonally spread — that's
correct, not a bad crop.** Unlike a deck (one mesh, one graphic) or a wheel
option (two disconnected `<key>1`/`<key>2` nodes that CAN be isolated one at
a time — see below), `Board.jsx`'s `Trucks`/`Bolts` are each a single mesh
whose geometry bakes BOTH the front and rear copies into one buffer — there
is no finer node to select, confirmed by dumping every mesh name under
`getObjectByName('Trucks')` and finding exactly one. Trying to crop to just
one of the two would misrepresent the product: buying "Standard Trucks"
gets you both, same as any real skate shop's trucks listing. Fitting the
image tightly to the combined bounding box (what `AutoFitCamera` already
does with no `focusName`) is the actual correct tightest crop here — the
visible empty space between the two clusters is inherent to the object's
real shape, not something a smarter crop could remove.

## How to regenerate (e.g. if the client ever sends new .glb files)

There's no kept script for this — same call as `public/models/README.md`
makes for the compression pipeline: worth documenting the approach in full,
not worth carrying a throwaway harness in the repo permanently. Rebuild it
like this:

1. Add a temporary Inertia page + route that renders
   `Components/Customizer/Scene.jsx` with `deckMeshName`/`wheelsMeshName` set
   to exactly one part (the other left `null` — `Board.jsx`/`Wheels.jsx`
   already hide everything else when a slot is `null`, confirmed by reading
   both; for Trucks/Bolts leave BOTH `null`, since they're always-on
   "core" meshes never toggled by either), plus `transparentBackground`,
   `autoFit`, and an `autoFitFocusName` of `${meshName}1` for wheels or
   plain `meshName` for Trucks/Bolts (`null` for decks — see below).
   **`AutoFitCamera.jsx` already exists in the repo**
   (`Components/Customizer/AutoFitCamera.jsx`) — it's inert unless a caller
   passes `autoFit`, so it was left in rather than deleted with the rest of
   the one-off harness. Read its docblock before touching it: it explains
   why a naive bounding-box-diagonal fit overshoots badly for a long thin
   deck, why wheels need `autoFitFocusName` (the 18 wheel options are each
   TWO disconnected axle groups — front and rear, at their real mounted
   positions — and fitting both at once leaves a mostly empty frame), and
   why `Scene.jsx` skips mounting `OrbitControls` entirely when `autoFit` is
   on (it recomputes camera position every frame off its own internal state
   regardless of its `enabled` prop, so merely disabling it isn't enough —
   it has to not be mounted).
2. For Trucks/Bolts, the harness controller also needs to read a `?color=`
   query param and pass it through as `boltsColor`/`trucksColor` (whichever
   matches the mesh being captured, `null` for the other) — the exact same
   prop `/customize`'s `ColorSwatchPicker` already drives on `Scene`, so no
   new recolor logic, just plumbing the hex through. Loop the capture over
   `Components/Customizer/hardwareColors.js`'s `HARDWARE_COLORS` (11).
3. Temporary Puppeteer install (`npm install --no-save puppeteer`, same
   pattern as every other verification in this project), navigate to each
   part's URL (decks/wheels: no `color`; Trucks/Bolts: once per swatch hex),
   screenshot the `<canvas>` element with `omitBackground: true`. Real mesh
   names: `SkateboardComponentSeeder`'s `DECKS` keys (14), the
   `WHEEL_SERIES` × `WHEEL_COLORS` cross product (18), and `Trucks`/`Bolts`.
4. `magick <raw> -trim +repage -resize 900x900> <out>.png` per shot — trims
   the transparent margin, caps file size. Don't try to crop Trucks/Bolts
   any tighter than that — see the note above on why the gap is real.
5. Delete the temporary page/route/Puppeteer install again once done — same
   "build tooling, use it, remove it, keep the output" rule as everywhere
   else 3D verification has happened in this project.
