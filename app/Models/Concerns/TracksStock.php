<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Stock behaviour shared by ProductVariant and SkateboardComponent.
 *
 * Deliberately contains NO decrement method. Stock is only ever reduced by
 * InventoryService inside a DB transaction with a row lock — exposing a loose
 * $model->decrementStock() invites callers to do it unsafely.
 */
trait TracksStock
{
    public function availableStock(): int
    {
        return (int) $this->stock;
    }

    public function isLowStock(): bool
    {
        return $this->availableStock() <= (int) $this->low_stock_threshold;
    }

    public function isOutOfStock(): bool
    {
        return $this->availableStock() <= 0;
    }

    /** Items at or below their restock threshold — drives the admin alert. */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('stock', '<=', 'low_stock_threshold');
    }

    public function scopeInStock(Builder $query): Builder
    {
        return $query->where('stock', '>', 0);
    }
}
