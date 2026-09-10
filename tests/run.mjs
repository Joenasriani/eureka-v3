import assert from 'node:assert/strict';
import process from 'node:process';
import { promises as fs, readFileSync } from 'node:fs';
import { parseCase } from '../server/parser.mjs';
import { deriveCalibration, updateProfile } from '../server/leveler.mjs';
import { retrieveSources, generateLocalCandidates } from '../server/generator.mjs';
import { verifyCandidates, adjudicate } from '../server/verifier.mjs';

process.chdir(new URL('..', import.meta.url).pathname);

let passed=0, failed=0;
const report=[];
function test(name,fn){
  try{fn();passed++;report.push(`PASS  ${name}`)}catch(e){failed++;report.push(`FAIL  ${name}\n      ${e.message}`)}
}

const profile={targetDistance:.55,abstractionPreference:.5,bridgeTolerance:.55,noveltyFloor:.45,sourceStats:{},knownConcepts:[],rejectedConcepts:[]};
const productivity={story:'I make detailed schedules for the day, then I stop following them as soon as one task takes longer or something unexpected arrives. A short unordered list often works better.',goal:'Finish important work without repairing the plan all day.',currentFrame:'I am inconsistent and need more discipline.',tried:'I tried stricter time blocks and reminders. I still abandon the plan when the day changes.',success:'When I compose music, I react to what I just made and decide the next move from there.',capability:'finish',familiarDomains:'music, design'};
const influence={story:'When I explain my service in detail, people become passive. When I show one short before and after example and stop, they start asking questions.',goal:'Make people understand the value quickly without pressuring them.',currentFrame:'People need more information before they can care.',tried:'I added more proof points and explanations. Attention dropped.',success:'The best conversations start after a small visual example and the other person asks for details.',capability:'influence',familiarDomains:'film, advertising, visual design'};
const transfer={story:'I avoid starting administrative work even when it is simple. I can start music or visual experiments immediately even when those projects are harder.',goal:'Start necessary work with less friction.',currentFrame:'I dislike boring work and lack motivation for it.',tried:'I tried rewards and strict task lists. I still delay the first step.',success:'With music I open the project and make a tiny change without deciding what the whole session must accomplish.',capability:'start',familiarDomains:'music, 3D, visual design'};

function fsSync(p){return readFileSync(p,'utf8')}

function runLocal(input, p=profile, excluded=[]){
  const parsed=parseCase(input);const cal=deriveCalibration(parsed.raw,p);const ret=retrieveSources(parsed,cal,p,excluded);const candidates=generateLocalCandidates(parsed,ret,cal);const verified=verifyCandidates(parsed,candidates);const result=adjudicate(parsed,verified);return {parsed,cal,ret,candidates,verified,result};
}

for (const [name,input] of [['productivity',productivity],['influence',influence],['transfer',transfer]]) {
  const r=runLocal(input);
  test(`${name}: anchors preserved`,()=>assert.ok(r.parsed.anchors.length>=4));
  test(`${name}: P1 source appears when success episode exists`,()=>assert.equal(r.ret.selected[0].pool,'P1'));
  test(`${name}: at least three source candidates`,()=>assert.ok(r.ret.selected.length>=3));
  test(`${name}: candidates replay admitted anchors`,()=>r.candidates.forEach(c=>c.storyReplay.forEach(x=>assert.ok(r.parsed.anchors.some(a=>a.anchorId===x.anchorId)))));
  test(`${name}: five axes remain separate`,()=>r.candidates.forEach(c=>assert.deepEqual(Object.keys(c.status),['evidence','structural','personalFit','recognition','transfer'])));
  test(`${name}: recognition begins unknown`,()=>r.candidates.forEach(c=>assert.equal(c.status.recognition,'UNKNOWN')));
  test(`${name}: transfer begins not tested`,()=>r.candidates.forEach(c=>assert.equal(c.status.transfer,'NOT_TESTED')));
  test(`${name}: candidates have boundaries and competing frames`,()=>r.candidates.forEach(c=>{assert.ok(c.boundary.length>20);assert.ok(c.competingFrame.length>20)}));
  test(`${name}: local verifier returns survivors`,()=>assert.ok(r.result.candidates.length>=1));
}

const p1=runLocal(productivity);
test('productivity: queueing or feedback is retrieved',()=>assert.ok(p1.ret.selected.some(x=>['queueing','feedback_control'].includes(x.id))));
const i1=runLocal(influence);
test('influence: trailer or compression is retrieved',()=>assert.ok(i1.ret.selected.some(x=>['trailer','compression'].includes(x.id))));
test('influence: autonomy or consent boundary present',()=>i1.candidates.forEach(c=>assert.ok(/voluntary|consent|autonomy|withholding|receiver|audience/i.test(c.boundary+' '+c.microTransfer))));
const t1=runLocal(transfer);
test('transfer: activation or composition is retrieved',()=>assert.ok(t1.ret.selected.some(x=>['activation','composition'].includes(x.id))));

test('thin case: app should be able to fail closed upstream',()=>assert.ok(parseCase({story:'I am stuck.',capability:'understand'}).raw.story.length<35));
test('high stakes: adjudication does not return personal guidance',()=>{
  const r=runLocal({...productivity,story:'I need to decide whether to stop a prescribed medication because I feel different.'});
  assert.equal(r.parsed.stakes,'HIGH');assert.equal(r.result.outcome,'INSUFFICIENT_EVIDENCE_FOR_CONSEQUENTIAL_GUIDANCE');
});

test('known already increases distance and novelty floor without truth status',()=>{
  const next=updateProfile(profile,{recognition:'KNOWN_ALREADY',reason:'KNOWN_CONCEPT',sourceId:'queueing',matrixDistance:.66});
  assert.ok(next.targetDistance>profile.targetDistance);assert.ok(next.noveltyFloor>profile.noveltyFloor);assert.equal(next.sourceStats.queueing.known,1);
});
test('too remote pulls distance nearer',()=>{
  const next=updateProfile(profile,{recognition:'INTERESTING',reason:'TOO_REMOTE',sourceId:'selection',matrixDistance:.79});
  assert.ok(next.targetDistance<profile.targetDistance);
});
test('too abstract changes abstraction preference',()=>{
  const next=updateProfile(profile,{recognition:'INTERESTING',reason:'TOO_ABSTRACT',sourceId:'feedback_control',matrixDistance:.74});
  assert.ok(next.abstractionPreference<profile.abstractionPreference);
});
test('strong AHA adjusts retrieval prior only',()=>{
  const next=updateProfile(profile,{recognition:'STRONG_AHA',sourceId:'queueing',matrixDistance:.66});
  assert.equal(next.sourceStats.queueing.strong,1);assert.equal('evidence' in next,false);
});
test('reroute exclusion can remove a rejected source',()=>{
  const first=runLocal(productivity);const excluded=[first.ret.selected[0].id];const second=runLocal(productivity,profile,excluded);
  assert.ok(!second.ret.selected.some(x=>excluded.includes(x.id)));
});

test('parser: explanation does not trigger planning relations',()=>{
  const r=runLocal(influence);
  assert.ok(!r.parsed.relationalSignature.includes('variable_arrivals'));
  assert.ok(!r.parsed.relationalSignature.includes('uncertain_duration'));
});
test('P2: incidental story vocabulary does not create familiarity',()=>{
  const r=runLocal({...influence,familiarDomains:'visual design'});
  assert.ok(!r.ret.selected.some(x=>x.pool==='P2' && x.id==='search'));
});
test('influence: unrelated queueing source is not selected',()=>{
  const r=runLocal(influence);
  assert.ok(!r.ret.selected.some(x=>x.id==='queueing'));
});
test('single vague relation cannot bypass intent and keyword route',()=>{
  const r=runLocal(transfer);
  assert.ok(!r.ret.selected.some(x=>x.id==='network_diffusion'));
});
test('P1 reframe changes condition instead of trait label',()=>{
  const r=runLocal(transfer);
  const p1=r.candidates.find(x=>x.sourceId==='intra_personal');
  assert.ok(/entry|first move|condition/i.test(p1.eureka));
  assert.ok(/motivation|capability/i.test(p1.eureka));
});


test('public copy contains no en dash or em dash characters',()=>{
  const html=fsSync('public/index.html');const js=fsSync('public/app.js');
  assert.ok(!/[–—]/.test(html+js));
});
test('public copy avoids the project banned stock wording',()=>{
  const copy=(fsSync('public/index.html')+' '+fsSync('public/app.js')).toLowerCase();
  for(const term of ['seamless','revolutionary','elevate','game changer','cutting edge','transformative','unlock','journey','powerful','smart','magical','effortless','effortlessly']) assert.ok(!copy.includes(term),term);
});
test('public styling rejects generic AI and SaaS surface patterns',()=>{
  const css=fsSync('public/styles.css').toLowerCase();
  for(const term of ['border-radius','linear-gradient','radial-gradient','conic-gradient','box-shadow','backdrop-filter','filter: blur']) assert.ok(!css.includes(term),term);
});
test('public markup rejects common chat and card naming',()=>{
  const html=fsSync('public/index.html').toLowerCase();
  for(const term of ['chat-bubble','chatbubble','glass-card','glasscard','hero-card','gradient-orb']) assert.ok(!html.includes(term),term);
});

after();
async function after(){
  const text=report.join('\n')+`\n\n${passed}/${passed+failed} passed`;
  console.log(text);
  await fs.writeFile('tests/TEST_REPORT.txt',text+'\n');
  if(failed) process.exitCode=1;
}
