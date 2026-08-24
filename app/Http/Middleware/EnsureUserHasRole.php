<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Objective 7: role-based access control.
 *
 * Usage:  ->middleware('role:admin')
 *         ->middleware('role:staff')   // admins pass this too
 *
 * Roles are HIERARCHICAL. An admin satisfies a staff requirement, because an
 * admin who cannot reach the staff inventory screens would be useless. Listing
 * a role admits that role and everything above it.
 */
class EnsureUserHasRole
{
    /** Lowest privilege first. */
    private const HIERARCHY = [
        User::ROLE_CUSTOMER,
        User::ROLE_STAFF,
        User::ROLE_ADMIN,
    ];

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // 401 for "not logged in" vs 403 for "logged in, wrong role" — the
        // 'auth' middleware normally handles this, but don't assume it ran.
        if (! $user) {
            abort(401);
        }

        if (! $this->satisfies($user, $roles)) {
            abort(403, 'This area requires a different role.');
        }

        return $next($request);
    }

    /**
     * @param  array<int, string>  $required
     */
    private function satisfies(User $user, array $required): bool
    {
        $userRank = array_search($user->role, self::HIERARCHY, true);

        // An unrecognised role in the DB grants nothing. Fail closed.
        if ($userRank === false) {
            return false;
        }

        foreach ($required as $role) {
            $needed = array_search($role, self::HIERARCHY, true);

            if ($needed !== false && $userRank >= $needed) {
                return true;
            }
        }

        return false;
    }
}
