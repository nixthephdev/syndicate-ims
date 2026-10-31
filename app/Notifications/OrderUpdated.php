<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Notifications\Notification;

/**
 * A change to a customer's own order — paid, moved along, completed,
 * cancelled. Lands in their bell. Database channel only, sent inline: there
 * is no queue worker on a handover laptop, and it's one insert.
 */
class OrderUpdated extends Notification
{
    public function __construct(private Order $order, private string $message)
    {
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        return [
            'kind' => 'order',
            'title' => 'Order '.$this->order->order_number,
            'message' => $this->message,
            'url' => route('orders.show', $this->order->order_number, false),
        ];
    }
}
