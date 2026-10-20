# Payment activation — Steel City Integrators

The repository implements Stripe-hosted Checkout with server-side payment verification. The booking calendar is not released until Stripe reports the Checkout Session as paid and complete.

## One-time account steps

1. Create or sign in to the Steel City Integrators Stripe account.
2. Complete Stripe business and payout verification.
3. In Google Apps Script, add the live Stripe secret key to **Project Settings → Script properties** as `STRIPE_SECRET_KEY`.
4. Add `WEBSITE_URL` with the public website origin (no trailing slash).
5. Replace the deployed Apps Script source with `dist/Code.gs`, save it, and run `upgradeSystemV12()` once.
6. Deploy a new version of the existing web app. Keep access set to **Anyone** and execute as the Steel City Integrators account.
7. Run `runDiagnostics()` and confirm every check is true.
8. Complete one low-value live checkout, book a time, and confirm the Stripe payment, CRM lead, Bookings row, Calendar event, confirmation email and reminder triggers.

Do not place the Stripe secret key in GitHub, website JavaScript, email or documentation.

## Customer flow

`Website → service selection → Stripe Checkout → verified Apps Script booking page → Calendar event → confirmation → reminders → follow-up`

## Pricing encoded in the server catalog

| Service | Fee | Reserved time |
|---|---:|---:|
| Phone consultation | $35 | 20 minutes |
| Live text consultation | $45 | 30 minutes |
| Remote technical support | $99 | 60 minutes |
| On-site Zone 1 (0–25 road miles) | $175 | Up to 90 minutes |
| On-site Zone 2 (26–50 road miles) | $225 | Up to 90 minutes |
| On-site Zone 3 (51–80 road miles) | $275 | Up to 90 minutes |

Prices are verified on the server against the Stripe Checkout Session before an appointment can be created.
