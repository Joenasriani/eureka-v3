import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { parsePersonImport, personSearchMaterial } from '../server/person.mjs';
import { personHistoryRecords, markKnownSources } from '../server/person-bridge.mjs';
import { deriveCalibration } from '../server/leveler.mjs';

let passed=0,failed=0;const report=[];
function test(name,fn){try{fn();passed++;report.push(`PASS ${name}`)}catch(error){failed++;report.push(`FAIL ${name}: ${error.message}`)}}

const raw=JSON.stringify({
  export_version:'EUREKA_PERSON_CONTEXT_1',
  identity:{name:'Test Person',preferred_name:'Test'},
  familiar_worlds:[{text:'music',status:'DIRECT',source_ref:'profile'}],
  knowledge_domains:[{text:'visual design',status:'DIRECT',source_ref:'profile'}],
  known_concepts:[{text:'queueing theory',status:'DIRECT',source_ref:'past chat'}],
  stories_and_episodes:[{id:'music_flow',text:'When composing music I keep a short task list, react to feedback from what I just made, and choose the next move instead of fixing the whole plan first.',status:'DIRECT',source_ref:'music chat',tags:['tasks','feedback','plan']}],
  candidate_inferences:[{text:'May prefer feedback driven work.',status:'CANDIDATE_INFERENCE',source_ref:'music chat'}],
  access_audit:{available:[{text:'past chats'}],not_available:[{text:'deleted chats'}]}
});
const person=parsePersonImport(raw,'',{useForPersonalization:true,useStoriesForP1:true,useCandidateInferences:false});
const material=personSearchMaterial(person);

test('identity and provenance survive import',()=>{assert.equal(person.identity.preferredName,'Test');assert.equal(person.stories[0].sourceRef,'music chat')});
test('candidate inferences stay separate and disabled',()=>{assert.equal(person.candidateInferences.length,1);assert.equal(person.permissions.useCandidateInferences,false)});
test('familiar fields and episodes enter search material only by permission',()=>{assert.ok(material.domains.includes('music'));assert.equal(material.stories.length,1)});
test('direct notes do not become P1 episodes',()=>{const p=parsePersonImport('','I work in design and music.',{useForPersonalization:true,useStoriesForP1:true});assert.equal(p.stories.length,0)});
test('person episode can be converted to relation bearing P1 history material',()=>{const history=personHistoryRecords(material);assert.equal(history.length,1);assert.ok(history[0].analysis.relationalSignature.length>=2)});
test('known source can be demoted without touching truth status',()=>{const r=markKnownSources({ranked:[{id:'queueing',name:'Queueing and Flow',pool:'P3',score:.8,keywords:['queue']},{id:'feedback_control',name:'Feedback Control',pool:'P3',score:.7,keywords:['feedback']}],selected:[]},['queueing theory']);assert.equal(r.ranked.find(x=>x.id==='queueing').known,true);assert.ok(r.ranked.find(x=>x.id==='queueing').score<.8);assert.equal('evidence' in r,false)});
test('Leveler admits familiar fields and known concepts without intelligence scoring',()=>{const c=deriveCalibration({story:'I keep rebuilding my plan.',goal:'finish',currentFrame:'discipline',tried:'stricter plan',success:'',familiarDomains:''},{targetDistance:.55,abstractionPreference:.5,bridgeTolerance:.55,noveltyFloor:.45,sourceStats:{}},person);assert.ok(c.explicitDomains.includes('music'));assert.ok(c.knownConcepts.includes('queueing theory'));assert.equal('iq' in c,false)});
test('public person surface keeps prohibited visual and wording patterns out',()=>{const css=fsSync('public/person.css').toLowerCase();const js=fsSync('public/person.js').toLowerCase();for(const term of ['border-radius','linear-gradient','radial-gradient','conic-gradient','box-shadow','backdrop-filter'])assert.ok(!css.includes(term),term);for(const term of ['seamless','revolutionary','elevate','game changer','cutting edge','transformative','unlock','magical'])assert.ok(!js.includes(term),term);assert.ok(!/[–—]/.test(js+css))});

after();
async function after(){const text=report.join('\n')+`\n\n${passed}/${passed+failed} passed`;console.log(text);await fs.writeFile('tests/PERSON_CONTEXT_REPORT.txt',text+'\n');if(failed)process.exitCode=1}
function fsSync(path){return requireText(path)}
function requireText(path){return globalThis.process.getBuiltinModule('fs').readFileSync(path,'utf8')}
