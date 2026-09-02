<?php

namespace App\Models;

use App\Contracts\Purchasable;
use App\Models\Concerns\TracksStock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * One selectable skateboard part, backed by a named mesh inside one of the
 * client's two .glb files.
 *
 * The customizer works by toggling mesh VISIBILITY over baked variants — it is
 * not free assembly with arbitrary colours. See public/models/README.md.
 */
class SkateboardComponent extends Model implements Purchasable
{
    use HasFactory, TracksStock;

    public const TYPE_DECK = 'deck';
    public const TYPE_WHEELS = 'wheels';
    public const TYPE_TRUCKS = 'trucks';
    public const TYPE_BOLTS = 'bolts';

    /**
     * No bearings and no grip tape: the supplied .glb files contain no such
     * meshes. Do not add them here without the assets to back them.
     */
    public const TYPES = [
        self::TYPE_DECK,
        self::TYPE_WHEELS,
        self::TYPE_TRUCKS,
        self::TYPE_BOLTS,
    ];

    public const TYPE_LABELS = [
        self::TYPE_DECK => 'Deck',
        self::TYPE_WHEELS => 'Wheels',
        self::TYPE_TRUCKS => 'Trucks',
        self::TYPE_BOLTS => 'Bolts',
    ];

    public const GLB_BOARD = 'board.glb';
    public const GLB_WHEELS = 'wheels.glb';

    protected $fillable = [
        'type',
        'name',
        'slug',
        'glb_file',
        'mesh_name',
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

    public function orderItems(): MorphMany
    {
        return $this->morphMany(OrderItem::class, 'purchasable');
    }

    public function currentPriceCentavos(): int
    {
        return (int) $this->price_centavos;
    }

    public function displayName(): string
    {
        return $this->name;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }
}
