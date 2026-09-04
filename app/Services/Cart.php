<?php

namespace App\Services;

use App\Contracts\Purchasable;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use Illuminate\Contracts\Session\Session;
use Illuminate\Database\Eloquent\Model;

/**
 * The shopper's cart, stored in the session.
 *
 * The cart does NOT reserve stock — that is a deliberate project rule (see
 * CLAUDE.md). Quantities here are an intention to buy, nothing more. Stock is
 * only taken off the shelf by InventoryService when payment is confirmed, and
 * it re-checks availability inside its own transaction. Anything this class
 * reports about stock is advisory and already stale by the time it renders.
 *
 * Lines are keyed by "<class>#<id>" so a variant and a skate component can
 * never collide on a shared integer id.
 */
class Cart
{
    public const SESSION_KEY = 'cart';

    /**
     * Only these may enter a cart. An allow-list, not a Purchasable check:
     * the type name comes off untrusted request input, and resolving an
     * arbitrary class from it would be a deserialisation hole.
     *
     * @var array<string, class-string<Purchasable>>
     */
    public const PURCHASABLE_TYPES = [
        'variant' => ProductVariant::class,
        'component' => SkateboardComponent::class,
    ];

    private Session $session;

    public function __construct(Session $session)
    {
        $this->session = $session;
    }

    /** Resolve a public alias ("variant") to its model class, or null. */
    public static function classForAlias(string $alias): ?string
    {
        return self::PURCHASABLE_TYPES[$alias] ?? null;
    }

    /** The reverse — used when rendering a line back to the browser. */
    public static function aliasForClass(string $class): ?string
    {
        $flipped = array_flip(self::PURCHASABLE_TYPES);

        return $flipped[$class] ?? null;
    }

    public static function key(string $class, int $id): string
    {
        return $class.'#'.$id;
    }

    /**
     * Add quantity to a line, creating it if new.
     *
     * Adding the same item twice increases the quantity rather than making a
     * second line — otherwise the cart shows the same tee twice and the
     * shopper cannot tell the lines apart.
     *
     * $buildKey groups lines that were added together as one custom skateboard
     * build (see CustomizeController::store()) so the cart page can render
     * deck+wheels+trucks+bolts as a single entry. It is display metadata
     * only — checkout still creates one OrderItem per line either way, so
     * each part's stock keeps decrementing independently. If this call
     * merges into an existing line (same purchasable already in the cart),
     * the line's build_key is left as whatever it already was — first-write
     * wins, so a later custom build never silently reclassifies a part the
     * shopper already added on its own.
     *
     * $color is the /parts hardware colour swatch (Trucks/Bolts only — see
     * PartController) — unlike /customize's own bolts/trucks recolour, which
     * stays purely decorative and never reaches here, a standalone hardware
     * purchase's colour is a real fulfilment instruction, so it rides the
     * cart line through to OrderItem.customization at checkout. Same
     * first-write-wins merge rule as build_key, for the same reason.
     */
    public function add(Purchasable $item, int $quantity = 1, ?string $buildKey = null, ?string $color = null): void
    {
        /** @var Model $item */
        $key = self::key(get_class($item), (int) $item->getKey());
        $raw = $this->raw();

        $raw[$key] = [
            'type' => get_class($item),
            'id' => (int) $item->getKey(),
            'quantity' => ($raw[$key]['quantity'] ?? 0) + $quantity,
            'build_key' => $raw[$key]['build_key'] ?? $buildKey,
            'color' => $raw[$key]['color'] ?? $color,
        ];

        $this->put($raw);
    }

    /** Set an exact quantity. Zero or less removes the line. */
    public function update(string $key, int $quantity): void
    {
        $raw = $this->raw();

        if (! isset($raw[$key])) {
            return;
        }

        if ($quantity < 1) {
            unset($raw[$key]);
        } else {
            $raw[$key]['quantity'] = $quantity;
        }

        $this->put($raw);
    }

    public function remove(string $key): void
    {
        $raw = $this->raw();
        unset($raw[$key]);
        $this->put($raw);
    }

    public function clear(): void
    {
        $this->session->forget(self::SESSION_KEY);
    }

    public function isEmpty(): bool
    {
        return $this->raw() === [];
    }

    /**
     * Total units in the cart — what the header badge shows.
     *
     * A custom build's 4 component rows (deck/wheels/trucks/bolts, sharing
     * one build_key — see add()) count as ONE unit per board, not four: the
     * cart page already shows them as a single "Custom Board" line, and the
     * badge disagreeing with that (showing 4 for what reads as 1 item) is
     * exactly the confusion grouping was meant to fix. Every member row of a
     * build always carries the same quantity (the group's stepper sets them
     * together), so counting the first one seen per build_key and skipping
     * the rest is correct, not an approximation.
     */
    public function count(): int
    {
        $seenBuildKeys = [];
        $total = 0;

        foreach ($this->raw() as $row) {
            $buildKey = $row['build_key'] ?? null;

            if ($buildKey !== null) {
                if (isset($seenBuildKeys[$buildKey])) {
                    continue;
                }

                $seenBuildKeys[$buildKey] = true;
            }

            $total += (int) $row['quantity'];
        }

        return $total;
    }

    public function subtotalCentavos(): int
    {
        return array_sum(array_column($this->lines(), 'line_total_centavos'));
    }

    /**
     * Hydrate every line against the database.
     *
     * Prices are read live here, NOT stored in the session: a session can sit
     * for days, and charging an old price because it was cached in a cookie is
     * a real bug. Snapshotting happens at checkout, onto the order.
     *
     * Lines whose product has since been deleted or deactivated are dropped
     * from the session as a side effect — leaving them would let a shopper
     * carry a dead item all the way to checkout.
     *
     * @return array<int, array<string, mixed>>
     */
    public function lines(): array
    {
        $raw = $this->raw();

        if ($raw === []) {
            return [];
        }

        $models = $this->loadModels($raw);
        $lines = [];
        $pruned = false;

        foreach ($raw as $key => $row) {
            $model = $models[$key] ?? null;

            if (! $model) {
                unset($raw[$key]);
                $pruned = true;

                continue;
            }

            $unit = $model->currentPriceCentavos();
            $quantity = (int) $row['quantity'];

            $lines[] = [
                'key' => $key,
                'type' => self::aliasForClass($row['type']),
                'id' => $row['id'],
                'name' => $model->displayName(),
                'unit_price_centavos' => $unit,
                'quantity' => $quantity,
                'line_total_centavos' => $unit * $quantity,
                // Null for everything except lines added together as one
                // custom skateboard build — see add()'s docblock.
                'build_key' => $row['build_key'] ?? null,
                // Null except a /parts hardware line with a colour picked —
                // see add()'s docblock.
                'color' => $row['color'] ?? null,
                // Advisory only — the cart does not reserve. Checkout
                // re-checks behind a row lock and is the real answer.
                'available_stock' => $model->availableStock(),
                'exceeds_stock' => $quantity > $model->availableStock(),
            ];
        }

        if ($pruned) {
            $this->put($raw);
        }

        return $lines;
    }

    /**
     * Load every cart line's model, grouped by type so each type costs one
     * query rather than one per line.
     *
     * @param  array<string, array<string, mixed>>  $raw
     * @return array<string, Purchasable>
     */
    private function loadModels(array $raw): array
    {
        $idsByType = [];

        foreach ($raw as $row) {
            $idsByType[$row['type']][] = (int) $row['id'];
        }

        $found = [];

        foreach ($idsByType as $class => $ids) {
            if (! in_array($class, self::PURCHASABLE_TYPES, true)) {
                continue;
            }

            $query = $class::query()->whereKey($ids);

            // Eager-load the parent so currentPriceCentavos() can fall back to
            // the product's base price without an N+1.
            if ($class === ProductVariant::class) {
                $query->with('product')->where('is_active', true);
            }

            foreach ($query->get() as $model) {
                $found[self::key($class, (int) $model->getKey())] = $model;
            }
        }

        return $found;
    }

    /** @return array<string, array<string, mixed>> */
    private function raw(): array
    {
        $raw = $this->session->get(self::SESSION_KEY, []);

        return is_array($raw) ? $raw : [];
    }

    /** @param  array<string, array<string, mixed>>  $raw */
    private function put(array $raw): void
    {
        if ($raw === []) {
            $this->session->forget(self::SESSION_KEY);

            return;
        }

        $this->session->put(self::SESSION_KEY, $raw);
    }
}
