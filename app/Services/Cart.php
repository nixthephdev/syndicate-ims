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
     */
    public function add(Purchasable $item, int $quantity = 1): void
    {
        /** @var Model $item */
        $key = self::key(get_class($item), (int) $item->getKey());
        $raw = $this->raw();

        $raw[$key] = [
            'type' => get_class($item),
            'id' => (int) $item->getKey(),
            'quantity' => ($raw[$key]['quantity'] ?? 0) + $quantity,
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

    /** Total units in the cart — what the header badge shows. */
    public function count(): int
    {
        return array_sum(array_column($this->raw(), 'quantity'));
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
