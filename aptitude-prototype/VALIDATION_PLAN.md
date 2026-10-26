# Aptitude Intelligence — Validation Plan

Status: developmental prototype. Nothing in the current build is psychometrically validated.

## Construct definitions

1. **Numerical Reasoning** — solving quantitative problems using arithmetic, proportions, rates, and numerical relationships.
2. **Logical Reasoning** — deriving valid conclusions from stated rules, sequences, and constraints.
3. **Verbal Reasoning** — interpreting language, analogies, evidence, and stated/unstated relationships.
4. **Spatial Reasoning** — mentally representing direction, rotation, reflection, folding, and 3D relationships.
5. **Attention to Detail** — detecting exact matches, discrepancies, ordering errors, and small symbolic differences.
6. **Systems Thinking** — recognizing bottlenecks, dependencies, handoffs, local optimization, feedback, and resilience.
7. **Practical / Technical Reasoning** — selecting sensible troubleshooting and technical diagnostic actions from observable symptoms.
8. **Learning Adaptability** — selecting effective learning and transfer strategies when feedback, context, or constraints change.

## Current scoring

Version: `weighted-accuracy-v1`

- Correct responses receive weight equal to pilot difficulty (1–3).
- Domain score = earned weighted points / possible weighted points presented.
- Composite = unweighted mean of available domain scores.
- Difficulty adapts one level up after a correct response and one level down after an incorrect response.
- Response time is captured but does not affect aptitude scores.
- Fewer than 4 items in a domain is explicitly labeled low evidence.

These are transparent prototype rules, not calibrated latent-trait estimates.

## Evidence gates

### Gate 0 — Content QA
Required before public pilot:
- unique item IDs
- exactly one keyed response
- no broken choices
- explanation agrees with key
- construct relevance review
- ambiguity review
- accessibility review
- obvious cultural/context bias review

### Gate 1 — Pilot usability
Collect consented pilot sessions and examine:
- completion rate
- abandonment by item/domain
- median response time
- extreme time outliers
- item omission rate
- participant clarity feedback
- mobile usability failures

### Gate 2 — Item analysis
After sufficient pilot responses:
- empirical item difficulty
- item-total association/discrimination
- distractor functioning
- ceiling/floor effects
- exposure rate
- differential performance by relevant subgroups where lawful, ethical, and adequately sampled

Items that do not perform as intended move to revision or retirement.

### Gate 3 — Reliability
Evaluate:
- internal consistency where appropriate for each construct
- split-form/alternate-form stability when the bank is large enough
- test-retest reliability with an appropriate interval
- score precision / uncertainty

Do not publish a single reliability statistic as proof of validity.

### Gate 4 — Construct and criterion evidence
Study whether scores relate to:
- established measures of similar constructs where licensing/permissions allow
- training performance
- course outcomes
- job-task performance
- other clearly defined external criteria

Avoid circular criteria that simply restate the assessment.

### Gate 5 — Fairness
Evaluate:
- differential item functioning
- subgroup score distributions
- accessibility effects
- language complexity effects
- device/interface effects
- whether recommendations create disparate or unjustified outcomes

A demographic difference alone does not establish item bias; investigate construct relevance and item functioning.

### Gate 6 — Norming
Only after a defensible reference sample exists:
- define target population
- document sampling method
- determine weighting/stratification needs
- produce standard scores/percentiles with uncertainty and documentation

Until this gate is passed, the product must not call current scores population percentiles.

## Working data targets

These are planning targets, not guarantees of adequacy:

- usability pilot: tens of participants can reveal obvious UX failures
- early item analysis: aim for at least low hundreds of completed sessions
- stronger calibration/fairness work: expect several hundred to thousands depending on model complexity and subgroup analysis

Final sample requirements must be set from the intended claim, assessment model, and subgroup precision—not from a fixed marketing number.

## Item lifecycle

`draft → AI review → human review → approved → pilot → calibrated → active → retired`

No AI-generated item should move directly from generation to active high-stakes use.

## Current claim boundary

Allowed:
- developmental
- exploratory
- observed performance on the current pilot item bank
- provisional profile

Not allowed yet:
- IQ score
- validated aptitude score
- national percentile
- clinical diagnosis
- validated hiring predictor
- school-placement determination
- guaranteed career fit

## Next evidence task

Collect structured pilot exports using:
- `schemaVersion: 0.3`
- `bankVersion: pilot-64-v1`
- `scoringVersion: weighted-accuracy-v1`

The next analytics layer should ingest those exports, calculate item statistics, flag weak items, and preserve version history so scores are never mixed across incompatible bank/scoring versions.
