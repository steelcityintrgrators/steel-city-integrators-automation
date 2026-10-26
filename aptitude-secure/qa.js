const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const api=fs.readFileSync('api/check-answer.js','utf8');
function fail(m){console.error('SECURE QA FAIL:',m);process.exit(1)}
if (!html.includes("fetch('/api/check-answer'")) fail('client does not call scoring API');
if (/"answer"\s*:/.test(html)) fail('answer key leaked into secure client');
if (/"explain"\s*:/.test(html)) fail('answer explanations leaked into secure client');
if (!api.includes('APTITUDE_ANSWER_KEY')) fail('API is not using server-side answer key');
if (!api.includes("req.method !== 'POST'")) fail('API method guard missing');
if (!api.includes("Cache-Control")) fail('API no-store header missing');
console.log('SECURE QA PASS');
