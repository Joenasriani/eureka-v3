const API_URL = 'https://api.openai.com/v1/responses';

export function aiAvailable() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function aiAssistCandidates(parsed, localCandidates, calibration) {
  if (!aiAvailable()) return {used:false, candidates:localCandidates, note:'deterministic structural engine'};

  const instructions = [
    'You are one discovery worker inside the Eureka Reasoning Architecture.',
    'Do not claim truth, diagnosis, novelty, or user recognition.',
    'Use only the admitted user anchors supplied in the input. Do not invent personal history.',
    'Preserve each candidate source matrix. Improve only the collision, story reinterpretation, AHA candidate, and micro transfer wording.',
    'A candidate must make a concrete admitted moment mean something materially different and expose a move that depends on the new representation.',
    'Do not use generic self help advice. Do not flatter the user.',
    'Return JSON only with shape {"candidates":[...]} and keep all candidateId and sourceId values unchanged.'
  ].join('\n');

  const input = JSON.stringify({
    oldFrame:parsed.oldFrame,
    ahaTarget:parsed.ahaTarget,
    unresolvedResidue:parsed.unresolvedResidue,
    anchors:parsed.anchors,
    relationalSignature:parsed.relationalSignature,
    calibration:{targetDistance:calibration.targetDistance, abstractionPreference:calibration.abstractionPreference},
    candidates:localCandidates.map(c=>({
      candidateId:c.candidateId, sourceId:c.sourceId, sourceName:c.sourceName,
      yourMoment:c.yourMoment, secondMatrix:c.secondMatrix, mapping:c.mapping,
      eureka:c.eureka, storyReplay:c.storyReplay, whatBecomesVisible:c.whatBecomesVisible,
      microTransfer:c.microTransfer, counterAnchor:c.counterAnchor, boundary:c.boundary, competingFrame:c.competingFrame
    }))
  });

  try {
    const raw = await callResponse({instructions,input,effort:'medium'});
    const parsedJson = parseJson(raw);
    const byId = new Map((parsedJson.candidates || []).map(c=>[c.candidateId,c]));
    const merged = localCandidates.map(base => {
      const ai = byId.get(base.candidateId);
      if (!ai || ai.sourceId !== base.sourceId) return base;
      return {
        ...base,
        gap:safeString(ai.gap, base.gap),
        eureka:safeString(ai.eureka, base.eureka),
        storyReplay:safeReplay(ai.storyReplay, base.storyReplay, parsed.anchors),
        whatBecomesVisible:safeString(ai.whatBecomesVisible, base.whatBecomesVisible),
        microTransfer:safeString(ai.microTransfer, base.microTransfer),
        counterAnchor:safeString(ai.counterAnchor, base.counterAnchor),
        boundary:safeString(ai.boundary, base.boundary),
        competingFrame:safeString(ai.competingFrame, base.competingFrame),
        diagnostics:{...base.diagnostics, aiAssisted:true}
      };
    });
    return {used:true,candidates:merged,note:'AI assisted discovery with local structural guardrails'};
  } catch (error) {
    return {used:false,candidates:localCandidates,note:`AI unavailable, deterministic engine used: ${error.message}`};
  }
}

export async function aiAdversarialReview(parsed, candidates) {
  if (!aiAvailable() || !candidates.length) return null;
  const instructions = [
    'You are an independent adversarial reviewer. You did not generate the candidates.',
    'Attempt to falsify or narrow each candidate.',
    'Focus on forced analogy, story cherry picking, alternate explanations, boundary failure, and whether the new move actually depends on the reframe.',
    'Do not add new personal facts. Return JSON only: {"reviews":[{"candidateId":"C1","verdict":"SURVIVE|NARROW|REJECT","strongestObjection":"...","missingDetail":"..."}]}.'
  ].join('\n');
  try {
    const raw = await callResponse({instructions,input:JSON.stringify({anchors:parsed.anchors,candidates}),effort:'medium'});
    return parseJson(raw);
  } catch {
    return null;
  }
}

async function callResponse({instructions,input,effort='medium'}) {
  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
    instructions,
    input,
    reasoning:{effort}
  };
  const res = await fetch(API_URL, {
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
    body:JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return extractText(data);
}

function extractText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (typeof part.text === 'string') chunks.push(part.text);
    }
  }
  if (!chunks.length) throw new Error('empty model output');
  return chunks.join('\n');
}

function parseJson(text) {
  const cleaned = String(text).trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim();
  return JSON.parse(cleaned);
}
function safeString(x,fallback) { return typeof x==='string' && x.trim().length>20 ? x.trim() : fallback; }
function safeReplay(value,fallback,anchors) {
  if (!Array.isArray(value)) return fallback;
  const allowed = new Set(anchors.map(a=>a.anchorId));
  const clean = value.filter(x=>allowed.has(x.anchorId) && typeof x.reinterpretation==='string' && x.reinterpretation.length>20)
    .map(x=>({anchorId:x.anchorId,text:anchors.find(a=>a.anchorId===x.anchorId).text,reinterpretation:x.reinterpretation.trim()}));
  return clean.length ? clean : fallback;
}

export async function aiDiscoverSources(parsed, calibration) {
  if (!aiAvailable()) return {sources:[], note:'open source discovery unavailable without model credentials'};

  const proposalInstructions = [
    'You are the source retrieval worker inside Eureka.',
    'Search conceptually across human knowledge for second matrices that can re represent the target structure.',
    'Do not give advice and do not write the final Eureka.',
    'P2 sources may come only from the explicitly supplied familiar domains. P3 sources should be genuinely remote.',
    'Prefer relation level correspondence over topic similarity.',
    'Avoid sources that share only one vague relation such as feedback or threshold.',
    'Return six candidates at most as JSON: {"sources":[{"id":"short_slug","name":"...","pool":"P2|P3","sourceDomain":"...","distance":0.0,"abstraction":0.0,"core":"...","targetRelations":["..."],"sourceRelations":["..."],"collisions":["..."],"move":"...","boundary":"...","counter":"..."}]}.',
    'distance means conceptual distance from the user case, not intelligence. abstraction means conceptual machinery needed to explain the source.',
    'Every targetRelations value must be copied exactly from the supplied target relational signature.'
  ].join('\n');

  try {
    const proposedRaw = await callResponse({
      instructions:proposalInstructions,
      input:JSON.stringify({
        ahaTarget:parsed.ahaTarget,
        oldFrame:parsed.oldFrame,
        unresolvedResidue:parsed.unresolvedResidue,
        targetRelationalSignature:parsed.relationalSignature,
        explicitFamiliarDomains:calibration.explicitDomains,
        targetDistance:calibration.targetDistance,
        abstractionPreference:calibration.abstractionPreference
      }),
      effort:'high'
    });
    const proposals = sanitizeSourceProposals(parseJson(proposedRaw), parsed, calibration);
    if (!proposals.length) return {sources:[],note:'model proposed no admissible source matrices'};

    const reviewInstructions = [
      'You are an independent structural source reviewer. You did not propose these source matrices.',
      'Judge relation level correspondence only. Do not reward novelty, elegance, or user familiarity.',
      'Reject any source whose mapping depends on surface resemblance, one vague relation, invented target relations, or an inaccurate description of the source mechanism.',
      'For P2, reject if sourceDomain is not one of the explicitly supplied familiar domains or a clear subdomain of one.',
      'Return JSON only: {"reviews":[{"id":"...","verdict":"ACCEPT|NARROW|REJECT","mappingQuality":0.0,"acceptedTargetRelations":["..."],"objection":"..."}]}.'
    ].join('\n');
    const reviewRaw = await callResponse({
      instructions:reviewInstructions,
      input:JSON.stringify({targetRelationalSignature:parsed.relationalSignature,explicitFamiliarDomains:calibration.explicitDomains,sources:proposals}),
      effort:'high'
    });
    const reviews = parseJson(reviewRaw).reviews || [];
    const byId = new Map(reviews.map(r=>[r.id,r]));
    const accepted = [];
    for (const proposal of proposals) {
      const r = byId.get(proposal.id);
      if (!r || r.verdict === 'REJECT') continue;
      const acceptedRelations = (r.acceptedTargetRelations || []).filter(x=>parsed.relationalSignature.includes(x));
      if (acceptedRelations.length < 2) continue;
      const quality = clamp(Number(r.mappingQuality) || .5);
      const frontier = sourceFrontier(proposal, quality, calibration);
      accepted.push({
        ...proposal,
        structuralScore:quality,
        relationOverlap:acceptedRelations,
        keywordHits:[],
        familiar:proposal.pool === 'P2',
        ...frontier,
        independentSourceReview:{verdict:r.verdict,objection:r.objection || ''},
        aiDiscovered:true
      });
    }
    return {sources:accepted.sort((a,b)=>b.score-a.score).slice(0,6),note:`${accepted.length} open source matrices survived independent structural review`};
  } catch (error) {
    return {sources:[],note:`open source discovery failed closed: ${error.message}`};
  }
}

function sanitizeSourceProposals(raw, parsed, calibration) {
  const seen = new Set();
  const out = [];
  for (const x of raw.sources || []) {
    const id = String(x.id || '').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,40);
    if (!id || seen.has(id)) continue;
    const pool = x.pool === 'P2' ? 'P2' : 'P3';
    const targetRelations = Array.isArray(x.targetRelations) ? x.targetRelations.filter(r=>parsed.relationalSignature.includes(r)) : [];
    if (targetRelations.length < 2) continue;
    if (pool === 'P2' && !calibration.explicitDomains.length) continue;
    const proposal = {
      id:`ai_${id}`,
      originalId:id,
      name:safeString(x.name,'Unnamed source'),
      pool,
      sourceDomain:safeString(x.sourceDomain,'unknown'),
      distance:clamp(Number(x.distance) || .7),
      abstraction:clamp(Number(x.abstraction) || .65),
      core:safeString(x.core,'Source mechanism unavailable.'),
      targetRelations,
      sourceRelations:Array.isArray(x.sourceRelations)?x.sourceRelations.map(String).slice(0,8):[],
      collisions:Array.isArray(x.collisions)?x.collisions.map(String).filter(Boolean).slice(0,5):[],
      move:safeString(x.move,'Use this representation only to form a bounded test.'),
      boundary:safeString(x.boundary,'The transfer may fail when the source relation does not hold in the target.'),
      counter:safeString(x.counter,'A competing representation may explain the same experience better.'),
      relations:targetRelations,
      intents:[parsed.raw.capability],
      keywords:[]
    };
    seen.add(id); out.push(proposal);
  }
  return out;
}

function sourceFrontier(source, mappingQuality, calibration) {
  const distanceFit = 1 - Math.abs(source.distance - calibration.targetDistance);
  const abstractionFit = 1 - Math.abs(source.abstraction - calibration.abstractionPreference);
  const bridgeCost = source.pool === 'P2' ? Math.max(.1,source.distance*.42) : source.distance*(.72+source.abstraction*.22);
  const bridgeFit = 1-Math.max(0,bridgeCost-calibration.bridgeTolerance);
  const score = mappingQuality*.6 + distanceFit*.18 + abstractionFit*.1 + bridgeFit*.12;
  const d = source.distance-calibration.targetDistance;
  const frontierBand = d < -.25 ? 'TOO_CLOSE' : d < -.08 ? 'FAMILIAR' : d <= .12 ? 'PRODUCTIVE_SURPRISE' : d <= .28 ? 'BRIDGEABLE_CHALLENGE' : 'TOO_REMOTE';
  return {score,bridgeCost:clamp(bridgeCost),distanceFit:clamp(distanceFit),abstractionFit:clamp(abstractionFit),frontierBand};
}
function clamp(n,lo=0,hi=1){return Math.max(lo,Math.min(hi,n))}

export async function aiEnrichCase(parsed) {
  if (!aiAvailable()) return {used:false, parsed, note:'local parser'};
  const instructions = [
    'You are the case interpretation worker inside Eureka.',
    'Use only the admitted anchors. Never invent an event, trait, motive, diagnosis, or personal history.',
    'Your task is not to advise. Identify the unresolved structure in the admitted material.',
    'Return JSON only with shape {"ahaTarget":"...","oldFrame":"...","unresolvedResidue":"...","relationalSignature":["snake_case_relation"],"relations":[{"type":"...","fromAnchorId":"X1","toAnchorId":"X2"}]}.',
    'Allowed ahaTarget values: STUCKNESS, EXPECTATION_VIOLATION, CONTRADICTION, REPEATED_FRICTION, SUCCESS_PATTERN, OPPORTUNITY, CAPABILITY_GAP, TRANSFER_GAP.',
    'The oldFrame must describe the current representation, not assert that it is true.',
    'The unresolvedResidue must name what the current representation leaves unexplained.',
    'Use at most 12 relationalSignature items. Prefer relations such as delayed_feedback, fixed_sequence, variable_state, threshold, switching_cost, dependency, information_gap, selection_effect, bottleneck, coordination, optionality, signal, transmission, evaluation, search, feedback, ambiguity, replacement_latency.',
    'Every relation endpoint must refer to an existing anchorId.'
  ].join('\n');
  try {
    const raw = await callResponse({
      instructions,
      input:JSON.stringify({anchors:parsed.anchors, currentOldFrame:parsed.oldFrame, currentResidue:parsed.unresolvedResidue, currentSignature:parsed.relationalSignature}),
      effort:'medium'
    });
    const data = parseJson(raw);
    const allowedTargets = new Set(['STUCKNESS','EXPECTATION_VIOLATION','CONTRADICTION','REPEATED_FRICTION','SUCCESS_PATTERN','OPPORTUNITY','CAPABILITY_GAP','TRANSFER_GAP']);
    const anchorIds = new Set(parsed.anchors.map(a=>a.anchorId));
    const signature = Array.isArray(data.relationalSignature)
      ? [...new Set(data.relationalSignature.map(x=>String(x).toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'')).filter(Boolean))].slice(0,12)
      : [];
    const relations = Array.isArray(data.relations) ? data.relations.filter(r=>anchorIds.has(r.fromAnchorId) && anchorIds.has(r.toAnchorId)).map(r=>({
      type:String(r.type||'RELATED_TO').toUpperCase().replace(/[^A-Z0-9_]/g,'_'),
      fromAnchorId:r.fromAnchorId,
      toAnchorId:r.toAnchorId,
      provenance:'MODEL_INFERENCE_FROM_ADMITTED_ANCHORS'
    })).slice(0,12) : [];
    const next = {
      ...parsed,
      ahaTarget:allowedTargets.has(data.ahaTarget) ? data.ahaTarget : parsed.ahaTarget,
      oldFrame:safeString(data.oldFrame, parsed.oldFrame),
      unresolvedResidue:safeString(data.unresolvedResidue, parsed.unresolvedResidue),
      relationalSignature:signature.length >= 2 ? [...new Set([...parsed.relationalSignature,...signature])].slice(0,14) : parsed.relationalSignature,
      relations:[...parsed.relations,...relations]
    };
    return {used:true, parsed:next, note:'model case interpretation admitted only validated anchor references'};
  } catch (error) {
    return {used:false, parsed, note:`case interpretation failed closed: ${error.message}`};
  }
}

export async function aiResearchEvidence(candidate) {
  if (!aiAvailable()) return {used:false,status:'UNVERIFIED',summary:'No model credentials are present, so the imported source model has not been checked against external sources.',sources:[]};
  const instructions = [
    'You are the evidence worker inside Eureka. You did not generate this analogy.',
    'Use web search to check only the imported source field mechanism. Do not evaluate whether it explains the user personally.',
    'Prefer primary, academic, institutional, or technically authoritative sources when available.',
    'Return exactly three plain text lines.',
    'Line 1: VERDICT: SUPPORTED or MIXED or CONTRADICTED or INSUFFICIENT',
    'Line 2: SCOPE: one sentence stating the scope actually supported',
    'Line 3: SUMMARY: one concise sentence explaining what the inspected sources support or fail to support.',
    'Do not claim that structural correspondence or personal fit is evidence.'
  ].join('\n');
  try {
    const data = await callResponseData({
      instructions,
      input:JSON.stringify({sourceName:candidate.sourceName, sourceMatrix:candidate.secondMatrix, mapping:candidate.mapping, boundary:candidate.boundary}),
      effort:'medium',
      tools:[{type:'web_search'}],
      include:['web_search_call.action.sources']
    });
    const text = extractText(data);
    const verdict = (text.match(/VERDICT:\s*(SUPPORTED|MIXED|CONTRADICTED|INSUFFICIENT)/i)?.[1] || 'INSUFFICIENT').toUpperCase();
    const scope = cleanEvidenceLine(text.match(/SCOPE:\s*([^\n]+)/i)?.[1] || 'The inspected material did not establish a stable scope.');
    const summary = cleanEvidenceLine(text.match(/SUMMARY:\s*([^\n]+)/i)?.[1] || 'The source mechanism remains insufficiently checked.');
    const sources = extractSources(data);
    return {used:true,status:verdict,scope,summary,sources,checkedAt:new Date().toISOString()};
  } catch (error) {
    return {used:false,status:'UNVERIFIED',summary:`Evidence inspection failed closed: ${error.message}`,sources:[]};
  }
}

async function callResponseData({instructions,input,effort='medium',tools,include}) {
  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
    instructions,
    input,
    reasoning:{effort}
  };
  if (tools) body.tools = tools;
  if (include) body.include = include;
  const res = await fetch(API_URL, {
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
    body:JSON.stringify(body)
  });
  if (!res.ok) {
    const detail = await res.text().catch(()=> '');
    throw new Error(`OpenAI ${res.status}${detail ? `: ${detail.slice(0,180)}` : ''}`);
  }
  return res.json();
}

function extractSources(data) {
  const out = [];
  const seen = new Set();
  for (const item of data.output || []) {
    if (item.type === 'web_search_call') {
      for (const src of item.action?.sources || []) pushSource(out,seen,src);
    }
    for (const part of item.content || []) {
      for (const ann of part.annotations || []) {
        if (ann.type === 'url_citation') pushSource(out,seen,ann);
      }
    }
  }
  return out.slice(0,8);
}
function pushSource(out,seen,src) {
  const url = String(src.url || '').trim();
  if (!url || seen.has(url)) return;
  seen.add(url);
  out.push({url,title:String(src.title || src.name || url).trim()});
}
function cleanEvidenceLine(text='') {
  return String(text).replace(/\s+/g,' ').replace(/【[^】]+】/g,'').trim();
}
