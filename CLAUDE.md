# CLAUDE.md — Syndicate IMS Project Context

## What this project is
A **Web-Based Retail Management System with Interactive 3D Product Visualization and Inventory Monitoring** for an apparel + skateboarding shop (**Syndicate Supply Co.**), Legazpi, Philippines. This is a college capstone project (STI College Legazpi, BS Information Technology). I am a freelance/full-stack developer building this for the student group.

## Who I am
Laravel developer. I'm building the whole system from scratch. Prefer Laravel/PHP for the backend — it's my strength. The student group confirmed the tech stack is a free choice (their paper says JS, but "free naman palitan" / swappable), so we are NOT bound to the JS stack in their proposal.

## Chosen stack (LOCKED)
- **Backend/framework:** Laravel 9 (9.52.22) — PHP
- **Frontend:** React via **Inertia.js** (installed through Laravel Breeze, React variant)
- **Build tool:** Vite (ships with Laravel/Breeze)
- **Styling:** Tailwind CSS
- **3D:** Three.js + @react-three/fiber + @react-three/drei
- **3D models:** PROVIDED BY THE CLIENT. The student group already has the 3D models (from their existing "Skateboard Studio" demo). I do NOT model from scratch in Blender — my job is to INTEGRATE their supplied models into the system. Expect .glb/.gltf assets from them; if they send another format, convert to .glb for web. (Blender only needed for minor cleanup/format conversion, not full modeling.)
- **Database:** MySQL (database name: `syndicate_ims`, user `root`, no password — XAMPP local)
- **Auth/roles:** Laravel Breeze + a `role` column on users (customer / staff / admin)
- **Payments:** PayMongo (PHP SDK) — **TEST/sandbox mode, DEPLOYED (LOCKED DECISION).** GCash QR checkout using PayMongo test API keys. The system WILL be deployed online with a live URL, but payments stay in test mode — real GCash QR flow shows, but transactions are fake/sandbox. NO real money is processed. This is the chosen approach: it's free, legal, fulfills the proposal's "GCash QR payment" objective, and looks legit to the defense panel because it's a genuine gateway integration (not a faked status-change). If the shop ever wants real live payments, that requires the SHOP OWNER to register their own PayMongo business account (DTI/SEC docs + KYC) and provide live keys — NOT the developer's account. That is out of scope for the capstone; only a key swap would be needed later.
- **Realtime stock (optional/later):** Laravel Reverb

## Environment
- Windows + XAMPP. Project lives at `C:\xampp\htdocs\syndicate-ims`.
- IMPORTANT: run Laravel via `php artisan serve` (localhost:8000) + `npm run dev` (Vite). Do NOT serve through XAMPP Apache. XAMPP is only used for MySQL.
- PHP 8.x, Composer, Node 18+, MySQL all installed.

## Core objectives the system must hit (from the proposal)
1. Interactive 3D product visualization — view apparel + assemble skateboard components (deck, trucks, wheels, bearings, grip tape, hardware) before purchase; 360° rotation + zoom.
2. Product customization/preview — clothing combos + compatible skateboard setups; color pickers, patterns, custom text/graphics.
3. Automated inventory monitoring — stock syncs INSTANTLY after every completed transaction (do this atomically in a DB transaction).
4. Restocking/low-stock notification for admins at a critical threshold.
5. Online checkout with GCash QR (PayMongo).
6. Centralized product management module (listings, pricing, stock, orders).
7. Role-based access control (customer / staff / admin).
8. Reporting — inventory summaries, order details, sales; printable.
9. Responsive web interface (desktop + mobile browsers). No native mobile app.
10. Transaction history for admins.

## Explicitly OUT of scope
No native mobile app, no AR/virtual fitting, no AI/demand forecasting, no courier/logistics integration, no payment methods other than GCash (via PayMongo).

## Build order (priority — DO NOT jump straight to 3D)
The 3D is the flashy part but the RISK is a half-baked management system at defense. Build the backbone first.
- **Phase 1:** Data layer — models + migrations: Product, ProductVariant (size/color/stock), SkateboardComponent (type, name, price, stock, glb_path), Order, OrderItem. Add `role` to users.
- **Phase 2:** Role-based access (role column + middleware gating admin routes).
- **Phase 3:** Product management (admin CRUD).
- **Phase 4:** Customer storefront — browse, cart, checkout; inventory auto-decrements on completed order (atomic DB transaction).
- **Phase 5:** 3D customizer — React Three Fiber, load the CLIENT-PROVIDED .glb boards, color/component pickers (mirrors the group's existing "Skateboard Studio" demo). Integration work, not modeling.
- **Phase 6:** PayMongo TEST-MODE checkout (deployed), reports, low-stock alerts, transaction history.

## Notes / reminders
- The group already has a working Three.js "Skateboard Studio" customizer demo (ran on Vite localhost:5173) AND already has the 3D models. My job is to INTEGRATE their supplied models, not build them. Get the actual model files (.glb/.gltf ideally) + the list of which boards/components they cover.
- Deployment: the system will be DEPLOYED ONLINE (live URL) with PayMongo in TEST mode. Need a Laravel-capable host (e.g. Railway, Hostinger, or a VPS). Keep 3D scope tight so it doesn't starve the inventory/order modules.
- The group must update their paper's Technical Background + Table 6.0 to say Laravel/PHP (currently contradicts itself: Table says PHP, write-up says Node.js). Panel compares doc vs. live system.

## Coding conventions
- Laravel 9 structure (has app/Http/Kernel.php — middleware registered there, NOT the Laravel 11 style).
- Use `php artisan make:model X -mcr` to scaffold model + migration + controller together.
- Eloquent + form request validation. Keep inventory decrement logic inside DB transactions.
