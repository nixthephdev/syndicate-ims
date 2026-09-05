/**
 * Bolts/Trucks are free cosmetic recolors of the one real hardware mesh in
 * board.glb — not separate purchasable SkateboardComponent rows like Deck and
 * Wheels are, so there's no price or stock attached to a colour here. Values
 * are the exact swatches from reference/skate-demo/index.html (bolts_color /
 * trucks_color radio inputs), not invented — same reference the mesh names
 * themselves come from.
 */
export const HARDWARE_COLORS = [
    { hex: '#f8f8f8', label: 'Off-White' },
    { hex: '#F1C40F', label: 'Gold' },
    { hex: '#DEB887', label: 'Burlywood' },
    { hex: '#C2C025', label: 'Yellow' },
    { hex: '#aaaaaa', label: 'Silver' },
    { hex: '#00C202', label: 'Green' },
    { hex: '#F1396E', label: 'Pink' },
    { hex: '#E7312F', label: 'Red' },
    { hex: '#9700C2', label: 'Purple' },
    { hex: '#2b2b2b', label: 'Black' },
    { hex: '#0400C2', label: 'Blue' },
];

/**
 * White, matching the empty state the builder opens in — the board starts
 * with nothing chosen, so the hardware starts neutral rather than on the
 * black that used to be preselected and read as a deliberate choice.
 *
 * Must stay a hex that exists in HARDWARE_COLORS above, or the swatch picker
 * opens with nothing highlighted.
 */
export const DEFAULT_HARDWARE_COLOR = '#f8f8f8';
