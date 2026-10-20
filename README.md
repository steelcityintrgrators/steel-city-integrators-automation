# Steel City Integrators Autonomous Business System

Production website, prepaid booking, CRM, Google Calendar scheduling and customer communications for **Steel City Integrators LLC** in Birmingham, Alabama.

## Release 1.2

- Professional public website for Birmingham and surrounding Central Alabama communities
- Phone consultation — $35 / 20 minutes
- Live text consultation — $45 / 30 minutes
- Remote technical support — $99 / 60 minutes
- On-site consultation/troubleshooting — $175, $225 or $275 by road-mile zone
- Stripe-hosted secure checkout
- Server-side payment and price verification before the calendar opens
- Single-use paid booking sessions
- Google Calendar event creation and customer invitation
- Gmail confirmations, 24-hour and 2-hour reminders, and post-service follow-up
- Google Sheets CRM, lead scoring, pipeline activity and daily operations summary
- Google Business Profile copy and SEO assets

## Customer journey

`Website → select service → secure payment → verified scheduling → confirmation → service → follow-up`

## Repository layout

- `site/` — static public website
- `src/` — modular Google Apps Script source
- `dist/Code.gs` — single-file Apps Script deployment bundle
- `docs/` — architecture, setup and account-activation instructions
- `tests/` — automated release checks

## Public website

https://steel-city-integrators-birmingham.racing-tide-2944.chatgpt.site

## Safe deployment order

1. Deploy the website.
2. Copy `dist/Code.gs` into the existing Steel City Apps Script project.
3. Add the Stripe live secret key as the `STRIPE_SECRET_KEY` Apps Script property.
4. Run `upgradeSystemV12()` once. Do **not** rerun the original setup from scratch.
5. Deploy a new version of the existing Apps Script web app.
6. Run `runDiagnostics()` and complete one controlled live booking test.

See `docs/PAYMENT_ACTIVATION.md` for the account-dependent steps. Never commit payment keys or account credentials.
