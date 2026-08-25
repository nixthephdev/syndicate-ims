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

    /**
     * The browsable apparel subcategory — separate from `category`, which is
     * the coarser apparel/skateboard split. Only meaningful within apparel,
     * so the column is nullable rather than forcing skateboard products
     * through the same list.
     */
    public const TYPE_TEE = 'tee';
    public const TYPE_HOODIE = 'hoodie';
    public const TYPE_CAP = 'cap';

    public const TYPES = [
        self::TYPE_TEE,
        self::TYPE_HOODIE,
        self::TYPE_CAP,
    ];

    public const TYPE_LABELS = [
        self::TYPE_TEE => 'Tees',
        self::TYPE_HOODIE => 'Hoodies',
        self::TYPE_CAP => 'Caps',
    ];

    protected $fillable = [
        'name',
        'slug',
        'description',
        'category',
        'type',
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

    public function scopeType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }
}
