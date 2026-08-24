<?php

namespace App\Models;

use App\Contracts\Purchasable;
use App\Models\Concerns\TracksStock;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * A specific size/colour of an apparel product. This is where apparel stock
 * actually lives — Product itself holds no stock.
 */
class ProductVariant extends Model implements Purchasable
{
    use HasFactory, TracksStock;

    protected $fillable = [
        'product_id',
        'size',
        'color',
        'sku',
        'price_centavos',
        'stock',
        'low_stock_threshold',
        'is_active',
    ];

    protected $casts = [
        'price_centavos' => 'integer',
        'stock' => 'integer',
        'low_stock_threshold' => 'integer',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function orderItems(): MorphMany
    {
        return $this->morphMany(OrderItem::class, 'purchasable');
    }

    /** Falls back to the parent product's base price when not overridden. */
    public function currentPriceCentavos(): int
    {
        return (int) ($this->price_centavos ?? $this->product->base_price_centavos);
    }

    public function displayName(): string
    {
        $parts = array_filter([$this->size, $this->color]);

        return $parts
            ? sprintf('%s (%s)', $this->product->name, implode(' / ', $parts))
            : $this->product->name;
    }
}
