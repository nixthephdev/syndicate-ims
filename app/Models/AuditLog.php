<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * One thing a staff member or admin did. Written through record(), read on
 * the admin-only Audit Log page. Append-only — see the migration.
 */
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    /** Class constants, not enums — PHP 8.0. Grouped by what they touch. */
    public const ACTION_LOGIN = 'auth.login';
    public const ACTION_LOGOUT = 'auth.logout';
    public const ACTION_LOGIN_FAILED = 'auth.login_failed';

    public const ACTION_PRODUCT_CREATED = 'product.created';
    public const ACTION_PRODUCT_UPDATED = 'product.updated';
    public const ACTION_PRODUCT_ARCHIVED = 'product.archived';

    public const ACTION_VARIANT_CREATED = 'variant.created';
    public const ACTION_VARIANT_UPDATED = 'variant.updated';
    public const ACTION_VARIANT_DELETED = 'variant.deleted';

    public const ACTION_COMPONENT_UPDATED = 'component.updated';

    public const ACTION_ORDER_STAGE = 'order.stage_advanced';
    public const ACTION_ORDER_FULFILLED = 'order.fulfilled';
    public const ACTION_ORDER_CANCELLED = 'order.cancelled';

    public const ACTION_USER_ROLE = 'user.role_changed';
    public const ACTION_USER_STATUS = 'user.status_changed';

    public const ACTION_EXPORT = 'report.exported';

    /** For the page's filter dropdown — label per group of actions. */
    public const ACTION_GROUPS = [
        'auth' => 'Sign-ins',
        'product' => 'Products',
        'variant' => 'Stock & variants',
        'component' => 'Skate components',
        'order' => 'Orders',
        'user' => 'Users',
        'report' => 'Exports',
    ];

    protected $guarded = [];

    protected $casts = [
        'changes' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Write one entry, as whoever is signed in (or $actor, for the auth
     * events, which fire around the moment there is no signed-in user).
     *
     * Never throws: an audit write failing must not take down the action it
     * was describing — the stock edit still happened, and refusing it would
     * be worse than an incomplete log. The failure is reported instead.
     */
    public static function record(
        string $action,
        string $description,
        ?Model $subject = null,
        ?string $subjectLabel = null,
        ?array $changes = null,
        ?User $actor = null
    ): ?self {
        $actor ??= Auth::user();

        try {
            return self::create([
                'user_id' => $actor?->id,
                'actor_name' => $actor?->name,
                'actor_role' => $actor?->role,
                'action' => $action,
                'description' => mb_substr($description, 0, 500),
                'subject_type' => $subject ? $subject->getMorphClass() : null,
                'subject_id' => $subject?->getKey(),
                'subject_label' => $subjectLabel,
                'changes' => $changes ?: null,
                'ip_address' => request()?->ip(),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    /**
     * What is about to change on $model, as { field: [old, new] }. Call
     * BEFORE save() — it reads the dirty attributes, which save() clears.
     *
     * @param  array<int, string>  $hidden  Fields to leave out (e.g. a slug
     *   that just follows the name).
     */
    public static function changesOf(Model $model, array $hidden = []): array
    {
        $changes = [];

        foreach ($model->getDirty() as $field => $new) {
            if (in_array($field, array_merge(['updated_at', 'created_at'], $hidden), true)) {
                continue;
            }

            $changes[$field] = [$model->getOriginal($field), $new];
        }

        return $changes;
    }

    public function scopeInGroup(Builder $query, string $group): Builder
    {
        return $query->where('action', 'like', $group.'.%');
    }
}
