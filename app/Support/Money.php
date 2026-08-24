<?php

namespace App\Support;

/**
 * The one place peso <-> centavos conversion happens. Forms accept pesos
 * (what a human types); the DB stores centavos (what PayMongo speaks). Doing
 * this conversion ad-hoc in multiple controllers is how rounding drift and
 * float bugs creep into money handling.
 */
class Money
{
    public static function toCentavos(string|float|int $pesos): int
    {
        return (int) round(((float) $pesos) * 100);
    }

    public static function toPesos(int $centavos): float
    {
        return $centavos / 100;
    }

    public static function format(int $centavos): string
    {
        return '₱'.number_format(self::toPesos($centavos), 2);
    }
}
