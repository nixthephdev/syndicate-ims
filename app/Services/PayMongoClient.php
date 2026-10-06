<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin wrapper over PayMongo's Payment Intents API (not the older Sources
 * API — Sources is legacy; Payment Intents + Payment Methods is PayMongo's
 * current recommended flow, confirmed against their own docs, 2026-09).
 *
 * Three calls, in order, make up "create a GCash payment":
 *   1. createPaymentIntent()  — how much, in what currency
 *   2. createPaymentMethod()  — "gcash", no other input needed
 *   3. attachPaymentMethod()  — joins them, returns the checkout redirect URL
 *
 * Auth is HTTP Basic with the secret key as username and an empty password
 * — that's PayMongo's own convention, not a mistake.
 */
class PayMongoClient
{
    private const BASE_URL = 'https://api.paymongo.com/v1';

    public function __construct(private ?string $secretKey = null)
    {
        $this->secretKey = $secretKey ?? config('services.paymongo.secret_key');
    }

    /** @return array{id: string, client_key: string} */
    public function createPaymentIntent(int $amountCentavos, string $description = ''): array
    {
        $response = $this->request()->post('/payment_intents', [
            'data' => [
                'attributes' => [
                    'amount' => $amountCentavos,
                    'currency' => 'PHP',
                    'payment_method_allowed' => ['gcash'],
                    'description' => $description,
                ],
            ],
        ]);

        $data = $this->unwrap($response, 'create payment intent');

        return [
            'id' => $data['id'],
            'client_key' => $data['attributes']['client_key'],
        ];
    }

    /** @return array{id: string} */
    public function createGcashPaymentMethod(): array
    {
        $response = $this->request()->post('/payment_methods', [
            'data' => [
                'attributes' => [
                    'type' => 'gcash',
                ],
            ],
        ]);

        $data = $this->unwrap($response, 'create payment method');

        return ['id' => $data['id']];
    }

    /**
     * Joins the payment method to the intent. GCash is redirect-based —
     * the response's next_action.redirect.url is where the customer
     * actually authorizes the payment; there is no such thing as GCash
     * completing without that redirect.
     *
     * @return array{status: string, redirect_url: ?string}
     */
    public function attachPaymentMethod(
        string $paymentIntentId,
        string $paymentMethodId,
        string $clientKey,
        string $returnUrl
    ): array {
        $response = $this->request()->post("/payment_intents/{$paymentIntentId}/attach", [
            'data' => [
                'attributes' => [
                    'payment_method' => $paymentMethodId,
                    'client_key' => $clientKey,
                    'return_url' => $returnUrl,
                ],
            ],
        ]);

        $data = $this->unwrap($response, 'attach payment method');
        $attributes = $data['attributes'];

        return [
            'status' => $attributes['status'],
            'redirect_url' => $attributes['next_action']['redirect']['url'] ?? null,
        ];
    }

    /**
     * Reads back an intent PayMongo already has — the authoritative answer to
     * "did this actually get paid?", asked of PayMongo rather than inferred
     * from anything the customer's browser carried back.
     *
     * `status` is 'succeeded' once the money moved. The nested payments array
     * carries the pay_... id worth recording alongside it; field shapes here
     * were confirmed against a real completed test payment, same as the rest
     * of this client (PayMongo's docs pages were serving empty schemas).
     *
     * @return array{id: string, status: string, payment_id: ?string, amount: int}
     */
    public function getPaymentIntent(string $paymentIntentId): array
    {
        $response = $this->request()->get("/payment_intents/{$paymentIntentId}");

        $data = $this->unwrap($response, 'retrieve payment intent');
        $attributes = $data['attributes'];

        return [
            'id' => $data['id'],
            'status' => $attributes['status'] ?? '',
            'payment_id' => $attributes['payments'][0]['id'] ?? null,
            'amount' => $attributes['amount'] ?? 0,
        ];
    }

    private function request()
    {
        if (! $this->secretKey) {
            throw new RuntimeException('PayMongo secret key is not configured (PAYMONGO_SECRET_KEY).');
        }

        return Http::withBasicAuth($this->secretKey, '')
            ->baseUrl(self::BASE_URL)
            ->acceptJson();
    }

    /** @return array{id: string, attributes: array} */
    private function unwrap($response, string $action): array
    {
        if ($response->failed()) {
            $message = $response->json('errors.0.detail') ?? $response->body();

            throw new RuntimeException("PayMongo: failed to {$action} — {$message}");
        }

        return $response->json('data');
    }
}
