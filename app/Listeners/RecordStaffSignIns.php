<?php

namespace App\Listeners;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

/**
 * Staff and admin sign-ins, sign-outs and failed attempts, into the audit
 * log. Customers are left out — the log watches the people who can touch
 * stock and orders, and every shopper's login would bury that.
 *
 * Failed attempts count only when the email belongs to a staff/admin
 * account: someone guessing at the shop team's passwords is exactly the
 * suspicious activity the log is for.
 */
class RecordStaffSignIns
{
    public function handle(Login|Logout|Failed $event): void
    {
        $user = $event->user;

        if ($event instanceof Failed && ! $user) {
            $user = User::query()->where('email', $event->credentials['email'] ?? null)->first();
        }

        if (! $user instanceof User || ! $user->isStaff()) {
            return;
        }

        [$action, $verb] = match (true) {
            $event instanceof Login => [AuditLog::ACTION_LOGIN, 'Signed in'],
            $event instanceof Logout => [AuditLog::ACTION_LOGOUT, 'Signed out'],
            default => [AuditLog::ACTION_LOGIN_FAILED, 'Failed sign-in (wrong password) for'],
        };

        AuditLog::record($action, $event instanceof Failed ? "{$verb} {$user->email}." : "{$verb}.", $user, $user->email, null, $user);
    }
}
