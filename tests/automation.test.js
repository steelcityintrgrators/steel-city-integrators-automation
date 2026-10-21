const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const propertyValues = {
  CRM_SHEET_ID: 'crm', LEAD_FORM_ID: 'form', CALENDAR_ID: 'calendar',
  PAYMENT_PROVIDER: 'disabled', STRIPE_SECRET_KEY: 'sk_test_example', WEBSITE_URL: 'https://example.com'
};
let responseBody = {};
let lastFetch = null;
const context = {
  console,
  PropertiesService: {getScriptProperties: () => ({getProperty: (k) => propertyValues[k] || '',setProperty: (k,v) => {propertyValues[k]=v;},deleteProperty: (k) => {delete propertyValues[k];}})},
  Session: {getEffectiveUser: () => ({getEmail: () => 'steelcityintegrators@gmail.com'}),getScriptTimeZone: () => 'America/Chicago'},
  ScriptApp: {getService: () => ({getUrl: () => 'https://script.google.com/macros/s/example/exec'})},
  UrlFetchApp: {fetch: (url, options) => {lastFetch={url,options};return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(responseBody)};}},
  Utilities: {formatDate: () => 'formatted',computeDigest:()=>[1,2,3],base64EncodeWebSafe:()=> 'digest',getUuid:()=> '12345678-1234-1234-1234-123456789012'},
  HtmlService: {createHtmlOutput: (html) => ({html,setTitle(){return this;}})},
  ContentService: {MimeType:{JSON:'json',JAVASCRIPT:'javascript'},createTextOutput:(text)=>({text,setMimeType(){return this;}})},
  CacheService: {getScriptCache:()=>({get:()=>null,put:()=>{}})},
  LockService: {getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
  CalendarApp: {}, SpreadsheetApp: {}, FormApp: {}, GmailApp: {}
};
vm.createContext(context);
const bundlePath = fs.existsSync('dist/Code.gs') ? 'dist/Code.gs' : 'release/dist/Code.gs';
vm.runInContext(fs.readFileSync(bundlePath,'utf8'),context);

const catalog=context.serviceCatalog_();
assert.deepStrictEqual(Object.keys(catalog),['phone','text','remote_support','remote_consultation','onsite_consultation']);
assert.strictEqual(catalog.phone.amount,4000);
assert.strictEqual(catalog.phone.durationMinutes,30);
assert.strictEqual(catalog.remote_support.amount,15000);
assert.strictEqual(catalog.onsite_consultation.amount,50000);
assert.throws(()=>context.getService_('invalid'),/not available/);
assert.equal(context.paymentProviderStatus_().configured,false);

responseBody={id:'cs_test_created',url:'https://checkout.stripe.com/c/pay/example'};
const created=context.createStripeCheckoutSession_(catalog.remote_support);
assert.strictEqual(created.reference,'cs_test_created');
assert.strictEqual(lastFetch.url,'https://api.stripe.com/v1/checkout/sessions');
assert.strictEqual(lastFetch.options.payload['line_items[0][price_data][unit_amount]'],'15000');
assert.strictEqual(lastFetch.options.payload['metadata[service_code]'],'remote_support');
assert.ok(lastFetch.options.payload.success_url.includes('{CHECKOUT_SESSION_ID}'));

responseBody={id:'cs_test_paid',status:'complete',payment_status:'paid',payment_intent:'pi_test',amount_total:4000,currency:'usd',metadata:{service_code:'phone'},customer_details:{name:'Test Customer',email:'test@example.com',phone:'2055550100'}};
const verified=context.verifyStripeCheckoutSession_('cs_test_paid');
assert.strictEqual(verified.service.code,'phone');
assert.strictEqual(verified.customer.email,'test@example.com');
responseBody.amount_total=3900;
assert.throws(()=>context.verifyStripeCheckoutSession_('cs_test_paid'),/amount does not match/);
assert.throws(()=>context.verifyStripeCheckoutSession_('not-a-session'),/verified payment is required/i);

propertyValues.PAYMENT_PROVIDER='square';
propertyValues.SQUARE_ACCESS_TOKEN='EAAA_test_token_long_enough_for_unit_test';
propertyValues.SQUARE_LOCATION_ID='LOCATION';
propertyValues.SQUARE_ENVIRONMENT='sandbox';
responseBody={payment_link:{order_id:'order_1',url:'https://square.link/u/example'}};
const squareCreated=context.createPaymentCheckout_(catalog.phone);
assert.strictEqual(squareCreated.provider,'square');
assert.strictEqual(squareCreated.reference,'sq:12345678123412341234123456789012');
assert.strictEqual(lastFetch.url,'https://connect.squareupsandbox.com/v2/online-checkout/payment-links');
const squareRequest=JSON.parse(lastFetch.options.payload);
assert.strictEqual(squareRequest.order.line_items[0].base_price_money.amount,4000);
assert.strictEqual(squareRequest.order.reference_id,'12345678123412341234123456789012');
responseBody={order:{id:'order_1',reference_id:'12345678123412341234123456789012',state:'COMPLETED',total_money:{amount:4000,currency:'USD'},tenders:[{id:'tender_1'}]}};
const squareVerified=context.verifyPayment_('sq:12345678123412341234123456789012');
assert.strictEqual(squareVerified.provider,'square');
assert.strictEqual(squareVerified.paymentIntentId,'tender_1');

assert.strictEqual(context.htmlEscape_('<b>"x" & y</b>'),'&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
console.log('automation tests passed');

