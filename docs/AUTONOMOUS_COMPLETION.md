# Autonomous System Completion Runbook

Current customer journey: website -> payment gate -> verified scheduling -> confirmation/reminders -> service -> follow-up.

## Account-dependent blocker
Checkout is intentionally disabled until a legitimate payment processor account is activated and verified. Never remove this gate merely to make the UI appear complete. Once a supported processor is verified, configure credentials outside GitHub, run diagnostics, and perform a controlled live transaction before enabling public checkout.

## Prospecting
The target on-site market is now defined by drive time: up to approximately four hours from Birmingham, Alabama. Prospecting should use the methodology in PROSPECT_INTELLIGENCE.md and sync qualified records to the existing CRM.

## Definition of operational completion
1. Public site and service territory copy deployed.
2. Verified payment processor configured; no secrets committed.
3. Payment-success verification gates scheduling.
4. Calendar availability and event creation pass live test.
5. CRM receives booking/payment/project status.
6. Confirmation, reminder and follow-up messages pass live test.
7. Prospect ingestion is deduplicated, source-traceable and scored.
8. Outreach suppression/opt-out is enforced.
9. Daily operations summary reports new prospects, hot leads, bookings, payments, projects and exceptions.
10. Google Business Profile is separately verified/published; website code cannot substitute for Google's verification.
