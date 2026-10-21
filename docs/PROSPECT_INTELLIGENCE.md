# Steel City Prospect Intelligence Engine

## Objective

Build a proprietary, source-traceable database of organizations within an approximately four-hour drive of Birmingham, then prioritize legitimate commercial opportunities for Steel City Integrators.

## Target organizations

Houses of worship, funeral homes, daycares, dental and medical offices, HVAC/plumbing/trade businesses, professional offices, small-to-midsize commercial businesses, schools, nonprofits and community facilities.

## Territory tiers

- Tier 1: 0–1 hour — all services, highest priority
- Tier 2: 1–2 hours — all commercial services with travel-aware qualification
- Tier 3: 2–3 hours — prioritize larger installations, upgrades and retainers
- Tier 4: 3–4 hours — prioritize strategic projects whose expected value justifies travel
- Outside 4 hours — remote consultation/support unless manually approved

Drive time is the qualification standard. Straight-line distance must not be represented as drive time.

## Compliant source registry

Allowed source classes when terms permit:
- official business and organization websites
- public Google Business Profile/Maps business listings used as business records, not anonymous-searcher identity
- state licensing and corporate registries
- public procurement, RFP and permit portals
- chamber, association, school, nonprofit and denominational directories
- public job postings, news releases and expansion announcements
- licensed business-data providers with documented permitted use
- existing CRM records and customer referrals
- aggregate Google Ads, Search Console and trend data
- aggregate campaign performance captured in the Campaign Performance sheet

Every material business fact retains source URL/provider, source timestamp and last verified date. Missing contact details are not invented.

## Prospect record

Store: prospect ID, organization, vertical, location, website, public phone, public business email, public decision-maker role when lawfully available, source URL/provider/timestamp, drive minutes/tier, need signals, aggregate demand index, campaign fit, project fit, score, outreach eligibility, suppression state, CRM lead ID and last verified date.

## Need signals

Examples:
- active but visibly limited livestream or production workflow
- expansion, renovation, relocation or new facility
- multiple facilities
- public references to cameras, controlled entry, Wi-Fi, network, AV, sound, displays, cabling or construction
- relevant technical/media/facilities hiring
- public RFP, bid, procurement or permit activity
- operational pain explicitly described by the organization

Signals must be public, relevant and attributable.

## Opportunity score

- relevant target vertical: 10
- drive-time territory: up to 20
- one credible need signal: 15
- multiple independent need signals: +10
- recent/high-intent public signal: 20
- public business contact path: 10
- public decision-maker role: 10
- estimated project fit: up to 15
- aggregate demand context: up to 5
- historical campaign fit: up to 5
- total capped at 100

Routing:
- 80–100: Hot — human research and personalized review queue
- 60–79: Qualified — human review queue
- 40–59: Nurture — retain and recheck
- below 40: Database only

Suppression and opt-out status override score. Automated cold SMS/calls are not permitted without required consent.

## CRM safety boundary

upsertProspect(payload) creates or updates the separate Prospects sheet and deduplicates by domain, public phone or organization/location.

A prospect never enters automated follow-up merely because it scored highly. promoteProspectToCrm(prospectId, true) requires an explicit human-review confirmation, blocks suppressed records and creates the CRM record in Prospecting Review with the next automated follow-up blank.

## Aggregate demand and campaign learning

Aggregate search demand helps prioritize markets and content; it does not reveal who searched. Campaign Performance stores impressions, clicks, leads, qualified leads, appointments, proposals, wins, revenue and spend by channel and vertical. Conversion and revenue trends can adjust campaign-fit inputs without changing compliance rules or fabricating identities.

## Acquisition loop

Discovery → provenance and dedupe → need-signal verification → drive-time qualification → scoring → human review → CRM promotion → relevant outreach → consultation/project request → proposal → installation → follow-up/retainer

## Prohibited claims and data practices

- Do not claim to identify individual anonymous Google searchers.
- Do not scrape or use a source in violation of its terms.
- Do not buy, infer or expose sensitive personal data.
- Do not invent names, emails, roles, need signals or project timing.
- Do not bypass suppression, opt-out or consent requirements.
- Do not present straight-line radius as verified drive time.

