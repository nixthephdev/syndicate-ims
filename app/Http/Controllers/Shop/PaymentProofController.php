<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The customer's proof that they sent the money — a screenshot of the GCash
 * or bank transfer receipt.
 *
 * THIS MARKS NOTHING PAID. Uploading a screenshot is a claim, not a payment;
 * anyone can attach any image. Staff check the shop's own GCash or bank
 * account and confirm it in the admin panel, and that confirmation is the
 * only thing that moves stock (Admin\OrderPaymentController). Keeping those
 * two apart is the whole integrity story now that there is no gateway
 * telling us anything — do not add a "mark paid on upload" shortcut.
 *
 * Stored on the PRIVATE disk for the same reason ID photos are: a payment
 * receipt carries a real name, a reference number and partial account
 * details, and has no business being fetchable by URL.
 */
class PaymentProofController extends Controller
{
    private const DIRECTORY = 'private-payment-proofs';

    public function store(Request $request, string $orderNumber): RedirectResponse
    {
        $order = $this->ownedOrder($request, $orderNumber);

        if (! $order->needsPaymentProof()) {
            return back()->withErrors([
                'payment' => 'This order is paid in cash at the branch — there is nothing to upload.',
            ]);
        }

        // Once staff have confirmed the money arrived, a new screenshot can
        // only confuse the record. Nothing is re-uploadable after that.
        if ($order->stockIsCommitted()) {
            return back()->withErrors([
                'payment' => 'This payment is already confirmed.',
            ]);
        }

        $validated = $request->validate([
            'proof' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'reference' => ['nullable', 'string', 'max:100'],
        ], [
            'proof.required' => 'Please attach a screenshot of your receipt.',
            'proof.image' => 'That file is not an image.',
            'proof.max' => 'That image is larger than 4MB. Try a smaller screenshot.',
        ]);

        $previous = $order->payment_proof_path;

        $path = $request->file('proof')->storeAs(
            self::DIRECTORY,
            Str::random(40).'.'.$request->file('proof')->extension()
        );

        $order->forceFill([
            'payment_proof_path' => $path,
            'payment_proof_uploaded_at' => now(),
            'payment_reference' => $validated['reference'] ?? null,
        ])->save();

        // Replacing a screenshot deletes the one it replaced — same reasoning
        // as ID photos, and the new file is saved first so a failed swap
        // never leaves the order with no proof at all.
        if ($previous && $previous !== $path) {
            Storage::delete($previous);
        }

        return back()->with('success', 'Receipt received. We will confirm your payment shortly.');
    }

    /** Streams the receipt. Owner or staff only — see the class docblock. */
    public function show(Request $request, string $orderNumber): StreamedResponse
    {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();
        $viewer = $request->user();

        abort_unless($order->user_id === $viewer->id || $viewer->isStaff(), 403);
        abort_unless(
            $order->payment_proof_path && Storage::exists($order->payment_proof_path),
            404
        );

        return Storage::response(
            $order->payment_proof_path,
            null,
            ['Cache-Control' => 'private, no-store, max-age=0']
        );
    }

    private function ownedOrder(Request $request, string $orderNumber): Order
    {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        // Owner only, with no staff bypass — staff confirming a payment is a
        // different action in a different controller, not this one.
        abort_unless($order->user_id === $request->user()->id, 403);

        return $order;
    }
}
