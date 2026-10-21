function upsertProspect(payload) {
  payload=payload||{};
  const organization=safeText_(payload.organization);
  const sourceUrl=safeText_(payload.sourceUrl);
  if(!organization)throw new Error("Prospect organization is required.");
  if(!/^https:\/\//i.test(sourceUrl))throw new Error("A valid public or licensed source URL is required.");
  const key=prospectDedupeKeyApps_(payload);
  if(!key)throw new Error("Website, public phone, or organization and location are required for deduplication.");
  const scored=scoreProspectApps_(payload);
  const sheet=crm_().getSheetByName(SCI.SHEETS.PROSPECTS);
  const existing=findProspectByKey_(key);
  const id=existing?safeText_(existing["Prospect ID"]):"SCIP-"+Utilities.getUuid().slice(0,8).toUpperCase();
  const row=[
    id,organization,safeText_(payload.vertical),safeText_(payload.location),safeText_(payload.website),
    safeText_(payload.publicPhone),safeText_(payload.publicBusinessEmail),safeText_(payload.decisionMakerRole),
    sourceUrl,safeText_(payload.sourceProvider),safeText_(payload.sourceTimestamp||new Date().toISOString()),
    Number(payload.driveMinutes||0),scored.driveTier,(payload.needSignals||[]).join(" | "),
    Number(payload.aggregateDemandIndex||0),Number(payload.campaignFit||0),Number(payload.projectFitPoints||0),
    scored.score,scored.temperature,scored.outreachEligible?"Yes":"No",payload.suppressed===true?"Yes":"No",
    existing?safeText_(existing["CRM Lead ID"]):"",new Date(),safeText_(payload.notes)
  ];
  if(existing)sheet.getRange(existing._row,1,1,row.length).setValues([row]);else sheet.appendRow(row);
  appendActivity_(id,existing?"prospect_updated":"prospect_created","prospect_intelligence",organization+" | "+scored.score+"/100 | "+sourceUrl);
  return{id:id,score:scored.score,temperature:scored.temperature,driveTier:scored.driveTier,outreachEligible:scored.outreachEligible,updated:Boolean(existing)};
}

function scoreProspectApps_(payload) {
  payload=payload||{};
  const vertical=safeText_(payload.vertical).toLowerCase();
  const targets=["church","house of worship","funeral home","daycare","dental office","medical office","hvac company","plumbing company","trade business","professional office","small business","commercial business","nonprofit","school","community facility"];
  const tier=prospectDriveTierApps_(payload.driveMinutes);
  let score=targets.indexOf(vertical)!==-1?10:0;
  score+=tier.points;
  const signals=Array.isArray(payload.needSignals)?payload.needSignals.filter(Boolean):[];
  if(signals.length)score+=15;
  if(signals.length>1)score+=10;
  if(payload.highIntentSignal===true)score+=20;
  if(safeText_(payload.publicBusinessEmail)||safeText_(payload.publicPhone))score+=10;
  if(safeText_(payload.decisionMakerRole))score+=10;
  score+=Math.max(0,Math.min(15,Number(payload.projectFitPoints)||0));
  score+=Math.round(Math.max(0,Math.min(100,Number(payload.aggregateDemandIndex)||0))/20);
  score+=Math.max(0,Math.min(5,Number(payload.campaignFit)||0));
  score=Math.min(100,score);
  const temperature=score>=80?"Hot":score>=60?"Qualified":score>=40?"Nurture":"Database";
  const outreachEligible=payload.suppressed!==true&&tier.onsite&&(safeText_(payload.publicBusinessEmail)||safeText_(payload.publicPhone))&&score>=60;
  return{score:score,temperature:temperature,driveTier:tier.tier,onsiteEligible:tier.onsite,outreachEligible:Boolean(outreachEligible)};
}

function prospectDriveTierApps_(minutes) {
  const n=Number(minutes);
  if(!isFinite(n)||n<0)return{tier:"Unknown",points:0,onsite:false};
  if(n<=60)return{tier:"Tier 1",points:20,onsite:true};
  if(n<=120)return{tier:"Tier 2",points:16,onsite:true};
  if(n<=180)return{tier:"Tier 3",points:12,onsite:true};
  if(n<=240)return{tier:"Tier 4",points:8,onsite:true};
  return{tier:"Remote only",points:0,onsite:false};
}

function prospectDedupeKeyApps_(payload) {
  const domain=safeText_(payload.website).toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").split("/")[0];
  const phone=safeText_(payload.publicPhone).replace(/\D/g,"");
  const org=safeText_(payload.organization).toLowerCase().replace(/[^a-z0-9]/g,"");
  const location=safeText_(payload.location).toLowerCase().replace(/[^a-z0-9]/g,"");
  return domain||phone||[org,location].filter(Boolean).join("|");
}

function findProspectByKey_(key) {
  const sheet=crm_().getSheetByName(SCI.SHEETS.PROSPECTS),values=sheet.getDataRange().getValues();
  if(values.length<2)return null;
  const headers=values[0];
  for(let i=1;i<values.length;i++){
    const row={_row:i+1};headers.forEach(function(header,index){row[header]=values[i][index];});
    if(prospectDedupeKeyApps_({website:row["Website"],publicPhone:row["Public Phone"],organization:row["Organization"],location:row["Location"]})===key)return row;
  }
  return null;
}

function promoteProspectToCrm(prospectId,reviewConfirmed) {
  if(reviewConfirmed!==true)throw new Error("Human review confirmation is required before CRM promotion.");
  const prospect=getProspectById_(prospectId);
  if(!prospect)throw new Error("Prospect not found.");
  if(safeText_(prospect["Suppressed"]).toLowerCase()==="yes")throw new Error("Suppressed prospects cannot be promoted.");
  if(Number(prospect["Score"]||0)<60)throw new Error("Prospect must score at least 60.");
  if(safeText_(prospect["CRM Lead ID"]))return{ok:true,leadId:prospect["CRM Lead ID"],existing:true};
  const lead=createLead_({
    name:safeText_(prospect["Decision-Maker Role"])||"Business contact",organization:prospect["Organization"],
    customerType:prospect["Vertical"],industrySegment:prospect["Vertical"],email:prospect["Public Business Email"],
    phone:prospect["Public Phone"],location:prospect["Location"],services:prospect["Need Signals"],
    budget:"Qualification required",timeline:"Public need signal",preferredContact:"Email",
    summary:"Prospect intelligence review. Verify relevance and contact permissions before outreach.",
    campaign:"prospect-intelligence",sourceDetail:prospect["Source URL"]
  },"Prospect Intelligence");
  updateLeadFields_(lead["Lead ID"],{"Stage":"Prospecting Review","Next Follow-Up":""});
  const sheet=crm_().getSheetByName(SCI.SHEETS.PROSPECTS),headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0],index=headers.indexOf("CRM Lead ID");
  sheet.getRange(prospect._row,index+1).setValue(lead["Lead ID"]);
  appendActivity_(lead["Lead ID"],"prospect_promoted","system",prospect["Prospect ID"]);
  return{ok:true,leadId:lead["Lead ID"],existing:false};
}

function getProspectById_(prospectId) {
  const sheet=crm_().getSheetByName(SCI.SHEETS.PROSPECTS),values=sheet.getDataRange().getValues();
  if(values.length<2)return null;
  const headers=values[0];
  for(let i=1;i<values.length;i++){if(safeText_(values[i][0])===safeText_(prospectId)){const row={_row:i+1};headers.forEach(function(header,index){row[header]=values[i][index];});return row;}}
  return null;
}

function recordCampaignPerformance(payload) {
  payload=payload||{};
  if(!safeText_(payload.campaign))throw new Error("Campaign name is required.");
  crm_().getSheetByName(SCI.SHEETS.CAMPAIGNS).appendRow([
    new Date(),safeText_(payload.campaign),safeText_(payload.vertical),safeText_(payload.channel),
    Number(payload.impressions||0),Number(payload.clicks||0),Number(payload.leads||0),Number(payload.qualifiedLeads||0),
    Number(payload.appointments||0),Number(payload.proposals||0),Number(payload.wins||0),Number(payload.revenue||0),
    Number(payload.spend||0),safeText_(payload.notes)
  ]);
  return{ok:true};
}

