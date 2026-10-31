<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use App\Support\Csv;
use App\Support\Money;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Response as HttpResponse;

/**
 * Sales & trends for any date range, exportable — objective 8 and the
 * client's 2026-10-31 ask. The dashboard shows a fixed last-30-days glance;
 * this is where someone sits down with a date range and takes the numbers
 * away (CSV for Excel, or the page printed).
 *
 * Same rules as the dashboard, deliberately: only PAID orders count (dated
 * by paid_at, when the money arrived), deposit orders count only the
 * deposit until fulfilled (Order::COLLECTED_AMOUNT_SQL), and nothing dated
 * in the future counts (the demo history runs ahead — see Order::asOfNow()).
 */
class SalesReportController extends Controller
{
    private const INTERVALS = ['day', 'week', 'month'];

    public function index(Request $request): Response
    {
        [$from, $to, $interval] = $this->range($request);
        $days = $from->diffInDays($to) + 1;
        [$prevFrom, $prevTo] = [$from->copy()->subDays($days), $from->copy()->subDay()->endOfDay()];

        $summary = $this->summary($from, $to);
        $previous = $this->summary($prevFrom, $prevTo);

        return Inertia::render('Admin/Sales/Index', [
            'filters' => [
                'from' => $from->format('Y-m-d'),
                'to' => $to->format('Y-m-d'),
                'interval' => $interval,
            ],
            'period_label' => $from->format('d M Y').' – '.$to->format('d M Y'),
            'previous_label' => $prevFrom->format('d M Y').' – '.$prevTo->format('d M Y'),
            'summary' => $summary,
            'previous' => $previous,
            'trend' => $this->trend($from, $to, $interval),
            'top_items' => $this->topItems($from, $to),
            'split' => $this->split($from, $to),
        ]);
    }

    /** ?type=trend (one row per day/week/month) or ?type=lines (every item sold). */
    public function export(Request $request): HttpResponse
    {
        [$from, $to, $interval] = $this->range($request);
        $span = $from->format('Y-m-d').'-to-'.$to->format('Y-m-d');

        AuditLog::record(AuditLog::ACTION_EXPORT, "Exported the sales report ({$from->format('d M Y')} – {$to->format('d M Y')}).");

        if ($request->query('type') === 'lines') {
            $rows = $this->paidOrders($from, $to)
                ->join('order_items', 'order_items.order_id', '=', 'orders.id')
                ->orderBy('orders.paid_at')
                ->get([
                    'orders.order_number', 'orders.paid_at', 'orders.status', 'orders.customer_name',
                    'orders.fulfillment_method', 'order_items.name_snapshot', 'order_items.quantity',
                    'order_items.unit_price_centavos', 'order_items.line_total_centavos', 'order_items.purchasable_type',
                ]);

            return Csv::download("sales-lines-{$span}.csv",
                ['Order', 'Paid at', 'Status', 'Customer', 'Pickup/Delivery', 'Item', 'Category', 'Qty', 'Unit price (PHP)', 'Line total (PHP)'],
                $rows->map(fn ($r) => [
                    $r->order_number, $r->paid_at, $r->status, $r->customer_name, $r->fulfillment_method,
                    $r->name_snapshot, $r->purchasable_type === SkateboardComponent::class ? 'Skateboard' : 'Apparel',
                    $r->quantity, $r->unit_price_centavos / 100, $r->line_total_centavos / 100,
                ])
            );
        }

        return Csv::download("sales-by-{$interval}-{$span}.csv",
            ['Period', 'Orders paid', 'Revenue collected (PHP)', 'Average order (PHP)'],
            collect($this->trend($from, $to, $interval))->map(fn ($r) => [
                $r['label'], $r['orders'], $r['revenue_centavos'] / 100,
                $r['orders'] ? round($r['revenue_centavos'] / $r['orders'] / 100, 2) : 0,
            ])
        );
    }

    /**
     * from/to as dates (default: the last 30 days), clamped so a typo'd year
     * can't ask for a century of rows; interval defaults by span length so a
     * year-long report isn't 365 bars.
     *
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    private function range(Request $request): array
    {
        $parse = function (?string $value) {
            try {
                return $value ? Carbon::createFromFormat('Y-m-d', $value) : null;
            } catch (\Throwable) {
                return null;
            }
        };

        $to = ($parse($request->query('to')) ?? now())->endOfDay();
        $from = ($parse($request->query('from')) ?? $to->copy()->subDays(29))->startOfDay();

        if ($from->gt($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        if ($from->diffInDays($to) > 731) {
            $from = $to->copy()->subDays(731)->startOfDay();
        }

        $interval = $request->query('interval');
        if (! in_array($interval, self::INTERVALS, true)) {
            $span = $from->diffInDays($to);
            $interval = $span > 180 ? 'month' : ($span > 62 ? 'week' : 'day');
        }

        return [$from, $to, $interval];
    }

    private function paidOrders(Carbon $from, Carbon $to): Builder
    {
        return DB::table('orders')
            ->whereNotNull('orders.paid_at')
            ->whereBetween('orders.paid_at', [$from, $to->copy()->min(now())])
            ->where('orders.created_at', '<=', now());
    }

    private function summary(Carbon $from, Carbon $to): array
    {
        $orders = $this->paidOrders($from, $to)
            ->selectRaw('COUNT(*) as orders, COALESCE(SUM('.Order::COLLECTED_AMOUNT_SQL.'), 0) as revenue')
            ->selectRaw("COALESCE(SUM(CASE WHEN orders.status = 'deposit_paid' THEN orders.total_centavos - orders.deposit_centavos ELSE 0 END), 0) as balance_due")
            ->first();

        $units = (int) $this->paidOrders($from, $to)
            ->join('order_items', 'order_items.order_id', '=', 'orders.id')
            ->sum('order_items.quantity');

        $count = (int) $orders->orders;
        $revenue = (int) $orders->revenue;

        return [
            'orders' => $count,
            'revenue_centavos' => $revenue,
            'average_centavos' => $count ? intdiv($revenue, $count) : 0,
            'units' => $units,
            'balance_due_centavos' => (int) $orders->balance_due,
            'cancelled' => Order::query()->asOfNow()->status(Order::STATUS_CANCELLED)
                ->whereBetween('updated_at', [$from, $to])->count(),
        ];
    }

    /**
     * One row per day/week/month in the range, empty periods included as
     * zeros — a chart that skips a zero day draws a line straight across
     * the dip instead of showing it.
     */
    private function trend(Carbon $from, Carbon $to, string $interval): array
    {
        $byDay = $this->paidOrders($from, $to)
            ->selectRaw('DATE(orders.paid_at) as day, COUNT(*) as orders, SUM('.Order::COLLECTED_AMOUNT_SQL.') as revenue')
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $buckets = [];

        foreach (CarbonPeriod::create($from->copy()->startOfDay(), $to->copy()->startOfDay()) as $day) {
            [$key, $label] = match ($interval) {
                'week' => [$day->copy()->startOfWeek()->format('Y-m-d'), 'Week of '.$day->copy()->startOfWeek()->format('d M Y')],
                'month' => [$day->format('Y-m'), $day->format('M Y')],
                default => [$day->format('Y-m-d'), $day->format('D d M Y')],
            };

            $buckets[$key] ??= ['key' => $key, 'label' => $label, 'short' => $this->shortLabel($day, $interval), 'orders' => 0, 'revenue_centavos' => 0];
            $row = $byDay[$day->format('Y-m-d')] ?? null;
            $buckets[$key]['orders'] += (int) ($row->orders ?? 0);
            $buckets[$key]['revenue_centavos'] += (int) ($row->revenue ?? 0);
        }

        return array_values($buckets);
    }

    private function shortLabel(Carbon $day, string $interval): string
    {
        return match ($interval) {
            'week' => $day->copy()->startOfWeek()->format('M j'),
            'month' => $day->format('M Y'),
            default => $day->format('M j'),
        };
    }

    /**
     * Best sellers in the range, apparel and skateboard parts together —
     * apparel rolled up to the product (all sizes), parts as themselves.
     * Line totals at full value, same known simplification as the
     * dashboard's category split for a still-deposit_paid order.
     */
    private function topItems(Carbon $from, Carbon $to): array
    {
        $apparel = $this->paidOrders($from, $to)
            ->join('order_items', 'order_items.order_id', '=', 'orders.id')
            ->join('product_variants', function ($join) {
                $join->on('product_variants.id', '=', 'order_items.purchasable_id')
                    ->where('order_items.purchasable_type', ProductVariant::class);
            })
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->selectRaw("products.name as name, 'Apparel' as category, SUM(order_items.quantity) as units, SUM(order_items.line_total_centavos) as revenue")
            ->groupBy('products.id', 'products.name');

        $parts = $this->paidOrders($from, $to)
            ->join('order_items', 'order_items.order_id', '=', 'orders.id')
            ->join('skateboard_components', function ($join) {
                $join->on('skateboard_components.id', '=', 'order_items.purchasable_id')
                    ->where('order_items.purchasable_type', SkateboardComponent::class);
            })
            ->selectRaw("skateboard_components.name as name, 'Skateboard' as category, SUM(order_items.quantity) as units, SUM(order_items.line_total_centavos) as revenue")
            ->groupBy('skateboard_components.id', 'skateboard_components.name');

        return $apparel->unionAll($parts)
            ->get()
            ->sortByDesc('revenue')
            ->take(10)
            ->map(fn ($r) => [
                'name' => $r->name,
                'category' => $r->category,
                'units' => (int) $r->units,
                'revenue_formatted' => Money::format((int) $r->revenue),
                'revenue_centavos' => (int) $r->revenue,
            ])
            ->values()
            ->all();
    }

    /** Apparel vs skateboard, pickup vs delivery, full vs deposit. */
    private function split(Carbon $from, Carbon $to): array
    {
        $category = $this->paidOrders($from, $to)
            ->join('order_items', 'order_items.order_id', '=', 'orders.id')
            ->selectRaw('order_items.purchasable_type as type, SUM(order_items.line_total_centavos) as revenue')
            ->groupBy('order_items.purchasable_type')
            ->pluck('revenue', 'type');

        $orders = $this->paidOrders($from, $to)
            ->selectRaw('orders.fulfillment_method as method, (orders.deposit_centavos IS NOT NULL) as is_deposit, COUNT(*) as n')
            ->groupBy('method', 'is_deposit')
            ->get();

        return [
            'apparel_centavos' => (int) ($category[ProductVariant::class] ?? 0),
            'skateboard_centavos' => (int) ($category[SkateboardComponent::class] ?? 0),
            'pickup' => (int) $orders->where('method', Order::FULFILLMENT_PICKUP)->sum('n'),
            'delivery' => (int) $orders->where('method', Order::FULFILLMENT_DELIVERY)->sum('n'),
            'paid_in_full' => (int) $orders->where('is_deposit', 0)->sum('n'),
            'deposit' => (int) $orders->where('is_deposit', 1)->sum('n'),
        ];
    }
}
