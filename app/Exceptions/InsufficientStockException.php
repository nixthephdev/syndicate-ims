<?php

namespace App\Exceptions;

use App\Contracts\Purchasable;
use RuntimeException;

/**
 * Thrown when stock ran out between adding to cart and confirming payment.
 *
 * The cart does not reserve stock (see DECISIONS.md), so two shoppers can race
 * for the last item. The loser gets this, and it must surface as a readable
 * checkout failure — never a silent oversell.
 *
 * NOTE: plain promoted properties, not readonly — readonly is PHP 8.1+ and
 * this project runs on 8.0.30.
 */
class InsufficientStockException extends RuntimeException
{
    public function __construct(
        public string $itemName,
        public int $requested,
        public int $available
    ) {
        parent::__construct(sprintf(
            'Insufficient stock for "%s": %d requested, %d available.',
            $itemName,
            $requested,
            $available
        ));
    }

    public static function for(Purchasable $item, int $requested): self
    {
        return new self($item->displayName(), $requested, $item->availableStock());
    }
}
