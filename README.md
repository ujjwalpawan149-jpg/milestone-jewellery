# Milestone Enterprises — Jewellery

Premium jewellery storefront built with Node.js + Express + PostgreSQL.

## What is included

- Responsive luxury storefront
- Product search and category filters
- Product detail modal
- Cart with quantity controls
- Guest checkout
- Order creation in PostgreSQL
- Order tracking by order number + phone
- WhatsApp enquiry links
- Gold-rate information panel (illustrative until a live rate provider is connected)
- Health endpoint for Render
- Database schema + seed script
- Render Blueprint file
- No secrets committed to Git

## Local setup

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run:
   `npm install`
   `npm run seed`
   `npm start`
4. Open `http://localhost:10000`.

## Render deployment

Render supports Node web services with `npm install` and `npm start`. Connect this repository as a new Web Service. Use `main` as the branch.

Set these environment variables in Render:
- `DATABASE_URL` — the PostgreSQL connection string. This build uses an isolated `jewellery` schema, so it can safely share the existing Render Postgres instance with the Auto Parts app. Do not point the Auto Parts app at a different database or change its schema.

**Important:** the included products/prices are demo catalogue data. Replace them with the real jewellery catalogue before accepting real orders.
- `ADMIN_KEY` — long random secret.
- `STORE_PHONE`
- `WHATSAPP_NUMBER` (digits only with country code, e.g. 9198...)
- `STORE_EMAIL`
- `PUBLIC_URL` — final public URL.

The app automatically creates its isolated `jewellery` schema and sample catalogue on first start. You can also run `npm run seed` manually if you want to refresh the sample catalogue.

## Custom domain

Add the jewellery domain/subdomain in the Render Web Service's Custom Domains section, then follow the DNS records Render provides. Do not change the DNS records for the existing Auto Parts service until the new service is verified.

## Payments

The app intentionally defaults to COD so it can go live without exposing payment secrets. Razorpay integration can be added only after valid Razorpay credentials are configured. Never put `RAZORPAY_KEY_SECRET` in frontend code.

## Important before launch

Replace the sample jewellery products/prices and product SVGs with the shop's actual catalogue, legal business details, shipping/return policy, GST details, and verified hallmark/certificate information.

## Admin

Open `/admin.html` after deployment. Enter the `ADMIN_KEY` set in Render. The admin page can:
- view the latest 100 orders;
- update order status;
- add catalogue products.

Do not share the `ADMIN_KEY`. This is a lightweight store admin, not a substitute for a full enterprise IAM system.
