<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\ProductVariantController as AdminProductVariantController;
use App\Http\Controllers\ProfileController;
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
 * those routes exist (Phases 5 and 4), then light up on their own.
 */
Route::get('/', function () {
    return Inertia::render('Storefront/Home');
})->name('home');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

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

        Route::post('products/{product}/variants', [AdminProductVariantController::class, 'store'])
            ->name('products.variants.store');
        Route::patch('products/{product}/variants/{variant}', [AdminProductVariantController::class, 'update'])
            ->name('products.variants.update');
        Route::delete('products/{product}/variants/{variant}', [AdminProductVariantController::class, 'destroy'])
            ->name('products.variants.destroy');
    });

require __DIR__.'/auth.php';
