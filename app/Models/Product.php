<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    /** Class constants, not enums — PHP 8.0. */
    public const CATEGORY_APPAREL = 'apparel';
    public const CATEGORY_SKATEBOARD = 'skateboard';

    public const CATEGORIES = [
        self::CATEGORY_APPAREL,
        self::CATEGORY_SKATEBOARD,
    ];

    protected $fillable = [
        'name',
        'slug',
        'description',
        'category',
        'base_price_centavos',
        'image_path',
        'is_active',
    ];

    protected $casts = [
        'base_price_centavos' => 'integer',
        'is_active' => 'boolean',
    ];

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /** Total stock across every variant. */
    public function totalStock(): int
    {
        return (int) $this->variants()->sum('stock');
    }

    public function isApparel(): bool
    {
        return $this->category === self::CATEGORY_APPAREL;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }
}
