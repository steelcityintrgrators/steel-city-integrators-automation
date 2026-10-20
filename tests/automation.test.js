const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const propertyValues = {
  CRM_SHEET_ID: 'crm', LEAD_FORM_ID: 'form', CALENDAR_ID: 'calendar',
  STRIPE_SECRET_KEY: 'sk_test_example', WEBSITE_URL: 'https://example.com'
};
let stripeBody = {};
let lastFetch = null;
const context = {
  console,
  PropertiesService: {getScriptProperties: () => ({getProperty: (k) => propertyValues[k] || '',setProperty: (k,v) => {propertyValues[k]=v;},deleteProperty: (k) => {delete propertyValues[k];}})},
  Session: {getEffectiveUser: () => ({getEmail: () => 'steelcityintegrators@gmail.com'}),getScriptTimeZone: () => 'America/Chicago'},
  ScriptApp: {getService: () => ({getUrl: () => 'https://script.google.com/macros/s/example/exec'})},
  UrlFetchApp: {fetch: (url, options) => {lastFetch={url,options};return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(stripeBody)};}},
  Utilities: {formatDate: () => 'formatted',computeDigest:()=>[1,2,3],base64EncodeWebSafe:()=> 'digest'},
  HtmlService: {createHtmlOutput: (html) => ({html,setTitle(){return this;}})},
  ContentService: {MimeType:{JSON:'json'},createTextOutput:(text)=>({text,setMimeType(){return this;}})},
  CacheService: {getScriptCache:()=>({get:()=>null,put:()=>{}})},
  LockService: {getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
  CalendarApp: {}, SpreadsheetApp: {}, FormApp: {}, GmailApp: {}
};
vm.createContext(context);
const bundlePath = fs.existsSync('dist/Code.gs') ? 'dist/Code.gs' : 'release/dist/Code.gs';
vm.runInContext(fs.readFileSync(bundlePath,'utf8'),context);

const catalog=context.serviceCatalog_();
assert.deepStrictEqual(Object.keys(catalog),['phone','text','remote','onsite_1','onsite_2','onsite_3']);
assert.strictEqual(catalog.phone.amount,3500);
assert.strictEqual(catalog.remote.durationMinutes,60);
assert.strictEqual(catalog.onsite_3.amount,27500);
assert.throws(()=>context.getService_('invalid'),/not available/);

stripeBody={id:'cs_test_created',url:'https://checkout.stripe.com/c/pay/example'};
const created=context.createStripeCheckoutSession_(catalog.remote);
assert.strictEqual(created.id,'cs_test_created');
assert.strictEqual(lastFetch.url,'https://api.stripe.com/v1/checkout/sessions');
assert.strictEqual(lastFetch.options.payload['line_items[0][price_data][unit_amount]'],'9900');
assert.strictEqual(lastFetch.options.payload['metadata[service_code]'],'remote');
assert.ok(lastFetch.options.payload.success_url.includes('{CHECKOUT_SESSION_ID}'));

stripeBody={id:'cs_test_paid',status:'complete',payment_status:'paid',payment_intent:'pi_test',amount_total:3500,currency:'usd',metadata:{service_code:'phone'},customer_details:{name:'Test Customer',email:'test@example.com',phone:'2055550100'}};
const verified=context.verifyStripeCheckoutSession_('cs_test_paid');
assert.strictEqual(verified.service.code,'phone');
assert.strictEqual(verified.customer.email,'test@example.com');
stripeBody.amount_total=3400;
assert.throws(()=>context.verifyStripeCheckoutSession_('cs_test_paid'),/amount does not match/);
assert.throws(()=>context.verifyStripeCheckoutSession_('not-a-session'),/verified payment is required/i);

assert.strictEqual(context.htmlEscape_('<b>"x" & y</b>'),'&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
console.log('automation tests passed');
