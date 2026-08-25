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
            $user->save();
        }
    }

    /**
     * Twelve products per apparel type (tees, hoodies, caps) so the shop has
     * enough depth to actually browse and to demo the type sections with.
     *
     * Only the first product in each type carries one of the client's real
     * photos (see public/images/lookbook/) — there are only three real shots
     * to go around. The rest are seeded with image_path null on purpose,
     * which the storefront already renders as a labelled placeholder block
     * (see Storefront/Shop/Index.jsx) rather than a fake product photo.
     */
    private function seedApparel(): void
    {
        if (Product::query()->exists()) {
            return; // Idempotent — don't pile up duplicates on re-seed.
        }

        $this->seedType(Product::TYPE_TEE, [
            ['Syndicate Box Logo Tee', 89900, '/images/lookbook/love-your-mind-tee.jpg', 'Heavyweight cotton tee with the Syndicate chest mark. Boxy fit, ribbed collar, built to survive a bail.'],
            ['Core Logo Tee — Black', 79900],
            ['Core Logo Tee — White', 79900],
            ['Flame Graphic Tee', 84900],
            ['Skate Or Die Tee', 84900],
            ['Minimal Wordmark Tee', 74900],
            ['Street Stripe Tee', 79900],
            ['Faded Wash Tee', 89900],
            ['Pocket Tee — Olive', 74900],
            ['Long Sleeve Tee', 94900],
            ['Tie-Dye Tee', 99900],
            ['Oversized Tee — Grey', 89900],
        ], ['S', 'M', 'L', 'XL'], ['Black', 'White']);

        $this->seedType(Product::TYPE_HOODIE, [
            ['Supply Co. Hoodie', 199900, '/images/lookbook/varsity-hoodie.jpg', 'Full-zip varsity hoodie in brushed fleece. Embroidered brain mark on the chest, contrast sleeves.'],
            ['Pullover Hoodie — Charcoal', 179900],
            ['Zip-Up Hoodie — Black', 189900],
            ['Flame Graphic Hoodie', 194900],
            ['Heavyweight Hoodie — Bone', 209900],
            ['Crewneck Sweatshirt', 169900],
            ['Embroidered Logo Hoodie', 199900],
            ['Tie-Dye Hoodie', 219900],
            ['Oversized Hoodie — Olive', 199900],
            ['Half-Zip Hoodie', 184900],
            ['Skate Or Die Hoodie', 194900],
            ['Wordmark Hoodie — Grey', 179900],
        ], ['S', 'M', 'L', 'XL'], ['Black', 'White']);

        // Headwear — caps, snapbacks, beanies. Sized "One Size" rather than
        // S/M/L/XL: the seeded description already said as much and the old
        // seeder contradicted it by generating apparel-style size variants.
        $this->seedType(Product::TYPE_CAP, [
            ['Legazpi Skate Crew Cap', 59900, '/images/lookbook/flame-tee-cap.jpg', 'Six-panel cap with an embroidered flame mark and an adjustable strap. One size, wears low.'],
            ['Flame Snapback', 64900],
            ['Six-Panel Cap — Black', 59900],
            ['Dad Cap — Khaki', 54900],
            ['Embroidered Brain Cap', 64900],
            ['Corduroy Cap', 69900],
            ['Mesh Trucker Cap', 54900],
            ['Low-Profile Cap — Navy', 59900],
            ['Bucket Hat', 64900],
            ['Beanie — Black', 49900],
            ['Wordmark Cap — White', 59900],
            ['Flame Bucket Hat', 69900],
        ], ['One Size'], ['Black', 'White', 'Olive', 'Navy']);
    }

    /**
     * @param  array<int, array{0: string, 1: int, 2?: string, 3?: string}>  $catalogue  [name, price_centavos, image_path?, description?]
     * @param  string[]  $sizes
     * @param  string[]  $colors
     */
    private function seedType(string $type, array $catalogue, array $sizes, array $colors): void
    {
        foreach ($catalogue as $entry) {
            [$name, $price, $image, $description] = array_pad($entry, 4, null);

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
                foreach ($colors as $color) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'size' => $size,
                        'color' => $color,
                        // Product id, not a slug fragment — several names in
                        // this catalogue share their first six slug
                        // characters ("Core Logo Tee — Black/White" both give
                        // "core-l"), which collided against the SKU's unique
                        // index. The id can't collide.
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
}
