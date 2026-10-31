<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

/**
 * The bell, for both panels — staff get ShopAlert, customers get
 * OrderUpdated, and each only ever reads their own.
 *
 * Plain JSON polled every few seconds, not an Inertia prop: the bell lives in
 * the layout on every page, and an Inertia reload would cancel whatever
 * visit the user had in flight (Inertia allows one at a time).
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'unread' => $user->unreadNotifications()->count(),
            'items' => $user->notifications()
                ->latest()
                ->take(15)
                ->get()
                ->map(fn (DatabaseNotification $n) => [
                    'id' => $n->id,
                    'kind' => $n->data['kind'] ?? 'order',
                    'title' => $n->data['title'] ?? '',
                    'message' => $n->data['message'] ?? '',
                    'url' => $n->data['url'] ?? null,
                    'read' => $n->read_at !== null,
                    'ago' => $n->created_at->diffForHumans(null, true, true),
                ]),
        ]);
    }

    /** One notification (when clicked), or all of them. */
    public function markRead(Request $request): JsonResponse
    {
        $request->validate(['id' => ['nullable', 'string']]);

        $request->user()->unreadNotifications()
            ->when($request->input('id'), fn ($q, $id) => $q->whereKey($id))
            ->update(['read_at' => now()]);

        return response()->json(['unread' => $request->user()->unreadNotifications()->count()]);
    }
}
