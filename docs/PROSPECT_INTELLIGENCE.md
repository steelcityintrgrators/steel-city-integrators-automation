# Steel City Prospect Intelligence Engine

## Objective
Continuously build a proprietary, source-traceable prospect database for organizations within an approximately four-hour drive of Birmingham, Alabama, then prioritize likely buyers of Steel City Integrators services.

## Target organizations
Churches, funeral homes, daycares, schools/nonprofits, event venues and small/commercial businesses.

## Territory tiers
- Tier 1: 0–1 hour — all services, highest priority.
- Tier 2: 1–2 hours — all commercial services; travel-aware scoring.
- Tier 3: 2–3 hours — prioritize larger installations, upgrades and retainers.
- Tier 4: 3–4 hours — prioritize strategic/high-value projects whose expected value justifies travel.
- Outside 4 hours — remote consultation/support only unless manually approved.

Drive time is the qualification standard. Straight-line distance must not be represented as drive time.

## Prospect record
Store: prospect_id, organization, vertical, address/city/state/ZIP, website, public phone, public business email, public decision-maker name/title when lawfully available, source URL/provider, source timestamp, drive-time tier, service hypotheses, evidence signals, opportunity score, outreach eligibility, CRM status, last verified date.

Every material fact should retain provenance. Do not invent missing contact information.

## Need signals
Examples include: active livestreaming; visibly dated production workflow; expansion/renovation/new location; multiple facilities; public references to security, cameras, controlled entry, Wi-Fi, network, AV, sound, displays, cabling or construction; technical/media hiring; public RFP/procurement notices; and other public evidence of a relevant project.

## Opportunity score (0–100)
- Relevant target vertical: 10
- Within target drive-time territory: up to 20 (Tier 1=20, Tier 2=16, Tier 3=12, Tier 4=8)
- One credible need signal: 15
- Multiple independent need signals: +10
- Recent/high-intent signal (RFP, renovation, opening, hiring, explicit upgrade): 20
- Public business contact path: 10
- Public decision-maker role/contact: 10
- Estimated project-fit/value: up to 15
Cap at 100.

Routing:
- 80–100: Hot — research/personalize and route to human-safe outreach queue.
- 60–79: Qualified — personalized outreach queue.
- 40–59: Nurture — retain and recheck signals.
- <40: Database only.

## Acquisition loop
Discovery -> enrichment -> provenance/dedupe -> need-signal detection -> scoring -> CRM sync -> personalized outreach queue -> paid booking/project request -> calendar -> service -> follow-up -> review/retainer.

## Data and outreach guardrails
Use lawful public/business data and licensed APIs/datasets. Respect source terms, robots/rate limits where applicable, opt-outs and applicable email/SMS/telemarketing rules. Do not buy, infer or expose sensitive personal data. Do not claim to identify an individual Google searcher. Google search/Ads/Search Console data is used as aggregate demand intelligence; identifiable prospects come from legitimate business/public sources.

Cold outreach must be targeted and relevant, identify Steel City Integrators, provide a working opt-out for email where required, and avoid automated marketing SMS/calls without the required consent. Suppression/opt-out status overrides scoring.

## CRM integration
Prospects that reach the configured threshold are inserted or updated in the existing CRM, never duplicated. Use normalized domain + phone + organization/location matching for dedupe. Set Lead Source to Prospect Intelligence and retain the original source/provenance separately.

## Autonomous learning
Track prospect source, signals, score at creation, outreach attempts, replies, bookings, proposals, wins, revenue and service type. Periodically compare conversion/revenue against the signals so scoring weights can be improved without silently changing compliance rules.
