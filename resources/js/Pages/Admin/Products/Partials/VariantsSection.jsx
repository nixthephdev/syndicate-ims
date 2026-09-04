import Card from '@/Components/Admin/Card';
import AddVariantForm from './AddVariantForm';
import VariantRow from './VariantRow';

export default function VariantsSection({ productId, variants }) {
    return (
        <Card className="mt-8">
            <div className="px-6 py-4 border-b border-white/10 admin-light:border-ink-900/10">
                <h2 className="font-semibold text-white admin-light:text-ink-900">Variants</h2>
                <p className="text-sm text-white/40 admin-light:text-ink-900/50">
                    Size/colour combinations. This is where actual stock lives — a product with no variants has nothing to sell.
                </p>
            </div>

            {variants.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 admin-light:divide-ink-900/10">
                        <thead className="bg-white/[0.04] admin-light:bg-ink-900/[0.04]">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-white/40 uppercase admin-light:text-ink-900/50">Size / Color</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-white/40 uppercase admin-light:text-ink-900/50">SKU</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-white/40 uppercase admin-light:text-ink-900/50">Price</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-white/40 uppercase admin-light:text-ink-900/50">Stock</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-white/40 uppercase admin-light:text-ink-900/50">Threshold</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-white/40 uppercase admin-light:text-ink-900/50">Status</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 admin-light:divide-ink-900/10">
                            {variants.map((variant) => (
                                <VariantRow key={variant.id} productId={productId} variant={variant} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <AddVariantForm productId={productId} />
        </Card>
    );
}
