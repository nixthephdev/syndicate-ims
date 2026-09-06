# Setting up Syndicate IMS on another Windows laptop

One-time install. After this, running it day to day is a double-click on
`start-syndicate.bat`.

Everything is included in the handover folder — you do **not** need Composer,
Node.js, npm, or an internet connection to install it. Only XAMPP.

---

## 1. Install XAMPP

Download from <https://www.apachefriends.org> and install with the defaults.

**The app needs PHP 8.0.2 or newer.** Any current XAMPP is fine (they ship
8.2). To check, open a terminal and run `C:\xampp\php\php.exe -v`.

You only need **MySQL** from XAMPP. Apache is not used — the app serves
itself with PHP's own server (see step 6). Leave Apache off; it avoids a
port-80 fight with Skype, IIS or anything else.

## 2. Copy the project in

Put the handover folder at exactly:

```
C:\xampp\htdocs\syndicate-ims
```

Other paths work, but every command below assumes this one.

## 3. Start MySQL

Open **XAMPP Control Panel** → click **Start** next to **MySQL**.

It needs to be running whenever you use the app. Tick *Autostart* in XAMPP's
Config if you'd rather not think about it.

## 4. Create the database

In XAMPP Control Panel click **Shell**, then:

```
mysql -u root -e "CREATE DATABASE syndicate_ims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

XAMPP's MySQL has no root password by default. If yours does, add `-p`.

## 5. Configure the app

Copy `.env.example` to `.env`:

```
cd C:\xampp\htdocs\syndicate-ims
copy .env.example .env
```

Open `.env` in Notepad and set:

```
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_TIMEZONE=Asia/Manila

DB_DATABASE=syndicate_ims
DB_USERNAME=root
DB_PASSWORD=
```

Then generate this installation's own encryption key and build the database:

```
php artisan key:generate
php artisan migrate --seed
```

`--seed` loads the product catalogue and the three accounts in step 7. Run it
**once**. Re-running the seeder duplicates the catalogue — it has no dedupe
guard.

Optional, for a dashboard with realistic charts instead of an empty one:

```
php artisan db:seed --class=DemoOrdersSeeder
```

That adds ~90 fake orders over the last 45 days. The customers in it are
obviously fake (`@example.com` addresses) — say so if anyone asks to see
"the real customer list".

## 6. Email — read this before skipping it

The app emails a 6-digit code for **registration, password reset and
checkout**. If mail doesn't work, nobody can sign up or place an order.

**Do not copy the developer's personal Gmail credentials onto this laptop.**
Pick one:

**Option A — the shop's own Gmail (best).** Sign in to the shop's account,
turn on 2-Step Verification, create an *App Password* (Google account →
Security → App passwords), then in `.env`:

```
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=syndicatesupplyco63@gmail.com
MAIL_PASSWORD="the16charapppassword"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="syndicatesupplyco63@gmail.com"
MAIL_FROM_NAME="Syndicate Supply Co."
```

Google rejects a normal account password here. It must be an App Password,
and 2-Step Verification has to be on before that option appears.

**Option B — no real email (demo only).** Leave `MAIL_MAILER=log`. Nothing is
sent; each code is written to `storage\logs\laravel.log` instead. Everything
still works, you just read the code out of that file. Fine for a walkthrough,
useless for real customers.

## 7. Run it

Double-click **`start-syndicate.bat`**, or:

```
cd C:\xampp\htdocs\syndicate-ims
php artisan serve
```

Then open <http://localhost:8000>.

Stop it with `Ctrl+C`, or just close the window.

### Signing in

| Account | Email | Password |
|---|---|---|
| Admin | `admin@syndicate.test` | `password` |
| Staff | `staff@syndicate.test` | `password` |
| Customer | `customer@syndicate.test` | `password` |

Staff and admin land in the admin panel at `/admin`. Change these passwords
before anyone real uses this.

### Showing it on a phone

Serve on the network instead of just this machine:

```
php artisan serve --host=0.0.0.0 --port=8000
```

Find the laptop's IP with `ipconfig` (the IPv4 address, usually
`192.168.x.x`), then open `http://192.168.x.x:8000` on a phone connected to
the **same wifi**. Windows Firewall may ask to allow PHP the first time —
say yes, or it won't reach you.

---

## Things to fill in before real use

**Where customers send money.** `config/shop.php` holds the GCash number and
bank details shown at checkout. They are **placeholders**, and the site shows
a red "these are demo details, don't send money to them" warning until they
are replaced. Set the real ones in `.env`:

```
SHOP_PAYMENT_DETAILS_REAL=true
SHOP_GCASH_NAME="Syndicate Supply Co."
SHOP_GCASH_NUMBER="0917 123 4567"
SHOP_BANK_NAME="BDO"
SHOP_BANK_ACCOUNT_NAME="Syndicate Supply Co."
SHOP_BANK_ACCOUNT_NUMBER="1234-5678-9012"
```

There is no payment gateway. A customer sends the money and uploads a
screenshot; **staff confirm it in the admin panel after checking the shop's
own account.** Uploading a receipt marks nothing paid — that is deliberate,
since anyone can attach any image.

---

## If something goes wrong

**The site loads as plain unstyled text, no error anywhere.**
A leftover `public\hot` file is telling the browser to fetch styles from a
build server that isn't running. Delete `C:\xampp\htdocs\syndicate-ims\public\hot`
and reload. This is the single most common problem — check it first.

**`SQLSTATE[HY000] [2002]` or "connection refused".**
MySQL isn't running. Start it in XAMPP Control Panel.

**"Failed to open stream" / "vendor/autoload.php not found".**
The `vendor` folder didn't copy across. It's ~67 MB and thousands of files —
copying can silently truncate. Re-copy it.

**`Address already in use` on port 8000.**
Something else has the port. Use another: `php artisan serve --port=8080`.

**Nobody receives their code / checkout says it can't send.**
Mail isn't configured — see step 6. With `MAIL_MAILER=log` this is expected;
read the code from `storage\logs\laravel.log`.

**"Please provide a valid cache path" or permission errors.**
Make sure `storage` and `bootstrap\cache` exist and aren't read-only.

---

## What this install is and isn't

It runs on **this laptop only**, at `localhost`. It is not on the internet;
nobody else can reach it unless they're on the same wifi and you used the
`--host=0.0.0.0` form above.

That is deliberate. There is no hosting to pay for, nothing to expire, and
no external service that can fail during a demonstration.
