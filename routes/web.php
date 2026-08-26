<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\OrderStatusController as AdminOrderStatusController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\ProductVariantController as AdminProductVariantController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Shop\CartController;
use App\Http\Controllers\Shop\CheckoutController;
use App\Http\Controllers\Shop\CustomizeController;
use App\Http\Controllers\Shop\OrderController as ShopOrderController;
use App\Http\Controllers\Shop\PaymentController;
use App\Http\Controllers\Shop\ProductController as ShopProductController;
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
| Browsing and the cart are open to guests; a guest can fill a cart and is
| sent to log in only at checkout, which is where an order needs an owner.
|
| Nothing in this group writes stock. Orders are created `awaiting_payment`
| and stock moves only when payment is confirmed, through InventoryService.
|
*/
Route::get('/shop', [ShopProductController::class, 'index'])->name('shop.index');
Route::get('/shop/{product:slug}', [ShopProductController::class, 'show'])->name('shop.show');

// The 3D skateboard builder. Route name `customize` is load-bearing — see
// StoreHeader's nav, which lights this chip up the moment the route exists.
Route::get('/customize', [CustomizeController::class, 'index'])->name('customize');
Route::post('/customize', [CustomizeController::class, 'store'])->name('customize.store');

// The cart lives in the session, so the item is identified in the body
// rather than the URL — a cart key contains a class name and a "#".
Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
Route::post('/cart', [CartController::class, 'store'])->name('cart.store');
Route::patch('/cart', [CartController::class, 'update'])->name('cart.update');
Route::delete('/cart', [CartController::class, 'destroy'])->name('cart.destroy');

Route::middleware('auth')->group(function () {
    Route::get('/checkout', [CheckoutController::class, 'create'])->name('checkout.create');
    Route::post('/checkout', [CheckoutController::class, 'store'])->name('checkout.store');

    Route::get('/orders', [ShopOrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/{order_number}', [ShopOrderController::class, 'show'])->name('orders.show');

    // TEMPORARY stand-in for the PayMongo webhook — 404s outside local/testing.
    // See PaymentController.
    Route::post('/orders/{order_number}/confirm-payment', [PaymentController::class, 'confirm'])
        ->name('payment.confirm');
});

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

require __DIR__.'/auth.php';
