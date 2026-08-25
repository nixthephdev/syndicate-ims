# 3D models

**Compressed and integrated** — `board.glb` (2.46 MB) and `wheels.glb`
(6.51 MB) live in this directory and are committed. Served to the browser at
`/models/board.glb` / `/models/wheels.glb` by `Components/Customizer/{Board,Wheels}.jsx`
on the `/customize` page.

## How they were compressed (61.7 MB + 74.6 MB → 8.6 MB combined)

`@gltf-transform/cli`'s own `resize`/`webp` commands **crash on Windows** —
they route texture processing through `sharp`, and every sharp/vips build
tested (including the exact `~0.34.5` version gltf-transform itself pins)
throws `colourspace: parameter space not set` on every texture in both
files. Root cause not fully diagnosed; not worth more time chasing given a
working alternative existed.

Actual pipeline used — ImageMagick (already relied on elsewhere in this
project, e.g. the logo/favicon pipeline) does the pixel work, gltf-transform
only does container-level glTF work:

1. A small Node script (`@gltf-transform/core`'s `NodeIO`) reads every
   texture's raw image bytes out of the `.glb`, shells out to
   `magick <in> -resize 1024x1024> -quality 82 <out>.webp` per texture
   (`>` = only shrink, never upscale), then splices the WebP bytes back in
   via `texture.setImage(bytes).setMimeType('image/webp')`.
2. `gltf-transform draco <in> <out>` compresses geometry — this step never
   touched images, so it was unaffected by the sharp bug.

Every named mesh survived — verified with a script that reads the
compressed file back and confirms all 16 board.glb names (14 decks +
Bolts + Trucks) and all 36 wheels.glb names (18 pairs × 2) are still
present before the files were treated as done.

**Known accepted trade-off:** a few textures ended up with non-power-of-two
dimensions (e.g. 461×1024) because the resize preserves aspect ratio. The
official glTF validator flags this as an error — it's a legacy WebGL1
mipmapping rule with no effect on Three.js/WebGL2 rendering. Not fixed,
because fixing it (padding or cropping to exact POT) only satisfies the
validator, not anything a browser actually needs.

## Real assets, only reachable by loading them

**The two files each pack more than one graphic per mesh.** Every deck's
glTF node contains ONE mesh with TWO primitives — griptape (generic, shared
material across all 14 decks) and the printed graphic (the actual per-deck
texture). Viewed from above, every deck looks identical (you're looking at
griptape); the graphic is on the underside. `Scene.jsx`'s default camera
position accounts for this — it deliberately looks up from below, exactly
like the reference demo's own hardcoded board-selection camera did
(`Vector3(-18.3, -509.0, -21.9)`, negative Y). This was only discovered by
actually rendering the model in a browser and comparing decks side by side
— every deck rendered identically until the camera was fixed. Automated
tests could not have caught this; there is no JS test runner in this
project and the bug was purely visual.

## What's inside the two files

`board.glb` — 14 pre-textured board meshes, matched by mesh name:

```
abstract   clash   moon   neonpalmtree   ogre   spicy   tiedye
syndicateBLACK  syndicateBLUE  syndicateGREEN  syndicatePURPLE
syndicateRED    syndicateWHITE syndicateYELLOW
```

plus objects named `Bolts` and `Trucks`.

`wheels.glb` — 18 wheel variants, each a `<name>1` / `<name>2` pair:

```
bb{BLUE,GREEN,PURPLE,RED,WHITE,YELLOW}
eye{BLUE,GREEN,PURPLE,RED,WHITE,YELLOW}
star{BLUE,GREEN,PURPLE,RED,WHITE,YELLOW}
```

No bearings. No separately swappable grip tape (grip is just a roughness tweak
on meshes whose name contains `grip`/`tape`/`top`/`sand`). **No apparel models
at all.**

Customization is therefore *mesh visibility toggling over baked variants*, not
free assembly with arbitrary colors. `SkateboardComponent` needs
`glb_file` + `mesh_name`, not a single `glb_path` — and that's exactly what's
seeded (see `SkateboardComponentSeeder`).

Reference implementation: `reference/skate-demo/main.js` (loads from
root-absolute `/board.glb` and `/wheels.glb`). Still runs standalone:
`cd reference/skate-demo && npm install && npx vite`. The real integration
translating this into React Three Fiber is
`resources/js/Components/Customizer/{Scene,Board,Wheels}.jsx`.

## If the raw source files are ever needed again

They were git-ignored and are **not recoverable from git** — the group's
originals must be backed up outside the project (Drive / external disk) if
that hasn't already happened. Last known location before compression:
`reference/skate-demo/public/board.glb` (61.7 MB), `.../wheels.glb` (74.6 MB).
