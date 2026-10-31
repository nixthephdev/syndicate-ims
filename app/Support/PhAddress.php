<?php

namespace App\Support;

/**
 * The Philippine province -> city/municipality -> barangay list behind the
 * checkout address dropdowns (client, 2026-10-31: typed addresses were
 * "prone to human error").
 *
 * Source: the PSA's Philippine Standard Geographic Code, via the
 * psgc.gitlab.io API, baked into resources/data/ph-address/ — see the README
 * there. Shipped as files, not fetched live, because a handover install has
 * no guaranteed internet and checkout must not depend on someone else's API.
 *
 * Orders still store the NAMES, not PSGC codes: the columns already held
 * names, staff read them as an address, and every order placed before this
 * existed has names only.
 */
class PhAddress
{
    public const INVALID_MESSAGE = 'Pick your province, city and barangay from the lists.';

    public const ZIP_MESSAGE = 'Pick the ZIP code for your area from the list.';

    /**
     * Fill in the ZIP when the city has exactly one, and check a given ZIP
     * belongs to the city when we know its codes (client, 2026-10-31: typed
     * addresses were "prone to human error"). Returns the address with
     * postal_code settled, or null when the ZIP is wrong for that city.
     *
     * @param  array<string, mixed>  $address
     */
    public static function settleZip(array $address): ?array
    {
        $known = self::zipsFor($address['province'] ?? null, $address['city'] ?? null);
        $zip = $address['postal_code'] ?? null;

        if (count($known) === 1) {
            $address['postal_code'] = $known[0];
        } elseif ($known !== [] && ! in_array($zip, $known, true)) {
            // Several postal areas: the customer picks theirs from the list.
            return null;
        }

        return $address;
    }

    private static ?array $provinces = null;

    private static array $cities = [];

    /** @return array<int, array{code: string, name: string}> */
    public static function provinces(): array
    {
        return self::$provinces ??= self::read('provinces.json');
    }

    /**
     * Cities/municipalities of one province, each with its barangays.
     *
     * @return array<int, array{name: string, barangays: array<int, string>}>|null
     */
    public static function citiesOf(string $provinceName): ?array
    {
        $province = collect(self::provinces())->firstWhere('name', $provinceName);

        if (! $province) {
            return null;
        }

        return self::$cities[$province['code']] ??= self::read($province['code'].'.json');
    }

    /**
     * Does this province/city/barangay trio actually exist, and nest the way
     * it claims to? The dropdowns only ever offer real combinations; this is
     * for a POST that didn't come from them.
     */
    public static function isValid(?string $province, ?string $city, ?string $barangay): bool
    {
        $cities = $province ? self::citiesOf($province) : null;
        $match = $cities ? collect($cities)->firstWhere('name', $city) : null;

        return $match !== null && in_array($barangay, $match['barangays'], true);
    }

    /**
     * The ZIP code(s) known for a city/municipality — one for almost every
     * town, several for big cities split into postal areas (Manila, Quezon
     * City), none for the ~60 places whose GeoNames spelling didn't match
     * PSGC's (see the README). Empty means "unknown, let them type it".
     *
     * @return array<int, string>
     */
    public static function zipsFor(?string $province, ?string $city): array
    {
        $cities = $province ? self::citiesOf($province) : null;
        $match = $cities ? collect($cities)->firstWhere('name', $city) : null;

        return collect($match['zips'] ?? [])
            ->map(fn ($zip) => is_array($zip) ? $zip['code'] : $zip)
            ->all();
    }

    private static function read(string $file): array
    {
        return json_decode(file_get_contents(resource_path('data/ph-address/'.$file)), true);
    }
}
