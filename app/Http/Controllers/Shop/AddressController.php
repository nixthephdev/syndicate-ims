<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Support\PhAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Feeds the address dropdowns one province at a time. The province list
 * itself rides along as a page prop; a province's cities and barangays are
 * fetched when one is picked, so nobody downloads all 42,000 barangays to
 * fill in one address.
 */
class AddressController extends Controller
{
    public function cities(Request $request): JsonResponse
    {
        $cities = PhAddress::citiesOf((string) $request->query('province'));

        abort_if($cities === null, 404);

        return response()->json($cities)
            // Government reference data; it changes a few times a decade.
            ->header('Cache-Control', 'public, max-age=86400');
    }
}
