# Steel City Integrators Autonomous Business System

Production website, CRM, prospect intelligence, Google Calendar scheduling, Gmail communications and provider-gated booking for **Steel City Integrators LLC** in Birmingham, Alabama.

## Release 1.3

- Commercial positioning for organizations within approximately a four-hour drive of Birmingham
- Three primary markets: Commercial Businesses, Houses of Worship, and Community & Institutional Facilities
- Six campaign landing pages: worship, funeral homes, daycares, dental/medical, trades, and general commercial
- Updated consultation/support catalog:
  - Phone support — starting at $40 / 30 minutes
  - Text support — starting at $40 / 30 minutes
  - Zoom/TeamViewer/AnyDesk technical support — starting at $150/hour
  - Remote consultation — starting at $350
  - On-site consultation — starting at $500
  - Installation/project work — custom proposal
- Payment-provider adapter with a disabled default, Square as the intended primary provider, and optional legacy Stripe support
- Runtime payment-status check so verified Square checkout can be activated without rebuilding the public website
- Google Calendar booking, Gmail confirmation, 24-hour and 2-hour reminders, and post-service follow-up
- Google Sheets CRM, campaign attribution, lead scoring, pipeline activity and daily operations summary
- Source-traceable Prospect Intelligence Engine with four-hour drive tiers, compliant public-data guardrails, suppression controls and human-reviewed CRM promotion
- Funnel and video campaign production libraries

## Customer journey

Awareness → industry landing page → project/consultation request → CRM qualification → payment when applicable → scheduling/site assessment → proposal → installation → follow-up/retainer

## Prospect-intelligence journey

Legitimate business/public data → provenance → need signals → aggregate demand + campaign context → scoring → review queue → CRM → relevant outreach → opportunity

The system does not claim to identify anonymous individual Google searchers.

## Repository layout

- site/ — static public website and vertical landing pages
- src/ — modular Google Apps Script source and prospect-scoring module
- dist/Code.gs — generated single-file Apps Script deployment bundle
- docs/ — architecture, payment activation, funnels, campaigns and operating guidance
- tests/ — automated release checks
- scripts/build-apps-script.js — reproducible Apps Script bundler

## Public website

https://steel-city-integrators-birmingham.racing-tide-2944.chatgpt.site

## Safe deployment order

1. Merge the validated release PR and deploy the static website.
2. Build and copy dist/Code.gs into the existing Steel City Apps Script project.
3. Save and run upgradeSystemV13() once. Do not rerun the original setup from scratch.
4. Deploy a new version of the existing Apps Script web app.
5. Run runDiagnostics() and verify CRM, Form, Calendar, Gmail triggers, Prospects and Campaign Performance sheets.
6. Leave PAYMENT_PROVIDER=disabled until Square approves the account.
7. After approval, store Square credentials in Apps Script properties, run configureSquare(...), verify the location, then run activatePaymentProvider("square").
8. Complete one controlled live transaction and confirm payment verification, CRM/Bookings rows, Calendar event, Gmail confirmation and reminders.

See docs/SQUARE_ACTIVATION.md. Never commit payment keys, account credentials or customer data.

