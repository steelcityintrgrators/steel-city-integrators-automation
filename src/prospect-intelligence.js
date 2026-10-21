/**
 * Steel City Prospect Intelligence scoring core.
 * Pure functions so this can be used from Apps Script or tested independently.
 */
const SCI_PROSPECT = Object.freeze({
  MAX_DRIVE_MINUTES: 240,
  HOT: 80,
  QUALIFIED: 60,
  NURTURE: 40
});

function prospectDriveTier(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n < 0) return { tier: 'Unknown', points: 0, onsite: false };
  if (n <= 60) return { tier: 'Tier 1', points: 20, onsite: true };
  if (n <= 120) return { tier: 'Tier 2', points: 16, onsite: true };
  if (n <= 180) return { tier: 'Tier 3', points: 12, onsite: true };
  if (n <= 240) return { tier: 'Tier 4', points: 8, onsite: true };
  return { tier: 'Remote only', points: 0, onsite: false };
}

function scoreProspect(p) {
  p = p || {};
  const targetVerticals = [
    'church','house of worship','funeral home','daycare','dental office','medical office','hvac company',
    'plumbing company','trade business','professional office','school','community facility','nonprofit',
    'event venue','small business','commercial business'
  ];
  const tier = prospectDriveTier(p.driveMinutes);
  let score = 0;
  if (targetVerticals.includes(String(p.vertical || '').trim().toLowerCase())) score += 10;
  score += tier.points;
  const signals = Array.isArray(p.needSignals) ? p.needSignals.filter(Boolean) : [];
  if (signals.length >= 1) score += 15;
  if (signals.length >= 2) score += 10;
  if (p.highIntentSignal === true) score += 20;
  if (p.publicBusinessContact === true) score += 10;
  if (p.publicDecisionMaker === true) score += 10;
  score += Math.max(0, Math.min(15, Number(p.projectFitPoints) || 0));
  // Aggregate search demand and historical campaign fit improve prioritization;
  // neither signal identifies an anonymous individual searcher.
  score += Math.round(Math.max(0, Math.min(100, Number(p.aggregateDemandIndex) || 0)) / 20);
  score += Math.max(0, Math.min(5, Number(p.campaignFitPoints) || 0));
  score = Math.min(100, score);
  const temperature = score >= SCI_PROSPECT.HOT ? 'Hot' :
    score >= SCI_PROSPECT.QUALIFIED ? 'Qualified' :
    score >= SCI_PROSPECT.NURTURE ? 'Nurture' : 'Database';
  const outreachEligible = p.suppressed !== true && tier.onsite && p.publicBusinessContact === true && score >= SCI_PROSPECT.QUALIFIED;
  return { score, temperature, driveTier: tier.tier, onsiteEligible: tier.onsite, outreachEligible };
}

function prospectDedupeKey(p) {
  p = p || {};
  const domain = String(p.domain || '').toLowerCase().replace(/^www\./,'').trim();
  const phone = String(p.phone || '').replace(/\D/g,'');
  const org = String(p.organization || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  const location = String(p.cityState || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  return domain || phone || [org, location].filter(Boolean).join('|');
}

if (typeof module !== 'undefined') module.exports = { SCI_PROSPECT, prospectDriveTier, scoreProspect, prospectDedupeKey };

