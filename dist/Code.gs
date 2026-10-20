// ===== Config.gs =====
const SCI = Object.freeze({
  VERSION: "1.2.0",
  SHEETS: Object.freeze({LEADS: "Leads", ACTIVITY: "Activity", SETTINGS: "Settings", BOOKINGS: "Bookings"}),
  LEAD_HEADERS: Object.freeze([
    "Lead ID","Created At","Source","Name","Organization","Customer Type","Email","Phone",
    "Location","Services","Budget","Timeline","Preferred Contact","Project Summary","Score",
    "Stage","Last Contact","Next Follow-Up","Follow-Up Count","Appointment ID","Notes"
  ]),
  ACTIVITY_HEADERS: Object.freeze(["Timestamp","Lead ID","Type","Channel","Details"]),
  BOOKING_HEADERS: Object.freeze([
    "Payment Session ID","Payment Intent ID","Service Code","Service Name","Amount Paid","Name","Email","Phone",
    "Organization","Location","Start","End","Event ID","Confirmation Sent","Reminder 24h Sent","Reminder 2h Sent",
    "Follow-Up Sent","Status","Created At"
  ]),
  SERVICES: Object.freeze([
    "Live Streaming","Permanent Sound Installation","Lighting","LED Walls","CCTV","Confidence Monitors",
    "Structured Cabling","Access Control","Commercial Video Displays","WiFi / Network",
    "Streaming Audio Mixing - On-site","Streaming Audio Mixing - Remote","Other"
  ]),
  CLOSED_STAGES: Object.freeze(["Scheduled","Won","Lost"]),
  BUSINESS_START_HOUR: 7,
  BUSINESS_END_HOUR: 21,
  FOLLOW_UP_GAPS_DAYS: Object.freeze([1, 2, 4]),
  DEFAULT_APPOINTMENT_MINUTES: 60,
  DEFAULT_PUBLIC_SITE_URL: "https://steel-city-integrators-birmingham.racing-tide-2944.chatgpt.site"
});

function sciConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    businessName: p.getProperty("BUSINESS_NAME") || "Steel City Integrators LLC",
    businessEmail: p.getProperty("BUSINESS_EMAIL") || Session.getEffectiveUser().getEmail(),
    crmSheetId: p.getProperty("CRM_SHEET_ID") || "",
    leadFormId: p.getProperty("LEAD_FORM_ID") || "",
    calendarId: p.getProperty("CALENDAR_ID") || "",
    websiteUrl: p.getProperty("WEBSITE_URL") || SCI.DEFAULT_PUBLIC_SITE_URL,
    serviceRadiusMiles: Number(p.getProperty("SERVICE_RADIUS_MILES") || "80"),
    homeBase: p.getProperty("HOME_BASE") || "Birmingham, Alabama",
    appointmentMinutes: Number(p.getProperty("APPOINTMENT_MINUTES") || String(SCI.DEFAULT_APPOINTMENT_MINUTES)),
    smsWebhookUrl: p.getProperty("SMS_WEBHOOK_URL") || "",
    smsWebhookToken: p.getProperty("SMS_WEBHOOK_TOKEN") || "",
    stripeSecretKey: p.getProperty("STRIPE_SECRET_KEY") || ""
  };
}

function requireConfigured_() {
  const cfg = sciConfig_();
  if (!cfg.crmSheetId || !cfg.leadFormId || !cfg.calendarId) throw new Error("System is not configured. Run setupSystem() once from Apps Script.");
  return cfg;
}

function crm_() { return SpreadsheetApp.openById(requireConfigured_().crmSheetId); }
function nowIso_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }
function safeText_(value) { return value == null ? "" : String(value).trim(); }
function money_(cents) { return "$" + (Number(cents || 0) / 100).toFixed(2); }

// ===== CRM.gs =====
function createLead_(payload,source){const ss=crm_(),sheet=ss.getSheetByName(SCI.SHEETS.LEADS),id=newLeadId_(),created=new Date(),services=Array.isArray(payload.services)?payload.services.join(", "):safeText_(payload.services),score=scoreLead_(payload),nextFollowUp=addDays_(created,SCI.FOLLOW_UP_GAPS_DAYS[0]);const row=[id,created,safeText_(source||"unknown"),safeText_(payload.name),safeText_(payload.organization),safeText_(payload.customerType),safeText_(payload.email),safeText_(payload.phone),safeText_(payload.location),services,safeText_(payload.budget),safeText_(payload.timeline),safeText_(payload.preferredContact),safeText_(payload.summary),score,"New","",nextFollowUp,0,"",""];sheet.appendRow(row);appendActivity_(id,"lead_created","system","Lead created from "+safeText_(source));return getLeadById_(id);}
function scoreLead_(payload){let score=10;const type=safeText_(payload.customerType).toLowerCase(),timeline=safeText_(payload.timeline).toLowerCase(),budget=safeText_(payload.budget).toLowerCase(),services=(Array.isArray(payload.services)?payload.services.join(" "):safeText_(payload.services)).toLowerCase();if(["church","funeral home","daycare","small business"].indexOf(type)!==-1)score+=15;if(timeline.indexOf("asap")!==-1||timeline.indexOf("1 week")!==-1)score+=20;else if(timeline.indexOf("30 days")!==-1)score+=12;if(budget.indexOf("10,000+")!==-1)score+=25;else if(budget.indexOf("5,000")!==-1)score+=18;else if(budget.indexOf("2,500")!==-1)score+=12;else if(budget.indexOf("1,000")!==-1)score+=8;["led wall","sound","structured cabling","access control","cctv","live streaming"].forEach(function(keyword){if(services.indexOf(keyword)!==-1)score+=5;});if(safeText_(payload.email))score+=5;if(safeText_(payload.phone))score+=5;return Math.min(score,100);}
function getLeadById_(leadId){const leads=getLeadRows_();for(let i=0;i<leads.length;i++)if(leads[i]["Lead ID"]===leadId)return leads[i];return null;}
function getLeadRows_(){const sheet=crm_().getSheetByName(SCI.SHEETS.LEADS),values=sheet.getDataRange().getValues();if(values.length<2)return[];const headers=values[0];return values.slice(1).map(function(row,index){const obj={_row:index+2};headers.forEach(function(header,i){obj[header]=row[i];});return obj;});}
function updateLeadFields_(leadId,updates){const sheet=crm_().getSheetByName(SCI.SHEETS.LEADS),headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0],lead=getLeadById_(leadId);if(!lead)throw new Error("Lead not found: "+leadId);Object.keys(updates).forEach(function(key){const index=headers.indexOf(key);if(index!==-1)sheet.getRange(lead._row,index+1).setValue(updates[key]);});}
function appendActivity_(leadId,type,channel,details){const cfg=sciConfig_();if(!cfg.crmSheetId)return;const sheet=SpreadsheetApp.openById(cfg.crmSheetId).getSheetByName(SCI.SHEETS.ACTIVITY);if(sheet)sheet.appendRow([new Date(),safeText_(leadId),safeText_(type),safeText_(channel),safeText_(details)]);}
function newLeadId_(){const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMdd-HHmmss"),suffix=Math.floor(Math.random()*900+100);return"SCI-"+stamp+"-"+suffix;}
function addDays_(date,days){const copy=new Date(date.getTime());copy.setDate(copy.getDate()+Number(days||0));return copy;}

// ===== Intake.gs =====
function onLeadFormSubmit(e){if(!e||!e.response)throw new Error("Form submit event is required.");const answers={};e.response.getItemResponses().forEach(function(r){answers[r.getItem().getTitle()]=r.getResponse();});const payload={name:answers["Name"],organization:answers["Organization / Business"],customerType:answers["Customer Type"],email:answers["Email"],phone:answers["Phone"],location:answers["Project Location"],services:answers["Services Needed"],budget:answers["Budget Range"],timeline:answers["Desired Timeline"],preferredContact:answers["Preferred Contact"],summary:answers["Project Summary"]};const lead=createLead_(payload,"Google Form");sendLeadAcknowledgement_(lead);sendInternalLeadAlert_(lead);return lead;}
function handleWebLead_(payload){payload=payload||{};if(safeText_(payload.website))return{ok:true};if(!safeText_(payload.name))throw new Error("Name is required.");if(!safeText_(payload.email)&&!safeText_(payload.phone))throw new Error("Email or phone is required.");if(!safeText_(payload.location))throw new Error("Project location is required.");const lead=createLead_(payload,"Website API");sendLeadAcknowledgement_(lead);sendInternalLeadAlert_(lead);return{ok:true,leadId:lead["Lead ID"],score:lead["Score"]};}
function sendLeadAcknowledgement_(lead){const email=safeText_(lead["Email"]);if(!email)return false;const cfg=sciConfig_(),subject="We received your Steel City Integrators request",services=safeText_(lead["Services"])||"your requested service",body="Hi "+safeText_(lead["Name"])+",\n\nWe received your request for "+services+". We will review the details and follow up with the next step.\n\nSteel City Integrators LLC\n"+cfg.businessEmail;GmailApp.sendEmail(email,subject,body,{name:cfg.businessName,htmlBody:"<p>Hi "+htmlEscape_(lead["Name"])+",</p><p>We received your request for <strong>"+htmlEscape_(services)+"</strong>.</p><p>We will review the details and follow up with the next step.</p><p>Steel City Integrators LLC<br>"+htmlEscape_(cfg.businessEmail)+"</p>"});updateLeadFields_(lead["Lead ID"],{"Last Contact":new Date(),"Stage":"Contacted"});appendActivity_(lead["Lead ID"],"acknowledgement_sent","email",email);return true;}
function sendInternalLeadAlert_(lead){const cfg=sciConfig_();if(!cfg.businessEmail)return;const subject="[SCI Lead "+lead["Score"]+"/100] "+safeText_(lead["Name"])+" - "+safeText_(lead["Services"]),body=["New lead: "+safeText_(lead["Lead ID"]),"Name: "+safeText_(lead["Name"]),"Organization: "+safeText_(lead["Organization"]),"Type: "+safeText_(lead["Customer Type"]),"Phone: "+safeText_(lead["Phone"]),"Email: "+safeText_(lead["Email"]),"Location: "+safeText_(lead["Location"]),"Services: "+safeText_(lead["Services"]),"Budget: "+safeText_(lead["Budget"]),"Timeline: "+safeText_(lead["Timeline"]),"Score: "+safeText_(lead["Score"]),"",safeText_(lead["Project Summary"])].join("\n");GmailApp.sendEmail(cfg.businessEmail,subject,body,{name:cfg.businessName});appendActivity_(lead["Lead ID"],"internal_alert","email",cfg.businessEmail);}
function htmlEscape_(value){return safeText_(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

// ===== FollowUp.gs =====
function runFollowUpEngine(){const cfg=requireConfigured_(),now=new Date(),hour=Number(Utilities.formatDate(now,Session.getScriptTimeZone(),"H"));if(hour<SCI.BUSINESS_START_HOUR||hour>=SCI.BUSINESS_END_HOUR)return{skipped:true,reason:"outside_business_hours"};const leads=getLeadRows_();let processed=0;leads.forEach(function(lead){if(SCI.CLOSED_STAGES.indexOf(safeText_(lead["Stage"]))!==-1)return;const count=Number(lead["Follow-Up Count"]||0);if(count>=SCI.FOLLOW_UP_GAPS_DAYS.length)return;const due=lead["Next Follow-Up"] instanceof Date?lead["Next Follow-Up"]:new Date(lead["Next Follow-Up"]);if(!due||isNaN(due.getTime())||due>now)return;if(!sendAutomatedFollowUp_(lead,count))return;const nextCount=count+1,updates={"Follow-Up Count":nextCount,"Last Contact":new Date(),"Stage":safeText_(lead["Stage"])==="New"?"Contacted":safeText_(lead["Stage"])};updates["Next Follow-Up"]=nextCount<SCI.FOLLOW_UP_GAPS_DAYS.length?addDays_(new Date(),SCI.FOLLOW_UP_GAPS_DAYS[nextCount]):"";updateLeadFields_(lead["Lead ID"],updates);processed++;});return{processed:processed};}
function sendAutomatedFollowUp_(lead,index){const preferred=safeText_(lead["Preferred Contact"]).toLowerCase(),email=safeText_(lead["Email"]),phone=safeText_(lead["Phone"]);if(preferred==="text"&&phone&&sendSmsIfConfigured_(phone,followUpText_(lead,index),lead["Lead ID"]))return true;if(email){const cfg=sciConfig_();GmailApp.sendEmail(email,followUpSubject_(index),followUpText_(lead,index),{name:cfg.businessName});appendActivity_(lead["Lead ID"],"follow_up_sent","email","Sequence "+(index+1));return true;}if(phone&&sendSmsIfConfigured_(phone,followUpText_(lead,index),lead["Lead ID"]))return true;appendActivity_(lead["Lead ID"],"follow_up_pending","manual","No automated email/SMS channel available");return false;}
function followUpSubject_(index){return["Following up on your Steel City Integrators request","Still planning your AV / low-voltage project?","Final follow-up on your Steel City Integrators request"][index]||"Steel City Integrators follow-up";}
function followUpText_(lead,index){const name=safeText_(lead["Name"])||"there",services=safeText_(lead["Services"])||"your project",messages=["Hi "+name+", this is Steel City Integrators following up on your request for "+services+". Reply with the best time to talk and we can help plan the next step.","Hi "+name+", checking back on "+services+". If the project is still active, we can help with scope, scheduling, and an estimate.","Hi "+name+", one last follow-up on "+services+". If you are still planning the project, reply anytime and we can pick it back up."];return messages[index]||messages[0];}
function sendSmsIfConfigured_(phone,message,leadId){const cfg=sciConfig_();if(!cfg.smsWebhookUrl)return false;const options={method:"post",contentType:"application/json",muteHttpExceptions:true,payload:JSON.stringify({to:phone,body:message,leadId:leadId})};if(cfg.smsWebhookToken)options.headers={Authorization:"Bearer "+cfg.smsWebhookToken};const response=UrlFetchApp.fetch(cfg.smsWebhookUrl,options),ok=response.getResponseCode()>=200&&response.getResponseCode()<300;if(leadId)appendActivity_(leadId,ok?"follow_up_sent":"follow_up_failed","sms","HTTP "+response.getResponseCode());return ok;}

// ===== Payments.gs =====
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

// ===== Booking.gs =====
function getAvailability_(dateText, durationMinutes) {
  const cfg = requireConfigured_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeText_(dateText))) throw new Error("Use date format YYYY-MM-DD.");
  const minutes = Math.max(20, Number(durationMinutes || cfg.appointmentMinutes));
  const calendar = CalendarApp.getCalendarById(cfg.calendarId);
  const dayStart = localDateTime_(dateText, pad2_(SCI.BUSINESS_START_HOUR) + ":00");
  const dayEnd = localDateTime_(dateText, pad2_(SCI.BUSINESS_END_HOUR) + ":00");
  const events = calendar.getEvents(dayStart, dayEnd);
  const slots = [];
  for (let start = new Date(dayStart.getTime()); start.getTime() + minutes * 60000 <= dayEnd.getTime(); start = new Date(start.getTime() + 30 * 60000)) {
    const end = new Date(start.getTime() + minutes * 60000);
    const busy = events.some(function(event) { return event.getStartTime() < end && event.getEndTime() > start; });
    if (!busy && start > new Date()) slots.push({date:dateText,time:Utilities.formatDate(start,Session.getScriptTimeZone(),"HH:mm"),label:Utilities.formatDate(start,Session.getScriptTimeZone(),"h:mm a")});
  }
  return slots;
}

function bookAppointment_(payload, payment) {
  payload = payload || {};
  payment = payment || verifyStripeCheckoutSession_(safeText_(payload.paymentSessionId));
  const cfg = requireConfigured_();
  const name = safeText_(payload.name) || payment.customer.name;
  const email = safeText_(payload.email) || payment.customer.email;
  const dateText = safeText_(payload.date);
  const timeText = safeText_(payload.time);
  const leadId = safeText_(payload.leadId);
  const location = safeText_(payload.location);
  if (!name || !email || !dateText || !/^\d{2}:\d{2}$/.test(timeText)) throw new Error("Name, email, date and time are required.");
  if (payment.customer.email && email.toLowerCase() !== payment.customer.email.toLowerCase()) throw new Error("The booking email must match the email used at checkout.");
  if (payment.service.code.indexOf("onsite_") === 0 && !location) throw new Error("The on-site service address is required.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (paymentAlreadyBooked_(payment.id)) throw new Error("This payment has already been used to schedule an appointment.");
    const open = getAvailability_(dateText, payment.service.durationMinutes).some(function(slot) { return slot.time === timeText; });
    if (!open) throw new Error("That appointment time is no longer available.");

    const start = localDateTime_(dateText, timeText);
    const end = new Date(start.getTime() + payment.service.durationMinutes * 60000);
    const calendar = CalendarApp.getCalendarById(cfg.calendarId);
    const title = "SCI — " + payment.service.name + " — " + name;
    const description = [
      "PREPAID STEEL CITY INTEGRATORS APPOINTMENT",
      "Service: " + payment.service.name,
      "Payment session: " + payment.id,
      "Payment intent: " + payment.paymentIntentId,
      "Amount paid: " + money_(payment.amountTotal),
      "Lead ID: " + leadId,
      "Email: " + email,
      "Phone: " + safeText_(payload.phone || payment.customer.phone),
      "Organization: " + safeText_(payload.organization),
      "Notes: " + safeText_(payload.notes || payload.summary),
      "Policy: Reservation fee is non-refundable after booking except when Steel City Integrators cancels or applicable law requires otherwise."
    ].join("\n");
    const event = calendar.createEvent(title, start, end, {description:description,location:location,guests:email,sendInvites:true});
    recordBooking_(payment,payload,start,end,event.getId());
    if (leadId && getLeadById_(leadId)) {
      updateLeadFields_(leadId,{"Appointment ID":event.getId(),"Stage":"Scheduled","Last Contact":new Date(),"Next Follow-Up":""});
      appendActivity_(leadId,"appointment_booked","calendar",payment.service.name + " | " + dateText + " " + timeText);
    }
    sendBookingConfirmation_(payment,payload,start,end);
    return {ok:true,eventId:event.getId(),start:start.toISOString(),end:end.toISOString(),service:payment.service.name};
  } finally { lock.releaseLock(); }
}

function recordBooking_(payment,payload,start,end,eventId) {
  const sheet = crm_().getSheetByName(SCI.SHEETS.BOOKINGS);
  if (!sheet) throw new Error("Bookings sheet is missing. Run upgradeSystemV12() once.");
  sheet.appendRow([
    payment.id,payment.paymentIntentId,payment.service.code,payment.service.name,payment.amountTotal / 100,
    safeText_(payload.name) || payment.customer.name,safeText_(payload.email) || payment.customer.email,
    safeText_(payload.phone) || payment.customer.phone,safeText_(payload.organization),safeText_(payload.location),
    start,end,eventId,new Date(),"","","","Scheduled",new Date()
  ]);
}

function sendBookingConfirmation_(payment,payload,start,end) {
  const cfg = sciConfig_();
  const email = safeText_(payload.email) || payment.customer.email;
  const when = Utilities.formatDate(start,Session.getScriptTimeZone(),"EEEE, MMMM d 'at' h:mm a z");
  const body = [
    "Your Steel City Integrators appointment is confirmed.","",payment.service.name,when,
    safeText_(payload.location) ? "Location: " + safeText_(payload.location) : "",
    "Amount paid: " + money_(payment.amountTotal),"",
    "One reschedule is allowed with at least 24 hours' notice, subject to availability.",
    "Reservation fees are non-refundable after booking except when Steel City Integrators cancels or applicable law requires otherwise.","",
    "Steel City Integrators LLC","(659) 223-4118",cfg.businessEmail
  ].filter(String).join("\n");
  GmailApp.sendEmail(email,"Confirmed: " + payment.service.name + " — " + when,body,{name:cfg.businessName});
  GmailApp.sendEmail(cfg.businessEmail,"[PAID BOOKING] " + payment.service.name + " — " + when,body + "\n\nCustomer: " + (safeText_(payload.name) || payment.customer.name),{name:cfg.businessName});
}

function localDateTime_(dateText,timeText) {
  const d=dateText.split("-").map(Number),t=timeText.split(":").map(Number);
  return new Date(d[0],d[1]-1,d[2],t[0],t[1],0,0);
}
function pad2_(n) { return String(n).padStart(2,"0"); }

// ===== BookingPage.gs =====
function publicAvailability(dateText, paymentSessionId) {
  const payment = verifyStripeCheckoutSession_(safeText_(paymentSessionId));
  if (paymentAlreadyBooked_(payment.id)) throw new Error("This payment has already been used for an appointment.");
  return getAvailability_(safeText_(dateText),payment.service.durationMinutes);
}

function publicBookAppointment(payload) {
  payload = payload || {};
  if (!payload.contactConsent || !payload.policyConsent) throw new Error("Contact and booking-policy consent are required.");
  const payment = verifyStripeCheckoutSession_(safeText_(payload.paymentSessionId));
  if (paymentAlreadyBooked_(payment.id)) throw new Error("This payment has already been used for an appointment.");
  payload.name = safeText_(payload.name) || payment.customer.name;
  payload.email = safeText_(payload.email) || payment.customer.email;
  payload.phone = safeText_(payload.phone) || payment.customer.phone;
  let lead = findLeadByContact_(payload.email,payload.phone);
  if (!lead) {
    lead = createLead_({
      name:payload.name,organization:payload.organization,customerType:payload.customerType || "Other",email:payload.email,phone:payload.phone,
      location:payload.location || "Remote / phone",services:payment.service.name,budget:"Paid " + money_(payment.amountTotal),timeline:"Scheduled",
      preferredContact:"Email",summary:payload.summary || ("Prepaid booking: " + payment.service.name)
    },"Prepaid Booking");
    sendLeadAcknowledgement_(lead); sendInternalLeadAlert_(lead);
  }
  payload.leadId = lead["Lead ID"];
  return bookAppointment_(payload,payment);
}

function findLeadByContact_(email,phone) {
  const targetEmail=safeText_(email).toLowerCase(),targetPhone=safeText_(phone).replace(/\D/g,"");
  const leads=getLeadRows_().slice().reverse();
  for (let i=0;i<leads.length;i++) {
    const leadEmail=safeText_(leads[i]["Email"]).toLowerCase(),leadPhone=safeText_(leads[i]["Phone"]).replace(/\D/g,"");
    if ((targetEmail && leadEmail===targetEmail)||(targetPhone && leadPhone===targetPhone)) return leads[i];
  }
  return null;
}

function serviceFormPage_() {
  const cfg=requireConfigured_(),url=FormApp.openById(cfg.leadFormId).getPublishedUrl(),escaped=htmlEscape_(url);
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=' + escaped + '"><title>Steel City Integrators Service Request</title></head><body><p>Opening the Steel City Integrators service request form…</p><p><a href="' + escaped + '" target="_top">Tap here if the form does not open.</a></p></body></html>').setTitle("Steel City Integrators Service Request");
}

function bookingPage_(params) {
  let payment;
  try { payment=verifyStripeCheckoutSession_(safeText_(params && params.session_id)); }
  catch (err) { return bookingGatePage_(err.message); }
  if (paymentAlreadyBooked_(payment.id)) return bookingGatePage_("This payment has already been used to schedule an appointment. Check your email for the confirmation or contact Steel City Integrators for help.");
  const isOnsite=payment.service.code.indexOf("onsite_")===0;
  const sessionJson=JSON.stringify(payment.id);
  return HtmlService.createHtmlOutput(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Schedule Paid Service | Steel City Integrators</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f2f5f6;color:#07111c;font-family:Arial,sans-serif}.top{padding:18px;background:#07111c;color:#fff}.brand{max-width:780px;margin:auto;font-weight:800;letter-spacing:.08em}.wrap{max-width:780px;margin:0 auto;padding:28px 16px 50px}.card{padding:28px;border-radius:20px;background:#fff;box-shadow:0 20px 60px rgba(7,17,28,.12)}h1{margin:0;font-size:32px}.paid{display:inline-flex;margin:12px 0 24px;padding:7px 10px;border-radius:999px;background:#e7f8ee;color:#17683b;font-size:12px;font-weight:800}.service{padding:16px;border-left:4px solid #ff6b2c;background:#f7f9fa}.service strong,.service span{display:block}.service span{color:#62717f;font-size:13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}.full{grid-column:1/-1}label{display:block;margin-bottom:6px;font-weight:700;font-size:13px}input,select,textarea,button{width:100%;font:inherit}input,select,textarea{padding:12px;border:1px solid #cbd5dc;border-radius:10px;background:#fff}input[readonly]{background:#f0f3f5}textarea{min-height:90px;resize:vertical}button{padding:13px;border:0;border-radius:999px;background:#ff6b2c;color:#111;font-weight:800;cursor:pointer}button.secondary{background:#0d1c2b;color:#fff}button:disabled{opacity:.55}.consent{display:flex;gap:9px;font-weight:400;line-height:1.4}.consent input{width:auto;margin-top:3px}.message{display:none;margin-top:15px;padding:13px;border-radius:10px}.message.ok{display:block;background:#e7f8ee}.message.err{display:block;background:#fdecec}@media(max-width:620px){.grid{grid-template-columns:1fr}.full{grid-column:1}.card{padding:22px}}
  </style></head><body><div class="top"><div class="brand">STEEL CITY INTEGRATORS</div></div><div class="wrap"><div class="card"><h1>Schedule your paid service</h1><div class="paid">✓ PAYMENT VERIFIED · ${htmlEscape_(money_(payment.amountTotal))}</div><div class="service"><strong>${htmlEscape_(payment.service.name)}</strong><span>${htmlEscape_(payment.service.description)} · Central Time</span></div>
  <form id="form"><div class="grid"><div><label for="name">Name</label><input id="name" required value="${htmlEscape_(payment.customer.name)}"></div><div><label for="email">Checkout email</label><input id="email" type="email" readonly required value="${htmlEscape_(payment.customer.email)}"></div><div><label for="phone">Phone</label><input id="phone" type="tel" value="${htmlEscape_(payment.customer.phone)}"></div><div><label for="organization">Organization / business</label><input id="organization"></div><div><label for="customerType">Customer type</label><select id="customerType"><option>Church</option><option>Funeral Home</option><option>Daycare</option><option>Small Business</option><option>Residential</option><option>Other</option></select></div><div><label for="date">Date</label><input id="date" type="date" required></div>
  <div class="full"><label for="location">${isOnsite ? "Service address" : "City / location (optional)"}</label><input id="location" ${isOnsite ? "required" : ""} placeholder="${isOnsite ? "Full service address" : "Birmingham, AL"}"></div><div class="full"><button class="secondary" type="button" id="load">Show available times</button></div><div class="full"><label for="time">Available time</label><select id="time" disabled required><option value="">Choose a date first</option></select></div><div class="full"><label for="summary">Notes for the appointment</label><textarea id="summary" placeholder="Describe the system, issue or goal."></textarea></div>
  <div class="full"><label class="consent"><input id="contactConsent" type="checkbox" required><span>I agree to receive transactional email, calendar and, when configured, text updates about this appointment.</span></label></div><div class="full"><label class="consent"><input id="policyConsent" type="checkbox" required><span>I agree to the booking policy: one reschedule with 24 hours' notice; the reservation fee is non-refundable after booking except when Steel City Integrators cancels or applicable law requires otherwise.</span></label></div><div class="full"><button id="submit" type="submit">Confirm appointment</button></div></div></form><div id="message" class="message"></div></div></div>
  <script>(function(){var session=${sessionJson},form=document.getElementById('form'),date=document.getElementById('date'),time=document.getElementById('time'),load=document.getElementById('load'),submit=document.getElementById('submit'),msg=document.getElementById('message');var tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);date.min=tomorrow.toISOString().slice(0,10);function show(t,ok){msg.className='message '+(ok?'ok':'err');msg.textContent=t}load.onclick=function(){if(!date.value){show('Choose a date first.',false);return}load.disabled=true;load.textContent='Checking…';google.script.run.withSuccessHandler(function(slots){time.innerHTML='';var first=document.createElement('option');first.value='';first.textContent=slots&&slots.length?'Select a time':'No times available';time.appendChild(first);(slots||[]).forEach(function(slot){var o=document.createElement('option');o.value=slot.time;o.textContent=slot.label;time.appendChild(o)});time.disabled=!(slots&&slots.length);load.disabled=false;load.textContent='Show available times';if(!(slots&&slots.length))show('No appointment times are available for that date.',false)}).withFailureHandler(function(e){load.disabled=false;load.textContent='Show available times';show(e.message||String(e),false)}).publicAvailability(date.value,session)};form.onsubmit=function(ev){ev.preventDefault();if(!time.value){show('Choose an available time.',false);return}submit.disabled=true;submit.textContent='Confirming…';var p={paymentSessionId:session,name:document.getElementById('name').value,email:document.getElementById('email').value,phone:document.getElementById('phone').value,organization:document.getElementById('organization').value,customerType:document.getElementById('customerType').value,location:document.getElementById('location').value,date:date.value,time:time.value,summary:document.getElementById('summary').value,contactConsent:document.getElementById('contactConsent').checked,policyConsent:document.getElementById('policyConsent').checked};google.script.run.withSuccessHandler(function(r){show('Appointment confirmed. Check your email for the confirmation and calendar invitation.',true);form.querySelectorAll('input,select,textarea,button').forEach(function(n){n.disabled=true})}).withFailureHandler(function(e){submit.disabled=false;submit.textContent='Confirm appointment';show(e.message||String(e),false)}).publicBookAppointment(p)}})();</script></body></html>`).setTitle("Schedule Paid Service | Steel City Integrators");
}

function bookingGatePage_(message) {
  const cfg=sciConfig_();
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment required | Steel City Integrators</title><style>body{font-family:Arial;background:#07111c;color:#fff;padding:35px}.card{max-width:650px;margin:auto;padding:28px;border:1px solid #2b4355;border-radius:18px;background:#0d1c2b}a{color:#ff6b2c}</style></head><body><div class="card"><h1>Verified payment required</h1><p>' + htmlEscape_(message) + '</p><p><a target="_top" href="' + htmlEscape_(cfg.websiteUrl) + '/book.html">Return to pricing and secure checkout</a></p></div></body></html>').setTitle("Payment required | Steel City Integrators");
}

// ===== Reminders.gs =====
function runAppointmentReminders() {
  const sheet = bookingsSheet_();
  if (sheet.getLastRow() < 2) return {processed:0};
  const rows = sheet.getRange(2,1,sheet.getLastRow()-1,SCI.BOOKING_HEADERS.length).getValues();
  const now = new Date(); let processed = 0;
  rows.forEach(function(row,index) {
    const booking = bookingObject_(row);
    if (booking.status !== "Scheduled" || !(booking.start instanceof Date)) return;
    const hours = (booking.start.getTime() - now.getTime()) / 3600000;
    if (!booking.reminder24 && hours > 23 && hours <= 25) { sendReminder_(booking,"24 hours"); sheet.getRange(index+2,15).setValue(new Date()); processed++; }
    if (!booking.reminder2 && hours > 1 && hours <= 3) { sendReminder_(booking,"2 hours"); sheet.getRange(index+2,16).setValue(new Date()); processed++; }
  });
  return {processed:processed};
}

function runPostServiceFollowUp() {
  const sheet=bookingsSheet_();
  if (sheet.getLastRow()<2) return {processed:0};
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,SCI.BOOKING_HEADERS.length).getValues();
  const now=new Date(); let processed=0;
  rows.forEach(function(row,index){
    const booking=bookingObject_(row);
    if (booking.status!=="Scheduled" || booking.followUp || !(booking.end instanceof Date)) return;
    const hours=(now.getTime()-booking.end.getTime())/3600000;
    if (hours>=20 && hours<=48) {
      const cfg=sciConfig_();
      const body=["Hi " + booking.name + ",","Thank you for choosing Steel City Integrators for " + booking.serviceName + ".","","Reply to this email if you need a next step, estimate or follow-up visit. Your feedback also helps us improve the service experience.","","Steel City Integrators LLC","(659) 223-4118",cfg.businessEmail].join("\n");
      GmailApp.sendEmail(booking.email,"Following up on your Steel City Integrators service",body,{name:cfg.businessName});
      sheet.getRange(index+2,17).setValue(new Date()); processed++;
    }
  });
  return {processed:processed};
}

function sendReminder_(booking,windowLabel) {
  const cfg=sciConfig_();
  const when=Utilities.formatDate(booking.start,Session.getScriptTimeZone(),"EEEE, MMMM d 'at' h:mm a z");
  const message=["Reminder: your Steel City Integrators " + booking.serviceName + " appointment is in about " + windowLabel + ".","","Scheduled: " + when,booking.location ? "Location: " + booking.location : "","","Need help? Call (659) 223-4118 or reply to this email."].filter(String).join("\n");
  GmailApp.sendEmail(booking.email,"Reminder: " + booking.serviceName + " — " + when,message,{name:cfg.businessName});
  if (booking.phone) sendSmsIfConfigured_(booking.phone,"Steel City Integrators reminder: " + booking.serviceName + " is scheduled " + when + ".","");
}

function bookingsSheet_() {
  const sheet=crm_().getSheetByName(SCI.SHEETS.BOOKINGS);
  if (!sheet) throw new Error("Bookings sheet is missing. Run upgradeSystemV12() once.");
  return sheet;
}

function bookingObject_(row) {
  return {sessionId:safeText_(row[0]),serviceCode:safeText_(row[2]),serviceName:safeText_(row[3]),amount:Number(row[4]||0),name:safeText_(row[5]),email:safeText_(row[6]),phone:safeText_(row[7]),organization:safeText_(row[8]),location:safeText_(row[9]),start:row[10],end:row[11],eventId:safeText_(row[12]),confirmation:row[13],reminder24:row[14],reminder2:row[15],followUp:row[16],status:safeText_(row[17])};
}

// ===== Ops.gs =====
function sendDailyOpsSummary() {
  const cfg=requireConfigured_(); if(!cfg.businessEmail)return;
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(start.getTime());end.setDate(end.getDate()+1);
  const leads=getLeadRows_(),todaysLeads=leads.filter(function(lead){const created=lead["Created At"] instanceof Date?lead["Created At"]:new Date(lead["Created At"]);return created>=start&&created<end;}),openLeads=leads.filter(function(lead){return SCI.CLOSED_STAGES.indexOf(safeText_(lead["Stage"]))===-1;}),hotLeads=openLeads.filter(function(lead){return Number(lead["Score"]||0)>=60;}).sort(function(a,b){return Number(b["Score"]||0)-Number(a["Score"]||0);}).slice(0,5);
  const tomorrowStart=new Date(end.getTime()),tomorrowEnd=new Date(tomorrowStart.getTime());tomorrowEnd.setDate(tomorrowEnd.getDate()+1);
  const appointments=CalendarApp.getCalendarById(cfg.calendarId).getEvents(tomorrowStart,tomorrowEnd),lines=["Steel City Integrators Daily Operations Summary","","New leads today: "+todaysLeads.length,"Open leads: "+openLeads.length,"Hot leads (60+): "+hotLeads.length,"Appointments tomorrow: "+appointments.length,"Payments: "+(cfg.stripeSecretKey?"Stripe connected":"ACTION REQUIRED — connect Stripe"),"SMS: "+(cfg.smsWebhookUrl?"Connected":"Pending Voice/provider verification"),""];
  if(hotLeads.length){lines.push("Top active leads:");hotLeads.forEach(function(lead){lines.push("- "+lead["Lead ID"]+" | "+lead["Name"]+" | "+lead["Score"]+"/100 | "+lead["Services"]);});lines.push("");}
  if(appointments.length){lines.push("Tomorrow:");appointments.forEach(function(event){lines.push("- "+Utilities.formatDate(event.getStartTime(),Session.getScriptTimeZone(),"h:mm a")+" | "+event.getTitle());});}
  GmailApp.sendEmail(cfg.businessEmail,"SCI Daily Ops - "+Utilities.formatDate(now,Session.getScriptTimeZone(),"MMM d"),lines.join("\n"),{name:cfg.businessName});appendActivity_("","daily_ops_summary","email",cfg.businessEmail);
}

function systemStatus(){const cfg=sciConfig_();return{version:SCI.VERSION,configured:Boolean(cfg.crmSheetId&&cfg.leadFormId&&cfg.calendarId),businessHours:"07:00-21:00 Central",paymentConfigured:Boolean(cfg.stripeSecretKey),smsConfigured:Boolean(cfg.smsWebhookUrl),publicWebsite:cfg.websiteUrl};}

// ===== Admin.gs =====
function configureBusinessProfile(options){
  options=options||{};const props=PropertiesService.getScriptProperties(),allowed={businessName:"BUSINESS_NAME",businessEmail:"BUSINESS_EMAIL",websiteUrl:"WEBSITE_URL",serviceRadiusMiles:"SERVICE_RADIUS_MILES",homeBase:"HOME_BASE",appointmentMinutes:"APPOINTMENT_MINUTES"};
  Object.keys(allowed).forEach(function(key){if(options[key]!==undefined&&options[key]!==null&&String(options[key]).trim()!=="")props.setProperty(allowed[key],String(options[key]).trim());});return sciConfig_();
}
function configureSmsWebhook(webhookUrl,token){const props=PropertiesService.getScriptProperties();props.setProperty("SMS_WEBHOOK_URL",safeText_(webhookUrl));if(safeText_(token))props.setProperty("SMS_WEBHOOK_TOKEN",safeText_(token));else props.deleteProperty("SMS_WEBHOOK_TOKEN");return{smsConfigured:Boolean(safeText_(webhookUrl))};}
function getSystemLinks(){const cfg=requireConfigured_(),ss=SpreadsheetApp.openById(cfg.crmSheetId),form=FormApp.openById(cfg.leadFormId),webApp=ScriptApp.getService().getUrl()||"";return{website:cfg.websiteUrl,crm:ss.getUrl(),leadForm:form.getPublishedUrl(),webApp:webApp,serviceRequest:webApp?webApp+"?action=service":"",paymentGatedBooking:webApp?webApp+"?action=booking":"",calendarId:cfg.calendarId};}
function runDiagnostics(){
  const cfg=sciConfig_(),checks=[{name:"CRM configured",ok:Boolean(cfg.crmSheetId)},{name:"Lead form configured",ok:Boolean(cfg.leadFormId)},{name:"Calendar configured",ok:Boolean(cfg.calendarId)},{name:"Stripe configured",ok:Boolean(cfg.stripeSecretKey)},{name:"Public website configured",ok:Boolean(cfg.websiteUrl)}];
  if(cfg.crmSheetId){const ss=SpreadsheetApp.openById(cfg.crmSheetId);[SCI.SHEETS.LEADS,SCI.SHEETS.ACTIVITY,SCI.SHEETS.SETTINGS,SCI.SHEETS.BOOKINGS].forEach(function(name){checks.push({name:"Sheet: "+name,ok:Boolean(ss.getSheetByName(name))});});}
  if(cfg.leadFormId)checks.push({name:"Lead form accessible",ok:Boolean(FormApp.openById(cfg.leadFormId).getId())});if(cfg.calendarId)checks.push({name:"Booking calendar accessible",ok:Boolean(CalendarApp.getCalendarById(cfg.calendarId))});
  const handlers=ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction();});["onLeadFormSubmit","runFollowUpEngine","sendDailyOpsSummary","runAppointmentReminders","runPostServiceFollowUp"].forEach(function(handler){checks.push({name:"Trigger: "+handler,ok:handlers.indexOf(handler)!==-1});});
  return{ok:checks.every(function(c){return c.ok;}),checks:checks,smsConfigured:Boolean(cfg.smsWebhookUrl),paymentMode:cfg.stripeSecretKey?(cfg.stripeSecretKey.indexOf("sk_live_")===0?"live":"test"):"not configured"};
}

// ===== Setup.gs =====
function setupSystem() {
  const props=PropertiesService.getScriptProperties();
  if (!props.getProperty("BUSINESS_NAME")) props.setProperty("BUSINESS_NAME","Steel City Integrators LLC");
  if (!props.getProperty("BUSINESS_EMAIL")) props.setProperty("BUSINESS_EMAIL",Session.getEffectiveUser().getEmail());
  if (!props.getProperty("SERVICE_RADIUS_MILES")) props.setProperty("SERVICE_RADIUS_MILES","80");
  if (!props.getProperty("HOME_BASE")) props.setProperty("HOME_BASE","Birmingham, Alabama");
  if (!props.getProperty("APPOINTMENT_MINUTES")) props.setProperty("APPOINTMENT_MINUTES","60");
  if (!props.getProperty("WEBSITE_URL")) props.setProperty("WEBSITE_URL",SCI.DEFAULT_PUBLIC_SITE_URL);
  let ss=props.getProperty("CRM_SHEET_ID") ? SpreadsheetApp.openById(props.getProperty("CRM_SHEET_ID")) : SpreadsheetApp.create("Steel City Integrators CRM");
  props.setProperty("CRM_SHEET_ID",ss.getId()); initializeCrmSheets_(ss);
  let form=props.getProperty("LEAD_FORM_ID") ? FormApp.openById(props.getProperty("LEAD_FORM_ID")) : buildLeadForm_();
  if (!props.getProperty("LEAD_FORM_ID")) { form.setDestination(FormApp.DestinationType.SPREADSHEET,ss.getId()); props.setProperty("LEAD_FORM_ID",form.getId()); }
  let calendar=props.getProperty("CALENDAR_ID") ? CalendarApp.getCalendarById(props.getProperty("CALENDAR_ID")) : CalendarApp.createCalendar("Steel City Integrators Bookings");
  props.setProperty("CALENDAR_ID",calendar.getId()); installProjectTriggers_(form); writeSettings_(ss,form,calendar);
  appendActivity_("","system_setup","system","Automation core configured or upgraded to " + SCI.VERSION);
  return {version:SCI.VERSION,crmUrl:ss.getUrl(),formUrl:form.getPublishedUrl(),calendarId:calendar.getId(),nextStep:"Configure Stripe and deploy a new web-app version."};
}

function upgradeSystemV12() {
  const cfg=requireConfigured_(),ss=SpreadsheetApp.openById(cfg.crmSheetId),form=FormApp.openById(cfg.leadFormId),calendar=CalendarApp.getCalendarById(cfg.calendarId);
  PropertiesService.getScriptProperties().setProperty("WEBSITE_URL",cfg.websiteUrl || SCI.DEFAULT_PUBLIC_SITE_URL);
  initializeCrmSheets_(ss); installProjectTriggers_(form); writeSettings_(ss,form,calendar);
  appendActivity_("","system_upgrade","system","Upgraded to " + SCI.VERSION);
  return {ok:true,version:SCI.VERSION,stripeConfigured:Boolean(sciConfig_().stripeSecretKey),webApp:ScriptApp.getService().getUrl()||""};
}

function initializeCrmSheets_(ss) {
  const leads=getOrCreateSheet_(ss,SCI.SHEETS.LEADS),activity=getOrCreateSheet_(ss,SCI.SHEETS.ACTIVITY),settings=getOrCreateSheet_(ss,SCI.SHEETS.SETTINGS),bookings=getOrCreateSheet_(ss,SCI.SHEETS.BOOKINGS);
  setHeaderIfNeeded_(leads,SCI.LEAD_HEADERS); setHeaderIfNeeded_(activity,SCI.ACTIVITY_HEADERS); setHeaderIfNeeded_(bookings,SCI.BOOKING_HEADERS);
  if (settings.getLastRow()===0) settings.getRange(1,1,1,2).setValues([["Setting","Value"]]);
  [leads,activity,settings,bookings].forEach(function(sheet){sheet.setFrozenRows(1);});
}
function getOrCreateSheet_(ss,name){return ss.getSheetByName(name)||ss.insertSheet(name);}
function setHeaderIfNeeded_(sheet,headers){if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers]);return;}const existing=sheet.getRange(1,1,1,headers.length).getValues()[0];if(existing.join("|")!==headers.join("|"))sheet.getRange(1,1,1,headers.length).setValues([headers]);}

function buildLeadForm_(){
  const form=FormApp.create("Steel City Integrators Service Request");
  form.setDescription("Request AV, live streaming, sound, lighting, networking, CCTV, access control, structured cabling, or commercial display service within approximately 80 miles of Birmingham, Alabama.");
  form.setConfirmationMessage("Thank you. Steel City Integrators received your request and will follow up shortly.");
  form.addTextItem().setTitle("Name").setRequired(true); form.addTextItem().setTitle("Organization / Business");
  form.addMultipleChoiceItem().setTitle("Customer Type").setChoiceValues(["Church","Funeral Home","Daycare","Small Business","Residential","Other"]).setRequired(true);
  form.addTextItem().setTitle("Email"); form.addTextItem().setTitle("Phone"); form.addTextItem().setTitle("Project Location").setRequired(true);
  form.addCheckboxItem().setTitle("Services Needed").setChoiceValues(SCI.SERVICES).setRequired(true);
  form.addMultipleChoiceItem().setTitle("Budget Range").setChoiceValues(["Not sure yet","Under $1,000","$1,000-$2,500","$2,500-$5,000","$5,000-$10,000","$10,000+"]);
  form.addMultipleChoiceItem().setTitle("Desired Timeline").setChoiceValues(["Emergency / ASAP","Within 1 week","Within 30 days","1-3 months","Planning / researching"]);
  form.addMultipleChoiceItem().setTitle("Preferred Contact").setChoiceValues(["Email","Phone","Text"]); form.addParagraphTextItem().setTitle("Project Summary").setRequired(true);
  form.addCheckboxItem().setTitle("Contact Consent").setChoiceValues(["I agree to be contacted about this service request."]).setRequired(true); return form;
}

function installProjectTriggers_(form) {
  const handlers=["onLeadFormSubmit","runFollowUpEngine","sendDailyOpsSummary","runAppointmentReminders","runPostServiceFollowUp"];
  ScriptApp.getProjectTriggers().forEach(function(trigger){if(handlers.indexOf(trigger.getHandlerFunction())!==-1)ScriptApp.deleteTrigger(trigger);});
  ScriptApp.newTrigger("onLeadFormSubmit").forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger("runFollowUpEngine").timeBased().everyHours(1).create(); ScriptApp.newTrigger("runAppointmentReminders").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("runPostServiceFollowUp").timeBased().everyHours(1).create(); ScriptApp.newTrigger("sendDailyOpsSummary").timeBased().atHour(20).everyDays(1).create();
}

function writeSettings_(ss,form,calendar) {
  const cfg=sciConfig_(),sheet=ss.getSheetByName(SCI.SHEETS.SETTINGS),rows=[["Version",SCI.VERSION],["Business Name",cfg.businessName],["Business Email",cfg.businessEmail],["Website",cfg.websiteUrl],["Home Base",cfg.homeBase],["Service Radius Miles",cfg.serviceRadiusMiles],["Operating Hours","7:00 AM - 9:00 PM Central"],["Lead Form",form.getPublishedUrl()],["Calendar ID",calendar.getId()],["Payments",cfg.stripeSecretKey ? "Stripe configured" : "Stripe authorization required"],["SMS Status",cfg.smsWebhookUrl ? "Configured" : "Pending Google Voice/provider verification"]];
  if(sheet.getMaxRows()>1)sheet.getRange(2,1,sheet.getMaxRows()-1,2).clearContent(); sheet.getRange(2,1,rows.length,2).setValues(rows);
}

// ===== WebApp.gs =====
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = safeText_(params.action) || "health";
    if (action === "health") return jsonResponse_({ok: true, status: systemStatus()});
    if (action === "booking") return bookingPage_(params);
    if (action === "service") return serviceFormPage_();
    if (action === "availability") {
      const payment = verifyStripeCheckoutSession_(safeText_(params.session_id));
      return jsonResponse_({ok: true, slots: getAvailability_(safeText_(params.date), payment.service.durationMinutes)});
    }
    return jsonResponse_({ok: false, error: "Unknown action"});
  } catch (err) {
    return jsonResponse_({ok: false, error: err.message});
  }
}

function doPost(e) {
  try {
    const payload = parseRequestBody_(e);
    const action = safeText_(payload.action);
    if (action === "checkout") return checkoutRedirectPage_(safeText_(payload.service));
    enforceRateLimit_(payload);
    if (action === "lead") return jsonResponse_(handleWebLead_(payload));
    if (action === "book") return jsonResponse_(publicBookAppointment(payload));
    return jsonResponse_({ok: false, error: "Unknown action"});
  } catch (err) {
    const action = safeText_(e && e.parameter && e.parameter.action);
    if (action === "checkout") return errorPage_(err.message);
    return jsonResponse_({ok: false, error: err.message});
  }
}

function parseRequestBody_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    const type = safeText_(e.postData.type).toLowerCase();
    if (type.indexOf("application/json") !== -1) return JSON.parse(e.postData.contents);
  }
  const obj = {};
  Object.keys(e.parameter || {}).forEach(function(key) { obj[key] = e.parameter[key]; });
  return obj;
}

function enforceRateLimit_(payload) {
  const identity = [safeText_(payload.email).toLowerCase(),safeText_(payload.phone),safeText_(payload.name).toLowerCase()].join("|");
  if (!identity.replace(/\|/g, "")) return;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, identity);
  const key = "rl:" + Utilities.base64EncodeWebSafe(digest).slice(0, 32);
  const cache = CacheService.getScriptCache();
  const current = Number(cache.get(key) || "0");
  if (current >= 5) throw new Error("Too many requests. Please try again later.");
  cache.put(key, String(current + 1), 3600);
}

function jsonResponse_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function errorPage_(message) {
  const cfg = sciConfig_();
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Steel City Integrators</title><style>body{font-family:Arial;background:#07111c;color:#fff;padding:40px}.card{max-width:640px;margin:auto;padding:30px;border:1px solid #294258;border-radius:18px;background:#0d1c2b}a{color:#ff6b2c}</style></head><body><div class="card"><h1>We could not open checkout.</h1><p>' + htmlEscape_(message) + '</p><p><a href="' + htmlEscape_(cfg.websiteUrl) + '/book.html" target="_top">Return to pricing and booking</a></p></div></body></html>');
}
