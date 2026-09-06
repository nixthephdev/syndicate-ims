<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Where customers send money
    |--------------------------------------------------------------------------
    |
    | Shown on the order page after checkout so the customer knows where to
    | send a GCash payment or a bank transfer before uploading their receipt.
    |
    | THESE ARE PLACEHOLDERS. They are not the shop's real accounts and must
    | be replaced before anyone is asked to send money to them — see the
    | standing rule in CLAUDE.md about never inventing a real-world detail
    | (address, phone, hours) that wasn't actually given. `is_placeholder`
    | below drives a visible warning on the storefront so a stand-in number
    | can never be mistaken for the real one; set it false once the client
    | supplies the genuine details.
    |
    | Override per-environment in .env rather than editing this file.
    |
    */

    'payment' => [

        'is_placeholder' => env('SHOP_PAYMENT_DETAILS_REAL', false) === false,

        'gcash' => [
            'name' => env('SHOP_GCASH_NAME', 'Syndicate Supply Co.'),
            'number' => env('SHOP_GCASH_NUMBER', '09XX XXX XXXX'),
        ],

        'bank' => [
            'name' => env('SHOP_BANK_NAME', 'Bank name'),
            'account_name' => env('SHOP_BANK_ACCOUNT_NAME', 'Syndicate Supply Co.'),
            'account_number' => env('SHOP_BANK_ACCOUNT_NUMBER', 'XXXX-XXXX-XXXX'),
        ],
    ],

];
