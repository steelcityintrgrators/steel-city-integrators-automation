# Autonomous System Completion Runbook

Current customer journey: awareness -> industry landing page -> project/consultation request -> CRM qualification -> payment when applicable -> scheduling or site assessment -> proposal -> installation -> follow-up/retainer.

## Account-dependent blocker
Checkout is intentionally disabled until Square is activated and verified. The public website falls back to CRM intake while payment is disabled. Once Square is verified, configure credentials outside GitHub, run diagnostics, activate the provider and perform a controlled live transaction. Runtime status activates the payment path without another public-site rebuild.

## Prospecting
The target on-site market is defined by drive time: up to approximately four hours from Birmingham, Alabama. Prospecting uses the methodology in PROSPECT_INTELLIGENCE.md. Qualified prospects require human review before CRM promotion; suppression overrides score.

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

