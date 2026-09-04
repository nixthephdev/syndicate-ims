<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasFactory;

    /** Class constants, not enums — PHP 8.0. */
    public const STATUS_PENDING = 'pending';
    public const STATUS_AWAITING_PAYMENT = 'awaiting_payment';
    public const STATUS_PAID = 'paid';
    public const STATUS_FULFILLED = 'fulfilled';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_FAILED = 'failed';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_AWAITING_PAYMENT,
        self::STATUS_PAID,
        self::STATUS_FULFILLED,
        self::STATUS_CANCELLED,
        self::STATUS_FAILED,
    ];

    /** Statuses that mean stock has already been taken off the shelf. */
    public const STATUSES_STOCK_COMMITTED = [
        self::STATUS_PAID,
        self::STATUS_FULFILLED,
    ];

    protected $fillable = [
        'order_number',
        'user_id',
        'status',
        'subtotal_centavos',
        'total_centavos',
        'paymongo_payment_intent_id',
        'paymongo_source_id',
        'paymongo_payment_id',
        'paid_at',
        'customer_name',
        'customer_email',
        'customer_phone',
        'address_line',
        'barangay',
        'city',
        'province',
        'postal_code',
        'notes',
    ];

    protected $casts = [
        'subtotal_centavos' => 'integer',
        'total_centavos' => 'integer',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Has stock already been committed for this order? InventoryService uses
     * this as its idempotency guard so a repeated PayMongo webhook cannot
     * decrement stock twice.
     */
    public function stockIsCommitted(): bool
    {
        return in_array($this->status, self::STATUSES_STOCK_COMMITTED, true);
    }

    public function isPaid(): bool
    {
        return $this->paid_at !== null;
    }

    /** Any address field filled in at all — a pickup order has none of these. */
    public function hasAddress(): bool
    {
        return $this->address_line !== null
            || $this->barangay !== null
            || $this->city !== null
            || $this->province !== null
            || $this->postal_code !== null;
    }

    public static function generateOrderNumber(): string
    {
        // Asia/Manila date (config/app.php timezone) + random suffix.
        return 'SYN-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));
    }

    public function scopeStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /** Revenue-bearing orders only — the basis for sales reports. */
    public function scopePaid(Builder $query): Builder
    {
        return $query->whereNotNull('paid_at');
    }
}
