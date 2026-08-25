<?php

/**
 * Lookbook image processor.
 *
 *   php tools/lookbook.php
 *
 * Drop the shop's photos (any size, any format, straight off a phone or
 * downloaded from the Facebook page) into:
 *
 *   public/files/images/lookbook-src/
 *
 * This writes web-ready versions to public/images/lookbook/ and prints the
 * LOOKBOOK array to paste into resources/js/Pages/Storefront/Home.jsx.
 *
 * Why this exists: phone/Facebook photos are 3-6 MB each with EXIF rotation
 * that browsers honour inconsistently. Nine of them unprocessed is a ~40 MB
 * landing page — on a Philippine mobile connection that is a dead site.
 *
 * Aspect ratios are read from each photo and emitted as-is rather than
 * forced to a fixed crop: cropping to a house ratio beheads people, and the
 * masonry grid wants varied heights anyway.
 *
 * Requires ImageMagick 7 (`magick`) on PATH.
 */

const SRC_DIR   = __DIR__ . '/../public/files/images/lookbook-src';
const OUT_DIR   = __DIR__ . '/../public/images/lookbook';
const MAX_WIDTH = 1000;  // Tiles never render wider than ~500px; 2x for retina.
const QUALITY   = 82;

function fail(string $msg): void
{
    fwrite(STDERR, "\n  ERROR: {$msg}\n\n");
    exit(1);
}

/**
 * Simplest w/h fraction within 1% of the true ratio, so Tailwind gets
 * aspect-[3/2] rather than aspect-[1000/667].
 *
 * A plain GCD reduction is not enough: resizing rounds to whole pixels, so a
 * 3000x2000 photo lands on 1000x667, whose GCD is 1. Searching small
 * denominators first recovers the ratio the photo actually had. 1% is below
 * the threshold where a height difference is visible in the grid.
 */
function ratio(int $w, int $h): string
{
    $target = $w / $h;

    for ($den = 1; $den <= 20; $den++) {
        $num = (int) round($target * $den);
        if ($num < 1) {
            continue;
        }
        if (abs(($num / $den) - $target) / $target <= 0.01) {
            return "{$num}/{$den}";
        }
    }

    $gcd = function ($a, $b) use (&$gcd) {
        return $b === 0 ? $a : $gcd($b, $a % $b);
    };
    $g = max(1, $gcd($w, $h));

    return ($w / $g) . '/' . ($h / $g);
}

exec('magick -version', $_, $code);
if ($code !== 0) {
    fail('ImageMagick not found. Install it, or tell Claude and it will use PHP GD instead.');
}

if (! is_dir(SRC_DIR)) {
    fail('Missing ' . realpath(dirname(SRC_DIR)) . '/lookbook-src — create it and drop photos in.');
}

@mkdir(OUT_DIR, 0755, true);

$files = [];
// .jfif is what Windows/Facebook hand you for a plain JPEG — same bytes,
// different extension. Browsers and ImageMagick both read it fine, but it
// gets missed if you only glob for .jpg.
foreach (['jpg', 'jpeg', 'jfif', 'png', 'webp', 'JPG', 'JPEG', 'JFIF', 'PNG', 'WEBP'] as $ext) {
    $files = array_merge($files, glob(SRC_DIR . '/*.' . $ext) ?: []);
}
$files = array_values(array_unique($files));
sort($files);

if (! $files) {
    fail('No images in ' . SRC_DIR . '. Drop some .jpg/.png files in there first.');
}

echo "\nProcessing " . count($files) . " image(s)...\n\n";

$entries = [];
$savedBytes = 0;

foreach ($files as $i => $path) {
    $slug = preg_replace('/[^a-z0-9]+/', '-', strtolower(pathinfo($path, PATHINFO_FILENAME)));
    $slug = trim($slug, '-') ?: 'photo-' . ($i + 1);
    $out  = OUT_DIR . '/' . $slug . '.jpg';

    // -auto-orient applies the EXIF rotation then strips it; -strip removes
    // the rest of the EXIF (including GPS coordinates of the shop — do not
    // publish those). -interlace Plane = progressive JPEG, renders sooner.
    $cmd = sprintf(
        'magick %s -auto-orient -resize %dx%d^> -strip -interlace Plane -quality %d %s',
        escapeshellarg($path),
        MAX_WIDTH,
        MAX_WIDTH * 3,
        QUALITY,
        escapeshellarg($out)
    );
    exec($cmd, $_, $code);

    if ($code !== 0 || ! file_exists($out)) {
        echo "  SKIPPED (convert failed): " . basename($path) . "\n";
        continue;
    }

    $before = filesize($path);

    // Facebook already compressed these once. Re-encoding an image that is
    // both small enough and already well compressed can come out LARGER than
    // the source, so back off the quality once rather than shipping a file
    // that got worse. Only re-runs for the few images that need it.
    if (filesize($out) > $before) {
        exec(str_replace('-quality ' . QUALITY, '-quality 72', $cmd), $_, $code);
        clearstatcache();
    }

    clearstatcache();
    [$w, $h] = getimagesize($out);
    $after  = filesize($out);
    $savedBytes += $before - $after;

    printf(
        "  %-28s %4dx%-4d  %6s KB -> %5s KB  aspect-[%s]\n",
        basename($out),
        $w,
        $h,
        number_format($before / 1024),
        number_format($after / 1024),
        ratio($w, $h)
    );

    $entries[] = [
        'src'   => '/images/lookbook/' . $slug . '.jpg',
        'ratio' => ratio($w, $h),
        'slug'  => $slug,
    ];
}

if (! $entries) {
    fail('Nothing converted.');
}

printf("\nTotal saved: %s KB\n", number_format($savedBytes / 1024));

echo "\n" . str_repeat('-', 70) . "\n";
echo "Paste into the LOOKBOOK array in resources/js/Pages/Storefront/Home.jsx.\n";
echo "Then WRITE A REAL alt AND caption FOR EACH — the placeholders below are\n";
echo "not accessible and not useful. tag shows as the volt chip on the tile.\n";
echo str_repeat('-', 70) . "\n\n";

foreach ($entries as $e) {
    $label = ucwords(str_replace('-', ' ', $e['slug']));
    echo "    {\n";
    echo "        src: '{$e['src']}',\n";
    echo "        alt: '" . addslashes($label) . "',\n";
    echo "        tag: 'Street',\n";
    echo "        caption: '" . addslashes($label) . "',\n";
    echo "        ratio: 'aspect-[{$e['ratio']}]',\n";
    echo "    },\n";
}

echo "\n";
