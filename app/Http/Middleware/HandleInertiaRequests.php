<?php

namespace App\Http\Middleware;

use App\Services\Cart;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tightenco\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user(),
            ],
            'ziggy' => function () use ($request) {
                return array_merge((new Ziggy)->toArray(), [
                    'location' => $request->url(),
                ]);
            },
            // Admin CRUD flashes ->with('success', ...) and validation
            // ->withErrors(['variant' => ...]) — without this share, those
            // never reach the page and would sit silently in the session.
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
            ],
            // Drives the header cart badge. A closure so the count is only
            // computed for pages that actually read it, and so it reflects
            // the session as it stands at the end of the request.
            'cart' => fn () => [
                'count' => app(Cart::class)->count(),
            ],
        ]);
    }
}
