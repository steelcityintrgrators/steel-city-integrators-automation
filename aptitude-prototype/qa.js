const fs = require('fs');

const html = fs.readFileSync('aptitude-prototype/index.html', 'utf8');

function fail(msg) {
  console.error('QA FAIL:', msg);
  process.exit(1);
}

const bankMatch = html.match(/const BANK=(\[[\s\S]*?\]);\s*const DOMAINS=/);
if (!bankMatch) fail('Question bank could not be parsed.');

let bank;
try { bank = JSON.parse(bankMatch[1]); }
catch (e) { fail('Question bank JSON is invalid: ' + e.message); }

const ids = new Set();
const domains = new Map();
for (const q of bank) {
  if (!q || typeof q !== 'object') fail('Invalid question object.');
  if (!q.id || ids.has(q.id)) fail('Missing or duplicate question id: ' + q.id);
  ids.add(q.id);
  if (!q.domain) fail('Question missing domain: ' + q.id);
  domains.set(q.domain, (domains.get(q.domain) || 0) + 1);
  if (![1,2,3].includes(q.difficulty)) fail('Invalid difficulty: ' + q.id);
  if (!Array.isArray(q.choices) || q.choices.length !== 4) fail('Question must have exactly four choices: ' + q.id);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) fail('Invalid answer index: ' + q.id);
  if (!q.q || !q.explain) fail('Question missing stem or explanation: ' + q.id);
}

if (bank.length !== 64) fail('Expected 64 questions; found ' + bank.length);
if (domains.size !== 8) fail('Expected 8 domains; found ' + domains.size);
for (const [domain,count] of domains) {
  if (count !== 8) fail(domain + ' must have 8 questions; found ' + count);
}

const banned = [
  ['id="admin"', 'Public admin section exposed'],
  ["go('admin')", 'Public admin navigation exposed'],
  ['localStorage', 'Persistent participant storage reintroduced'],
  ['answer:q.answer', 'Answer key included in participant response record']
];
for (const [needle,msg] of banned) {
  if (html.includes(needle)) fail(msg);
}

for (const required of [
  'PUBLIC DEVELOPMENTAL PROTOTYPE',
  'function exportCurrent()',
  "schemaVersion:'0.4'",
  'function buildPathwayProfile',
  'NOT A FIT DETERMINATION',
  'Low evidence — use the full test',
  'not suitable for supervised or high-stakes testing'
]) {
  if (!html.includes(required)) fail('Required safeguard missing: ' + required);
}

const analyzerPath='aptitude-prototype/pilot-analyzer.html';
if (!fs.existsSync(analyzerPath)) fail('Pilot analyzer is missing.');
const analyzer=fs.readFileSync(analyzerPath,'utf8');
for (const required of ['Pilot Analyzer','LOCAL ANALYTICS • PILOT ONLY','function exportSummary()','function pearson','Option share A/B/C/D','negative discrimination']) {
  if (!analyzer.includes(required)) fail('Pilot analyzer safeguard missing: '+required);
}
for (const forbidden of ['XMLHttpRequest','navigator.sendBeacon']) {
  if (analyzer.includes(forbidden)) fail('Pilot analyzer contains network-capable code: '+forbidden);
}

console.log('QA PASS:', {
  questions: bank.length,
  domains: domains.size,
  perDomain: Object.fromEntries(domains)
});
