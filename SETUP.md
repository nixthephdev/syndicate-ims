# Run Syndicate IMS on a Windows laptop

This package includes the source code, PHP dependencies (`vendor`), built
frontend (`public/build`), images, and 3D models. You need **XAMPP with PHP
and MySQL**. Composer, Node.js, and npm are not required to run this package.
The package was checked with PHP 8.0.30; the application requires PHP 8.0.2+.

This is a fresh installation with a separate database and sample catalogue.
It does not copy or synchronize the hosted site's customers, orders,
inventory, or uploads. Credentials are configured separately on the laptop.
Internet is required for Gmail, PayMongo, and external maps. The local app
can run offline using email logs for demos; PayMongo payments need internet.

## 1. Install XAMPP and extract the ZIP

Install XAMPP from <https://www.apachefriends.org/>. Extract the ZIP so that
these files exist directly inside this directory (avoid double nesting):

```text
C:\xampp\htdocs\syndicate-ims\artisan
C:\xampp\htdocs\syndicate-ims\start-syndicate.bat
C:\xampp\htdocs\syndicate-ims\vendor\autoload.php
```

Start **MySQL** in XAMPP Control Panel. Apache is not needed; the launcher
uses PHP's local server. Keep MySQL running while using the system.

## 2. Create a fresh local database

Open **Command Prompt** and run:

```bat
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE syndicate_ims_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

If MySQL root has a password, add `-p` after `-u root` and enter it when
prompted. If that database exists, choose a different name for a fresh
install instead of deleting the existing database.

## 3. Configure the local environment

In Command Prompt:

```bat
cd /d C:\xampp\htdocs\syndicate-ims
copy .env.example .env
notepad .env
```

Copy the example only on first installation. Set these values in `.env`:

```dotenv
APP_URL=http://localhost:8000
APP_TIMEZONE=Asia/Manila
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=syndicate_ims_local
DB_USERNAME=root
DB_PASSWORD=
```

Set `DB_PASSWORD` if your MySQL account uses one. Leave `DEPLOY_TOKEN`
empty. Keep `QUEUE_CONNECTION=sync`; no queue worker is required.

Generate this installation's encryption key and build the fresh database:

```bat
C:\xampp\php\php.exe artisan key:generate
C:\xampp\php\php.exe artisan migrate --seed
C:\xampp\php\php.exe artisan storage:link
```

These are first-install commands. The seeder resets the sample account
passwords; do not run it each startup. Do not run `migrate:fresh` on a database
you want to keep. Keep the generated `APP_KEY` for this installation.
If `storage:link` fails on Windows, enable Developer Mode or run that command
from an administrator Command Prompt.

## 4. Configure Gmail email delivery

Registration, password recovery, and checkout use email codes. For real email,
use the shop's Gmail account with 2-Step Verification enabled. Create an app
password for this laptop at <https://myaccount.google.com/apppasswords>.
Enter the credentials directly into the laptop's `.env`:

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-shop-account@gmail.com
MAIL_PASSWORD="your-google-app-password"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="your-shop-account@gmail.com"
MAIL_FROM_NAME="Syndicate Supply Co."
```

Replace both email placeholders with the actual sending account. Use the app
password, not the regular Google password. Some managed accounts do not permit
app passwords. Changing the Google account password revokes app passwords;
update `.env` if that happens. Using the same mailbox does not disable the
hosted copy. A separate app password lets you manage laptop access independently.

For a demo without real email, keep `MAIL_MAILER=log`. Emails and codes are
written to `storage\logs\laravel.log` instead of being sent. Watch them using
PowerShell (Ctrl+C stops watching):

```powershell
Get-Content C:\xampp\htdocs\syndicate-ims\storage\logs\laravel.log -Tail 80 -Wait
```

## 5. Configure PayMongo GCash test payments

Get the shop's PayMongo **test secret key** from its dashboard and set:

```dotenv
PAYMONGO_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_TEST_KEY
```

Test payments do not transfer real money. The laptop and browser need internet.
Using the existing PayMongo test account does not disable the hosted copy;
test transactions appear under that same account, while order records remain
in each installation's separate database.

The app redirects the browser to PayMongo, then retrieves the payment status
from PayMongo when the browser returns. This local test flow does not need a
public webhook. Complete the return in the **same laptop browser** and keep
the app running. If the checkout tab is closed before returning, reopen the
order and press Pay again so the app can check the previous payment intent.

This handoff is not a verified setup for accepting live public payments.
Live operation needs public HTTPS, live account configuration, and reliable
webhook reconciliation.

After changing `.env`, run the following and restart the launcher:

```bat
cd /d C:\xampp\htdocs\syndicate-ims
C:\xampp\php\php.exe artisan config:clear
```

## 6. Start and sign in

Start MySQL in XAMPP, then double-click `start-syndicate.bat`. Open
<http://localhost:8000>. Keep its window open. Close it or press Ctrl+C to stop.
Use `localhost` consistently rather than switching to `127.0.0.1`.

| Role | Email | Initial password |
| --- | --- | --- |
| Admin | admin@syndicate.test | password |
| Staff | staff@syndicate.test | password |
| Customer | customer@syndicate.test | password |

Admin and staff use `/admin`. Change sample passwords before operational use.
Sample `.test` addresses cannot receive email; register with a real email
address to test Gmail or use the log option. Review sample prices and stock.

Check the catalogue, 3D customizer, admin login, registration email code, and
a PayMongo test payment. Confirm the local order becomes paid in admin.

## Troubleshooting

- **Database connection refused:** Start MySQL and check the `DB_*` settings.
- **Missing styles:** Confirm `public\build\manifest.json` exists. The launcher
  removes leftover `public\hot` files that point at a development server.
- **Missing vendor/autoload.php:** Re-extract the full ZIP, including `vendor`.
- **No email code:** Check Gmail settings, internet, and `storage\logs\laravel.log`.
  With `MAIL_MAILER=log`, reading the log is expected.
- **TLS/certificate errors:** Check the laptop clock and configure PHP's
  `curl.cainfo` / `openssl.cafile` with a valid CA bundle. Keep TLS verification on.
- **Port 8000 in use:** Stop the other process, or manually run
  `C:\xampp\php\php.exe artisan serve --host=localhost --port=8080`
  and update `APP_URL` to match. The launcher always uses port 8000.
- **Uploaded images missing:** Run `artisan storage:link`; original uploaded
  files are not included in this clean package.

## Local access and backups

`localhost` means this laptop. Customers cannot access it over the internet.
The system is unavailable when the laptop sleeps or shuts down. This local
database does not synchronize with the hosted system.

Back up the local MySQL database, `storage\app`, and `.env` together. Keep
backups private; `.env` contains the encryption key and service credentials.
Moving hosted data into this installation is a separate migration.

Service references: [Google app passwords](https://support.google.com/accounts/answer/185833),
[Gmail SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp),
[PayMongo e-wallet flow](https://docs.paymongo.com/docs/payment-acceptance-e-wallets),
[PayMongo testing](https://docs.paymongo.com/docs/payment-channels-testing).
