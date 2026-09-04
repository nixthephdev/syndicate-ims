/**
 * Hand-copied Heroicons-outline paths (viewBox 0 0 24 24, strokeWidth 2,
 * stroke="currentColor") — the same convention already used storefront-side
 * (ThemeToggle.jsx, StoreHeader.jsx, both ToastStack.jsx) and admin-side
 * (VariantRow.jsx's original pencil/trash). No icon library dependency.
 * `className` defaults to h-4 w-4, the size every call site here uses.
 */
function Icon({ path, className = 'h-4 w-4', ...props }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );
}

export const PencilIcon = (props) => (
    <Icon
        {...props}
        path="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
    />
);

export const TrashIcon = (props) => (
    <Icon
        {...props}
        path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
    />
);

export const ArchiveBoxIcon = (props) => (
    <Icon
        {...props}
        path="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375C2.754 3.75 2.25 4.254 2.25 4.875v1.5c0 .621.504 1.125 1.125 1.125Z"
    />
);

export const PlusIcon = (props) => <Icon {...props} path="M12 4.5v15m7.5-7.5h-15" />;

export const CheckIcon = (props) => <Icon {...props} path="M4.5 12.75l6 6 9-13.5" />;

export const XIcon = (props) => <Icon {...props} path="M6 18L18 6M6 6l12 12" />;

export const ChevronLeftIcon = (props) => <Icon {...props} path="M15.75 19.5L8.25 12l7.5-7.5" />;

export const ChevronRightIcon = (props) => <Icon {...props} path="M8.25 4.5l7.5 7.5-7.5 7.5" />;

export const MagnifyingGlassIcon = (props) => (
    <Icon {...props} path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
);

export const PowerIcon = (props) => (
    <Icon {...props} path="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
);

export const ArrowLeftIcon = (props) => (
    <Icon {...props} path="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
);

export const ArrowRightIcon = (props) => (
    <Icon {...props} path="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
);

export const CheckCircleIcon = (props) => (
    <Icon {...props} path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
);

export const TrendUpIcon = (props) => <Icon {...props} path="M2.25 18 9 11.25l3.75 3.75L21.75 6M21.75 6h-5.25M21.75 6v5.25" />;

export const TrendDownIcon = (props) => <Icon {...props} path="M2.25 6 9 12.75l3.75-3.75L21.75 18M21.75 18h-5.25M21.75 18v-5.25" />;

export const BanknotesIcon = (props) => (
    <Icon
        {...props}
        path="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
    />
);

export const ClockIcon = (props) => <Icon {...props} path="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />;

export const TruckIcon = (props) => (
    <Icon
        {...props}
        path="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
    />
);

export const CubeIcon = (props) => (
    <Icon {...props} path="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
);

export function TagIcon({ className = 'h-4 w-4', ...props }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.169.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.31a11.947 11.947 0 0 0 3.34-3.34c.562-.827.39-1.908-.31-2.607L9.659 3.66A2.25 2.25 0 0 0 8.084 3H9.568Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
        </svg>
    );
}

export const ExclamationTriangleIcon = (props) => (
    <Icon
        {...props}
        path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
    />
);

export const XCircleIcon = (props) => (
    <Icon {...props} path="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
);
