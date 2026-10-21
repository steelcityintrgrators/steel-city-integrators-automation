const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const publicPages = [
  'index.html','book.html','houses-of-worship.html','funeral-homes.html','daycares.html',
  'healthcare-offices.html','trade-businesses.html','commercial-businesses.html','privacy.html','terms.html'
];

for (const file of publicPages) {
  const html = fs.readFileSync(path.join(site, file), 'utf8');
  assert.match(html, /<meta name="viewport"/, file + ' must be mobile-ready');
  assert.match(html, /<title>.+<\/title>/, file + ' must have a title');
  for (const href of html.matchAll(/href="([^"]+)"/g)) {
    const value = href[1];
    if (/^(https?:|mailto:|tel:|sms:|#)/.test(value)) continue;
    const target = value.split('#')[0].split('?')[0];
    if (target) assert.ok(fs.existsSync(path.join(site, target)), file + ' has missing link: ' + target);
  }
}

const home = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
for (const market of ['Commercial Businesses','Houses of Worship','Community & Institutional Facilities']) {
  assert.ok(home.includes(market), 'home missing market: ' + market);
}
for (const capability of ['Commercial AV','Permanent sound','PTZ & live streaming','Digital consoles','CCTV','Access control','Structured cabling','Commercial Wi-Fi','LED walls','Confidence monitors']) {
  assert.ok(home.toLowerCase().includes(capability.toLowerCase()), 'home missing capability: ' + capability);
}
assert.doesNotMatch(home, /prepaid|pay first/i);

const support = fs.readFileSync(path.join(site, 'book.html'), 'utf8');
assert.match(support, /Phone support[\s\S]*\$<\/sup>40/);
assert.match(support, /Text support[\s\S]*\$<\/sup>40/);
assert.match(support, /Zoom \/ TeamViewer \/ AnyDesk[\s\S]*\$<\/sup>150/);
assert.match(support, /Remote Consultation[\s\S]*\$350/i);
assert.match(support, /On-Site Consultation[\s\S]*\$500/i);
assert.match(support, /Installation & project work[\s\S]*Custom proposal/i);
assert.doesNotMatch(support, /Pay first|prepaid/i);

const script = fs.readFileSync(path.join(site, 'site.js'), 'utf8');
assert.ok(script.includes('SCI_PAYMENT_STATUS'));
assert.ok(script.includes('sci_attribution'));
console.log('site tests passed');

