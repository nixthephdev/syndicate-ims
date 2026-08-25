# CLAUDE.md — Syndicate IMS

## Current state — KEEP THIS UPDATED
This is the only section that goes stale. Everything below it is stable intent.

- **Phases 1 (data layer), 2 (RBAC), and a first slice of 3 (admin product management): DONE.** Product CRUD with inline variant management (stock, price override, low-stock threshold) is live at `/admin`, gated by `role:staff`.
- **Phase 4 (storefront: catalogue, cart, checkout): DONE.** `/shop` → `/shop/{slug}` → session cart → `/checkout` → order → payment confirmation. **`InventoryService` is now actually reachable from the running app** — before this it was called by nothing but its own tests.
- **⚠ Payment is a STUB.** `Shop\PaymentController::confirm` marks an order paid and calls `InventoryService`. It is the seam PayMongo's webhook will replace in Phase 6, and it **404s outside local/testing** (pinned by a test) — a route that marks orders paid for free must never be live. Everything downstream of `commitForPaidOrder()` is final; only the trigger is fake.
- **Admin order management: DONE.** `/admin/orders` (status tabs, search, paginated) and `/admin/orders/{order_number}`. Dashboard now leads with revenue and the two queues that need action, plus the five most recent orders. Objectives 6 and 10.
- **Order status transitions are deliberately narrow** — `Admin\OrderStatusController` allows exactly `paid → fulfilled` and `awaiting_payment → cancelled`. **Cancelling a PAID order is refused**, and there are tests pinning it: that needs stock putting back and money refunding, and `InventoryService` has no inverse on purpose. Build a real refund/restock path with its own audit trail before widening this.
- **Not yet built in Phase 3:** SkateboardComponent admin CRUD (only seeded via the seeder, no UI), reports.
- **No product image upload in the admin.** `Product::image_path` is populated by the seeder pointing at `public/images/lookbook/`. Any product created through the admin UI will have no image and renders a grey category block.
- **Breeze + Inertia + React + Tailwind: INSTALLED and verified.** Breeze v1.19.2, Inertia 0.6.3, Ziggy.
- **Storefront landing page: BUILT.** `/` (route name `home`) now renders `Pages/Storefront/Home.jsx` instead of Breeze's `Welcome` — dark/volt skate-brand look, hero, marquee, masonry lookbook using the client's real photography. Nav's Shop, Orders and cart entries are live; **Customize is still a dimmed "soon" chip** and lights up on its own via `route().has()` when Phase 5 registers that route.
- **Tests: 98 passing** (`php artisan test`), including `assertInertia()` checks on every new admin page and on the storefront home — these verify the actual component name and props Laravel returns, the closest thing to a browser check available without one.
- **DB works.** `syndicate_ims` (dev, seeded) and `syndicate_ims_test` (tests) both exist.
- **Seeded logins** (password `password`): `admin@syndicate.test`, `staff@syndicate.test`, `customer@syndicate.test`. Staff/admin land straight in `/admin` after login; "View the shop" in the sidebar footer takes them to the storefront.
- **Admin UI direction is locked** (see Design section below): dark sidebar + light content, one blue accent, light mode only. The sidebar is grouped (Overview / Catalogue / Sales) with icons, and is an **off-canvas drawer below `lg`, static from `lg` up** — the earlier version was a plain `w-60` flex child that ate 240px of a phone screen.
- **`/dashboard` routes by role.** Staff/admin are redirected to `/admin`; customers get `Storefront/Account` in the shop's own styling. Breeze's "You're logged in!" page is gone. The route NAME stays `dashboard` because `RouteServiceProvider::HOME` and the auth controllers point at it.
- **Every authenticated page now matches the storefront.** `Profile/Edit` (+ its three partials), `ConfirmPassword`, `VerifyEmail` are all on the dark/volt treatment now. **Breeze's stock `AuthenticatedLayout`, `GuestLayout`, `ApplicationLogo`, `DangerButton`, `SecondaryButton`, `Modal`, `Checkbox` were deleted** — confirmed orphaned (grepped, zero remaining imports) before removal, not just unused-looking. `TextInput`/`InputLabel`/`InputError`/`PrimaryButton` remain, but are now used **only by the admin** (Products Create/Edit) — which is exactly the invariant the separate `volt`/`brand` tokens exist for, now true by construction rather than by convention. Storefront destructive actions use the new `Components/Storefront/{DangerButton,GhostButton,Modal}`.
- **Git:** live at `github.com/nixthephdev/syndicate-ims` (private), branch `main`.
- **3D:** raw client `.glb` files on disk but git-ignored and uncompressed. Nothing integrated.

## What this project is
Web-Based Retail Management System with Interactive 3D Product Visualization and Inventory Monitoring, for **Syndicate Supply Co.** — an apparel + skateboarding shop in Legazpi, Philippines.

**Three branches, confirmed by the client (2026-08-25):**
- **Purok 1, Tagas, Daraga, 4501 Albay — the MAIN branch** (address from the shop's own Google Maps listing, "Syndicate Supply Co. (Branch 1)"). This is why their Facebook page is titled "Syndicate Supply Co. | Daraga" — an earlier note in this file called that title "likely stale," assuming it contradicted two Legazpi-only addresses. It was correct all along; the assumption was wrong for not accounting for a third, unlisted branch.
- Brgy. 33 PNR, Peñaranda St., Legazpi City
- Pagasa, Rawis, Legazpi City

All three are in the storefront footer, Tagas marked "Main branch," with a
`tel:` link for **0948 211 3209** (from the same Google listing as the
address, sitting under Tagas only — not confirmed to also reach Peñaranda or
Rawis, so it is not presented as a shop-wide number).

**Hours are still NOT on the site.** The Google listing showed only "Closes
8 PM" with the opening time hidden behind a collapsed dropdown in the
screenshot — publishing a schedule from a half-known closing time is the
same mistake as the invented hours already removed once. Get the full
opening–closing range before adding anything. Same standing rule: never
invent an address, phone number or hours that weren't actually given.

College capstone (STI College Legazpi, BSIT). I'm the freelance full-stack dev building it for the student group; they are the client.

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
- **Frontend:** React via Inertia.js, installed through Laravel Breeze (React variant)
- **Build:** Vite · **Styling:** Tailwind
- **3D:** Three.js + @react-three/fiber + @react-three/drei
- **Auth/roles:** Breeze + `role` column on users (customer / staff / admin)
- **Payments:** PayMongo, **test keys only**, GCash QR. Deployed live but no real money. Live keys would be the shop owner's own business account — out of scope. See DECISIONS.md.
- **Realtime:** none. ~~Laravel Reverb~~ requires Laravel 11 + PHP 8.2 — **impossible on this stack.** If live stock updates are needed, poll or use Pusher's free tier.

## Conventions — LOCKED
- **Money: integer centavos.** Columns named `*_centavos`, type `unsignedBigInteger`. Never float, never `decimal`. PayMongo's API takes centavos, so this avoids a conversion layer and float drift. Format for display only.
- **Timezone:** `Asia/Manila` (`APP_TIMEZONE` in `.env`, wired into `config/app.php`). Reports are for a PH shop — UTC would be 8 hours off.
- **Stock decrements when payment is CONFIRMED**, not when the order is placed. PayMongo webhook → `DB::transaction()` → re-check availability *inside* the transaction → decrement. The cart does **not** reserve stock. If two shoppers race for the last item, the loser gets a graceful checkout failure. No reservations table.
- **No enums** — PHP 8.0. Use class constants for `role` and order status (e.g. `Order::STATUS_PAID`). Also no readonly properties, no `never` return type.
- Laravel 9 structure: middleware registers in `app/Http/Kernel.php`, *not* the Laravel 11 style.
- Eloquent + Form Request validation. Scaffold with `php artisan make:model X -mcr`.
- **All inventory writes go inside `DB::transaction()`**, with the stock re-checked *inside* the transaction.
- **Tests run against `syndicate_ims_test`** (set in `phpunit.xml`), never the dev DB. MySQL not sqlite — the inventory logic depends on real transaction/row-locking behaviour that sqlite doesn't model. `php artisan test`.

## Open decisions — ASK ME, don't assume
1. **Apparel in 3D — get models from the group, or downscope to 2D images?** See the asset gap below. Blocks objective 1 and needs a paper amendment either way.

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

**Two files only** (git-ignored, raw, at `reference/skate-demo/public/`):
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
- Reference loader: `reference/skate-demo/main.js` (loads root-absolute `/board.glb`, `/wheels.glb`). Folder is intact and still runs standalone: `cd reference/skate-demo && npm install && npx vite`.

## Design — admin panel
Two different UI jobs, not one skin:
- **Admin/staff backend** (built): clean utility dashboard, dark sidebar (`bg-gray-900`) + light content, ONE accent — `brand` in `tailwind.config.js`, aliased to Tailwind's blue. Light mode only. Reads as a competent management tool first.
- **Customer storefront** (landing page built): bold, high contrast, skate-brand voice. Near-black ground (`ink` scale), ONE loud accent — `volt` (acid yellow-green `#ccff00`) — and Anton as the display face (`font-display`). `volt` and `brand` are **separate tokens on purpose**: the admin must stay a restrained tool while the shop stays loud, and changing one must never touch the other. Shell is `Layouts/StorefrontLayout.jsx`; it deliberately imports nothing from the admin. If an admin component shows up in a storefront import, the storefront is drifting back into looking like a dashboard.
  - **Lookbook photos are REAL now** — the client's own shots off their Facebook page, no more picsum. Originals in `public/files/images/lookbook-src/`, web copies in `public/images/lookbook/`, wired into `Pages/Storefront/Home.jsx`.
  - **Never hand-edit `src`/`ratio` in the LOOKBOOK array.** Drop new photos in `lookbook-src/` and run `php tools/lookbook.php` — it resizes to 1000px, strips EXIF, backs off quality if a re-encode would grow the file, and prints the array to paste. It strips EXIF because **phone photos carry the shop's GPS coordinates**; publishing those is not something to do by accident.
  - Keep a mix of tall/square/wide — the varied ratios are what make the masonry stagger. Nine identical ratios render as a plain grid.
  - Tiles are **full colour, not grayscale-until-hover**. That was the placeholder-era treatment; the shop sells mint/pink/red apparel shot on Albay beaches, and desaturating it hides the product.
  - `Components/Storefront/LookbookTile.jsx` still falls back to a generated block if an image fails, so a flaky connection at defense won't render broken-image icons.
  - **Storefront-styled auth: Login, Register, ForgotPassword, ResetPassword** (`Layouts/StorefrontAuthLayout.jsx`, split screen with the shop's doorway photo). They use `Components/Storefront/FormControls.jsx` — **not** Breeze's `TextInput`/`PrimaryButton`/`InputLabel`/`Checkbox`, which are shared with the admin product screens and the profile page and must stay light. Never "unify" the two sets; that is the coupling the separate `volt`/`brand` tokens exist to prevent.
  - **Loading states, three layers.** (1) Boot splash — logo + volt bar, markup and *inline* CSS in `app.blade.php`, dismissed by `app.jsx` after first paint. Inline because the compiled stylesheet has not arrived yet; a Tailwind-classed splash flashes unstyled. It is gated on the Inertia component name to customer pages only, pinned by `StorefrontTest::test_boot_splash_shows_on_customer_pages_only` — **the admin gets no brand splash**. Carries a 6s JS failsafe and a `<noscript>` hide so it can never trap a visitor. (2) Inertia's top progress bar, volt, `delay: 250` so fast navigations show nothing. (3) `animate-fade-up` on storefront page content, replayed per visit because Inertia remounts.
  - **The splash is not artificially delayed.** Locally React mounts in ~50ms so you will barely see it; that is correct. To actually watch it, throttle the network in devtools. Do not add a minimum display time — it makes the site slower to look busier.
  - **Still on Breeze's light `GuestLayout`:** ConfirmPassword, VerifyEmail. Both are reachable by logged-in users only, so they don't break the signup/reset journey — but they will look wrong if a customer hits them.

**Why blue, not red or green:** `DangerButton` already owns red for destructive actions (`resources/js/Components/DangerButton.jsx`) — a red brand accent would put "Save" and "Delete" in the same hue next to a delete button. Stock-status badges (`Components/Admin/StockBadge.jsx`) already own red/amber/green for out-of-stock/low/healthy. Blue was free.

The blue was a from-scratch call — no client-supplied palette existed when it was picked. If the group supplies real brand colors later, swap them in `tailwind.config.js`'s `colors.brand` — every admin page reads from that token, nothing is hardcoded per-page.

### Logo — the one real brand asset
Client supplied a white line-art brain + ™ mark. **Source of truth: `public/files/images/logo.jpg`** (960×960 JPEG, mark sits off-center in a large black field). Derived web assets in `public/images/` were generated from it with ImageMagick — regenerate from the source, never from a derivative:

| File | What | Use on |
|---|---|---|
| `logo-mark.png` | brain only, white, transparent | dark surfaces only |
| `logo-mark-dark.png` | brain only, ink, transparent | light surfaces (admin, print) |
| `logo-full.png` | brain + ™, white, transparent | dark surfaces |
| `favicon.ico` (16/32/48) + `images/favicon-*.png` + `apple-touch-icon.png` | ink mark on volt, **background baked in** | browser chrome |

Non-obvious constraints, all learned the hard way:
- **The source is JPEG, so it has no alpha.** Transparency was reconstructed by using the image's own luminance as an alpha mask (`-level 22%,72%` to kill JPEG noise in the black field without eating anti-aliased stroke edges). Dropping the `.jpg` straight into a page puts a black square on the design.
- **Exact geometry in the source — do not re-measure by eye, and never by cropping a percentage of the canvas.** Verified with `-connected-components 8`:
  - brain outline = `435x334+240+313` (spans x 240–675)
  - ™ glyphs = two blobs at x 633–720, y 318–364 — the **T overlaps the brain's x-range**, so cropping the brain's bbox drags in a stray "T". Blacken `rectangle 626,310 726,372` first; that rect provably contains only ™ (2176 white px = T's 669 + M's 1507, zero brain pixels).
  - full mark incl. ™ = `480x334+240+313`
  - A first attempt measured "brain only" by cropping the left 63% of the canvas and trimming. That silently clipped 70px off the right lobe — the crop window truncated the very bbox being measured, and the flat-edged result shipped before it was spotted. Measure with connected-components, then eyeball the render on a dark background.
- **`logo-mark.png` is white — it is INVISIBLE on white.** That is why the dark variant exists. Check the surface before picking one.
- **Favicon backgrounds are baked, not transparent, on purpose:** a transparent white mark vanishes on light browser tab bars.
- **Favicon is ink-on-volt, not the brand's usual white-on-ink** — at 32px it tested as by far the most legible of the three options, and it stays readable on both light and dark browser chrome.
- **At 16px the line-art degrades to a blob** — inherent to strokes this fine; nothing to fix short of a simplified small-size mark. 32px (what modern browsers mostly use) is clean.

## Data layer — the rules that matter
- **The cart (`App\Services\Cart`) is session-backed and reserves NOTHING.** Prices are read live on every render, never cached into the session — a cart can sit for days and charging a stale cookie price is a real bug. Snapshotting happens once, onto `OrderItem`, at checkout. Lines whose variant was archived meanwhile are silently pruned. Anything the cart says about stock is advisory and already stale; `InventoryService` behind its row lock is the only real answer.
- **Cart item types are an allow-list of aliases** (`variant`, `component` → `Cart::PURCHASABLE_TYPES`), never class names from request input. A test pins this.
- **`InventoryService` is the only place ORDER-DRIVEN stock decrements happen.** Nothing in the checkout/payment path may touch a `stock` column except through it — it marks paid and decrements in one transaction, locks each row, re-checks inside the lock, aggregates duplicate lines, and no-ops on a repeat webhook. Admin CRUD (restocking, correcting a count) is a separate, legitimate direct write — see `Admin\ProductVariantController`. The rule is about the *concurrency-sensitive* path, not every write to the column.
- **`role` is NOT in `User::$fillable`** — deliberately. Breeze's `/register` mass-assigns request input, so a fillable `role` would let anyone POST `role=admin` and self-promote. There's a test pinning this (`RoleAssignmentTest`). Assign roles explicitly.
- **Role middleware is hierarchical**: `role:staff` admits staff *and* admin. Unknown roles fail closed.
- **Order lines are polymorphic** (`purchasable` → ProductVariant | SkateboardComponent), and snapshot `name_snapshot` + `unit_price_centavos`. Never render an order from live product records.
- `ProductVariant.price_centavos` is nullable — null means inherit `Product.base_price_centavos`.

## Layout — non-obvious directories
| Path | What | In git? |
|---|---|---|
| `reference/skate-demo/` | The group's original Three.js demo, intact and runnable. Reference only, deliberately outside the web root. | source yes, `.glb` no |
| `public/models/` | Where **compressed** web-ready models will go. Empty but for its README. | yes |
| `docs/client/` | The group's capstone paper + client documents. | no |

## Housekeeping owed
- The group must fix their paper: Technical Background says Node.js, Table 6.0 says PHP. It's Laravel/PHP. The panel compares doc against live system.
- **Back up `reference/skate-demo/public/*.glb` outside the project.** Git-ignored — GitHub is not protecting them.

## Deployment
Live URL, PayMongo in test mode. Needs a Laravel-capable host (Railway, Hostinger, VPS). Keep 3D scope tight so it doesn't starve the inventory/order modules.
