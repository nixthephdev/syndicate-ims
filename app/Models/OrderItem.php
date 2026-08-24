<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One line on an order. purchasable is either a ProductVariant or a
 * SkateboardComponent — both implement Purchasable.
 *
 * name_snapshot and unit_price_centavos are copies taken at purchase time.
 * Never render an order from the live product record: prices and names change,
 * and a receipt must show what was actually bought.
 */
class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'purchasable_type',
        'purchasable_id',
        'name_snapshot',
        'unit_price_centavos',
        'quantity',
        'line_total_centavos',
        'customization',
    ];

    protected $casts = [
        'unit_price_centavos' => 'integer',
        'quantity' => 'integer',
        'line_total_centavos' => 'integer',
        'customization' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function purchasable(): MorphTo
    {
        return $this->morphTo();
    }
}
