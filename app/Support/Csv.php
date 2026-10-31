<?php

namespace App\Support;

use Illuminate\Http\Response;

/**
 * A CSV download that opens cleanly in Excel — the shop's spreadsheet.
 * The UTF-8 byte-order mark is what makes Excel read ₱ and ñ correctly;
 * without it they arrive as mojibake.
 *
 * Built in memory and returned as a plain Response, not streamDownload():
 * Laravel 9's AddLinkHeadersForPreloadedAssets middleware calls ->header()
 * on every response, which Symfony's StreamedResponse doesn't have — a
 * streamed export 500s. These reports are a few thousand rows at most.
 */
class Csv
{
    /**
     * @param  array<int, string>  $header
     * @param  iterable<int, array<int, mixed>>  $rows
     */
    public static function download(string $filename, array $header, iterable $rows): Response
    {
        $out = fopen('php://temp', 'r+');
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, $header);

        foreach ($rows as $row) {
            fputcsv($out, $row);
        }

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
