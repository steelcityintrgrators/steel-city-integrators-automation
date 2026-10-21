function serviceCatalog_() {
  return {
    phone: {
      code:"phone", name:"Phone Support", amount:4000, durationMinutes:30,
      meetingType:"Phone support", description:"Focused 30-minute phone support session"
    },
    text: {
      code:"text", name:"Text Support", amount:4000, durationMinutes:30,
      meetingType:"Text support", description:"Focused 30-minute live text support session"
    },
    remote_support: {
      code:"remote_support", name:"Remote Technical Support", amount:15000, durationMinutes:60,
      meetingType:"Remote technical support", description:"One hour by Zoom, TeamViewer or AnyDesk"
    },
    remote_consultation: {
      code:"remote_consultation", name:"Remote Consultation", amount:35000, durationMinutes:90,
      meetingType:"Remote consultation", description:"Remote discovery, system review and next-step planning"
    },
    onsite_consultation: {
      code:"onsite_consultation", name:"On-Site Consultation", amount:50000, durationMinutes:120,
      meetingType:"On-site consultation", description:"On-site discovery, assessment or troubleshooting"
    }
  };
}

function getService_(code) {
  const service = serviceCatalog_()[safeText_(code)];
  if (!service) throw new Error("That service option is not available.");
  return service;
}

function paymentProviderReady_() {
  const cfg = sciConfig_();
  if (cfg.paymentProvider === "square") return Boolean(cfg.squareAccessToken && cfg.squareLocationId);
  if (cfg.paymentProvider === "stripe") return Boolean(cfg.stripeSecretKey);
  return false;
}

function paymentProviderStatus_() {
  const cfg = sciConfig_();
  return {
    provider: cfg.paymentProvider,
    configured: paymentProviderReady_(),
    squareCredentialsPresent: Boolean(cfg.squareAccessToken && cfg.squareLocationId),
    stripeCredentialsPresent: Boolean(cfg.stripeSecretKey)
  };
}

function configureSquare(accessToken, locationId, environment, publicSiteUrl) {
  const token = safeText_(accessToken);
  const location = safeText_(locationId);
  const env = safeText_(environment || "production").toLowerCase();
  if (token.length < 20 || !location) throw new Error("Square access token and location ID are required.");
  if (["production","sandbox"].indexOf(env) === -1) throw new Error("Square environment must be production or sandbox.");
  const props = PropertiesService.getScriptProperties();
  props.setProperty("SQUARE_ACCESS_TOKEN", token);
  props.setProperty("SQUARE_LOCATION_ID", location);
  props.setProperty("SQUARE_ENVIRONMENT", env);
  if (safeText_(publicSiteUrl)) props.setProperty("WEBSITE_URL", safeText_(publicSiteUrl).replace(/\/$/, ""));
  return {ok:true, activated:false, nextStep:'Run activatePaymentProvider("square") only after Square approves the account.'};
}

function configureStripe(secretKey, publicSiteUrl) {
  const key = safeText_(secretKey);
  if (!/^sk_(test|live)_/.test(key)) throw new Error("Enter a valid Stripe secret key beginning with sk_test_ or sk_live_.");
  const props = PropertiesService.getScriptProperties();
  props.setProperty("STRIPE_SECRET_KEY", key);
  if (safeText_(publicSiteUrl)) props.setProperty("WEBSITE_URL", safeText_(publicSiteUrl).replace(/\/$/, ""));
  return {ok:true, activated:false, nextStep:'Run activatePaymentProvider("stripe") after account verification and a controlled test.'};
}

function activatePaymentProvider(provider) {
  const selected = safeText_(provider).toLowerCase();
  if (selected === "square") verifySquareConfiguration_();
  else if (selected === "stripe") {
    if (!sciConfig_().stripeSecretKey) throw new Error("Stripe credentials are not configured.");
  } else if (selected !== "disabled") throw new Error("Payment provider must be square, stripe or disabled.");
  PropertiesService.getScriptProperties().setProperty("PAYMENT_PROVIDER", selected);
  appendActivity_("","payment_provider","system","Payment provider set to " + selected);
  return paymentProviderStatus_();
}

function verifySquareConfiguration_() {
  const cfg = sciConfig_();
  if (!cfg.squareAccessToken || !cfg.squareLocationId) throw new Error("Square credentials are not configured.");
  const response = squareRequest_("get","/v2/locations/" + encodeURIComponent(cfg.squareLocationId));
  if (!response.location || response.location.status !== "ACTIVE") throw new Error("Square location is not active.");
  return {ok:true, locationId:response.location.id, name:safeText_(response.location.name)};
}

function checkoutRedirectPage_(serviceCode) {
  if (!paymentProviderReady_()) throw new Error("Online checkout is not active yet. Please submit a project request or contact Steel City Integrators.");
  const checkout = createPaymentCheckout_(getService_(serviceCode));
  const url = safeText_(checkout.url);
  if (!/^https:\/\//.test(url)) throw new Error("The payment provider did not return a valid checkout URL.");
  const escaped = htmlEscape_(url);
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=' + escaped + '"><title>Opening secure checkout</title></head><body><p>Opening secure checkout…</p><p><a href="' + escaped + '" target="_top">Continue</a></p><script>window.top.location.href=' + JSON.stringify(url) + ';</script></body></html>');
}

function createPaymentCheckout_(service) {
  const cfg = requireConfigured_();
  if (cfg.paymentProvider === "square") return createSquarePaymentLink_(service);
  if (cfg.paymentProvider === "stripe") return createStripeCheckoutSession_(service);
  throw new Error("Online checkout is not active.");
}

function verifyPayment_(reference) {
  const ref = safeText_(reference);
  if (ref.indexOf("sq:") === 0) return verifySquarePayment_(ref);
  if (/^cs_(test|live)_/.test(ref)) return verifyStripeCheckoutSession_(ref);
  throw new Error("A verified payment is required before scheduling.");
}

function paymentReferenceFromParams_(params) {
  params = params || {};
  return safeText_(params.payment_ref || params.session_id);
}

function createSquarePaymentLink_(service) {
  const cfg = requireConfigured_();
  const webApp = ScriptApp.getService().getUrl();
  if (!webApp) throw new Error("The booking application must be deployed before checkout can be used.");
  const token = Utilities.getUuid().replace(/-/g, "");
  const payload = {
    idempotency_key: Utilities.getUuid(),
    description: "Steel City Integrators — " + service.name,
    order: {
      location_id: cfg.squareLocationId,
      reference_id: token,
      line_items: [{
        name: service.name,
        quantity: "1",
        base_price_money: {amount: service.amount, currency: "USD"}
      }]
    },
    checkout_options: {
      redirect_url: webApp + "?action=booking&payment_ref=" + encodeURIComponent("sq:" + token),
      ask_for_shipping_address: false
    },
    payment_note: "Steel City Integrators — " + service.code
  };
  const response = squareRequest_("post","/v2/online-checkout/payment-links",payload);
  const link = response.payment_link || {};
  if (!link.order_id || !/^https:\/\//.test(safeText_(link.url))) throw new Error("Square did not return a usable payment link.");
  PropertiesService.getScriptProperties().setProperty("PAYMENT_REF_" + token,JSON.stringify({
    provider:"square", orderId:link.order_id, serviceCode:service.code, amount:service.amount, createdAt:new Date().toISOString()
  }));
  return {provider:"square", reference:"sq:" + token, url:link.url, orderId:link.order_id};
}

function verifySquarePayment_(reference) {
  const token = safeText_(reference).slice(3);
  if (!/^[A-Za-z0-9_]{16,80}$/.test(token)) throw new Error("The Square payment reference is invalid.");
  const raw = PropertiesService.getScriptProperties().getProperty("PAYMENT_REF_" + token);
  if (!raw) throw new Error("The Square payment reference was not found or has expired.");
  let stored;
  try { stored = JSON.parse(raw); } catch (_) { throw new Error("The Square payment reference is unreadable."); }
  const response = squareRequest_("get","/v2/orders/" + encodeURIComponent(stored.orderId));
  const order = response.order || {};
  const service = getService_(stored.serviceCode);
  const amount = Number(order.total_money && order.total_money.amount);
  if (order.state !== "COMPLETED") throw new Error("Square has not confirmed payment for this booking.");
  if (safeText_(order.reference_id) !== token || amount !== service.amount || safeText_(order.total_money && order.total_money.currency).toUpperCase() !== "USD") {
    throw new Error("The Square order does not match the selected service.");
  }
  const tender = order.tenders && order.tenders[0] || {};
  return {
    provider:"square", id:"square:" + order.id, paymentReference:reference,
    paymentIntentId:safeText_(tender.id), amountTotal:amount, service:service,
    customer:{name:"",email:"",phone:""}
  };
}

function squareRequest_(method,path,payload) {
  const cfg = sciConfig_();
  if (!cfg.squareAccessToken) throw new Error("Square is not configured.");
  const base = cfg.squareEnvironment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  const options = {
    method:method, contentType:"application/json",
    headers:{Authorization:"Bearer " + cfg.squareAccessToken,"Square-Version":"2026-09-16"},
    muteHttpExceptions:true
  };
  if (payload !== undefined) options.payload = JSON.stringify(payload);
  const response = UrlFetchApp.fetch(base + path,options);
  return parsePaymentResponse_(response,"Square");
}

function createStripeCheckoutSession_(service) {
  const cfg = requireConfigured_();
  if (!cfg.stripeSecretKey) throw new Error("Stripe is not configured.");
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
    "billing_address_collection":"auto"
  };
  const response = UrlFetchApp.fetch("https://api.stripe.com/v1/checkout/sessions",{
    method:"post",contentType:"application/x-www-form-urlencoded",headers:{Authorization:"Bearer " + cfg.stripeSecretKey},payload:payload,muteHttpExceptions:true
  });
  const session = parsePaymentResponse_(response,"Stripe");
  return {provider:"stripe",reference:session.id,url:session.url};
}

function verifyStripeCheckoutSession_(sessionId) {
  const id = safeText_(sessionId);
  if (!/^cs_(test|live)_/.test(id)) throw new Error("A verified payment is required before scheduling.");
  const cfg = requireConfigured_();
  if (!cfg.stripeSecretKey) throw new Error("Stripe is not configured.");
  const response = UrlFetchApp.fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(id),{
    method:"get",headers:{Authorization:"Bearer " + cfg.stripeSecretKey},muteHttpExceptions:true
  });
  const session = parsePaymentResponse_(response,"Stripe");
  if (session.payment_status !== "paid" || session.status !== "complete") throw new Error("Stripe has not confirmed payment for this booking.");
  const service = getService_(session.metadata && session.metadata.service_code);
  if (Number(session.amount_total) !== service.amount || safeText_(session.currency).toLowerCase() !== "usd") throw new Error("The payment amount does not match the selected service.");
  return {
    provider:"stripe",id:session.id,paymentReference:session.id,paymentIntentId:safeText_(session.payment_intent),
    amountTotal:Number(session.amount_total),service:service,
    customer:{name:safeText_(session.customer_details && session.customer_details.name),email:safeText_(session.customer_details && session.customer_details.email),phone:safeText_(session.customer_details && session.customer_details.phone)}
  };
}

function parsePaymentResponse_(response,provider) {
  const code = response.getResponseCode();
  let body = {};
  try { body = JSON.parse(response.getContentText()); } catch (_) { throw new Error(provider + " returned an unreadable response."); }
  if (code < 200 || code >= 300) {
    const squareError = body.errors && body.errors[0] && (body.errors[0].detail || body.errors[0].code);
    const stripeError = body.error && body.error.message;
    throw new Error(safeText_(squareError || stripeError) || (provider + " could not complete the payment request."));
  }
  return body;
}

function finalizePaymentReference_(payment) {
  if (payment && payment.provider === "square" && safeText_(payment.paymentReference).indexOf("sq:") === 0) {
    PropertiesService.getScriptProperties().deleteProperty("PAYMENT_REF_" + payment.paymentReference.slice(3));
  }
}

function paymentAlreadyBooked_(paymentId) {
  const sheet = crm_().getSheetByName(SCI.SHEETS.BOOKINGS);
  if (!sheet || sheet.getLastRow() < 2) return false;
  return sheet.getRange(2,1,sheet.getLastRow()-1,1).getDisplayValues().some(function(row){ return row[0] === paymentId; });
}

