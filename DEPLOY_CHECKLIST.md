# Milestone Jewellery — One-time deployment checklist

## 1) GitHub
- Create a NEW private repository, e.g. `milestone-jewellery`.
- Do NOT overwrite the existing `milestone-enterprises` Auto Parts repository.
- Upload the contents of this folder to the new repository root.
- Keep the branch name `main`.

## 2) Render Web Service
Create a NEW Web Service from the new GitHub repository.

Use:
- Runtime: Node
- Branch: main
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Region: Singapore (recommended because the existing Postgres is in Singapore)
- Plan: Free for testing; paid is recommended for a production shop.

Render supports Node/Express web services and expects the server to bind to `0.0.0.0`/`PORT`.

## 3) Environment variables
Set these in the NEW jewellery service:

Required:
- `DATABASE_URL` = the connection string for the existing Render Postgres instance used by Milestone. This build creates a separate `jewellery` PostgreSQL schema, so it does not use the Auto Parts tables.
- `ADMIN_KEY` = a long random secret.

Recommended:
- `STORE_PHONE`
- `WHATSAPP_NUMBER` (digits only with India country code, e.g. 919876543210)
- `STORE_EMAIL`
- `STORE_CITY=India`
- `PUBLIC_URL` = the final jewellery URL.

Optional online payment:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Never put the Razorpay secret or ADMIN_KEY in GitHub.

## 4) First deploy
Deploy the service. The app automatically:
- creates the `jewellery` schema;
- creates jewellery tables;
- inserts the sample catalogue if the jewellery catalogue is empty.

Open:
- `/api/health` — should return status `ok`.
- `/` — storefront.
- `/admin.html` — admin page.

## 5) Before accepting real orders
Replace the sample catalogue and demo prices with real products. Update:
- product names
- prices
- weights
- purity
- product images
- actual hallmark/certificate details
- shipping charges
- exchange/return policy
- business contact details
- GST/legal details

The included gold-rate figures are explicitly illustrative and are NOT a live market feed.

## 6) Custom domain
Recommended initial URL:
`jewellery.milestoneautoparts.in`

In Render:
Service → Settings → Custom Domains → Add Custom Domain.

In GoDaddy DNS:
- Type: CNAME
- Name: `jewellery`
- Value: the exact `onrender.com` hostname Render shows for the new jewellery service.
- TTL: default/automatic.

Do not change the existing `www`/root records used by `milestoneautoparts.in`.

After DNS propagation, verify the domain in Render. Render issues the TLS certificate automatically.

## 7) Do not touch
Do NOT change:
- existing `milestone-enterprises` Auto Parts Render service
- existing Auto Parts custom-domain DNS records
- existing Auto Parts GitHub repository files

This jewellery project is intentionally separate at the web-service level and isolated at the database-schema level.

## 8) Launch test
Before sharing the URL, test:
- Home page
- Search
- Every category button
- Product VIEW
- Add to cart
- Quantity +/-
- Remove
- Wishlist
- Checkout validation
- COD order
- WhatsApp order link
- Order tracking
- Admin order list/status
- Admin add product
- Mobile menu
- Mobile checkout
- Custom domain + HTTPS

For online payments, test a Razorpay test-mode payment before switching to live credentials.
