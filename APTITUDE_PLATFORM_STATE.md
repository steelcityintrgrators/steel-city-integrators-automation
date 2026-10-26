# Aptitude Intelligence Platform — Project State

Last updated: 2026-10-26

## Product objective

Build a mobile-first adaptive aptitude intelligence platform that can move from developmental pilot testing to defensible psychometric validation, career/pathway intelligence, organization use, white-label delivery, API access, and commercialization.

## Current tracks

### 1. Public developmental prototype

Path: `aptitude-prototype/`

Status:
- live through GitHub Pages
- 8 aptitude domains
- 64-item public developmental bank
- 16, 24, and 40 question modes
- accuracy-driven adaptive difficulty
- provisional multidimensional scoring
- timing captured but excluded from aptitude score
- no persistent browser attempt history
- no public admin UI
- test IDs encouraged instead of real names
- JSON result export
- exploratory pathway hypotheses
- explicit non-validated claim boundaries

Important limitation:
- the original public bank and its historical answer keys exist in public Git history
- this bank must never be treated as secure, high-stakes, or cheat-resistant

### 2. Pilot analyzer

Path: `aptitude-prototype/pilot-analyzer.html`

Status:
- local browser-only analytics
- imports one or more exported result JSON files
- no server upload
- session count
- average composite
- median duration
- domain averages
- item percent correct
- median item response time
- option A/B/C/D selection shares
- exploratory item-rest discrimination
- review flags for very easy, very hard, negative-discrimination, and low-discrimination items
- warns when schema, bank, or scoring versions are mixed

Purpose:
- early pilot diagnostics only
- not a substitute for a full psychometric calibration pipeline

### 3. Secure-scoring prototype

Path: `aptitude-secure/`

Vercel project:
- name: `aptitude-engine-prototype`
- project id: `prj_tGc0JEKzslM4AY5wdmLwpIiGWpdZ`
- team: `SCI` / `team_S7SRimUHDJJ7HWf4QbIJrYZE`
- Git repository: `steelcityintrgrators/steel-city-integrators-automation`
- root directory: `aptitude-secure`
- deployment protection remains enabled

Server architecture:
- `api/start.js` creates a protected adaptive session
- `api/answer.js` validates answers and advances the adaptive test
- `lib/engine.js` owns item selection, scoring, timing, encrypted session state, and final report generation
- session state uses AES-256-GCM
- no secure item bank is embedded in browser code
- no answer key is embedded in browser code
- server returns one question at a time
- final report returns participant answers without answer keys

Secure bank:
- version: `secure-32-v1`
- 32 new items
- 8 domains
- stored only in sensitive Vercel environment configuration
- intentionally distinct from the public 64-item bank

Secure result contract:
- schema: `1.0-secure`
- scoring: `server-weighted-accuracy-v1`
- test lengths currently supported: 16 and 24 items

Security headers:
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- restrictive Permissions-Policy
- Content-Security-Policy

## CI / QA

### Public deployment workflow

`.github/workflows/aptitude-pages.yml`

Gate checks:
- 64 unique public items
- 8 domains
- four choices per item
- valid keyed answer index
- no public admin UI
- no browser persistence of participant attempts
- no answer key in exported participant response records
- public claim-boundary language
- pilot analyzer privacy safeguards
- pilot analyzer item-diagnostic features

### Secure QA workflow

`.github/workflows/aptitude-secure-qa.yml`

Latest complete secure flow verified:
- encrypted session token round-trip
- secure client contains no bank or answer-key fields
- start/answer API wiring
- server-managed item selection
- server-managed scoring
- 16-question dummy adaptive test
- 8 domains represented
- 100% expected score under fixture test
- final report contains no answer keys

Latest secure end-to-end CI run passed.

## Psychometric status

The platform is developmental.

Current scores are not:
- IQ scores
- population percentiles
- clinically diagnostic
- validated hiring measures
- validated school-placement measures
- validated career-fit determinations

Validation roadmap is documented in:
`aptitude-prototype/VALIDATION_PLAN.md`

Evidence gates:
1. content QA
2. usability pilot
3. item analysis
4. reliability
5. construct and criterion evidence
6. fairness / differential item functioning
7. norming
8. claim expansion only after evidence supports it

## Deployment blocker

The secure Vercel project is correctly Git-linked but currently has zero deployments.

Vercel repeatedly returned:
- HTTP 402
- resource: `api-deployments-free-per-day`
- reason: team exceeded 100 free API deployments/day
- retry guidance: try after the daily limit resets or change plan/billing

A CLI fallback was checked locally, but the Vercel CLI is not installed in the available runtime.

Do not claim the secure Vercel build is live until an actual deployment exists and the API endpoints are tested.

## Current public test surfaces

GitHub Pages root:
`https://steelcityintrgrators.github.io/steel-city-integrators-automation/`

Pilot analyzer:
`https://steelcityintrgrators.github.io/steel-city-integrators-automation/pilot-analyzer.html`

## Current data strategy

For the $0 pilot stage:
- participant sessions do not persist automatically
- participants can export JSON reports
- pilot analyst can aggregate exported files locally
- secure server session state is encrypted and short-lived

Central persistence is intentionally not provisioned yet because the currently available private Vercel Blob option may create usage charges and current pricing could not be verified with web access disabled.

Do not create a potentially billable persistence resource without owner authorization or reliable current pricing verification.

## Next priority order

P1:
1. obtain first secure Vercel preview after deployment quota resets
2. test `/api/start` live
3. complete a full 16-item secure assessment
4. verify `/api/answer` never exposes answer keys
5. verify security headers
6. verify protected deployment behavior
7. inspect runtime/build logs

P2:
1. run first consented pilot cohort
2. collect versioned result exports
3. analyze item difficulty, option functioning, timing, and discrimination
4. revise weak items
5. expand secure item bank
6. establish reliability testing workflow

P3:
1. add interests/preferences separate from aptitude
2. build evidence-based pathway matching
3. introduce occupational-data integration
4. keep pathway recommendations explicitly exploratory until validated

P4:
1. consented centralized persistence
2. participant accounts
3. secure administrator authentication
4. organization/cohort model
5. report repository
6. billing only after product-market evidence

## Owner action currently required

None for the present build.

A paid Vercel upgrade is not recommended solely to bypass the current one-day deployment quota. The secure source, environment configuration, and CI are already staged.
