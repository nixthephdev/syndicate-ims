import { Link } from '@inertiajs/react';

/**
 * The `bg-volt-500 ...` button, byte-identical across Products/{Create,Edit}.jsx,
 * AddVariantForm.jsx, SkateboardComponents/Edit.jsx before this existed — one
 * shared component instead of four copies that could quietly drift apart.
 * `as="link"` covers the one spot that's an Inertia navigation styled as a
 * button (Products/Index.jsx's "Add product"), everything else defaults to a
 * real `<button>`. Text is `ink-900`, not white — volt is a bright fill, and
 * white-on-lime is nearly illegible (the old blue accent never had this
 * problem, which is why this needed changing, not just a colour swap).
 */
export default function PrimaryButton({ as = 'button', icon: Icon, children, className = '', ...props }) {
    const classes = `font-oswald inline-flex items-center gap-2 rounded-md bg-volt-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-ink-900 transition hover:bg-volt-400 disabled:opacity-50 ${className}`;

    if (as === 'link') {
        return (
            <Link className={classes} {...props}>
                {Icon && <Icon className="h-4 w-4" />}
                {children}
            </Link>
        );
    }

    return (
        <button type={props.type ?? 'button'} className={classes} {...props}>
            {Icon && <Icon className="h-4 w-4" />}
            {children}
        </button>
    );
}
