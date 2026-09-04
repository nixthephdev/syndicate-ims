import { Link } from '@inertiajs/react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

/**
 * Laravel paginator's `links` array rendered identically in Orders/Index.jsx
 * and Users/Index.jsx before this existed — one shared copy. Previous/Next
 * used to render Laravel's raw "&laquo; Previous" / "Next &raquo;" labels
 * via dangerouslySetInnerHTML; now real chevron icons, detected by label
 * text rather than assuming position, since numbered page links sit
 * between them and shouldn't be touched — page-number labels are plain
 * text with no HTML entities, so dangerouslySetInnerHTML is no longer
 * needed at all.
 */
export default function Pagination({ links }) {
    if (links.length <= 3) return null;

    return (
        <nav className="mt-4 flex flex-wrap gap-1">
            {links.map((link, i) => {
                const isPrev = link.label.includes('Previous');
                const isNext = link.label.includes('Next');

                return (
                    <Link
                        key={i}
                        href={link.url ?? '#'}
                        preserveScroll
                        aria-label={isPrev ? 'Previous page' : isNext ? 'Next page' : undefined}
                        className={
                            'inline-flex items-center rounded-md px-3 py-1.5 text-sm transition ' +
                            (link.active
                                ? 'bg-volt-500 text-ink-900'
                                : link.url
                                ? 'text-white/50 hover:bg-white/[0.06] hover:text-white admin-light:text-ink-900/50 admin-light:hover:bg-ink-900/[0.06] admin-light:hover:text-ink-900'
                                : 'cursor-default text-white/20 admin-light:text-ink-900/20')
                        }
                    >
                        {isPrev ? <ChevronLeftIcon /> : isNext ? <ChevronRightIcon /> : link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
