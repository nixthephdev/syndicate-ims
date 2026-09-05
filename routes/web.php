<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\OrderStatusController as AdminOrderStatusController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\ProductVariantController as AdminProductVariantController;
use App\Http\Controllers\Admin\SkateboardComponentController as AdminSkateboardComponentController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\DeployController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Shop\CartController;
use App\Http\Controllers\Shop\CheckoutController;
use App\Http\Controllers\Shop\CustomizeController;
use App\Http\Controllers\Shop\OrderController as ShopOrderController;
use App\Http\Controllers\Shop\PartController;
use App\Http\Controllers\Shop\PaymentController;
use App\Http\Controllers\Shop\PayMongoController;
use App\Http\Controllers\Shop\ProductController as ShopProductController;
use App\Http\Controllers\Webhooks\PayMongoWebhookController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

/*
 * Storefront. Replaces Breeze's stock Welcome page — the customer-facing
 * landing page is a brand surface, not a framework splash.
 *
 * Named 'home' because StoreHeader's nav resolves its links through
 * route().has() / route(): the Customize and cart entries stay dimmed until
 * those routes exist, then light up on their own.
 */
Route::get('/', function () {
    return Inertia::render('Storefront/Home');
})->name('home');

// Address/map/contact + FAQ. Static content, same as `home` above — a plain
// closure, no controller needed until this actually needs a DB query.
Route::get('/contact', function () {
    return Inertia::render('Storefront/Contact');
})->name('contact');

// Breeze's post-login landing (RouteServiceProvider::HOME). Now routes by
// role: staff/admin to the admin panel, customers to their own account page.
// Keep the route NAME `dashboard` — HOME and the auth controllers point at it.
Route::get('/dashboard', [AccountController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

/*
|--------------------------------------------------------------------------
| Storefront — catalogue, cart, checkout
|--------------------------------------------------------------------------
|
| Browsing is open to guests — the catalogue, the cart page, and the 3D
| customizer can all be viewed with no account. The act of ADDING to the
| cart requires sign-in (client requirement, 2026-09-02): a guest clicking
| Quick Add, a product page's Add to Cart, or the customizer's Add to Cart
| is sent to log in first, same as checkout already required.
|
| Nothing in this group writes stock. Orders are created `awaiting_payment`
| and stock moves only when payment is confirmed, through InventoryService.
|
*/
Route::get('/shop', [ShopProductController::class, 'index'])->name('shop.index');
Route::get('/shop/{product:slug}', [ShopProductController::class, 'show'])->name('shop.show');

// Buy a single skateboard part on its own (a deck, just wheels, trucks,
// bolts) — separate from the /customize 3D builder below. Add to Cart here
// posts to the same cart.store as everywhere else; no dedicated POST route.
Route::get('/parts', [PartController::class, 'index'])->name('parts.index');

// The 3D skateboard builder. Route name `customize` is load-bearing — see
// StoreHeader's nav, which lights this chip up the moment the route exists.
Route::get('/customize', [CustomizeController::class, 'index'])->name('customize');

// The cart lives in the session, so the item is identified in the body
// rather than the URL — a cart key contains a class name and a "#".
Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
Route::patch('/cart', [CartController::class, 'update'])->name('cart.update');
Route::delete('/cart', [CartController::class, 'destroy'])->name('cart.destroy');

Route::middleware('auth')->group(function () {
    Route::post('/customize', [CustomizeController::class, 'store'])->name('customize.store');
    Route::post('/cart', [CartController::class, 'store'])->name('cart.store');
});

Route::middleware('auth')->group(function () {
    Route::get('/checkout', [CheckoutController::class, 'create'])->name('checkout.create');
    Route::post('/checkout', [CheckoutController::class, 'store'])->name('checkout.store');

    // Confirmation step — store() no longer creates the order directly, it
    // stashes the validated form and requires this emailed code first. See
    // CheckoutController's docblock.
    Route::get('/checkout/verify', [CheckoutController::class, 'otpCreate'])->name('checkout.otp.create');
    Route::post('/checkout/verify', [CheckoutController::class, 'otpStore'])->name('checkout.otp.store');
    Route::post('/checkout/verify/resend', [CheckoutController::class, 'otpResend'])->name('checkout.otp.resend');

    Route::get('/orders', [ShopOrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/{order_number}', [ShopOrderController::class, 'show'])->name('orders.show');
    Route::post('/orders/{order_number}/cancel', [ShopOrderController::class, 'cancel'])->name('orders.cancel');
    Route::patch('/orders/{order_number}/address', [ShopOrderController::class, 'updateAddress'])->name('orders.address.update');

    // TEMPORARY stand-in — 404s outside local/testing. See PaymentController.
    Route::post('/orders/{order_number}/confirm-payment', [PaymentController::class, 'confirm'])
        ->name('payment.confirm');

    // The real path — reachable everywhere, marks nothing paid itself. Only
    // gets the customer to PayMongo's checkout page; the webhook below is
    // what actually confirms payment. See PayMongoController's docblock.
    Route::post('/orders/{order_number}/pay', [PayMongoController::class, 'create'])
        ->name('payment.paymongo.create');
});

// PayMongo calls this directly — no session, no CSRF token, no auth
// middleware. Its own signature verification (PayMongoWebhookVerifier)
// stands in for all three. See VerifyCsrfToken's $except for the CSRF side
// of this and PayMongoWebhookController's docblock for why.
Route::post('/webhooks/paymongo', [PayMongoWebhookController::class, 'handle'])
    ->name('webhooks.paymongo');

// No SSH on the target host = no way to run `php artisan migrate` there
// directly. Token-gated (see DeployController), not auth-gated — 404s
// entirely when DEPLOY_TOKEN is unset, which it is everywhere this isn't
// actually needed.
Route::get('/deploy/migrate', [DeployController::class, 'migrate'])
    ->name('deploy.migrate');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

/*
|--------------------------------------------------------------------------
| Admin / staff routes
|--------------------------------------------------------------------------
|
| role:staff admits staff AND admin — see EnsureUserHasRole's hierarchy.
| 'verified' matches the pattern the /dashboard route already uses.
|
*/
Route::middleware(['auth', 'verified', 'role:staff'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');

        Route::resource('products', AdminProductController::class)
            ->except(['show']); // No customer-facing product page yet.

        // Edit-only — see Admin\SkateboardComponentController's class
        // docblock for why there's no create/store/destroy here.
        Route::resource('skateboard-components', AdminSkateboardComponentController::class)
            ->only(['index', 'edit', 'update']);

        // Orders are read-only here apart from one narrow status transition —
        // see Admin\OrderStatusController. Staff never write stock directly.
        Route::get('orders', [AdminOrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order_number}', [AdminOrderController::class, 'show'])->name('orders.show');
        Route::patch('orders/{order_number}/status', [AdminOrderStatusController::class, 'update'])
            ->name('orders.status.update');

        Route::post('products/{product}/variants', [AdminProductVariantController::class, 'store'])
            ->name('products.variants.store');
        Route::patch('products/{product}/variants/{variant}', [AdminProductVariantController::class, 'update'])
            ->name('products.variants.update');
        Route::delete('products/{product}/variants/{variant}', [AdminProductVariantController::class, 'destroy'])
            ->name('products.variants.destroy');
    });

// User management is a step above the rest of /admin — role:admin only, so
// staff can run the shop day-to-day without being able to grant themselves
// or anyone else more access.
Route::middleware(['auth', 'verified', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
        Route::patch('users/{user}/role', [AdminUserController::class, 'updateRole'])->name('users.role.update');
        Route::patch('users/{user}/status', [AdminUserController::class, 'updateStatus'])->name('users.status.update');
    });

require __DIR__.'/auth.php';
