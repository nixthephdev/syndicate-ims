/**
 * Wheel colour swatches — unlike hardwareColors.js this isn't decorative:
 * every value here is a real seeded colourway (SkateboardComponentSeeder's
 * WHEEL_COLORS), baked into that component's own mesh_name (e.g. "bbBLUE").
 * Matched by suffix rather than parsing the display name, since mesh_name is
 * the stable machine-readable field.
 */
export const WHEEL_COLOR_HEX = {
    BLUE: '#0400C2',
    GREEN: '#00C202',
    PURPLE: '#9700C2',
    RED: '#E7312F',
    WHITE: '#f8f8f8',
    YELLOW: '#C2C025',
};

export function wheelColorHex(meshName) {
    const needle = (meshName ?? '').toUpperCase();
    const key = Object.keys(WHEEL_COLOR_HEX).find((color) => needle.endsWith(color));
    return key ? WHEEL_COLOR_HEX[key] : '#888888';
}
