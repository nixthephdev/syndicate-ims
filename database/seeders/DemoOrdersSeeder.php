<?php

namespace Database\Seeders;

use App\Exceptions\InsufficientStockException;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use App\Models\User;
use App\Services\InventoryService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * A simulated store history for demos and the defense: months of orders
 * following the shop's REAL rules — pickup or delivery, 50% deposit on
 * delivery, GCash or cash-on-pickup, custom boards from /customize (one
 * build_key + hardware colours, so the admin's 3D card has real builds to
 * draw), fulfillment stages, cancellations.
 *
 * Deliberately NOT called from DatabaseSeeder — `migrate:fresh --seed` stays
 * the clean baseline every test assumes. Run it on top of that:
 *
 *   php artisan db:seed --class=DemoOrdersSeeder
 *
 * The window defaults to 2026-07-01 .. 2027-04-30 — INCLUDING FUTURE DATES,
 * on the developer's instruction (2026-10-06) so the dashboard stays
 * populated through the defense season without re-seeding. Override with
 * DEMO_FROM / DEMO_TO (Y-m-d) in the environment.
 *
 * Every paid order goes through InventoryService::commitForPaidOrder(), so
 * stock genuinely moves. Only the clock is faked (raw timestamp updates
 * afterwards). Stock is topped up at the start of every month the way a real
 * shop receives deliveries — without that, ten months of sales would empty
 * the shelves by September.
 *
 * Fake customers come from UserFactory (en_PH names, example.* emails): no
 * real person's data.
 */
class DemoOrdersSeeder extends Seeder
{
    /** Real Albay-area places, same province as the shop's branches. */
    private const ADDRESSES = [
        ['barangay' => 'Tagas', 'city' => 'Daraga', 'province' => 'Albay', 'postal_code' => '4501'],
        ['barangay' => 'Anislag', 'city' => 'Daraga', 'province' => 'Albay', 'postal_code' => '4501'],
        ['barangay' => 'Rawis', 'city' => 'Legazpi City', 'province' => 'Albay', 'postal_code' => '4500'],
        ['barangay' => 'Bogtong', 'city' => 'Legazpi City', 'province' => 'Albay', 'postal_code' => '4500'],
        ['barangay' => "Em's Barrio", 'city' => 'Legazpi City', 'province' => 'Albay', 'postal_code' => '4500'],
        ['barangay' => 'Victory Village', 'city' => 'Legazpi City', 'province' => 'Albay', 'postal_code' => '4500'],
        ['barangay' => 'Poblacion', 'city' => 'Camalig', 'province' => 'Albay', 'postal_code' => '4502'],
        ['barangay' => 'Poblacion', 'city' => 'Guinobatan', 'province' => 'Albay', 'postal_code' => '4503'],
    ];

    private const STREET_NAMES = [
        'Rizal St.', 'Bonifacio Ave.', 'Quezon Ave.', 'Peñaranda St.',
        'P. Burgos St.', 'Aguinaldo St.', 'Imperial St.', 'F. Imperial St.',
    ];

    private const NOTES = [
        'Pickup at the Tagas branch.', 'Pickup after 5pm please.', 'Gift — please no price tag.',
        'Will pick up on Saturday.', 'Call before delivering.', 'Leave with the guard if no one is home.',
    ];

    /** Orders in the last N days of the window are still in progress. */
    private const IN_PROGRESS_DAYS = 10;

    private InventoryService $inventory;

    /** @var array<int, string> */
    private array $hardwareColors;

    /** @var array<int, User> */
    private array $customers = [];

    /** @var array<int, string> One phone per customer, like a real repeat buyer. */
    private array $phones = [];

    private array $tally = ['orders' => 0, 'paid' => 0, 'builds' => 0, 'customers' => 0];

    public function run(InventoryService $inventory): void
    {
        $this->inventory = $inventory;
        $this->hardwareColors = $this->loadHardwareColors();

        $from = Carbon::parse(env('DEMO_FROM', '2026-07-01'))->startOfDay();
        $to = Carbon::parse(env('DEMO_TO', '2027-04-30'))->startOfDay();

        $standing = User::query()->where('email', 'customer@syndicate.test')->first();
        if ($standing) {
            $this->customers[] = $standing;
        }

        for ($day = $from->copy(); $day->lte($to); $day->addDay()) {
            if ($day->day === 1) {
                $this->restock();
            }

            $inProgress = $day->diffInDays($to) < self::IN_PROGRESS_DAYS;

            for ($i = 0, $n = $this->ordersOn($day, $from); $i < $n; $i++) {
                $this->placeOrder($day->copy()->setTime(random_int(9, 21), random_int(0, 59)), $inProgress);
            }
        }

        $this->command?->info(sprintf(
            'DemoOrdersSeeder: %d orders (%d paid, %d custom boards), %d new customers, %s to %s.',
            $this->tally['orders'], $this->tally['paid'], $this->tally['builds'], $this->tally['customers'],
            $from->toDateString(), $to->toDateString()
        ));
    }

    /**
     * A small shop's rhythm: a few orders a day, busier weekends, steady
     * growth, a December rush and a January lull.
     */
    private function ordersOn(Carbon $day, Carbon $from): int
    {
        $mean = 2.0 + 0.2 * $from->diffInMonths($day);

        if ($day->isWeekend()) {
            $mean *= 1.5;
        }

        $mean *= match ($day->month) {
            12 => 1.9,
            11 => 1.3,
            1 => 0.8,
            default => 1.0,
        };

        return random_int(0, (int) round($mean * 2));
    }

    private function placeOrder(Carbon $placedAt, bool $inProgress): void
    {
        $customer = $this->customerFor($placedAt);
        $lines = $this->pickLines();

        if ($lines === []) {
            return;
        }

        $subtotal = array_sum(array_column($lines, 'line_total_centavos'));
        $isDelivery = random_int(1, 100) <= 35;
        // Delivery always pays its 50% deposit by GCash; pickup can pay cash.
        $method = (! $isDelivery && random_int(1, 100) <= 30) ? Order::PAYMENT_METHOD_CASH : Order::PAYMENT_METHOD_GCASH;

        $attributes = [
            'order_number' => 'SYN-'.$placedAt->format('Ymd').'-'.strtoupper(Str::random(6)),
            'user_id' => $customer->id,
            'status' => Order::STATUS_AWAITING_PAYMENT,
            'fulfillment_method' => $isDelivery ? Order::FULFILLMENT_DELIVERY : Order::FULFILLMENT_PICKUP,
            'payment_method' => $method,
            'subtotal_centavos' => $subtotal,
            'total_centavos' => $subtotal,
            'deposit_centavos' => $isDelivery ? (int) ceil($subtotal / 2) : null,
            'customer_name' => $customer->name,
            'customer_email' => $customer->email,
            'customer_phone' => $this->phones[$customer->id],
            'notes' => random_int(1, 100) <= 20 ? self::NOTES[array_rand(self::NOTES)] : null,
        ];

        if ($isDelivery) {
            $place = self::ADDRESSES[array_rand(self::ADDRESSES)];
            $attributes += $place + [
                'address_line' => random_int(1, 999).' '.self::STREET_NAMES[array_rand(self::STREET_NAMES)],
            ];
        }

        $order = Order::create($attributes);

        foreach ($lines as $line) {
            OrderItem::create(['order_id' => $order->id] + $line);
        }

        $this->stamp($order, ['created_at' => $placedAt, 'updated_at' => $placedAt]);
        $this->tally['orders']++;

        $this->settle($order->fresh(), $placedAt, $inProgress);
    }

    /**
     * What happened next. Older orders have run their course; the last
     * IN_PROGRESS_DAYS of the window leave a realistic working queue.
     */
    private function settle(Order $order, Carbon $placedAt, bool $inProgress): void
    {
        $roll = random_int(1, 100);
        $unpaidChance = $inProgress ? 30 : 9;

        if ($roll <= $unpaidChance) {
            // Never paid. Old ones were called off; recent ones still wait.
            if (! $inProgress || $roll <= 5) {
                $this->stamp($order, ['status' => Order::STATUS_CANCELLED, 'updated_at' => $placedAt->copy()->addDays(random_int(1, 4))]);
            }

            return;
        }

        try {
            $order = $this->inventory->commitForPaidOrder($order, $order->paidStatusForPaymentMethod());
        } catch (InsufficientStockException $e) {
            // Sold out mid-run — the race the real shop accepts. Stays unpaid.
            return;
        }

        $paidAt = $order->payment_method === Order::PAYMENT_METHOD_CASH
            ? $placedAt->copy()->addDays(random_int(0, 3))->addMinutes(random_int(30, 300))
            : $placedAt->copy()->addMinutes(random_int(3, 90));

        $this->tally['paid']++;

        $path = $order->stagePath();
        // Finished journeys for older orders; somewhere along it for recent ones.
        $stageIndex = $inProgress ? random_int(0, count($path) - 2) : count($path) - 1;
        $stage = $path[$stageIndex];

        $this->stamp($order, [
            'paid_at' => $paidAt,
            'fulfillment_stage' => $stage,
            'status' => $stage === Order::STAGE_COMPLETED ? Order::STATUS_FULFILLED : $order->status,
            'updated_at' => $paidAt->copy()->addDays($stageIndex),
        ]);
    }

    /** ~30% of orders come from someone new; the rest are returning buyers. */
    private function customerFor(Carbon $placedAt): User
    {
        if ($this->customers === [] || random_int(1, 100) <= 30) {
            $joined = $placedAt->copy()->subMinutes(random_int(10, 600));
            $user = User::factory()->create();
            $this->stamp($user, ['created_at' => $joined, 'updated_at' => $joined, 'email_verified_at' => $joined], 'users');
            $this->customers[] = $user;
            $this->tally['customers']++;
        }

        $user = $this->customers[array_rand($this->customers)];
        $this->phones[$user->id] ??= sprintf('09%02d %03d %04d', random_int(10, 99), random_int(0, 999), random_int(0, 9999));

        return $user;
    }

    /** 1-3 lines; ~15% of orders include a whole custom board. */
    private function pickLines(): array
    {
        $lines = [];

        if (random_int(1, 100) <= 15) {
            $lines = $this->customBoard();
        }

        for ($i = 0, $n = random_int($lines ? 0 : 1, 2); $i < $n; $i++) {
            $line = random_int(1, 100) <= 85 ? $this->apparelLine() : $this->partLine();
            if ($line) {
                $lines[] = $line;
            }
        }

        return $lines;
    }

    /** Deck + wheels + trucks + bolts sharing one build_key, like /customize. */
    private function customBoard(): array
    {
        $buildKey = (string) Str::uuid();
        $lines = [];

        foreach ([SkateboardComponent::TYPE_DECK, SkateboardComponent::TYPE_WHEELS, SkateboardComponent::TYPE_TRUCKS, SkateboardComponent::TYPE_BOLTS] as $type) {
            $part = SkateboardComponent::query()->active()->ofType($type)->inStock()->inRandomOrder()->first();

            if (! $part) {
                return []; // all-or-nothing, same as CustomizeController::store()
            }

            $isHardware = in_array($type, [SkateboardComponent::TYPE_TRUCKS, SkateboardComponent::TYPE_BOLTS], true);
            $lines[] = $this->line($part, 1, array_filter([
                'color' => $isHardware ? $this->hardwareColors[array_rand($this->hardwareColors)] : null,
                'build_key' => $buildKey,
            ]));
        }

        $this->tally['builds']++;

        return $lines;
    }

    private function apparelLine(): ?array
    {
        $variant = ProductVariant::query()->where('is_active', true)->where('stock', '>', 0)
            ->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->with('product')->inRandomOrder()->first();

        return $variant ? $this->line($variant, min($variant->stock, random_int(1, 2))) : null;
    }

    /** A part bought on its own from /parts. */
    private function partLine(): ?array
    {
        $part = SkateboardComponent::query()->active()->inStock()->inRandomOrder()->first();

        if (! $part) {
            return null;
        }

        $color = in_array($part->type, [SkateboardComponent::TYPE_TRUCKS, SkateboardComponent::TYPE_BOLTS], true) && random_int(0, 1)
            ? $this->hardwareColors[array_rand($this->hardwareColors)]
            : null;

        return $this->line($part, 1, $color ? ['color' => $color] : []);
    }

    private function line($purchasable, int $quantity, array $customization = []): array
    {
        $price = $purchasable->currentPriceCentavos();

        return [
            'purchasable_type' => get_class($purchasable),
            'purchasable_id' => $purchasable->id,
            'name_snapshot' => $purchasable->displayName(),
            'unit_price_centavos' => $price,
            'quantity' => $quantity,
            'line_total_centavos' => $price * $quantity,
            'customization' => $customization ?: null,
        ];
    }

    /**
     * Monthly delivery: anything at or under its threshold is topped back up.
     * A direct stock write is an admin-style restock, not a sale, so it does
     * not go through InventoryService (same rule as Admin\ProductVariantController).
     */
    private function restock(): void
    {
        foreach ([ProductVariant::class, SkateboardComponent::class] as $model) {
            $model::query()->whereColumn('stock', '<=', 'low_stock_threshold')->get()
                ->each(fn ($row) => $row->forceFill(['stock' => $row->stock + random_int(12, 25)])->saveQuietly());
        }
    }

    /** The hex values from the real swatch list — one source of truth. */
    private function loadHardwareColors(): array
    {
        preg_match_all('/#[0-9a-fA-F]{6}/', file_get_contents(resource_path('js/Components/Customizer/hardwareColors.js')), $m);

        return array_values(array_unique(array_map('strtolower', $m[0])));
    }

    /** Raw update — Eloquent would re-stamp timestamps with the real now(). */
    private function stamp($model, array $values, string $table = 'orders'): void
    {
        DB::table($table)->where('id', $model->id)->update($values);
    }
}
