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
