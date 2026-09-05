<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff review of buyer IDs — the human half of the feature. Nothing here is
 * automated and nothing is checked against an issuing authority; a person
 * looks at a photo and decides.
 *
 * Gated at `role:staff` with the rest of the admin panel rather than
 * `role:admin`. Reviewing an ID is day-to-day counter work, unlike user
 * management (changing someone's role) which stays admin-only.
 */
class IdVerificationController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');

        if (! in_array($status, User::ID_STATUSES, true)) {
            // Pending is what actually needs doing, so it leads.
            $status = User::ID_STATUS_PENDING;
        }

        $users = User::query()
            ->where('id_verification_status', $status)
            ->with('idReviewer:id,name')
            // Oldest submission first — a review queue is a queue, and the
            // person who has been waiting longest should not be last.
            ->orderByRaw('id_submitted_at IS NULL, id_submitted_at ASC')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => $this->row($user));

        return Inertia::render('Admin/IdVerifications/Index', [
            'users' => $users,
            'filters' => ['status' => $status],
            'statuses' => User::ID_STATUSES,
            'counts' => collect(User::ID_STATUSES)
                ->mapWithKeys(fn ($s) => [
                    $s => User::where('id_verification_status', $s)->count(),
                ]),
        ]);
    }

    public function show(User $user): Response
    {
        return Inertia::render('Admin/IdVerifications/Show', [
            'customer' => array_merge($this->row($user), [
                'orders_count' => $user->orders()->count(),
                'joined_at' => $user->created_at->format('d M Y'),
                'rejection_reason' => $user->id_rejection_reason,
                // Streamed through an authorised-only route, never a public
                // file path — see Shop\IdVerificationController's docblock.
                'photo_url' => $user->id_photo_path
                    ? route('verify-id.photo', $user)
                    : null,
            ]),
            'can_review' => in_array($user->id_verification_status, [
                User::ID_STATUS_PENDING,
                User::ID_STATUS_REJECTED,
            ], true),
        ]);
    }

    /**
     * Approve or reject. A rejection REQUIRES a reason — the customer is
     * shown it verbatim on their own page, and "rejected, no explanation"
     * leaves them with nothing to act on and staff with a support call.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'reason' => ['required_if:decision,reject', 'nullable', 'string', 'max:500'],
        ], [
            'reason.required_if' => 'Give a reason so the customer knows what to fix.',
        ]);

        // Nothing to review if they never submitted. Guards a forged request;
        // the UI does not offer the buttons in that state.
        if ($user->id_verification_status === User::ID_STATUS_NONE) {
            return back()->withErrors([
                'status' => 'This customer has not submitted an ID yet.',
            ]);
        }

        $approving = $validated['decision'] === 'approve';

        // forceFill — these columns are outside $fillable on purpose, so that
        // a customer can never mass-assign themselves an approved status.
        $user->forceFill([
            'id_verification_status' => $approving
                ? User::ID_STATUS_APPROVED
                : User::ID_STATUS_REJECTED,
            'id_rejection_reason' => $approving ? null : $validated['reason'],
            'id_reviewed_at' => now(),
            'id_reviewed_by' => $request->user()->id,
        ])->save();

        return back()->with(
            'success',
            $user->name.($approving ? ' verified.' : ' rejected.')
        );
    }

    private function row(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->id_verification_status,
            'id_type_label' => $user->idTypeLabel(),
            'has_photo' => $user->id_photo_path !== null,
            'submitted_at' => $user->id_submitted_at?->format('d M Y, g:ia'),
            'reviewed_at' => $user->id_reviewed_at?->format('d M Y, g:ia'),
            'reviewed_by' => $user->idReviewer?->name,
        ];
    }
}
