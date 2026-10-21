const assert = require('assert');
const { prospectDriveTier, scoreProspect, prospectDedupeKey } = require('../src/prospect-intelligence');

assert.equal(prospectDriveTier(60).tier, 'Tier 1');
assert.equal(prospectDriveTier(61).tier, 'Tier 2');
assert.equal(prospectDriveTier(240).tier, 'Tier 4');
assert.equal(prospectDriveTier(241).onsite, false);
const hot = scoreProspect({vertical:'Church',driveMinutes:45,needSignals:['livestream','renovation'],highIntentSignal:true,publicBusinessContact:true,publicDecisionMaker:true,projectFitPoints:15});
assert.equal(hot.score, 100);
assert.equal(hot.temperature, 'Hot');
assert.equal(hot.outreachEligible, true);
const aggregate = scoreProspect({vertical:'Dental Office',driveMinutes:90,needSignals:['new location'],publicBusinessContact:true,aggregateDemandIndex:80,campaignFitPoints:4,projectFitPoints:10});
assert.equal(aggregate.driveTier,'Tier 2');
assert.equal(aggregate.score,69);
assert.equal(aggregate.outreachEligible,true);
assert.equal(scoreProspect({vertical:'Church',driveMinutes:45,needSignals:['upgrade'],publicBusinessContact:true,projectFitPoints:15,suppressed:true}).outreachEligible,false);
assert.equal(prospectDedupeKey({domain:'www.Example.org'}),'example.org');
console.log('prospect-intelligence tests passed');

