<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\SkateboardComponent;
use App\Models\User;
use App\Support\Money;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as Notifier;

/**
 * Something the shop team should look at: an order came in, got paid or was
 * cancelled by the customer, or an item ran low or out. Goes to every active
 * staff and admin account's bell.
 *
 * `kind` (order / stock) is what the bell's icon and the client's "products
 * and orders" split key on.
 */
class ShopAlert extends Notification
{
    public function __construct(
        private string $kind,
        private string $title,
        private string $message,
        private string $url
    ) {
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        return [
            'kind' => $this->kind,
            'title' => $this->title,
            'message' => $this->message,
            'url' => $this->url,
        ];
    }

    /** Send to the whole shop team. Never throws — see AuditLog::record(). */
    public static function toTeam(self $alert): void
    {
        try {
            Notifier::send(User::query()->shopTeam()->get(), $alert);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public static function orderPlaced(Order $order): self
    {
        return self::forOrder($order, 'New order', sprintf(
            '%s placed an order for %s — waiting for GCash payment.',
            $order->customer_name,
            Money::format($order->total_centavos)
        ));
    }

    public static function orderPaid(Order $order): self
    {
        return self::forOrder($order, 'Payment received', $order->status === Order::STATUS_DEPOSIT_PAID
            ? sprintf('%s deposit paid. %s balance due on handover.', Money::format((int) $order->deposit_centavos), Money::format((int) $order->balanceCentavos()))
            : sprintf('%s paid in full. Ready to prepare.', Money::format($order->total_centavos)));
    }

    public static function balancePaid(Order $order): self
    {
        return self::forOrder($order, 'Balance paid', sprintf(
            'Remaining %s paid by GCash. Fully paid — ready to hand over.',
            Money::format((int) $order->balanceCentavos())
        ));
    }

    public static function orderCancelledByCustomer(Order $order): self
    {
        return self::forOrder($order, 'Order cancelled', $order->customer_name.' cancelled this order before paying.');
    }

    /** @param  ProductVariant|SkateboardComponent  $item */
    public static function stock(Model $item): self
    {
        [$name, $url] = $item instanceof ProductVariant
            ? [$item->displayName(), route('admin.products.edit', $item->product_id, false)]
            : [$item->name, route('admin.skateboard-components.edit', $item->id, false)];

        return $item->isOutOfStock()
            ? new self('stock', 'Out of stock', $name.' just sold out.', $url)
            : new self('stock', 'Low stock', sprintf('%s is down to %d left.', $name, $item->stock), $url);
    }

    private static function forOrder(Order $order, string $title, string $message): self
    {
        return new self('order', $title.' · '.$order->order_number, $message, route('admin.orders.show', $order->order_number, false));
    }
}
