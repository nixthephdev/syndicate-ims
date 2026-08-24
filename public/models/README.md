# 3D models

Raw `.glb` files are **git-ignored** and are not in this repo. This directory is
where the web-ready (compressed) models belong once they exist.

## Where the raw assets live

Supplied by the student group, currently at:

```
reference/skate-demo/public/board.glb     61.7 MB
reference/skate-demo/public/wheels.glb    74.6 MB
```

Keep a backup outside the project (Drive / external disk). They are not
recoverable from git.

## Why they aren't committed

- 136 MB of blobs in git history is permanent — slimming it later needs a
  history rewrite and force-push.
- Git LFS on a free account allows 1 GB bandwidth/month; each clone would
  spend 136 MB of it.
- More importantly, **136 MB is not shippable.** A shopper on mobile data
  would download it before seeing a single board. This must be compressed
  (Draco or meshopt via `gltf-transform` / `gltfpack`) before Phase 5.
  Target: single-digit MB.

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
`glb_file` + `mesh_name`, not a single `glb_path`.

Reference implementation: `reference/skate-demo/main.js` (loads from
root-absolute `/board.glb` and `/wheels.glb`). Still runs standalone:
`cd reference/skate-demo && npm install && npx vite`.
