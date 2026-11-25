# Mahjong Springs platform

Phase 1 of the national American Mahjong league site. It is meant to replace the WordPress site at mahjongsprings.com after a DNS cutover. It does not call or change the live site.

Organizers anywhere in the United States keep 100% of their entry fee. The player pays a flat $5.00 booking fee on top. Mahjong Springs (Lyndsey and Denise) is the home organization and the only organization that can host leagues in Utah.

## Stack

- Next.js App Router, TypeScript, React
- Postgres and Prisma
- Auth.js (credentials, JWT sessions)
- Stripe Connect, test mode only, Accounts v2, direct charges, Embedded Checkout

## Local setup

1. Start Postgres. `docker compose up -d` creates the database, or use the connection string below against a local server.
2. Copy `.env.example` to `.env`.
3. Install and prepare the database.

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Seed accounts are local test data. Every password is `Mahjong-Test-1`.

| Email | Role |
| --- | --- |
| lyndsey@mahjongsprings.test | Admin, Mahjong Springs |
| denise@mahjongsprings.test | Admin, Mahjong Springs |
| test.organizer@example.test | Approved organizer outside Utah |
| test.pending@example.test | Organizer waiting for approval |
| test.player@example.test | Player, not yet registered |
| test.host@example.test | Player on the sample Utah season |

Sample leagues, players, and scores are labeled test data. They are not live Mahjong Springs activity.

```bash
npm test
npm run build
```

`npm run migrate:wordpress` prints the WordPress `msl_*` and `msl_newsletter` column map. It does not connect to the live site. Set `WP_DATABASE_URL` only when you have a database copy to import; the MySQL reader is still a stub.

## Stripe test mode

Use a [Stripe sandbox](https://docs.stripe.com/sandboxes) (a test environment) or the account’s test-mode keys. The app refuses any key that is not `rk_test_`, `sk_test_`, or `pk_test_`.

Prefer a restricted API key (`rk_test_`) for `STRIPE_SECRET_KEY`, with permission to create Accounts v2 connected accounts, Account Links, Checkout Sessions, and refunds, and to read connected-account capabilities. Store it as a sensitive environment variable. Do not commit it.

1. Create a Stripe platform account and request Connect approval. Direct charges and `fees_collector: stripe` need the platform’s Connect settings to allow connected accounts to pay Stripe fees (managed risk).
2. Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`.
3. Forward webhooks while developing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The endpoint verifies the `Stripe-Signature` header and stores each event id so a delivery is applied once. Fulfillment runs on `checkout.session.completed` and `checkout.session.async_payment_succeeded` only when `payment_status` is `paid`. The return page can confirm the same session by reading it back from Stripe; it does not trust the redirect alone.

Listen for events on connected accounts. The handler also records `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, and account capability updates.

`POST /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET` records 24-hour table reminders and score reminders. Email delivery is logged in `MailLog` until an SMTP provider is attached. Players who have claimed a seat can download an `.ics` invite that includes the address.

## Charge configuration

Direct charges on the connected account, Accounts v2, generally available (Stripe Node SDK 23.2.0, API `2026-11-18.endive`). Not a preview API.

- Connected account: `dashboard: full`, `fees_collector: stripe`, `losses_collector: stripe`, merchant `card_payments` requested.
- Checkout Session: `ui_mode: embedded_page`, created with the `Stripe-Account` header, `payment_intent_data.application_fee_amount: 500`.
- No `payment_method_types` (dynamic payment methods).
- Refunds of the entry fee set `refund_application_fee: false`.

When Stripe collects fees, the application fee is only the platform’s $5. Stripe deducts its processing fee from the connected account separately, and it does not add a fee on the application fee. An $80 entry is an $85 charge. The organizer’s balance, before the processing fee, is the $80 entry. The platform nets $5. Gross settlement is a private preview and is not used.

Organizers onboard once through a Stripe-hosted Account Link. Checkout stays on this site. Payouts, disputes, and the full dashboard stay in Stripe. The platform never holds organizer funds.

## Deploy to Vercel

1. Create a Postgres database (Vercel Postgres, Neon, or similar) and set `DATABASE_URL`.
2. Set `AUTH_SECRET` (a long random string), `AUTH_URL`, and `NEXT_PUBLIC_SITE_URL=https://www.mahjongsprings.com`.
3. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID`. The current property is `G-L8C5HYQ4K6`.
4. Set the Stripe test keys and `STRIPE_WEBHOOK_SECRET`. Add the live webhook URL `https://www.mahjongsprings.com/api/stripe/webhook` in the Stripe Dashboard, with connected-account events enabled. Switch to live keys only after Connect is approved and you have reviewed a live test payment. This repo’s code still rejects live keys until that guard is removed on purpose.
5. Set `CRON_SECRET` and schedule `POST /api/cron/reminders` (Vercel Cron or an external scheduler).
6. Run `npx prisma db push` against the production database, then deploy. Do not run the local seed against production.

## DNS cutover

Keep DreamHost as the mail host.

1. Export a copy of the WordPress database and run the migration map. Do not point this app at the live WordPress database during the import rehearsal.
2. Lower the DNS TTL a day ahead.
3. In DreamHost, leave the MX records, SPF, DKIM, and DMARC for `mahjongsprings.com` in place so `hello@mahjongsprings.com` keeps arriving.
4. Point the web records (`A` / `AAAA` or `CNAME` for `@` and `www`) at Vercel. Do not replace the MX records with Vercel’s mail settings.
5. Add the domain in Vercel and confirm HTTPS.
6. Check `https://www.mahjongsprings.com/`, a city URL such as `/mahjong-saratoga-springs/`, `/leagues/`, and that mail to `hello@mahjongsprings.com` still arrives.
7. Old `/shop/`, `/cart/`, and `/checkout/` URLs 301 to the home page or `/leagues/`. `/my-account/` 301s to `/account/`.

## Routes

Public: `/`, `/leagues/`, `/find-a-table/`, `/how-it-works/`, `/leaderboard/`, `/host-a-game/`, `/league/[slug]/`, and the ten Utah city pages at their existing slugs.

Signed-in: `/account/`, `/my-league/`, `/my-profile/`, `/directory/`, `/organizer/`, `/admin/`.
