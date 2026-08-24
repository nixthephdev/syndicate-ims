import AddVariantForm from './AddVariantForm';
import VariantRow from './VariantRow';
import { usePage } from '@inertiajs/react';

export default function VariantsSection({ productId, variants }) {
    const { errors } = usePage().props;

    return (
        <div className="bg-white rounded-lg border border-gray-200 mt-8">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Variants</h2>
                <p className="text-sm text-gray-500">
                    Size/colour combinations. This is where actual stock lives — a product with no variants has nothing to sell.
                </p>
            </div>

            {errors.variant && (
                <div className="mx-6 mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                    {errors.variant}
                </div>
            )}

            {variants.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size / Color</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {variants.map((variant) => (
                                <VariantRow key={variant.id} productId={productId} variant={variant} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <AddVariantForm productId={productId} />
        </div>
    );
}
