import axios from 'axios';
import { useEffect, useState } from 'react';
import { Field } from '@/Components/Storefront/FormControls';

/**
 * Philippine delivery address as linked dropdowns — Province, then City /
 * municipality, then Barangay (client, 2026-10-31: typing these was "prone
 * to human error"). The lists are the PSA's official PSGC names, served by
 * Shop\AddressController one province at a time; the server re-checks the
 * combination, so a typo can't reach the shop even from a forged POST.
 *
 * Only the street is typed. The ZIP follows the city — filled in for a town
 * with one ZIP, a list for a city with several postal areas (GeoNames data,
 * see resources/data/ph-address/README.md), typed only for the few places
 * whose ZIP isn't in that list.
 *
 * Used by checkout and the order page's "Change address" modal, which both
 * hold the five fields in a useForm under the same names.
 */
const cityCache = new Map();

function loadCities(province) {
    if (!cityCache.has(province)) {
        cityCache.set(
            province,
            axios
                .get(route('address.cities'), { params: { province } })
                .then(({ data }) => data)
                .catch((error) => {
                    cityCache.delete(province);
                    throw error;
                })
        );
    }
    return cityCache.get(province);
}

function Select({ id, label, value, onChange, options, placeholder, disabled, error, required }) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65"
            >
                {label}
            </label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                required={required}
                aria-invalid={error ? 'true' : undefined}
                className={
                    'block w-full rounded-none border-2 bg-ink-800 px-4 py-3 text-white transition-colors focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40 ' +
                    'light:bg-white light:text-ink-900 ' +
                    (error
                        ? 'border-red-500 focus:border-red-400'
                        : 'border-white/15 focus:border-volt-500 light:border-ink-900/20 light:focus:border-volt-800')
                }
            >
                <option value="">{placeholder}</option>
                {options.map((option) => {
                    const { value, label } = typeof option === 'string' ? { value: option, label: option } : option;
                    return (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    );
                })}
            </select>
            {error && <p className="mt-2 text-sm font-medium text-red-400 light:text-red-700">{error}</p>}
        </div>
    );
}

export default function AddressFields({ data, setData, errors, provinces, idPrefix = '' }) {
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        if (!data.province) {
            setCities([]);
            return;
        }

        let current = true;
        setLoading(true);
        setLoadFailed(false);
        loadCities(data.province)
            .then((list) => current && setCities(list))
            .catch(() => current && setLoadFailed(true))
            .finally(() => current && setLoading(false));

        return () => {
            current = false;
        };
    }, [data.province]);

    const selectedCity = cities.find((c) => c.name === data.city);
    const barangays = selectedCity?.barangays ?? [];
    // One ZIP: a plain code. Several (Manila, Quezon City...): {code, area}.
    const zips = (selectedCity?.zips ?? []).map((z) =>
        typeof z === 'string' ? { value: z, label: z } : { value: z.code, label: `${z.code} · ${z.area}` }
    );

    // A saved address from before the dropdowns existed may not match a
    // list entry (e.g. "Legazpi City" vs PSGC's "City of Legazpi"). Picking
    // a new province clears what's below it rather than keeping a city
    // that doesn't belong to it.
    const pickProvince = (province) =>
        setData((d) => ({ ...d, province, city: '', barangay: '', postal_code: '' }));
    // The ZIP follows the city: filled in when the town has one, cleared
    // for the customer to pick when it has several.
    const pickCity = (city) => {
        const known = cities.find((c) => c.name === city)?.zips ?? [];
        setData((d) => ({
            ...d,
            city,
            barangay: '',
            postal_code: known.length === 1 && typeof known[0] === 'string' ? known[0] : '',
        }));
    };

    return (
        <div className="space-y-4">
            <Field
                id={`${idPrefix}address_line`}
                name="address_line"
                label="House / unit / street"
                placeholder="123 Rizal St."
                value={data.address_line}
                autoComplete="address-line1"
                required
                error={errors.address_line}
                onChange={(e) => setData('address_line', e.target.value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <Select
                    id={`${idPrefix}province`}
                    label="Province"
                    value={data.province}
                    onChange={pickProvince}
                    options={provinces}
                    placeholder="Select province"
                    required
                    error={errors.province}
                />
                <Select
                    id={`${idPrefix}city`}
                    label="City / municipality"
                    value={data.city}
                    onChange={pickCity}
                    options={cities.map((c) => c.name)}
                    placeholder={loading ? 'Loading…' : data.province ? 'Select city / municipality' : 'Pick a province first'}
                    disabled={!data.province || loading}
                    required
                    error={errors.city}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Select
                    id={`${idPrefix}barangay`}
                    label="Barangay"
                    value={data.barangay}
                    onChange={(barangay) => setData('barangay', barangay)}
                    options={barangays}
                    placeholder={data.city ? 'Select barangay' : 'Pick a city first'}
                    disabled={!data.city}
                    required
                    error={errors.barangay}
                />
                {zips.length > 1 ? (
                    <Select
                        id={`${idPrefix}postal_code`}
                        label="ZIP code"
                        value={data.postal_code}
                        onChange={(zip) => setData('postal_code', zip)}
                        options={zips}
                        placeholder="Select your area"
                        required
                        error={errors.postal_code}
                    />
                ) : zips.length === 1 ? (
                    // Known, single ZIP — filled in from the city, not typed.
                    <div>
                        <p className="mb-2 font-display text-xs uppercase tracking-[0.25em] text-white/50 light:text-ink-900/65">
                            ZIP code
                        </p>
                        <p className="flex items-center justify-between border-2 border-white/10 bg-ink-800/50 px-4 py-3 text-white light:border-ink-900/10 light:bg-ink-900/[0.03] light:text-ink-900">
                            {zips[0].value}
                            <span className="text-[10px] uppercase tracking-[0.15em] text-white/35 light:text-ink-900/45">
                                Set from {data.city}
                            </span>
                        </p>
                    </div>
                ) : (
                    // Before a city is picked, or one whose ZIP isn't in our
                    // list — the only case left where it's typed.
                    <Field
                        id={`${idPrefix}postal_code`}
                        name="postal_code"
                        label="ZIP code"
                        placeholder={data.city ? '4-digit ZIP' : 'Pick a city first'}
                        inputMode="numeric"
                        maxLength={4}
                        disabled={!data.city}
                        value={data.postal_code}
                        autoComplete="postal-code"
                        error={errors.postal_code}
                        onChange={(e) => setData('postal_code', e.target.value.replace(/\D/g, ''))}
                    />
                )}
            </div>

            {loadFailed && (
                <p className="text-sm text-red-400 light:text-red-700">
                    Couldn't load the cities for {data.province}. Check your connection and pick the province again.
                </p>
            )}
        </div>
    );
}
