# Autonomous System Architecture — Release 1.3

## 1. Public experience

The static site positions Steel City Integrators as a commercial technology integration company serving qualified work within approximately a four-hour drive of Birmingham.

Primary markets:
- Commercial Businesses
- Houses of Worship
- Community & Institutional Facilities

Six industry landing pages carry campaign-specific messaging and project-request links. UTM parameters persist during the visit and are forwarded into the CRM intake page.

## 2. Lead capture and CRM qualification

Inputs:
- industry landing-page project request
- legacy Google Form
- website/API POST
- verified support booking
- human-reviewed Prospect Intelligence promotion

The Leads sheet remains the customer-opportunity system of record. Release 1.3 adds industry segment, campaign, UTM source/medium/campaign and source-detail columns without replacing existing lead history.

Lead handling:
1. validate contact and project location
2. create or update CRM record
3. score commercial fit, urgency, budget and service need
4. send Gmail acknowledgement and internal alert
5. schedule follow-up inside the 7:00 AM–9:00 PM Central operating window

## 3. Prospect Intelligence Engine

The Prospects sheet is separate from customer leads. A prospect record requires a legitimate public/licensed source and provenance. It combines:

- organization and public business contact data
- four-hour drive-time qualification
- public need signals
- aggregate search-demand index
- historical campaign fit
- project-fit estimate
- suppression and outreach-eligibility state

Prospects never enter automated outreach. Scores of 60+ may be promoted only through promoteProspectToCrm(prospectId, true), which creates a Prospecting Review record with automated follow-up disabled. Human review remains required.

The engine does not identify anonymous individual searchers.

## 4. Consultation, payment and scheduling

Public support catalog:
- Phone Support — $40 / 30 minutes
- Text Support — $40 / 30 minutes
- Remote Technical Support — $150 / hour
- Remote Consultation — $350
- On-Site Consultation — $500
- Installation / project work — custom proposal

The payment adapter supports disabled, square and stripe states. Disabled is the safe default. The public Support page checks backend status at runtime:

- disabled/unverified: route into CRM request and qualification
- verified/active: create hosted checkout and verify the provider response server-side

Scheduling is never released until the provider confirms the exact server-side service and amount. Square is the intended primary production provider.

## 5. Google automation

Google Sheets:
- Leads
- Activity
- Settings
- Bookings
- Prospects
- Campaign Performance

Google Calendar:
- availability checks
- conflict prevention
- appointment event creation
- customer invitation

Gmail:
- lead acknowledgement
- internal lead alert
- booking confirmation
- 24-hour and 2-hour reminders
- post-service follow-up
- daily operations summary

## 6. Campaign measurement

The Campaign Performance sheet stores channel-level aggregate metrics: impressions, clicks, leads, qualified leads, appointments, proposals, wins, revenue and spend. Aggregate performance may influence vertical prioritization, but it is not used to claim the identity of anonymous searchers.

## 7. Security and continuity

- no secrets in GitHub or static website files
- provider credentials live in Apps Script properties
- checkout can be disabled immediately without a website deployment
- customer and prospect data remain in owner-controlled Google systems
- existing CRM, Calendar, Gmail, Form and trigger identities are upgraded in place through upgradeSystemV13()
- setupSystem() is not rerun on the production project

