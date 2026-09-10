import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const temp=path.join(root,'data','integration-state.json');
const initial={profile:{targetDistance:.55,abstractionPreference:.5,bridgeTolerance:.55,noveltyFloor:.45,sourceStats:{},knownConcepts:[],rejectedConcepts:[]},cases:[]};
await fs.writeFile(temp,JSON.stringify(initial,null,2));
const port=8791;
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),EUREKA_STATE_FILE:temp,OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
let log=''; child.stdout.on('data',d=>log+=d); child.stderr.on('data',d=>log+=d);

const base=`http://127.0.0.1:${port}`;
let pass=0,fail=0;const lines=[];
const test=async(name,fn)=>{try{await fn();pass++;lines.push(`PASS  ${name}`)}catch(e){fail++;lines.push(`FAIL  ${name}\n      ${e.message}`)}};

try {
  await waitForServer();
  await test('status endpoint reports deterministic mode',async()=>{const s=await get('/api/status');assert.equal(s.ok,true);assert.equal(s.ai,false)});
  let record;
  await test('analyze endpoint returns surviving candidates',async()=>{
    record=await post('/api/analyze',{
      story:'I make detailed schedules, then abandon them when the day changes. A short unordered list often works better and I do not understand why.',
      goal:'Finish important work without repairing the plan all day.',
      currentFrame:'I am inconsistent and need more discipline.',
      tried:'I tried stricter time blocks and reminders, but the plan still collapses after interruptions.',
      success:'When I compose music I react to what I just made and decide the next move from there.',
      capability:'finish',familiarDomains:'music, design',reuseHistory:true
    });
    assert.equal(record.outcome,'CANDIDATES_SURVIVED');assert.ok(record.candidates.length>=2);assert.ok(record.trace.some(x=>x.id==='ATOMIZE'));
  });
  let firstSource;
  await test('recognition changes recognition axis and retrieval profile only',async()=>{
    const c=record.candidates[0];firstSource=c.sourceId;
    const before=await get('/api/profile');
    const r=await post('/api/recognition',{caseId:record.caseId,candidateId:c.candidateId,recognition:'KNOWN_ALREADY',reason:'KNOWN_CONCEPT',reflection:'I use this frame already.'});
    const updated=r.case.candidates.find(x=>x.candidateId===c.candidateId);
    assert.equal(updated.status.recognition,'KNOWN_ALREADY');
    assert.equal(updated.status.evidence,c.status.evidence);assert.equal(updated.status.structural,c.status.structural);
    assert.ok(r.profile.targetDistance>before.targetDistance);
  });
  await test('reroute excludes the rejected source and preserves feedback history',async()=>{
    const r=await post('/api/reroute',{caseId:record.caseId});
    assert.ok(!r.candidates.some(c=>c.sourceId===firstSource));
    assert.ok(r.feedback.some(f=>f.type==='RECOGNITION'));
    assert.ok(r.revision>=1);record=r;
  });
  await test('transfer outcome remains its own status axis',async()=>{
    const c=record.candidates[0];
    const beforeEvidence=c.status.evidence;const beforeStructure=c.status.structural;
    const r=await post('/api/transfer',{caseId:record.caseId,candidateId:c.candidateId,outcome:'TRANSFER_HELPED',note:'The small test helped in this instance.'});
    const updated=r.case.candidates.find(x=>x.candidateId===c.candidateId);
    assert.equal(updated.status.transfer,'TRANSFER_HELPED');assert.equal(updated.status.evidence,beforeEvidence);assert.equal(updated.status.structural,beforeStructure);
  });
  await test('self transfer is stored as user material without truth promotion',async()=>{
    const c=record.candidates[0];
    const beforeEvidence=c.status.evidence;const beforeStructure=c.status.structural;
    const r=await post('/api/self-transfer',{caseId:record.caseId,candidateId:c.candidateId,restatement:'I am comparing how the next move gets selected.',anotherEpisode:'I notice the same pattern when I edit a video after receiving client notes.'});
    const updated=r.candidates.find(x=>x.candidateId===c.candidateId);
    assert.equal(updated.selfTransfer.status,'USER_RESTATED_OR_EXTENDED');
    assert.equal(updated.status.evidence,beforeEvidence);assert.equal(updated.status.structural,beforeStructure);
  });
  await test('manual Leveler adjustment affects routing only',async()=>{
    const before=await get('/api/profile');const after=await post('/api/calibration',{command:'MORE_CONCRETE'});
    assert.ok(after.abstractionPreference<before.abstractionPreference);assert.equal('evidence' in after,false);
  });
  await test('P1 evidence inspection remains user material and does not touch structure',async()=>{
    const p1=record.candidates.find(c=>c.sourcePool==='P1');
    if(!p1) return;
    const beforeStructure=p1.status.structural;
    const r=await post('/api/evidence',{caseId:record.caseId,candidateId:p1.candidateId});
    const updated=r.candidates.find(c=>c.candidateId===p1.candidateId);
    assert.equal(updated.status.evidence,'USER_PROVIDED_EXPERIENCE');
    assert.equal(updated.status.structural,beforeStructure);
  });
  await test('history endpoint returns the case',async()=>{const cases=await get('/api/cases');assert.ok(cases.some(c=>c.caseId===record.caseId))});
  let historyCase;
  await test('opt in history can become P1 when the current case has no contrast episode',async()=>{
    historyCase=await post('/api/analyze',{
      story:'I build a detailed work plan, then abandon it when new tasks arrive and the sequence stops matching the day.',
      goal:'Finish the important work without rebuilding the plan.',
      currentFrame:'I assume the plan needs to be stricter.',
      tried:'I added more time blocks but the same collapse happened.',
      success:'',capability:'finish',familiarDomains:'',reuseHistory:true
    });
    assert.ok(historyCase.candidates.some(c=>c.sourcePool==='P1' && c.sourceId.startsWith('history_')));
  });
  await test('thin story returns a null result instead of manufactured candidate',async()=>{const r=await post('/api/analyze',{story:'I am stuck.',capability:'understand'});assert.equal(r.candidates.length,0);assert.equal(r.outcome,'PERSONALIZATION_LIMITED_BY_AVAILABLE_CONTEXT')});
  await test('case deletion removes autobiographical record',async()=>{await post('/api/case/delete',{caseId:record.caseId});const cases=await get('/api/cases');assert.ok(!cases.some(c=>c.caseId===record.caseId))});
} finally {
  child.kill('SIGTERM');
  await fs.rm(temp,{force:true});
}

const text=lines.join('\n')+`\n\n${pass}/${pass+fail} passed`;
console.log(text);await fs.writeFile(path.join(root,'tests','INTEGRATION_REPORT.txt'),text+'\n');
if(fail) process.exitCode=1;

async function waitForServer(){for(let i=0;i<40;i++){try{const r=await fetch(base+'/api/status');if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('server did not start: '+log)}
async function get(pathname){const r=await fetch(base+pathname);const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);return j}
async function post(pathname,body){const r=await fetch(base+pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);return j}
