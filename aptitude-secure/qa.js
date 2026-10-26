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

const domains=[
  'Numerical Reasoning','Logical Reasoning','Verbal Reasoning','Spatial Reasoning',
  'Attention to Detail','Systems Thinking','Practical / Technical Reasoning','Learning Adaptability'
];
process.env.APTITUDE_ITEM_BANK=JSON.stringify(domains.flatMap((domain,di)=>[
  {id:'Q'+di+'A',domain,difficulty:1,q:'Fixture A',choices:['A','B','C','D'],answer:0},
  {id:'Q'+di+'B',domain,difficulty:2,q:'Fixture B',choices:['A','B','C','D'],answer:1},
  {id:'Q'+di+'C',domain,difficulty:3,q:'Fixture C',choices:['A','B','C','D'],answer:2}
]));
const bank=e.loadBank(),state=e.createState(16,'QA');
for(let i=0;i<16;i++){
  const item=e.prepareNext(state,bank);
  if(!item||Object.prototype.hasOwnProperty.call(item,'answer'))fail('public question leaked answer');
  const full=bank.find(x=>x.id===item.id);
  e.applyAnswer(state,full.answer,bank);
}
const report=e.buildReport(state);
if(report.total!==16||report.scores.length!==8||report.composite!==100)fail('full adaptive flow failed');
if(report.answers.some(x=>Object.prototype.hasOwnProperty.call(x,'answer')))fail('report leaked answer key');
console.log('SECURE QA PASS');
