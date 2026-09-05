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
    public const STATUS_DEPOSIT_PAID = 'deposit_paid';
    public const STATUS_PAID = 'paid';
    public const STATUS_FULFILLED = 'fulfilled';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_FAILED = 'failed';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_AWAITING_PAYMENT,
        self::STATUS_DEPOSIT_PAID,
        self::STATUS_PAID,
        self::STATUS_FULFILLED,
        self::STATUS_CANCELLED,
        self::STATUS_FAILED,
    ];

    /**
     * Statuses that mean stock has already been taken off the shelf.
     * Deposit-paid counts: the whole point of a delivery deposit is that it
     * reserves the item, same as a full payment does.
     */
    public const STATUSES_STOCK_COMMITTED = [
        self::STATUS_DEPOSIT_PAID,
        self::STATUS_PAID,
        self::STATUS_FULFILLED,
    ];

    public const FULFILLMENT_PICKUP = 'pickup';
    public const FULFILLMENT_DELIVERY = 'delivery';

    public const FULFILLMENT_METHODS = [
        self::FULFILLMENT_PICKUP,
        self::FULFILLMENT_DELIVERY,
    ];

    /**
     * Where the order physically is — a SEPARATE axis from `status`, which
     * tracks money. See the add_fulfillment_stage migration for why these
     * cannot share a column (short version: a delivery order stays
     * `deposit_paid` the whole way, and the revenue SQL depends on that).
     *
     * STAGE_* rather than FULFILLMENT_* on purpose: FULFILLMENT_PICKUP /
     * FULFILLMENT_DELIVERY above are the *method*, a different thing.
     */
    public const STAGE_NOT_STARTED = 'not_started';
    public const STAGE_PREPARING = 'preparing';
    public const STAGE_READY = 'ready';
    public const STAGE_OUT_FOR_DELIVERY = 'out_for_delivery';
    public const STAGE_COMPLETED = 'completed';

    public const STAGES = [
        self::STAGE_NOT_STARTED,
        self::STAGE_PREPARING,
        self::STAGE_READY,
        self::STAGE_OUT_FOR_DELIVERY,
        self::STAGE_COMPLETED,
    ];

    /**
     * The two journeys. A pickup order is never "out for delivery" and a
     * delivery order is never "ready for pickup" — the stage list is per
     * method, not one shared list with irrelevant steps greyed out.
     */
    public const STAGE_PATHS = [
        self::FULFILLMENT_PICKUP => [
            self::STAGE_NOT_STARTED,
            self::STAGE_PREPARING,
            self::STAGE_READY,
            self::STAGE_COMPLETED,
        ],
        self::FULFILLMENT_DELIVERY => [
            self::STAGE_NOT_STARTED,
            self::STAGE_PREPARING,
            self::STAGE_OUT_FOR_DELIVERY,
            self::STAGE_COMPLETED,
        ],
    ];

    /**
     * Wording differs by method for the same underlying stage — "Ready for
     * pickup" and "Handed over" only make sense for a pickup order.
     */
    public const STAGE_LABELS = [
        self::FULFILLMENT_PICKUP => [
            self::STAGE_NOT_STARTED => 'Not started',
            self::STAGE_PREPARING => 'Preparing your order',
            self::STAGE_READY => 'Ready for pickup',
            self::STAGE_COMPLETED => 'Picked up',
        ],
        self::FULFILLMENT_DELIVERY => [
            self::STAGE_NOT_STARTED => 'Not started',
            self::STAGE_PREPARING => 'Preparing your order',
            self::STAGE_OUT_FOR_DELIVERY => 'Out for delivery',
            self::STAGE_COMPLETED => 'Delivered',
        ],
    ];

    /**
     * gcash: full prepayment, pickup or delivery. cash: pickup only, staff
     * confirms in the admin panel — see Admin\OrderCashPaymentController.
     * gcash_deposit: delivery only, forced server-side regardless of what
     * the checkout form sends — 50% now via GCash, the rest in cash on
     * delivery. See CheckoutController::otpStore().
     */
    public const PAYMENT_METHOD_GCASH = 'gcash';
    public const PAYMENT_METHOD_CASH = 'cash';
    public const PAYMENT_METHOD_GCASH_DEPOSIT = 'gcash_deposit';

    protected $fillable = [
        'order_number',
        'user_id',
        'status',
        'fulfillment_method',
        'fulfillment_stage',
        'payment_method',
        'subtotal_centavos',
        'total_centavos',
        'deposit_centavos',
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

    /**
     * Mirrors the column default so a freshly created Order has a real stage
     * in memory too, not null until someone refreshes it — trackingPayload()
     * is reachable straight after Order::create() and would otherwise render
     * a blank current step.
     */
    protected $attributes = [
        'fulfillment_stage' => self::STAGE_NOT_STARTED,
    ];

    protected $casts = [
        'subtotal_centavos' => 'integer',
        'total_centavos' => 'integer',
        'deposit_centavos' => 'integer',
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

    /**
     * Which status a successful GCash payment lands this order on.
     *
     * A delivery order's online leg is only ever the 50% deposit, so it lands
     * on deposit_paid with the cash balance still due; everything else is a
     * full payment. Lives here because TWO things now confirm payments — the
     * webhook and the return-from-checkout reconciliation — and they must
     * never disagree about which status a payment produces.
     */
    public function paidStatusForPaymentMethod(): string
    {
        return $this->payment_method === self::PAYMENT_METHOD_GCASH_DEPOSIT
            ? self::STATUS_DEPOSIT_PAID
            : self::STATUS_PAID;
    }

    /** The ordered stage list for THIS order's fulfillment method. */
    public function stagePath(): array
    {
        return self::STAGE_PATHS[$this->fulfillment_method] ?? self::STAGE_PATHS[self::FULFILLMENT_PICKUP];
    }

    /** Human wording for a stage, in this order's method's vocabulary. */
    public function stageLabel(?string $stage = null): string
    {
        $stage = $stage ?? $this->fulfillment_stage;
        $labels = self::STAGE_LABELS[$this->fulfillment_method] ?? self::STAGE_LABELS[self::FULFILLMENT_PICKUP];

        return $labels[$stage] ?? str_replace('_', ' ', (string) $stage);
    }

    /**
     * The one stage staff may move to next, or null when there's nowhere to
     * go. Tracking only starts once stock is actually committed — there is
     * nothing to prepare for an order nobody has paid for, and a cancelled
     * or failed order goes nowhere at all.
     */
    public function nextStage(): ?string
    {
        if (! $this->stockIsCommitted()) {
            return null;
        }

        $path = $this->stagePath();
        $at = array_search($this->fulfillment_stage, $path, true);

        if ($at === false || $at === count($path) - 1) {
            return null;
        }

        return $path[$at + 1];
    }

    /**
     * How far along the journey, as a 0-based index into stagePath() — what
     * the customer's progress tracker fills in up to.
     */
    public function stageIndex(): int
    {
        $at = array_search($this->fulfillment_stage, $this->stagePath(), true);

        return $at === false ? 0 : $at;
    }

    /**
     * Tracking is only meaningful once the shop actually owes the customer
     * goods. Nothing is being prepared for an unpaid order, and a cancelled
     * or failed one is going nowhere — both would show a progress bar that
     * can only ever mislead.
     */
    public function isTrackable(): bool
    {
        return $this->stockIsCommitted();
    }

    /**
     * The whole journey as renderable steps. Built here rather than in each
     * controller because BOTH the admin panel and the customer's own order
     * page draw the same tracker — duplicating the done/current arithmetic
     * in two places is exactly how the two drift apart.
     *
     * @return array<int, array{key: string, label: string, done: bool, current: bool}>
     */
    public function trackingSteps(): array
    {
        $current = $this->stageIndex();

        return array_values(array_map(
            fn (string $stage, int $i) => [
                'key' => $stage,
                'label' => $this->stageLabel($stage),
                'done' => $i <= $current,
                'current' => $i === $current,
            ],
            $this->stagePath(),
            array_keys($this->stagePath())
        ));
    }

    /** The tracking block both order pages render. Null when not trackable. */
    public function trackingPayload(): ?array
    {
        if (! $this->isTrackable()) {
            return null;
        }

        $next = $this->nextStage();

        return [
            'stage' => $this->fulfillment_stage,
            'stage_label' => $this->stageLabel(),
            'steps' => $this->trackingSteps(),
            'next_stage' => $next,
            'next_stage_label' => $next ? $this->stageLabel($next) : null,
        ];
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

    /** Remaining cash due — only meaningful for a delivery/50% DP order. */
    public function balanceCentavos(): ?int
    {
        return $this->deposit_centavos !== null
            ? $this->total_centavos - $this->deposit_centavos
            : null;
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
