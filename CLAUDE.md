# CLAUDE.md — Syndicate IMS

## Current state — KEEP THIS UPDATED
This is the only section that goes stale. Everything below it is stable intent.

- **Phase: 1 (data layer), not started.** Only the 4 default Laravel migrations exist. `app/Models/` has just `User.php`. No `role` column yet.
- **Breeze / Inertia / React / Tailwind: NOT INSTALLED.** `composer.json` has no `laravel/breeze` or `inertiajs/inertia-laravel`; `package.json` is the stock Laravel skeleton. Do not write Inertia responses or `.jsx` until this is done.
- **DB works.** `syndicate_ims` exists, `php artisan migrate` runs clean.
- **Git:** live at `github.com/nixthephdev/syndicate-ims` (private), branch `main`.
- **3D:** raw client `.glb` files on disk but git-ignored and uncompressed. Nothing integrated.

## What this project is
Web-Based Retail Management System with Interactive 3D Product Visualization and Inventory Monitoring, for **Syndicate Supply Co.** — an apparel + skateboarding shop in Legazpi, Philippines. College capstone (STI College Legazpi, BSIT). I'm the freelance full-stack dev building it for the student group; they are the client.

## Environment — exact versions, not "8.x"
| | |
|---|---|
| PHP | **8.0.30** (EOL since Nov 2023) |
| Laravel | 9.52.22 |
| Node | 22.16.0 |
| MySQL | via XAMPP, `root`, no password |
| DB name | `syndicate_ims` |
| OS | Windows 10 + XAMPP |

**PHP 8.0 constrains us:** no enums, no readonly properties, no `never` return type. Use class constants for `role` and order status instead of enums. Blocks Laravel 10+.

Run it:
```
php artisan serve     # http://localhost:8000
npm run dev           # Vite, :5173
```
**Do NOT serve through XAMPP Apache.** XAMPP is only for MySQL.

## Stack — LOCKED
- **Backend:** Laravel 9 + PHP
- **Frontend:** React via Inertia.js, installed through Laravel Breeze (React variant) — *pending*
- **Build:** Vite · **Styling:** Tailwind
- **3D:** Three.js + @react-three/fiber + @react-three/drei
- **Auth/roles:** Breeze + `role` column on users (customer / staff / admin)
- **Payments:** PayMongo, **test keys only**, GCash QR. Deployed live but no real money. Live keys would be the shop owner's own business account — out of scope. See DECISIONS.md.
- **Realtime:** none. ~~Laravel Reverb~~ requires Laravel 11 + PHP 8.2 — **impossible on this stack.** If live stock updates are needed, poll or use Pusher's free tier.

## Conventions — LOCKED
- **Money: integer centavos.** Columns named `*_centavos`, type `unsignedBigInteger`. Never float, never `decimal`. PayMongo's API takes centavos, so this avoids a conversion layer and float drift. Format for display only.
- **Timezone:** `Asia/Manila` (`APP_TIMEZONE` in `.env`, wired into `config/app.php`). Reports are for a PH shop — UTC would be 8 hours off.
- Laravel 9 structure: middleware registers in `app/Http/Kernel.php`, *not* the Laravel 11 style.
- Eloquent + Form Request validation. Scaffold with `php artisan make:model X -mcr`.
- **All inventory writes go inside `DB::transaction()`**, with the stock re-checked *inside* the transaction.

## Open decisions — ASK ME, don't assume
1. **When does stock decrement?** On order placed, or on PayMongo webhook confirming payment? This defines all of Phase 4. *Recommended:* decrement on payment confirmed; cart does not reserve stock; re-check availability inside the transaction and fail gracefully if another shopper won the race.
2. **Upgrade XAMPP's PHP to 8.2?** Laravel 9 supports it, and it would unlock enums. Cheap now, annoying mid-build.
3. **Apparel in 3D — get models, or downscope to 2D images?** See the asset gap below.

## Core objectives (from the proposal)
1. Interactive 3D product visualization — apparel + skateboard assembly; 360° rotate + zoom.
2. Product customization/preview — color pickers, patterns, custom text/graphics. **⚠ see asset gap**
3. Automated inventory monitoring — stock syncs instantly on completed transaction, atomically.
4. Low-stock/restock notification for admins at a critical threshold.
5. Online checkout with GCash QR (PayMongo).
6. Centralized product management (listings, pricing, stock, orders).
7. Role-based access control (customer / staff / admin).
8. Reporting — inventory summaries, order details, sales; printable.
9. Responsive web (desktop + mobile browsers). No native app.
10. Transaction history for admins.

**Out of scope:** native mobile app, AR/virtual fitting, AI/demand forecasting, courier integration, any payment method other than GCash via PayMongo.

## Build order — DO NOT jump to 3D
3D is the flashy part; the *risk* is a half-baked management system at defense. Backbone first.

1. **Data layer** — Product, ProductVariant (size/color/stock), SkateboardComponent, Order, OrderItem. Add `role` to users.
2. **Role-based access** — middleware gating admin routes.
3. **Product management** — admin CRUD.
4. **Storefront** — browse, cart, checkout; atomic stock decrement.
5. **3D customizer** — R3F, client-supplied models. Integration, not modeling.
6. **PayMongo test checkout, reports, low-stock alerts, transaction history.**

## 3D asset reality — read before touching Phase 5
Full inventory in [public/models/README.md](public/models/README.md). The short version:

**Two files only** (git-ignored, raw, at `public/Skate/Skate/public/`):
- `board.glb` — **61.7 MB** — 14 pre-textured board meshes matched *by mesh name* (`abstract`, `clash`, `moon`, `neonpalmtree`, `ogre`, `spicy`, `tiedye`, `syndicate{BLACK,BLUE,GREEN,PURPLE,RED,WHITE,YELLOW}`), plus objects `Bolts` and `Trucks`.
- `wheels.glb` — **74.6 MB** — 18 wheel variants as `<name>1`/`<name>2` pairs: `{bb,eye,star}{BLUE,GREEN,PURPLE,RED,WHITE,YELLOW}`.

Consequences — these are facts, not opinions:
- **Customization is mesh-visibility toggling over baked variants**, not free assembly with arbitrary colors. The boards are baked textures.
- `SkateboardComponent` needs **`glb_file` + `mesh_name`**, not a single `glb_path`.
- **No bearings.** No separately swappable grip tape (grip is only a roughness tweak on meshes named `grip`/`tape`/`top`/`sand`).
- **No apparel models at all** — objective 1 promises apparel in 3D. Open decision #3.
- **Objective 2's "custom text/graphics" has zero asset support.** Decals on baked-texture boards is real work. Flag or cut.
- **136 MB is unshippable.** Must be Draco/meshopt compressed (`gltf-transform`, `gltfpack`) to single-digit MB before Phase 5. Highest technical risk in the project.
- Raw `.glb` are **not in git** — back them up outside the project or they're gone.
- Reference loader: `public/Skate/Skate/main.js` (loads root-absolute `/board.glb`, `/wheels.glb`).

## Housekeeping owed
- Move `public/Skate/` demo source out of the web root (reference only, shouldn't be publicly served).
- `public/files/` holds the group's capstone paper PDF **inside the web root** — move it out before deploying.
- The group must fix their paper: Technical Background says Node.js, Table 6.0 says PHP. It's Laravel/PHP. The panel compares doc against live system.

## Deployment
Live URL, PayMongo in test mode. Needs a Laravel-capable host (Railway, Hostinger, VPS). Keep 3D scope tight so it doesn't starve the inventory/order modules.
