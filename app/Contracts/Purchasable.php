<?php

namespace App\Contracts;

/**
 * Anything that can sit on an order line and carry stock.
 *
 * Implemented by ProductVariant (apparel) and SkateboardComponent (skate
 * parts). InventoryService depends on this rather than the concrete models so
 * the stock-commit logic is written once.
 */
interface Purchasable
{
    /** Price for one unit, in centavos. Never pesos, never a float. */
    public function currentPriceCentavos(): int;

    /** Human label snapshotted onto the order line at purchase time. */
    public function displayName(): string;

    /** Current stock on hand. */
    public function availableStock(): int;

    /** Is stock at or below the restock threshold? (Objective 4.) */
    public function isLowStock(): bool;
}
