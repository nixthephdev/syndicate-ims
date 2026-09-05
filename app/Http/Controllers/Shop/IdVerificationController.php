<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The customer's half of ID verification: upload a photo, wait for a human.
 *
 * STORAGE IS DELIBERATELY DIFFERENT FROM EVERY OTHER IMAGE IN THIS PROJECT.
 * Product and lookbook photos are moved into public/images/... and served
 * straight off disk by the web server, which is right for them — they are
 * meant to be seen by everyone. A government ID is the opposite: these go on
 * the PRIVATE 'local' disk (storage/app/private-ids), which no URL can reach,
 * and the only way to see one is show() below, behind an ownership check.
 * Do not "make it consistent" with the product-image convention.
 *
 * The other divergence: replacing an ID DELETES the file it replaced. Product
 * images deliberately never delete on replace (an old photo may still be
 * referenced by the Home lookbook). Here the opposite is correct — holding
 * more copies of someone's ID than the one currently under review is a
 * liability with no operational upside.
 */
class IdVerificationController extends Controller
{
    private const DIRECTORY = 'private-ids';

    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Storefront/VerifyId', [
            'status' => $user->id_verification_status,
            'id_type' => $user->id_type,
            'id_type_label' => $user->idTypeLabel(),
            'submitted_at' => $user->id_submitted_at?->format('d M Y, g:ia'),
            'reviewed_at' => $user->id_reviewed_at?->format('d M Y, g:ia'),
            'rejection_reason' => $user->id_rejection_reason,
            'id_types' => User::ID_TYPES,
            // Built here rather than in the page: the route is model-bound,
            // so the view would need the user's id to name it, and there is
            // no reason to hand that to the frontend just for a link.
            'photo_url' => $user->id_photo_path
                ? route('verify-id.photo', $user)
                : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        // An approved ID is not re-submittable. Letting someone quietly swap
        // the photo behind an already-approved status would make approval
        // meaningless — staff approved a specific document, not the account
        // forever. Re-verification would be staff resetting it, if that is
        // ever needed.
        if ($user->idIsApproved()) {
            return back()->withErrors([
                'id' => 'Your ID is already verified.',
            ]);
        }

        $validated = $request->validate([
            'id_type' => ['required', 'string', 'in:'.implode(',', array_keys(User::ID_TYPES))],
            // 4MB, matching the product-image cap. `image` rejects anything
            // PHP can't decode as one, so a renamed .php cannot get through.
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ], [
            'photo.required' => 'Please attach a photo of your ID.',
            'photo.image' => 'That file is not an image.',
            'photo.max' => 'That image is larger than 4MB. Try a smaller photo.',
        ]);

        $previous = $user->id_photo_path;

        // Random filename, not derived from the user's name or id — a
        // predictable one would make the (already authorised-only) route
        // easier to probe, and the path is the only thing identifying it.
        $path = $request->file('photo')->storeAs(
            self::DIRECTORY,
            Str::random(40).'.'.$request->file('photo')->extension()
        );

        // forceFill: every id_verification_* column is deliberately outside
        // $fillable so a customer cannot POST themselves an approved status.
        // See User::$fillable's docblock.
        $user->forceFill([
            'id_type' => $validated['id_type'],
            'id_photo_path' => $path,
            'id_verification_status' => User::ID_STATUS_PENDING,
            'id_submitted_at' => now(),
            'id_reviewed_at' => null,
            'id_reviewed_by' => null,
            'id_rejection_reason' => null,
        ])->save();

        // Only after the new one is safely saved — a delete-then-store that
        // failed halfway would leave the account with no ID at all.
        if ($previous && $previous !== $path) {
            Storage::delete($previous);
        }

        return back()->with('success', 'ID submitted. We will review it shortly.');
    }

    /**
     * Streams the photo itself. The ONLY way to see one — the file is not
     * under public/ and has no URL of its own.
     *
     * Owner or staff, nobody else. Staff need it to review; the owner needs
     * to check what they uploaded was legible.
     */
    public function show(Request $request, User $user): StreamedResponse
    {
        $viewer = $request->user();

        abort_unless($viewer->id === $user->id || $viewer->isStaff(), 403);
        abort_unless($user->id_photo_path && Storage::exists($user->id_photo_path), 404);

        return Storage::response(
            $user->id_photo_path,
            null,
            // Not cached anywhere shared, and not stored to disk by proxies.
            ['Cache-Control' => 'private, no-store, max-age=0']
        );
    }
}
