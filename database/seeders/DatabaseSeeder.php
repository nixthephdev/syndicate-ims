<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $this->seedStaffAccounts();
        $this->call(SkateboardComponentSeeder::class);
        $this->seedApparel();
    }

    /**
     * Fixed logins for development and the defense demo.
     *
     * 'role' is not mass-assignable (see User::$fillable), so it is assigned
     * explicitly here — which is exactly the intended path for granting roles.
     */
    private function seedStaffAccounts(): void
    {
        $accounts = [
            ['admin@syndicate.test', 'Syndicate Admin', User::ROLE_ADMIN],
            ['staff@syndicate.test', 'Syndicate Staff', User::ROLE_STAFF],
            ['customer@syndicate.test', 'Test Customer', User::ROLE_CUSTOMER],
        ];

        foreach ($accounts as [$email, $name, $role]) {
            $user = User::firstOrNew(['email' => $email]);
            $user->name = $name;
            $user->password = Hash::make('password');
            $user->email_verified_at = now();
            $user->role = $role;
            // Pre-verified, or the seeded customer can't reach checkout at
            // all until somebody logs into /admin and approves an ID that
            // doesn't exist — which would make a fresh install look broken.
            $user->id_verification_status = User::ID_STATUS_APPROVED;
            $user->save();
        }
    }

    /**
     * Twelve products per apparel type (tees, hoodies, caps) so the shop has
     * enough depth to actually browse and to demo the type sections with.
     *
     * A growing subset carries one of the client's real photos (see
     * public/images/lookbook/, shared with the Home page lookbook — some
     * files do double duty as both). The rest are seeded with image_path
     * null on purpose, which the storefront already renders as a labelled
     * placeholder block (see Storefront/Shop/Index.jsx) rather than a fake
     * product photo. No hoodie photos exist yet — all 12 hoodie entries are
     * still placeholder.
     *
     * ONE colour per product, not a spread. An earlier version of this
     * seeder gave every product in a type the same fixed Black/White(/Olive/
     * Navy) spread regardless of what the product's own name/photo/
     * description actually said — so "Core Logo Tee — Black" still had a
     * White variant that did nothing on the product page (image_path is one
     * photo per PRODUCT, not per colour — see Storefront/Shop/Show.jsx).
     * Client confirmed every real design is one fixed colour. Each colour
     * below was determined from, in order: the product name, the
     * description text, or (for `varsity-hoodie.jpg`, `flame-tee-cap.jpg`,
     * `flame-snapback-cap.jpg`, `brain-cap-black.jpg`, `wordmark-cap-black.jpg`
     * — real photos with no name/desc colour signal) actually looking at the
     * photo. `tee-rack-night.jpg` and `dad-cap-shelf.jpg` are real rack/shelf
     * shots of several colourways together, not one purchasable option — the
     * old copy claimed "runs in black, white or navy" / "shown in red, black
     * and navy" for those; rewritten below now that there's one real colour.
     * No signal anywhere → Black, except the two Tie-Dye products, which
     * have no solid base colour to name.
     */
    private function seedApparel(): void
    {
        if (Product::query()->exists()) {
            return; // Idempotent — don't pile up duplicates on re-seed.
        }

        $this->seedType(Product::TYPE_TEE, [
            ['Syndicate Box Logo Tee', 89900, '/images/lookbook/love-your-mind-tee.jpg', 'Heavyweight cotton tee with the Syndicate chest mark. Boxy fit, ribbed collar, built to survive a bail.', 'White'],
            ['Core Logo Tee — Black', 79900, '/images/lookbook/core-tee-black.jpg', 'Plain block "Syndicate" wordmark on heavyweight black cotton. The one to grab when a graphic is too much.', 'Black'],
            ['Core Logo Tee — White', 79900, '/images/lookbook/core-tee-white.jpg', 'Same wordmark, white cotton, red print. Runs true, boxy through the body.', 'White'],
            ['Flame Graphic Tee', 84900, '/images/lookbook/tee-rack-night.jpg', 'Flame "S" chest print, screen printed, on black cotton.', 'Black'],
            ['Mind Matters Tee — Black', 84900, '/images/lookbook/mind-matters-tee-black.jpg', 'Bold "SYNDICATE / The Mind Is What Matters" badge print on heavyweight black cotton, back placement.', 'Black'],
            ['Peace By Plant Tee', 74900, '/images/lookbook/syndicate-cap-white-tee.jpg', '"SYND." peace-sign graphic on white cotton. Screen printed, soft hand, no scratch.', 'White'],
            ['Pretty Girls Love Syndicate Tee', 79900, '/images/lookbook/pretty-girls-tee.jpg', 'Red silhouette print on white cotton, straight off the shop\'s own capsule run.', 'White'],
            ['Beach Brain Tee — Mint', 89900, '/images/lookbook/mint-tee-rocks.jpg', 'Brain-mark "Supply Co." wordmark on mint cotton, oversized fit.', 'Mint'],
            ['Peace By Plant Tee — Green', 74900, '/images/lookbook/peace-by-plant-tee-green.jpg', 'Same "SYND. Peace By Plant" graphic, green cotton, oversized fit.', 'Green'],
            ['Mind Matters Tee — White', 94900, '/images/lookbook/mind-matters-tee-white.jpg', 'Same "SYNDICATE / The Mind Is What Matters" badge print, white cotton, back placement.', 'White'],
            ['Flame Graphic Tee — Navy', 99900, '/images/lookbook/flame-graphic-tee-navy.jpg', 'Flame "S" chest and back print, screen printed, on navy cotton.', 'Navy'],
            ['Beach Brain Tee — Pink', 89900, '/images/lookbook/pink-tee-shoreline.jpg', 'Same brain-mark "Supply Co." wordmark, pink colourway, oversized fit.', 'Pink'],
        ], ['S', 'M', 'L', 'XL']);

        $this->seedType(Product::TYPE_HOODIE, [
            ['Supply Co. Hoodie', 199900, '/images/lookbook/varsity-hoodie.jpg', 'Full-zip varsity hoodie in brushed fleece. Embroidered brain mark on the chest, contrast black sleeves.', 'Red'],
            ['Pullover Hoodie — Charcoal', 179900, null, null, 'Charcoal'],
            ['Zip-Up Hoodie — Black', 189900, null, null, 'Black'],
            ['Flame Graphic Hoodie', 194900, null, null, 'Black'],
            ['Heavyweight Hoodie — Bone', 209900, null, null, 'Bone'],
            ['Crewneck Sweatshirt', 169900, null, null, 'Black'],
            ['Embroidered Logo Hoodie', 199900, null, null, 'Black'],
            ['Tie-Dye Hoodie', 219900, null, null, 'Tie-Dye'],
            ['Oversized Hoodie — Olive', 199900, null, null, 'Olive'],
            ['Half-Zip Hoodie', 184900, null, null, 'Black'],
            ['Skate Or Die Hoodie', 194900, null, null, 'Black'],
            ['Wordmark Hoodie — Grey', 179900, null, null, 'Grey'],
        ], ['S', 'M', 'L', 'XL']);

        // Headwear — caps, snapbacks, beanies. Sized "One Size" rather than
        // S/M/L/XL: the seeded description already said as much and the old
        // seeder contradicted it by generating apparel-style size variants.
        $this->seedType(Product::TYPE_CAP, [
            ['Legazpi Skate Crew Cap', 59900, '/images/lookbook/flame-tee-cap.jpg', 'Six-panel cap with an embroidered flame mark and an adjustable strap. One size, wears low.', 'Black'],
            ['Flame Snapback', 64900, '/images/lookbook/flame-snapback-cap.jpg', 'Same flame mark, tone-on-tone embroidery, snapback closure.', 'White'],
            ['Wordmark Cap — Black', 59900, '/images/lookbook/wordmark-cap-black.jpg', 'Structured five-panel cap, embroidered "Syndicate" wordmark on the front panel.', 'Black'],
            ['Curved Brim Dad Cap', 54900, '/images/lookbook/dad-cap-shelf.jpg', 'Six-panel dad cap, curved brim, brain mark only — no wordmark. Black cotton twill.', 'Black'],
            ['Embroidered Brain Cap', 64900, '/images/lookbook/brain-cap-black.jpg', 'Five-panel cap, embroidered brain mark, zip-back pocket detail.', 'Black'],
            ['Bold Wordmark Cap — Red', 69900, '/images/lookbook/wordmark-cap-red-bold.jpg', 'Five-panel cap, bold embroidered "SYNDICATE" wordmark across the front panel, red cotton twill.', 'Red'],
            ['Brain Mark 5-Panel Cap — Black', 54900, '/images/lookbook/brain-mark-cap-black.jpg', 'Five-panel nylon cap, embroidered brain mark only, no wordmark. Black.', 'Black'],
            ['Low-Profile Cap — Navy', 59900, null, null, 'Navy'],
            ['Bucket Hat', 64900, null, null, 'Black'],
            ['Beanie — Black', 49900, null, null, 'Black'],
            ['Wordmark Cap — Red', 59900, '/images/lookbook/wordmark-cap-red.jpg', 'Same wordmark cap, red colourway.', 'Red'],
            ['Flame Snapback — Black', 69900, '/images/lookbook/flame-snapback-cap-black.jpg', 'Flame "S" mark embroidered on a black snapback, tone-on-tone stitching.', 'Black'],
        ], ['One Size']);

        // Small goods — keychains, straps. Real photos only exist in black.
        $this->seedType(Product::TYPE_ACCESSORY, [
            ['Brain Pattern Keychain', 15000, '/images/lookbook/brain-keychain.jpg', 'Woven strap keychain, repeating brain-mark print, black nylon carabiner clip.', 'Black'],
            ['Syndicate Wordmark Keychain', 15000, '/images/lookbook/wordmark-keychain.jpg', 'Woven strap keychain, "Syndicate" wordmark print, black nylon carabiner clip.', 'Black'],
            ['Syndicate Canvas Strap', 25000, '/images/lookbook/canvas-strap.jpg', 'Adjustable canvas strap with a metal slide buckle, brain-mark and wordmark print.', 'Black'],
        ], ['One Size']);
    }

    /**
     * @param  array<int, array{0: string, 1: int, 2?: ?string, 3?: ?string, 4: string}>  $catalogue  [name, price_centavos, image_path?, description?, colour]
     * @param  string[]  $sizes
     */
    private function seedType(string $type, array $catalogue, array $sizes): void
    {
        foreach ($catalogue as [$name, $price, $image, $description, $color]) {
            $product = Product::create([
                'name' => $name,
                'slug' => Str::slug($name),
                'description' => $description ?? sprintf(
                    'Syndicate Supply Co. %s. Placeholder listing — swap in real copy and photography when available.',
                    strtolower(Product::TYPE_LABELS[$type])
                ),
                'category' => Product::CATEGORY_APPAREL,
                'type' => $type,
                'base_price_centavos' => $price,
                'image_path' => $image,
                'is_active' => true,
            ]);

            foreach ($sizes as $size) {
                ProductVariant::create([
                    'product_id' => $product->id,
                    'size' => $size,
                    'color' => $color,
                    // Product id, not a slug fragment — several names in
                    // this catalogue share their first six slug characters
                    // ("Core Logo Tee — Black/White" both give "core-l"),
                    // which collided against the SKU's unique index. The id
                    // can't collide.
                    'sku' => sprintf(
                        'SYN-%04d-%s-%s',
                        $product->id,
                        strtoupper(substr(str_replace(' ', '', $size), 0, 3)),
                        strtoupper(substr($color, 0, 3))
                    ),
                    'stock' => random_int(4, 20),
                    'low_stock_threshold' => 4,
                    'is_active' => true,
                ]);
            }
        }
    }
}
