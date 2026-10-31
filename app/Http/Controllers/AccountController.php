<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * `/dashboard` — Breeze's post-login landing (RouteServiceProvider::HOME).
 *
 * Breeze shipped this as a card saying "You're logged in!", which is a
 * dead end for everybody. Now it routes by role:
 *
 *   staff/admin -> the admin panel, where their work actually is
 *   customer    -> their account, in the storefront's own styling
 *
 * Keeping the route name `dashboard` matters: it is what HOME, the auth
 * controllers and several tests redirect to.
 */
class AccountController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        // Staff were landing here and then clicking a card to reach the admin.
        // Send them straight there; "View the shop" in the sidebar brings them
        // back if they want to browse as a customer.
        if ($user->isStaff()) {
            return redirect()->route('admin.dashboard');
        }

        $orders = Order::query()
            ->where('user_id', $user->id)
            ->withCount('items')
            ->latest()
            ->take(3)
            ->get()
            ->map(fn (Order $order) => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'items_count' => $order->items_count,
                'total_formatted' => Money::format($order->total_centavos),
                'placed_at' => $order->created_at->format('d M Y'),
            ]);

        return Inertia::render('Storefront/Account', [
            'recentOrders' => $orders,
            'stats' => [
                'orders' => Order::query()->where('user_id', $user->id)->count(),
                'spent_formatted' => Money::format(
                    (int) Order::query()->where('user_id', $user->id)->paid()->sum('total_centavos')
                ),
            ],
        ]);
    }
}
