function serviceCatalog_() {
  return {
    phone: {code:"phone", name:"Phone Consultation", amount:3500, durationMinutes:20, meetingType:"Phone consultation", description:"20-minute project or technical consultation"},
    text: {code:"text", name:"Live Text Consultation", amount:4500, durationMinutes:30, meetingType:"Text consultation", description:"30-minute live text support window"},
    remote: {code:"remote", name:"Remote Technical Support", amount:9900, durationMinutes:60, meetingType:"Remote support", description:"60-minute remote AV or low-voltage support session"},
    onsite_1: {code:"onsite_1", name:"On-Site Consultation — Zone 1", amount:17500, durationMinutes:90, meetingType:"On-site consultation", description:"Up to 90 minutes on site, 0–25 road miles from central Birmingham"},
    onsite_2: {code:"onsite_2", name:"On-Site Consultation — Zone 2", amount:22500, durationMinutes:90, meetingType:"On-site consultation", description:"Up to 90 minutes on site, 26–50 road miles from central Birmingham"},
    onsite_3: {code:"onsite_3", name:"On-Site Consultation — Zone 3", amount:27500, durationMinutes:90, meetingType:"On-site consultation", description:"Up to 90 minutes on site, 51–80 road miles from central Birmingham"}
  };
}

function getService_(code) {
  const service = serviceCatalog_()[safeText_(code)];
  if (!service) throw new Error("That service option is not available.");
  return service;
}

function configureStripe(secretKey, publicSiteUrl) {
  const key = safeText_(secretKey);
  if (!/^sk_(test|live)_/.test(key)) throw new Error("Enter a valid Stripe secret key beginning with sk_test_ or sk_live_.");
  const props = PropertiesService.getScriptProperties();
  props.setProperty("STRIPE_SECRET_KEY", key);
  if (safeText_(publicSiteUrl)) props.setProperty("WEBSITE_URL", safeText_(publicSiteUrl).replace(/\/$/, ""));
  return {ok:true, mode:key.indexOf("sk_live_") === 0 ? "live" : "test", websiteUrl:sciConfig_().websiteUrl};
}

function checkoutRedirectPage_(serviceCode) {
  const session = createStripeCheckoutSession_(getService_(serviceCode));
  const url = safeText_(session.url);
  if (!/^https:\/\/checkout\.stripe\.com\//.test(url)) throw new Error("Stripe did not return a valid checkout URL.");
  const escaped = htmlEscape_(url);
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=' + escaped + '"><title>Opening secure checkout</title></head><body><p>Opening secure Stripe checkout…</p><p><a href="' + escaped + '" target="_top">Continue to payment</a></p><script>window.top.location.href=' + JSON.stringify(url) + ';</script></body></html>');
}

function createStripeCheckoutSession_(service) {
  const cfg = requireConfigured_();
  if (!cfg.stripeSecretKey) throw new Error("Secure payment activation is pending. Steel City Integrators must connect its Stripe account before prepaid booking can open.");
  const webApp = ScriptApp.getService().getUrl();
  if (!webApp) throw new Error("The booking application must be deployed before checkout can be used.");
  const payload = {
    "mode":"payment",
    "success_url":webApp + "?action=booking&session_id={CHECKOUT_SESSION_ID}",
    "cancel_url":cfg.websiteUrl.replace(/\/$/, "") + "/book.html?payment=cancelled",
    "line_items[0][price_data][currency]":"usd",
    "line_items[0][price_data][unit_amount]":String(service.amount),
    "line_items[0][price_data][product_data][name]":service.name,
    "line_items[0][price_data][product_data][description]":service.description,
    "line_items[0][quantity]":"1",
    "metadata[service_code]":service.code,
    "payment_intent_data[description]":"Steel City Integrators — " + service.name,
    "payment_intent_data[metadata][service_code]":service.code,
    "customer_creation":"always",
    "phone_number_collection[enabled]":"true",
    "billing_address_collection":"auto",
    "custom_text[submit][message]":"Payment reserves professional time. Booking fees are non-refundable after scheduling except when Steel City Integrators cancels or applicable law requires otherwise."
  };
  const response = UrlFetchApp.fetch("https://api.stripe.com/v1/checkout/sessions", {
    method:"post", contentType:"application/x-www-form-urlencoded", headers:{Authorization:"Bearer " + cfg.stripeSecretKey}, payload:payload, muteHttpExceptions:true
  });
  return parseStripeResponse_(response, "create checkout session");
}

function verifyStripeCheckoutSession_(sessionId) {
  const id = safeText_(sessionId);
  if (!/^cs_(test|live)_/.test(id)) throw new Error("A verified payment is required before scheduling.");
  const cfg = requireConfigured_();
  if (!cfg.stripeSecretKey) throw new Error("Secure payment activation is pending.");
  const response = UrlFetchApp.fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(id), {
    method:"get", headers:{Authorization:"Bearer " + cfg.stripeSecretKey}, muteHttpExceptions:true
  });
  const session = parseStripeResponse_(response, "verify payment");
  if (session.payment_status !== "paid" || session.status !== "complete") throw new Error("Stripe has not confirmed payment for this booking.");
  const service = getService_(session.metadata && session.metadata.service_code);
  if (Number(session.amount_total) !== service.amount || safeText_(session.currency).toLowerCase() !== "usd") throw new Error("The payment amount does not match the selected service.");
  return {
    id:session.id, paymentIntentId:safeText_(session.payment_intent), amountTotal:Number(session.amount_total), service:service,
    customer:{name:safeText_(session.customer_details && session.customer_details.name),email:safeText_(session.customer_details && session.customer_details.email),phone:safeText_(session.customer_details && session.customer_details.phone)}
  };
}

function parseStripeResponse_(response, operation) {
  const code = response.getResponseCode();
  let body = {};
  try { body = JSON.parse(response.getContentText()); } catch (_) { throw new Error("Stripe returned an unreadable response while trying to " + operation + "."); }
  if (code < 200 || code >= 300) throw new Error(safeText_(body && body.error && body.error.message) || ("Stripe could not " + operation + "."));
  return body;
}

function paymentAlreadyBooked_(sessionId) {
  const sheet = crm_().getSheetByName(SCI.SHEETS.BOOKINGS);
  if (!sheet || sheet.getLastRow() < 2) return false;
  return sheet.getRange(2,1,sheet.getLastRow()-1,1).getDisplayValues().some(function(row){ return row[0] === sessionId; });
}
