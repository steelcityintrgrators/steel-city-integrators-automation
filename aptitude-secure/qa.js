const fs=require('fs');
function fail(m){console.error('SECURE QA FAIL:',m);process.exit(1)}
const html=fs.readFileSync('index.html','utf8');
const engine=fs.readFileSync('lib/engine.js','utf8');
const start=fs.readFileSync('api/start.js','utf8');
const answer=fs.readFileSync('api/answer.js','utf8');
for(const bad of ['const BANK=','"answer":','APTITUDE_ITEM_BANK'])if(html.includes(bad))fail('secure client leaks protected data: '+bad);
for(const required of ["/api/start","/api/answer","SERVER-MANAGED ADAPTIVE PILOT","function renderReport"])if(!html.includes(required))fail('secure client missing: '+required);
for(const required of ['aes-256-gcm','APTITUDE_SESSION_SECRET','APTITUDE_ITEM_BANK','function buildReport'])if(!engine.includes(required))fail('engine missing: '+required);
if(!start.includes('prepareNext')||!answer.includes('applyAnswer'))fail('API wiring incomplete');
process.env.APTITUDE_SESSION_SECRET='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const e=require('./lib/engine');
const token=e.seal({exp:Date.now()+60000,hello:'world'});
if(e.open(token).hello!=='world')fail('session encryption roundtrip failed');
console.log('SECURE QA PASS');
