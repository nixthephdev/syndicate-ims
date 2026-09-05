<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    | Test keys only — see CLAUDE.md/DECISIONS.md. GCash via Payment Intents
    | (not the older Sources API). secret_key signs API requests, webhook_secret
    | verifies inbound webhook signatures — two different secrets, don't mix
    | them up.
    */
    'paymongo' => [
        'secret_key' => env('PAYMONGO_SECRET_KEY'),
        'public_key' => env('PAYMONGO_PUBLIC_KEY'),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
    ],

    /*
    | Only meaningful on a host with no SSH access — see DeployController
    | and the Deployment section of CLAUDE.md. Empty by default, which
    | disables the endpoint entirely (see DeployController::migrate()).
    | Generate a long random value for this before ever setting it on a
    | real deploy — anyone who knows it can trigger migrations.
    */
    'deploy' => [
        'token' => env('DEPLOY_TOKEN'),
    ],

];
