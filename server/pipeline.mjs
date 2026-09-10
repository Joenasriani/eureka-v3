import crypto from 'node:crypto';
import { parseCase } from './parser.mjs';
import { deriveCalibration, updateProfile } from './leveler.mjs';
import { selectGenerators, retrieveSources, generateLocalCandidates } from './generator.mjs';
import { verifyCandidates, adjudicate } from './verifier.mjs';
import { atomizeCandidates } from './atomizer.mjs';
import { aiAssistCandidates, aiAdversarialReview, aiAvailable, aiDiscoverSources, aiEnrichCase, aiResearchEvidence } from './ai.mjs';
import { getProfile, setProfile, saveCase, updateCase, listCases, getPersonContext } from './storage.mjs';
import { personSearchMaterial } from './person.mjs';
import { personHistoryRecords, markKnownSources } from './person-bridge.mjs';

export async function runPipeline(input, options={}) {
  const trace = [];
  const startedAt = new Date().toISOString();
  const caseId = options.caseId || crypto.randomUUID();
  const profile = await getProfile();
  const personContext = await getPersonContext();
  const personMaterial = personSearchMaterial(personContext);

  trace.push(stage('INTAKE','User experience admitted', true));
  let parsed = parseCase(input);
  trace.push(stage('PARSE',`Experience graph: ${parsed.anchors.length} anchors, ${parsed.episodes.length} episodes`, true));

  if (parsed.raw.story.length < 35 || parsed.anchors.filter(a=>a.type==='OBSERVED_EPISODE').length === 0) {
    const record = buildNullCase(caseId,input,parsed,profile,trace,startedAt,'PERSONALIZATION_LIMITED_BY_AVAILABLE_CONTEXT','The story is too thin to justify a personal reframe without inventing details.');
    await saveCase(record);
    return record;
  }

  const caseAudit = await aiEnrichCase(parsed);
  parsed = caseAudit.parsed;
  trace.push(stage('INTERPRET',caseAudit.note,true));

  const calibration = deriveCalibration(parsed.raw, profile, personContext);
  trace.push(stage('LEVEL',`AHA frontier: ${calibration.label}; abstraction ${Math.round(calibration.abstractionPreference*100)}`, true));

  const generators = selectGenerators(parsed);
  trace.push(stage('ROUTE',`AHA target ${parsed.ahaTarget}; generators ${generators.map(g=>g.id).join(', ')}`, true));

  const storedHistory = parsed.raw.reuseHistory ? await listCases() : [];
  const importedHistory = personContext.permissions?.useStoriesForP1 ? personHistoryRecords(personMaterial) : [];
  const history = [...storedHistory, ...importedHistory];
  let retrieval = retrieveSources(parsed, calibration, profile, options.excludedSourceIds || [], history);
  retrieval = markKnownSources(retrieval, personMaterial.knownConcepts);
  const openSources = await aiDiscoverSources(parsed, calibration);
  const mergedSelected = mergeSourceSearch(retrieval.selected, openSources.sources, options.excludedSourceIds || []);
  const effectiveRetrieval = {...retrieval, selected:mergedSelected};
  trace.push(stage('RETRIEVE',`P1/P2/P3/P4 search: ${mergedSelected.map(s=>`${s.pool}:${s.name}`).join(' | ')}. ${openSources.note}`, mergedSelected.length>0));

  let candidates = generateLocalCandidates(parsed, effectiveRetrieval, calibration);
  const ai = await aiAssistCandidates(parsed, candidates, calibration);
  candidates = atomizeCandidates(parsed, ai.candidates);
  trace.push(stage('DISCOVER',ai.note, true));
  trace.push(stage('ATOMIZE',`${candidates.reduce((n,c)=>n+c.claimAtoms.length,0)} claim and inference atoms typed`, true));

  const verified = verifyCandidates(parsed, candidates);
  trace.push(stage('VERIFY',`${verified.filter(x=>x.survive).length}/${verified.length} candidates passed local structure and personal fit gates`, true));

  const independent = await aiAdversarialReview(parsed, verified.map(stripForAdversary));
  const reviewed = applyIndependentReview(verified, independent);
  if (independent) trace.push(stage('ATTACK','Independent model adversarial review completed', true));
  else trace.push(stage('ATTACK','Deterministic counter anchor review completed', true));

  const adjudication = adjudicate(parsed, reviewed);
  trace.push(stage('ARBITRATE',adjudication.outcome, adjudication.outcome==='CANDIDATES_SURVIVED'));

  const record = {
    caseId,
    createdAt:options.originalCreatedAt || startedAt,
    updatedAt:new Date().toISOString(),
    revision:options.revision || 0,
    engine:{mode:(ai.used || caseAudit.used || openSources.sources.length)?'AI_ASSISTED':'DETERMINISTIC', model:(ai.used || caseAudit.used || openSources.sources.length)?(process.env.OPENAI_MODEL || 'gpt-5.6-terra'):null},
    input:parsed.raw,
    experienceGraph:{anchors:parsed.anchors,episodes:parsed.episodes,relations:parsed.relations},
    analysis:{ahaTarget:parsed.ahaTarget,relationalSignature:parsed.relationalSignature,oldFrame:parsed.oldFrame,unresolvedResidue:parsed.unresolvedResidue,stakes:parsed.stakes,generators,calibration,retrieval:[...retrieval.ranked,...openSources.sources].map(compactSource),contrast:retrieval.contrast,openSourceSearch:openSources.note,caseInterpretation:caseAudit.note,historySearch:`${storedHistory.length} stored cases and ${importedHistory.length} imported person episodes admitted to P1 search`,personContext:{used:calibration.personContextUsed,name:personContext.identity?.preferredName||personContext.identity?.name||'',domains:personMaterial.domains.length,knownConcepts:personMaterial.knownConcepts.length,stories:personMaterial.stories.length}},
    outcome:adjudication.outcome,
    reason:adjudication.reason,
    candidates:adjudication.candidates,
    trace,
    feedback:options.priorFeedback || [],
    statusAxes:{evidence:'SEPARATE_PER_CANDIDATE',structural:'SEPARATE_PER_CANDIDATE',personalFit:'SEPARATE_PER_CANDIDATE',recognition:'USER_ONLY',transfer:'REALITY_ONLY'}
  };
  await saveCase(record);
  return record;
}

export async function researchCandidateEvidence(caseId, candidateId) {
  let found;
  await updateCase(caseId, record => {
    found = record.candidates.find(x=>x.candidateId===candidateId);
    if (!found) throw new Error('CANDIDATE_NOT_FOUND');
    return record;
  });
  if (found.sourcePool === 'P1') {
    return updateCase(caseId, record => {
      const c = record.candidates.find(x=>x.candidateId===candidateId);
      c.evidenceReview = {used:false,status:'USER_PROVIDED',summary:'This source field is another episode supplied by the user. External web evidence is not the basis of this source matrix.',sources:[]};
      c.status.evidence = 'USER_PROVIDED_EXPERIENCE';
      record.updatedAt = new Date().toISOString();
      return record;
    });
  }
  const review = await aiResearchEvidence(found);
  return updateCase(caseId, record => {
    const c = record.candidates.find(x=>x.candidateId===candidateId);
    c.evidenceReview = review;
    c.status.evidence = review.status === 'SUPPORTED' ? 'SOURCE_MODEL_SUPPORTED'
      : review.status === 'MIXED' ? 'SOURCE_MODEL_MIXED'
      : review.status === 'CONTRADICTED' ? 'SOURCE_MODEL_CONTRADICTED'
      : 'SOURCE_MODEL_UNVERIFIED';
    record.feedback.push({type:'EVIDENCE_INSPECTION',at:new Date().toISOString(),candidateId,status:review.status});
    record.updatedAt = new Date().toISOString();
    return record;
  });
}

export async function recordRecognition(caseId, payload) {
  const nextCase = await updateCase(caseId, record => {
    const c = record.candidates.find(x=>x.candidateId===payload.candidateId);
    if (!c) throw new Error('CANDIDATE_NOT_FOUND');
    c.status.recognition = payload.recognition;
    c.recognitionReason = payload.reason || null;
    c.userReflection = payload.reflection || null;
    record.feedback.push({type:'RECOGNITION',at:new Date().toISOString(),candidateId:c.candidateId,recognition:payload.recognition,reason:payload.reason||null});
    record.updatedAt = new Date().toISOString();
    return record;
  });

  const candidate = nextCase.candidates.find(x=>x.candidateId===payload.candidateId);
  const profile = await getProfile();
  const nextProfile = updateProfile(profile, {
    recognition:payload.recognition, reason:payload.reason, sourceId:candidate.sourceId, matrixDistance:candidate.sourceDistance
  });
  await setProfile(nextProfile);
  return {case:nextCase, profile:nextProfile};
}

export async function recordSelfTransfer(caseId, payload) {
  return updateCase(caseId, record => {
    const c = record.candidates.find(x=>x.candidateId===payload.candidateId);
    if (!c) throw new Error('CANDIDATE_NOT_FOUND');
    const restatement = String(payload.restatement || '').trim();
    const anotherEpisode = String(payload.anotherEpisode || '').trim();
    c.selfTransfer = {
      restatement:restatement || null,
      anotherEpisode:anotherEpisode || null,
      recordedAt:new Date().toISOString(),
      status:(restatement || anotherEpisode) ? 'USER_RESTATED_OR_EXTENDED' : 'NOT_RECORDED'
    };
    record.feedback.push({type:'SELF_TRANSFER',at:new Date().toISOString(),candidateId:c.candidateId,restatement:restatement || null,anotherEpisode:anotherEpisode || null});
    record.updatedAt = new Date().toISOString();
    return record;
  });
}

export async function recordTransfer(caseId, payload) {
  const nextCase = await updateCase(caseId, record => {
    const c = record.candidates.find(x=>x.candidateId===payload.candidateId);
    if (!c) throw new Error('CANDIDATE_NOT_FOUND');
    c.status.transfer = payload.outcome;
    c.transferNote = payload.note || null;
    record.feedback.push({type:'TRANSFER',at:new Date().toISOString(),candidateId:c.candidateId,outcome:payload.outcome,note:payload.note||null});
    record.updatedAt = new Date().toISOString();
    return record;
  });
  const candidate = nextCase.candidates.find(x=>x.candidateId===payload.candidateId);
  const profile = await getProfile();
  const nextProfile = updateProfile(profile, {sourceId:candidate.sourceId, transfer:payload.outcome});
  await setProfile(nextProfile);
  return {case:nextCase, profile:nextProfile};
}

export async function adjustCalibration(command) {
  const profile = await getProfile();
  const next = structuredClone(profile);
  const clamp = n => Math.max(0.1, Math.min(0.9, n));
  if (command === 'NEARER') next.targetDistance = clamp((next.targetDistance ?? .55) - .08);
  if (command === 'FARTHER') next.targetDistance = clamp((next.targetDistance ?? .55) + .08);
  if (command === 'MORE_CONCRETE') next.abstractionPreference = clamp((next.abstractionPreference ?? .5) - .08);
  if (command === 'MORE_ABSTRACT') next.abstractionPreference = clamp((next.abstractionPreference ?? .5) + .08);
  if (command === 'LOWER_BRIDGE_COST') next.bridgeTolerance = clamp((next.bridgeTolerance ?? .55) - .08);
  if (command === 'RESET') {
    next.targetDistance=.55; next.abstractionPreference=.5; next.bridgeTolerance=.55; next.noveltyFloor=.45;
  }
  await setProfile(next);
  return next;
}

export async function reroute(caseId, payload) {
  let prior;
  await updateCase(caseId, record => { prior = record; return record; });
  const exclude = new Set(payload.excludedSourceIds || []);
  for (const c of prior.candidates) {
    if (c.status.recognition === 'KNOWN_ALREADY' || c.status.recognition === 'DOES_NOT_FIT') exclude.add(c.sourceId);
  }
  return runPipeline(prior.input, {caseId, excludedSourceIds:[...exclude], priorFeedback:prior.feedback || [], originalCreatedAt:prior.createdAt, revision:(prior.revision || 0)+1});
}

function mergeSourceSearch(localSources, aiSources, excludedSourceIds) {
  const excluded = new Set(excludedSourceIds || []);
  const p1 = localSources.find(x=>x.pool==='P1' && !excluded.has(x.id));
  const pool = [...aiSources, ...localSources.filter(x=>x.pool!=='P1')]
    .filter(x=>!excluded.has(x.id))
    .sort((a,b)=>(b.score||0)-(a.score||0));
  const selected = p1 ? [p1] : [];
  for (const source of pool) {
    if (selected.length >= 4) break;
    if (selected.some(x=>x.id===source.id)) continue;
    if (source.pool==='P2' && selected.filter(x=>x.pool==='P2').length>=1) continue;
    selected.push(source);
  }
  return selected;
}

function applyIndependentReview(verified, independent) {
  if (!independent?.reviews) return verified;
  const byId = new Map(independent.reviews.map(r=>[r.candidateId,r]));
  return verified.map(c=>{
    const r = byId.get(c.candidateId);
    if (!r) return c;
    const verdict = ['SURVIVE','NARROW','REJECT'].includes(r.verdict) ? r.verdict : 'NARROW';
    return {
      ...c,
      independentReview:{verdict,strongestObjection:r.strongestObjection||'',missingDetail:r.missingDetail||''},
      counterAnchor:r.strongestObjection || c.counterAnchor,
      survive:c.survive && verdict !== 'REJECT',
      status:{...c.status,structural:verdict==='NARROW' && c.status.structural==='STRUCTURALLY_SUPPORTED' ? 'STRUCTURALLY_NARROWED' : c.status.structural}
    };
  });
}

function stripForAdversary(c) {
  return {candidateId:c.candidateId,sourceId:c.sourceId,sourceName:c.sourceName,mapping:c.mapping,eureka:c.eureka,storyReplay:c.storyReplay,microTransfer:c.microTransfer,boundary:c.boundary,competingFrame:c.competingFrame};
}
function compactSource(s) { return {id:s.id,name:s.name,pool:s.pool,distance:s.distance,abstraction:s.abstraction,score:s.score,structuralScore:s.structuralScore,frontierBand:s.frontierBand,bridgeCost:s.bridgeCost}; }
function stage(id,detail,pass) { return {id,detail,pass,at:new Date().toISOString()}; }
function buildNullCase(caseId,input,parsed,profile,trace,startedAt,outcome,reason) {
  trace.push(stage('ARBITRATE',outcome,false));
  return {caseId,createdAt:startedAt,updatedAt:new Date().toISOString(),engine:{mode:aiAvailable()?'AI_READY':'DETERMINISTIC'},input:parsed.raw,experienceGraph:{anchors:parsed.anchors,episodes:parsed.episodes,relations:parsed.relations},analysis:{ahaTarget:parsed.ahaTarget,relationalSignature:parsed.relationalSignature,oldFrame:parsed.oldFrame,unresolvedResidue:parsed.unresolvedResidue,stakes:parsed.stakes,calibration:deriveCalibration(parsed.raw,profile),generators:[],retrieval:[]},outcome,reason,candidates:[],trace,feedback:[],statusAxes:{evidence:'SEPARATE',structural:'SEPARATE',personalFit:'SEPARATE',recognition:'USER_ONLY',transfer:'REALITY_ONLY'}};
}
