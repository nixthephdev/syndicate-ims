<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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

    /** A few apparel products with size/colour variants to browse. */
    private function seedApparel(): void
    {
        if (Product::query()->exists()) {
            return; // Idempotent — don't pile up duplicates on re-seed.
        }

        $catalogue = [
            ['Syndicate Box Logo Tee', 89900],
            ['Supply Co. Hoodie', 199900],
            ['Legazpi Skate Crew Cap', 59900],
        ];

        foreach ($catalogue as [$name, $price]) {
            $product = Product::create([
                'name' => $name,
                'slug' => \Illuminate\Support\Str::slug($name),
                'description' => 'Syndicate Supply Co. apparel.',
                'category' => Product::CATEGORY_APPAREL,
                'base_price_centavos' => $price,
                'is_active' => true,
            ]);

            foreach (['S', 'M', 'L', 'XL'] as $size) {
                foreach (['Black', 'White'] as $color) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'size' => $size,
                        'color' => $color,
                        'sku' => sprintf(
                            'SYN-%s-%s-%s',
                            strtoupper(substr($product->slug, 0, 6)),
                            $size,
                            strtoupper(substr($color, 0, 3))
                        ),
                        'stock' => 12,
                        'low_stock_threshold' => 4,
                        'is_active' => true,
                    ]);
                }
            }
        }
    }
}
