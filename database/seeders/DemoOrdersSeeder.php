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
 * Realistic-looking order history so the admin dashboard's charts (30-day
 * revenue trend, apparel-vs-skateboard split, top products, restock alerts)
 * have something real to plot instead of sitting empty. Deliberately NOT
 * called from DatabaseSeeder::run() — a plain `migrate:fresh --seed` should
 * still give the clean 39-product/3-account baseline every test and every
 * other piece of documentation assumes. Run this one on its own, on top of
 * that baseline, whenever demo data is wanted:
 *
 *   php artisan db:seed --class=DemoOrdersSeeder
 *
 * Every order goes through the SAME InventoryService::commitForPaidOrder()
 * path a real payment does — stock genuinely decrements, low-stock alerts
 * genuinely trip, "top products" genuinely reflects what got "sold". The
 * only thing faked is the clock: order/paid timestamps are backdated across
 * the last 45 days via a raw (non-Eloquent) update afterward, since
 * InventoryService always stamps paid_at with the real now() — real
 * business logic is not touched to make that possible.
 *
 * Safe to re-run: it only ever adds new orders/customers, never touches or
 * deletes existing rows, so running it twice just doubles the order volume
 * rather than corrupting anything.
 */
class DemoOrdersSeeder extends Seeder
{
    /** Real Albay-area barangay/city/province/postal_code combinations —
     *  same province the shop's own three branches are actually in (see
     *  CLAUDE.md), not invented geography. */
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

    public function run(InventoryService $inventory): void
    {
        $customers = User::factory()->count(15)->create(['role' => User::ROLE_CUSTOMER]);

        $standingCustomer = User::query()->where('email', 'customer@syndicate.test')->first();
        if ($standingCustomer) {
            $customers->push($standingCustomer);
        }

        $today = Carbon::today();
        $created = 0;
        $paid = 0;

        for ($daysAgo = 44; $daysAgo >= 0; $daysAgo--) {
            $day = $today->copy()->subDays($daysAgo);

            // 0-5 orders on a normal day; today and yesterday are floored at
            // 3 so the dashboard's real vs-yesterday trend badge always has
            // something on both sides to compare, not a lopsided 0.
            $ordersToday = random_int(0, 5);
            if ($daysAgo <= 1) {
                $ordersToday = max($ordersToday, 3);
            }

            for ($i = 0; $i < $ordersToday; $i++) {
                $customer = $customers->random();
                $placedAt = $day->copy()->setTime(random_int(9, 20), random_int(0, 59));
                if ($placedAt->greaterThan(now())) {
                    $placedAt = now()->copy();
                }

                $order = $this->buildOrder($customer, $placedAt);
                if (! $order) {
                    continue;
                }

                $created++;
                $roll = random_int(1, 100);
                // Force today/yesterday toward paid so the trend badge has
                // real revenue on both sides, not a coin-flip of zeroes.
                $shouldPay = $roll <= 65 || $daysAgo <= 1;

                if ($shouldPay) {
                    try {
                        $order = $inventory->commitForPaidOrder($order);
                    } catch (InsufficientStockException $e) {
                        // Ran out of something mid-seed — leave this one as
                        // the awaiting_payment order it already is rather
                        // than crash the whole run over one exhausted item.
                        continue;
                    }

                    $paidAt = $placedAt->copy()->addMinutes(random_int(5, 240));
                    if ($paidAt->greaterThan(now())) {
                        $paidAt = now()->copy();
                    }

                    DB::table('orders')->where('id', $order->id)->update([
                        'paid_at' => $paidAt,
                        'updated_at' => $paidAt,
                    ]);
                    $paid++;

                    // Some older paid orders have since been handed over.
                    if ($daysAgo >= 3 && random_int(1, 100) <= 40) {
                        DB::table('orders')->where('id', $order->id)->update([
                            'status' => Order::STATUS_FULFILLED,
                        ]);
                    }
                } elseif ($roll > 92) {
                    // A customer who never paid, and the order got called off
                    // — the one transition Shop\OrderController::cancel()
                    // (and its admin equivalent) actually allow.
                    DB::table('orders')->where('id', $order->id)->update([
                        'status' => Order::STATUS_CANCELLED,
                    ]);
                }
                // else: stays awaiting_payment, an abandoned/unpaid cart.
            }
        }

        $this->command?->info("DemoOrdersSeeder: created {$created} orders ({$paid} paid) across the last 45 days.");
    }

    /**
     * Builds and persists one order (status starts awaiting_payment, exactly
     * like a real checkout) with 1-3 real line items priced off live
     * product/component data. Returns null if nothing sellable was in stock
     * to put in it — happens naturally as the run decrements real stock.
     */
    private function buildOrder(User $customer, Carbon $placedAt): ?Order
    {
        $lineCount = random_int(1, 3);
        $lines = [];

        for ($i = 0; $i < $lineCount; $i++) {
            $line = $this->pickLine();
            if ($line) {
                $lines[] = $line;
            }
        }

        if ($lines === []) {
            return null;
        }

        $subtotal = array_sum(array_map(
            fn ($line) => $line['unit_price_centavos'] * $line['quantity'],
            $lines
        ));

        $attributes = [
            'order_number' => 'SYN-'.$placedAt->format('Ymd').'-'.strtoupper(Str::random(6)),
            'user_id' => $customer->id,
            'status' => Order::STATUS_AWAITING_PAYMENT,
            'subtotal_centavos' => $subtotal,
            'total_centavos' => $subtotal,
            'customer_name' => $customer->name,
            'customer_email' => $customer->email,
            'customer_phone' => $this->randomPhone(),
            'notes' => random_int(1, 100) <= 30 ? 'Pickup at the shop.' : null,
        ];

        // Roughly half of demo orders carry a delivery address, half stay
        // pickup-only — matching the real shop's pickup-first pattern (see
        // the address migration's own docblock) rather than defaulting
        // every order to one or the other.
        if (random_int(1, 100) <= 50) {
            $address = self::ADDRESSES[array_rand(self::ADDRESSES)];
            $attributes['address_line'] = random_int(1, 999).' '.self::STREET_NAMES[array_rand(self::STREET_NAMES)];
            $attributes['barangay'] = $address['barangay'];
            $attributes['city'] = $address['city'];
            $attributes['province'] = $address['province'];
            $attributes['postal_code'] = $address['postal_code'];
        }

        $order = Order::create($attributes);

        foreach ($lines as $line) {
            OrderItem::create([
                'order_id' => $order->id,
                'purchasable_type' => $line['type'],
                'purchasable_id' => $line['id'],
                'name_snapshot' => $line['name'],
                'unit_price_centavos' => $line['unit_price_centavos'],
                'quantity' => $line['quantity'],
                'line_total_centavos' => $line['unit_price_centavos'] * $line['quantity'],
            ]);
        }

        // Eloquent's create() always stamps created_at/updated_at with the
        // real now() — overwrite with a raw (non-Eloquent) update so the
        // order actually lands on the historical day it's meant to.
        DB::table('orders')->where('id', $order->id)->update([
            'created_at' => $placedAt,
            'updated_at' => $placedAt,
        ]);

        return $order->fresh();
    }

    /**
     * One line: ~75% apparel (a ProductVariant), ~25% a standalone
     * skateboard part — both real Purchasable rows, queried fresh every
     * pick so a stock count another line in this same run just decremented
     * is never sold twice. Quantity is capped at whatever's actually left.
     *
     * @return array{type: class-string, id: int, name: string, unit_price_centavos: int, quantity: int}|null
     */
    private function pickLine(): ?array
    {
        if (random_int(1, 100) <= 75) {
            $variant = ProductVariant::query()
                ->where('is_active', true)
                ->where('stock', '>', 0)
                ->with('product')
                ->inRandomOrder()
                ->first();

            if (! $variant) {
                return null;
            }

            return [
                'type' => ProductVariant::class,
                'id' => $variant->id,
                'name' => $variant->displayName(),
                'unit_price_centavos' => $variant->currentPriceCentavos(),
                'quantity' => min($variant->stock, random_int(1, 3)),
            ];
        }

        $component = SkateboardComponent::query()
            ->active()
            ->inStock()
            ->inRandomOrder()
            ->first();

        if (! $component) {
            return null;
        }

        return [
            'type' => SkateboardComponent::class,
            'id' => $component->id,
            'name' => $component->displayName(),
            'unit_price_centavos' => $component->currentPriceCentavos(),
            'quantity' => min($component->stock, random_int(1, 2)),
        ];
    }

    /** PH mobile format, matches CheckoutRequest's own validation pattern. */
    private function randomPhone(): string
    {
        return sprintf(
            '09%02d %03d %04d',
            random_int(0, 99),
            random_int(0, 999),
            random_int(0, 9999)
        );
    }
}
