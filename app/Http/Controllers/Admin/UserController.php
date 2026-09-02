<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * role:admin only — a step above the rest of /admin, which is role:staff.
 * Granting or revoking staff access is an admin-only action; see the
 * separate route group in web.php.
 *
 * Both writes here are explicit and narrow, never mass assignment — 'role'
 * stays out of User::$fillable on purpose (see the model), so this
 * controller is the one deliberate path allowed to change it.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $role = $request->query('role');
        $role = in_array($role, User::ROLES, true) ? $role : null;

        $users = User::query()
            ->withCount('orders')
            ->when($role, fn ($query) => $query->role($role))
            ->when($request->query('q'), function ($query, $term) {
                $query->where(function ($q) use ($term) {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%");
                });
            })
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => $user->is_active,
                'orders_count' => $user->orders_count,
                'joined_at' => $user->created_at->format('d M Y'),
            ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => [
                'role' => $role,
                'q' => $request->query('q'),
            ],
            'roles' => User::ROLES,
        ]);
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->withErrors(['user' => "You can't change your own role here."]);
        }

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(User::ROLES)],
        ]);

        // 'role' is deliberately kept out of $fillable (see the model) so a
        // plain update() would silently no-op here. forceFill() bypasses
        // that guard for this one hardcoded, validated key — the mass
        // assignment protection this sidesteps exists to stop arbitrary
        // request input reaching the column, and nothing here is arbitrary.
        $user->forceFill(['role' => $validated['role']])->save();

        return back()->with('success', "{$user->name}'s role is now {$validated['role']}.");
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->withErrors(['user' => "You can't deactivate your own account here."]);
        }

        $user->forceFill(['is_active' => ! $user->is_active])->save();

        $state = $user->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "{$user->name} is now {$state}.");
    }
}
