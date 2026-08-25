import LookbookTile from './LookbookTile';

/**
 * Masonry lookbook.
 *
 * Built on CSS multi-columns (`columns-*` + `break-inside-avoid`) rather than
 * grid: tiles keep their own aspect ratios and the column heights stagger on
 * their own, which is the whole point of the layout. A CSS grid would need
 * fixed row spans and would fight the varied photo ratios.
 *
 * 1 column on phones → 2 on sm → 3 on lg. Every tile is full-width inside its
 * column, so nothing needs per-breakpoint sizing.
 */
export default function LookbookGrid({ items }) {
    return (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {items.map((item, i) => (
                <LookbookTile key={item.src} eager={i < 3} {...item} />
            ))}
        </div>
    );
}
