const crypto=require('crypto');

const DOMAINS=[
  'Numerical Reasoning','Logical Reasoning','Verbal Reasoning','Spatial Reasoning',
  'Attention to Detail','Systems Thinking','Practical / Technical Reasoning','Learning Adaptability'
];

const PATHWAY_MAP={
  'Numerical Reasoning':{modes:['quantify','compare','forecast'],examples:['data and reporting','estimating and pricing','financial or operational analysis']},
  'Logical Reasoning':{modes:['analyze rules','sequence decisions','test conclusions'],examples:['software or process QA','operations planning','structured problem solving']},
  'Verbal Reasoning':{modes:['interpret','explain','synthesize'],examples:['research and communications','client advisory work','documentation and knowledge work']},
  'Spatial Reasoning':{modes:['visualize','layout','orient'],examples:['technical design or CAD','field installation and layout','logistics or spatial planning']},
  'Attention to Detail':{modes:['verify','compare','inspect'],examples:['quality control','compliance or audit support','precision operations']},
  'Systems Thinking':{modes:['map dependencies','find bottlenecks','optimize flow'],examples:['operations improvement','systems or product operations','process engineering']},
  'Practical / Technical Reasoning':{modes:['diagnose','isolate','repair'],examples:['technical support','field service and integration','network, AV, equipment, or maintenance work']},
  'Learning Adaptability':{modes:['experiment','transfer','adjust'],examples:['fast-changing technical environments','training-intensive roles','startup or cross-functional operations']}
};

function loadBank(){
  let bank;
  try{bank=JSON.parse(process.env.APTITUDE_ITEM_BANK||'[]')}catch{throw new Error('bank_parse_error')}
  if(!Array.isArray(bank)||bank.length<16)throw new Error('bank_missing');
  return bank;
}
function getKey(){
  const raw=process.env.APTITUDE_SESSION_SECRET||'';
  const key=Buffer.from(raw,'hex');
  if(key.length!==32)throw new Error('session_secret_invalid');
  return key;
}
function seal(state){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',getKey(),iv);
  const enc=Buffer.concat([cipher.update(Buffer.from(JSON.stringify(state),'utf8')),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv,tag,enc].map(x=>x.toString('base64url')).join('.');
}
function open(token){
  if(typeof token!=='string'||token.length<20)throw new Error('invalid_token');
  const parts=token.split('.');
  if(parts.length!==3)throw new Error('invalid_token');
  const [ivB,tagB,encB]=parts.map(x=>Buffer.from(x,'base64url'));
  const decipher=crypto.createDecipheriv('aes-256-gcm',getKey(),ivB);
  decipher.setAuthTag(tagB);
  const out=Buffer.concat([decipher.update(encB),decipher.final()]);
  const state=JSON.parse(out.toString('utf8'));
  if(!state.exp||Date.now()>state.exp)throw new Error('expired_token');
  return state;
}
function quotas(total){
  const base=Math.floor(total/DOMAINS.length),extra=total%DOMAINS.length;
  return Object.fromEntries(DOMAINS.map((d,i)=>[d,base+(i<extra?1:0)]));
}
function createState(total,testId){
  if(![16,24].includes(total))throw new Error('invalid_length');
  const now=Date.now();
  return {
    v:1,testId:String(testId||'Pilot').slice(0,64),total,started:now,exp:now+2*60*60*1000,
    quotas:quotas(total),answered:0,used:[],levels:Object.fromEntries(DOMAINS.map(d=>[d,2])),
    counts:Object.fromEntries(DOMAINS.map(d=>[d,0])),answers:[],domainCursor:0,current:null
  };
}
function chooseDomain(state){
  for(let n=0;n<DOMAINS.length;n++){
    const idx=(state.domainCursor+n)%DOMAINS.length,d=DOMAINS[idx];
    if(state.counts[d]<state.quotas[d]){state.domainCursor=(idx+1)%DOMAINS.length;return d}
  }
  return null;
}
function pickQuestion(domain,state,bank){
  const lvl=state.levels[domain];
  const candidates=bank.filter(q=>q.domain===domain&&!state.used.includes(q.id));
  if(!candidates.length)throw new Error('item_pool_exhausted');
  candidates.sort((a,b)=>Math.abs(a.difficulty-lvl)-Math.abs(b.difficulty-lvl));
  const best=Math.abs(candidates[0].difficulty-lvl);
  const pool=candidates.filter(q=>Math.abs(q.difficulty-lvl)===best);
  return pool[crypto.randomInt(pool.length)];
}
function publicQuestion(q){
  return {id:q.id,domain:q.domain,difficulty:q.difficulty,q:q.q,choices:q.choices};
}
function prepareNext(state,bank){
  const domain=chooseDomain(state);
  if(!domain)return null;
  const q=pickQuestion(domain,state,bank);
  state.used.push(q.id);
  state.current={id:q.id,domain:q.domain,difficulty:q.difficulty,started:Date.now()};
  return publicQuestion(q);
}
function applyAnswer(state,selected,bank){
  if(!state.current)throw new Error('no_current_item');
  if(!Number.isInteger(selected)||selected<0||selected>3)throw new Error('invalid_answer');
  const q=bank.find(x=>x.id===state.current.id);
  if(!q)throw new Error('unknown_item');
  const correct=selected===q.answer;
  const ms=Math.max(0,Date.now()-state.current.started);
  state.answers.push({id:q.id,domain:q.domain,difficulty:q.difficulty,selected,correct,ms});
  state.counts[q.domain]++;state.answered++;
  state.levels[q.domain]=Math.max(1,Math.min(3,state.levels[q.domain]+(correct?1:-1)));
  state.current=null;
}
function scoreDomain(state,domain){
  const rows=state.answers.filter(x=>x.domain===domain);
  if(!rows.length)return null;
  const earned=rows.reduce((s,x)=>s+(x.correct?x.difficulty:0),0);
  const possible=rows.reduce((s,x)=>s+x.difficulty,0);
  return {domain,score:Math.round(100*earned/possible),n:rows.length};
}
function pathway(scores){
  const top=scores.slice(0,2).map(x=>x.domain),modes=[],examples=[];
  for(const d of top){
    const p=PATHWAY_MAP[d];if(!p)continue;
    for(const x of p.modes)if(!modes.includes(x))modes.push(x);
    for(const x of p.examples)if(!examples.includes(x))examples.push(x);
  }
  return {
    basedOn:top,workModes:modes.slice(0,5),examples:examples.slice(0,6),
    caveat:'Exploratory hypotheses only. Interests, experience, values, constraints, training requirements, and validated occupational evidence are not yet incorporated.'
  };
}
function buildReport(state){
  const ended=Date.now();
  const scores=DOMAINS.map(d=>scoreDomain(state,d)).filter(Boolean).sort((a,b)=>b.score-a.score);
  const composite=scores.length?Math.round(scores.reduce((s,x)=>s+x.score,0)/scores.length):0;
  return {
    schemaVersion:'1.0-secure',bankVersion:'secure-32-v1',scoringVersion:'server-weighted-accuracy-v1',
    id:'S'+ended,testId:state.testId,started:state.started,ended,total:state.total,composite,scores,
    answers:state.answers,pathways:pathway(scores),
    claimBoundary:'Developmental pilot. Not a validated aptitude, IQ, hiring, diagnostic, or school-placement instrument.'
  };
}
module.exports={DOMAINS,loadBank,seal,open,createState,prepareNext,applyAnswer,buildReport};
