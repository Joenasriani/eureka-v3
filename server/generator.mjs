import { MATRICES, CONTRASTS, GENERATORS } from './library.mjs';
import { rankByFrontier } from './leveler.mjs';

const overlap = (a=[], b=[]) => {
  const bs = new Set(b);
  return a.filter(x => bs.has(x));
};

export function selectGenerators(parsed) {
  const triggers = new Set(parsed.relationalSignature);
  if (parsed.ahaTarget === 'CONTRADICTION') triggers.add('contradiction');
  if (parsed.ahaTarget === 'EXPECTATION_VIOLATION') triggers.add('missing_variable');
  if (parsed.ahaTarget === 'STUCKNESS') triggers.add('stuckness');
  triggers.add('structure');
  triggers.add('reframe');
  triggers.add('collision');
  const selected = GENERATORS.filter(g => g.triggers.some(t => triggers.has(t)));
  for (const id of ['G2','G3','G5']) {
    const g = GENERATORS.find(x=>x.id===id);
    if (!selected.some(x=>x.id===id)) selected.push(g);
  }
  return selected.slice(0, 8);
}

export function retrieveSources(parsed, calibration, profile, excludedSourceIds=[], experienceHistory=[]) {
  const excluded = new Set(excludedSourceIds);
  const text = [parsed.raw.story,parsed.raw.goal,parsed.raw.currentFrame,parsed.raw.tried,parsed.raw.success].join(' ').toLowerCase();
  const familiarText = [parsed.raw.familiarDomains, parsed.raw.success].join(' ').toLowerCase();
  const ranked = [];

  for (const m of MATRICES) {
    if (excluded.has(m.id)) continue;
    const relationOverlap = overlap(parsed.relationalSignature, m.relations);
    const keywordHits = m.keywords.filter(k => text.includes(k));
    const intentHit = m.intents.includes(parsed.raw.capability) ? 1 : 0;
    const structuralScore = Math.min(1, relationOverlap.length * .2 + keywordHits.length * .09 + intentHit * .18 + (relationOverlap.length ? .14 : 0));
    if (structuralScore < .18) continue;
    if (intentHit === 0 && keywordHits.length === 0 && relationOverlap.length < 2) continue;
    const familiar = isFamiliarSource(m, calibration.explicitDomains, familiarText);
    const pool = familiar ? 'P2' : 'P3';
    const frontier = rankByFrontier(m, structuralScore, calibration, familiar, profile.sourceStats || {});
    ranked.push({...m, pool, structuralScore, relationOverlap, keywordHits, familiar, ...frontier});
  }

  const p1 = excluded.has('intra_personal') ? null : buildIntraPersonal(parsed, calibration);
  const historyP1 = buildHistoricalPersonal(parsed, calibration, experienceHistory, excluded);
  const contrast = selectContrast(parsed);
  const remote = ranked.sort((a,b)=>b.score-a.score);

  const selected = [];
  if (p1) selected.push(p1);
  else if (historyP1) selected.push(historyP1);

  const familiarCandidate = remote.find(x=>x.pool==='P2');
  if (familiarCandidate && !selected.some(x=>x.id===familiarCandidate.id)) selected.push(familiarCandidate);

  const remoteCandidates = remote.filter(x=>x.pool==='P3');
  for (const item of remoteCandidates) {
    if (selected.length >= 4) break;
    if (!selected.some(x=>x.id===item.id)) selected.push(item);
  }

  if (selected.length < 3) {
    for (const item of remote) {
      if (selected.length >= 3) break;
      if (!selected.some(x=>x.id===item.id)) selected.push(item);
    }
  }

  return {selected:selected.slice(0,4), contrast, ranked:remote.slice(0,12)};
}


function isFamiliarSource(matrix, explicitDomains, familiarText) {
  const declared = explicitDomains.join(' ');
  const rules = {
    composition:['music','composition','audio','song','sound'],
    trailer:['film','movie','cinema','video','advertising','ads'],
    queueing:['operations','queueing','logistics','manufacturing'],
    feedback_control:['control systems','control theory','engineering'],
    search:['computer science','algorithms','machine learning','optimization'],
    activation:['physics','chemistry'],
    compression:['information theory','compression','coding'],
    network_diffusion:['network science','epidemiology','social networks'],
    bottleneck_shift:['operations','manufacturing','process engineering'],
    portfolio:['finance','portfolio','risk management'],
    option_value:['finance','options','strategy'],
    signaling:['economics','signaling','branding'],
    protocol:['networking','software','protocols','distributed systems'],
    selection:['statistics','research','epidemiology'],
    path_dependence:['economics','history','systems'],
    redundancy:['engineering','reliability','systems'],
    error_correction:['coding theory','communications','engineering'],
    niche:['ecology','biology','strategy']
  };
  const names = rules[matrix.id] || [];
  if (names.some(name => declared.includes(name))) return true;
  if (matrix.id === 'composition' && /compose|music|song|audio|melody/.test(familiarText)) return true;
  if (matrix.id === 'trailer' && /film|movie|trailer|advertising|video/.test(familiarText)) return true;
  return false;
}

function buildIntraPersonal(parsed, calibration) {
  const success = parsed.anchors.find(a => a.type === 'SUCCESS_EPISODE');
  const problem = parsed.anchors.find(a => a.type === 'OBSERVED_EPISODE');
  if (!success || !problem) return null;
  return {
    id:'intra_personal', name:'Your own successful mode', pool:'P1', distance:0.18, abstraction:0.16,
    structuralScore:.76, relationOverlap:['different_outcome','same_person'], keywordHits:[], familiar:true,
    score:.9, bridgeCost:.08, distanceFit:1-Math.abs(.18-calibration.targetDistance), abstractionFit:1-Math.abs(.16-calibration.abstractionPreference), frontierBand:'FAMILIAR',
    core:'The useful second matrix may already exist in another episode of your own life. The question is which condition lets the capability appear there but not here.',
    collisions:['same person ↔ different outcome','missing ability ↔ context dependent ability','failure story ↔ prior success'],
    move:'Borrow one operating condition from the successful episode and reproduce only that condition in the difficult episode.',
    boundary:'A shared person does not prove the same mechanism is operating in both situations. The contexts may differ in many unobserved ways.',
    counter:'The successful episode may rely on a skill, incentive, environment, or resource that cannot transfer.'
  };
}

function buildHistoricalPersonal(parsed, calibration, history, excluded) {
  if (!Array.isArray(history) || !history.length) return null;
  const current = new Set(parsed.relationalSignature);
  let best = null;
  for (const record of history) {
    if (!record?.caseId || excluded.has(`history_${record.caseId}`)) continue;
    if (record.input?.reuseHistory !== true) continue;
    const priorRelations = record.analysis?.relationalSignature || [];
    const relationOverlap = priorRelations.filter(r=>current.has(r));
    const capabilityHit = record.input?.capability === parsed.raw.capability ? 1 : 0;
    if (relationOverlap.length < 2 && !capabilityHit) continue;
    const sourceAnchor = (record.experienceGraph?.anchors || []).find(a=>a.type==='SUCCESS_EPISODE')
      || (record.experienceGraph?.anchors || []).find(a=>a.type==='OBSERVED_EPISODE');
    if (!sourceAnchor?.text) continue;
    const score = relationOverlap.length*.18 + capabilityHit*.16 + ((record.candidates||[]).some(c=>['CLICKS','STRONG_AHA'].includes(c.status?.recognition)) ? .08 : 0);
    if (!best || score > best.score) best = {record,sourceAnchor,relationOverlap,score};
  }
  if (!best) return null;
  const overlap = best.relationOverlap.length ? best.relationOverlap : parsed.relationalSignature.slice(0,2);
  return {
    id:`history_${best.record.caseId}`,
    name:'A prior episode you allowed',
    pool:'P1',
    distance:.24,
    abstraction:.18,
    structuralScore:Math.min(.88,.48+overlap.length*.1),
    relationOverlap:overlap,
    keywordHits:[],
    familiar:true,
    score:.86,
    bridgeCost:.1,
    distanceFit:1-Math.abs(.24-calibration.targetDistance),
    abstractionFit:1-Math.abs(.18-calibration.abstractionPreference),
    frontierBand:'FAMILIAR',
    relations:best.record.analysis?.relationalSignature || overlap,
    core:`In a stored case you allowed for reuse, you reported: "${best.sourceAnchor.text}". The source value is the relation pattern in that episode, not a claim about your personality.`,
    collisions:overlap.map(r=>`${humanize(r)} in this case ↔ ${humanize(r)} in the prior case`).slice(0,3),
    move:'Borrow one operating condition from the prior episode and test only that condition in the current case.',
    boundary:'A repeated pattern across your own cases can still have different causes. Shared experience is a source for comparison, not proof of one mechanism.',
    counter:'The prior episode may only look similar because the same words describe different causal structures.',
    historicalSource:{caseId:best.record.caseId,anchorId:best.sourceAnchor.anchorId,text:best.sourceAnchor.text}
  };
}

function selectContrast(parsed) {
  const s = new Set(parsed.relationalSignature);
  let best = null;
  let score = -1;
  for (const c of CONTRASTS) {
    const match = c.relations.filter(r=>s.has(r)).length;
    const extra = c.id==='fixed_plan_valid' && s.has('variable_arrivals') ? 1 : 0;
    const current = match + extra;
    if (current > score) { score=current; best=c; }
  }
  return best;
}

export function generateLocalCandidates(parsed, retrieval, calibration) {
  const moment = parsed.anchors.find(a=>a.type==='OBSERVED_EPISODE') || parsed.anchors[0];
  const success = parsed.anchors.find(a=>a.type==='SUCCESS_EPISODE');
  return retrieval.selected.map((source, index) => {
    const shared = source.relationOverlap?.length ? source.relationOverlap : parsed.relationalSignature.slice(0,2);
    const mapping = buildMapping(parsed, source, shared);
    const storyReplay = buildStoryReplay(parsed, source, success);
    const eureka = buildEureka(parsed, source, success);
    const visible = buildVisible(parsed, source);
    return {
      candidateId:`C${index+1}`,
      sourceId:source.id,
      sourcePool:source.pool,
      sourceName:source.name,
      sourceDistance:source.distance,
      frontierBand:source.frontierBand,
      bridgeCost:source.bridgeCost,
      generatorIds:source.id==='intra_personal' ? ['G2','G5','G8'] : ['G2','G3','G5'],
      momentAnchorIds:moment ? [moment.anchorId] : [],
      yourMoment:moment?.text || parsed.raw.story,
      gap:parsed.unresolvedResidue,
      secondMatrix:source.core,
      mapping,
      collision:source.collisions,
      eureka,
      storyReplay,
      whatBecomesVisible:visible,
      microTransfer:source.move,
      counterAnchor:source.counter,
      boundary:withInfluenceBoundary(parsed, source.boundary),
      competingFrame:retrieval.contrast?.text || defaultCompetingFrame(parsed),
      status:{
        evidence:'USER_PROVIDED_INPUT_ONLY',
        structural:'PENDING_REVIEW',
        personalFit:'PENDING_REVIEW',
        recognition:'UNKNOWN',
        transfer:'NOT_TESTED'
      },
      diagnostics:{
        structuralRetrievalScore:source.structuralScore,
        frontierScore:source.score,
        sourceFamiliar:source.familiar,
        relationOverlap:shared
      }
    };
  });
}

function buildMapping(parsed, source, shared) {
  if (source.id === 'intra_personal') {
    return [
      {target:'Difficult episode', source:'Successful episode', relation:'same person, different outcome'},
      {target:'Capability seems absent', source:'Capability is observed elsewhere', relation:'search for the condition that changed'},
      {target:parsed.oldFrame, source:'Cross episode contrast', relation:'tests whether the trait explanation is too broad'}
    ];
  }
  if (source.id.startsWith('history_')) {
    return shared.slice(0,3).map(r=>({
      target:humanize(r),
      source:humanize(r),
      relation:`same relation appears in the current case and a prior case you allowed: ${humanize(r)}`
    }));
  }
  const targetNames = humanizeRelations(parsed.relationalSignature);
  const sourceNames = humanizeRelations(source.relations);
  return shared.slice(0,3).map((r,i)=>({
    target:targetNames.find(x=>x.key===r)?.label || humanize(r),
    source:sourceNames.find(x=>x.key===r)?.label || humanize(r),
    relation:`shared relation: ${humanize(r)}`
  }));
}

function buildStoryReplay(parsed, source, success) {
  const first = parsed.anchors.find(a=>a.type==='OBSERVED_EPISODE');
  const lines = [];
  if (source.id === 'intra_personal') {
    if (first) lines.push({anchorId:first.anchorId, text:first.text, reinterpretation:intraProblemReinterpret(parsed)});
    if (success) lines.push({anchorId:success.anchorId, text:success.text, reinterpretation:intraSuccessReinterpret(parsed)});
    return lines;
  }
  if (source.id.startsWith('history_')) {
    if (first) lines.push({anchorId:first.anchorId,text:first.text,reinterpretation:`This episode shares ${source.relationOverlap.map(humanize).join(', ')} with a prior case you allowed. The candidate is that the repeated relation may matter more than the surface topic.`});
    return lines;
  }
  if (first) lines.push({anchorId:first.anchorId, text:first.text, reinterpretation:reinterpret(first.text, source)});
  if (success) lines.push({anchorId:success.anchorId, text:success.text, reinterpretation:reinterpret(success.text, source)});
  return lines;
}

function reinterpret(text, source) {
  switch(source.id) {
    case 'queueing': return 'The episode can be read as a flow problem: the plan may be losing contact with a workload whose state keeps changing.';
    case 'feedback_control': return 'The episode can be read as a feedback mismatch: action is being chosen too far ahead of the information needed to correct it.';
    case 'composition': return 'The episode can be read as premature evaluation: judgment is happening before a cheap artifact exists to react to.';
    case 'activation': return 'The episode can be read as an entry threshold problem rather than uniform difficulty across the whole task.';
    case 'search': return 'The episode can be read as a search problem: commitment may be happening before enough discriminating information has been collected.';
    case 'trailer': return 'The episode can be read as a sequencing problem: the message may be trying to finish the argument before it earns the next voluntary step.';
    case 'compression': return 'The episode can be read as a representation problem: extra detail may be obscuring the structure needed for the next inference.';
    case 'network_diffusion': return 'The episode can be read as a propagation problem: reach may not be producing a reason for recipients to carry the message onward.';
    case 'bottleneck_shift': return 'The episode can be read as a shifted constraint: improving one stage may have moved waiting and supervision somewhere else.';
    case 'portfolio': return 'The episode can be read as a dependency structure: the count of alternatives may matter less than replacement time and failure cost.';
    case 'option_value': return 'The episode can be read as an option problem: the next step may be valuable because of what it lets you learn before commitment.';
    case 'signaling': return 'The episode can be read from the receiver side: what is observable may imply something different from what you intended to communicate.';
    case 'protocol': return 'The episode can be read as an interaction rule problem rather than simply a people or communication quality problem.';
    case 'selection': return 'The episode can be read as a visibility problem: the cases you can see may have passed through a filter that changes the apparent pattern.';
    case 'path_dependence': return 'The episode can be read as inherited structure: previous choices may be shaping what now feels like preference or necessity.';
    case 'redundancy': return 'The episode can be read as an efficiency versus resilience trade: removing spare capacity may have increased the cost of one failure.';
    case 'error_correction': return 'The episode can be read as a detection problem: the system may need earlier correction signals rather than an expectation of error free execution.';
    case 'niche': return 'The episode can be read as a fit problem: the environment may be suppressing a capability that becomes valuable under different conditions.';
    default: return `This episode may look different when interpreted through ${source.name}.`;
  }
}

function buildEureka(parsed, source, success) {
  if (source.id === 'intra_personal' && success) return intraEureka(parsed);
  if (source.id.startsWith('history_')) return `A prior case you allowed may contain the closer second matrix. The current episode and that earlier episode share ${source.relationOverlap.map(humanize).join(', ')}. The candidate is not that you are the same person in both. It is that one operating condition may be transferable across the two cases.`;
  const cap = parsed.raw.capability;
  switch(source.id) {
    case 'queueing': return 'The problem may not be failure to follow the plan. The plan may be the wrong control form for work whose state changes while you are doing it.';
    case 'feedback_control': return 'More discipline may be less important than shortening the distance between action and correction.';
    case 'composition': return 'The capability may appear after something exists to react to, so requiring confidence before a first artifact reverses the order that already works for you.';
    case 'activation': return 'The hard part may be crossing the entry condition, not sustaining the entire task. Treating both as one problem hides where the friction is concentrated.';
    case 'search': return 'You may be trying to choose the best option before collecting the information that would make best knowable.';
    case 'trailer': return 'The first communication may not need to win agreement. It may only need to earn the next voluntary step in attention.';
    case 'compression': return 'The communication problem may be excess representation rather than insufficient explanation. More detail can reduce the visibility of the structure that matters.';
    case 'network_diffusion': return 'The useful unit of influence may not be the audience member reached. It may be the handoff from one person to the next.';
    case 'bottleneck_shift': return 'The improvement may have worked locally and still failed globally because it moved the constraint instead of removing it.';
    case 'portfolio': return 'The visible concentration may not be the decisive risk variable. Replacement latency and consequence of loss may be the structure that changes the decision.';
    case 'option_value': return 'The next move can be valuable because it preserves future choices while buying information, not because it is the final answer.';
    case 'signaling': return 'The audience may be responding to what your behavior implies, not to what you intended the behavior to say.';
    case 'protocol': return 'The recurring failure may belong to the interaction rules between people rather than to the people themselves.';
    case 'selection': return 'The pattern you see may partly describe who became visible, not only what is true of the whole population you care about.';
    case 'path_dependence': return 'What feels like the best present choice may partly be the residue of earlier choices that changed the cost of switching.';
    case 'redundancy': return 'What looks like waste may sometimes be purchased resilience. Efficiency and fragility can rise together.';
    case 'error_correction': return 'Reliability may come from detecting mistakes sooner rather than from expecting yourself or the system to stop making them.';
    case 'niche': return 'The question may be less how to become universally stronger and more where your existing unusual capability becomes unusually valuable.';
    default: return `The ${source.name} representation may explain the unresolved part of the case better than the current frame.`;
  }
}

function buildVisible(parsed, source) {
  if (source.id === 'intra_personal') return intraVisible(parsed);
  if (source.id.startsWith('history_')) return 'A new move becomes available: reproduce one condition from the prior episode while changing as little else as possible, then compare the result.';
  return `A different intervention becomes available from this representation. ${source.move}`;
}

function withInfluenceBoundary(parsed, boundary) {
  if (!['influence','sell','negotiate','lead'].includes(parsed.raw.capability)) return boundary;
  if (/voluntary|consent|autonomy|decept|withholding|receiver|audience/i.test(boundary)) return boundary;
  return `${boundary} For influence use, the transfer must preserve meaningful autonomy and must not depend on deception or removal of informed choice.`;
}


function intraEureka(parsed) {
  const text = `${parsed.raw.story} ${parsed.raw.success}`.toLowerCase();
  if (['finish','focus','prioritize'].includes(parsed.raw.capability) && /schedule|plan|calendar/.test(text) && /react|next move|what i just|what i made|improv/.test(text)) {
    return 'Your story weakens the broad discipline explanation. The same person sustains work when the next action is chosen from fresh feedback, but struggles when the sequence is fixed before the day reveals its actual state. The variable worth testing is how the next move gets chosen.';
  }
  if (['influence','sell','teach'].includes(parsed.raw.capability) && /detail|explain|pitch|information/.test(text) && /question|ask|example|show/.test(text)) {
    return 'Your story contains its own counterexample to the idea that more explanation creates more influence. The interaction improves when the other person begins pulling for the next piece of information. The variable worth testing is who is generating the next step in the conversation.';
  }
  if (parsed.raw.capability === 'start' && /tiny|small|open|first|change/.test(parsed.raw.success.toLowerCase())) {
    return 'Your story weakens the claim that the capability to start is missing. In the successful context, the first move can be small and local before the whole session is decided. The variable worth testing is the shape of entry, not the amount of motivation you possess.';
  }
  return 'The missing capability may not be missing. Your own story shows it appearing elsewhere. The useful question is what condition changes between the two episodes, not how to force more of the trait you think you lack.';
}

function intraProblemReinterpret(parsed) {
  const text = `${parsed.raw.story} ${parsed.raw.success}`.toLowerCase();
  if (['finish','focus','prioritize'].includes(parsed.raw.capability) && /schedule|plan|calendar/.test(text)) return 'This episode may not show a general inability to persist. It shows persistence failing under a mode where later actions are committed before the day reveals new information.';
  if (['influence','sell','teach'].includes(parsed.raw.capability) && /detail|explain|pitch|information/.test(text)) return 'This episode may not show weak persuasiveness. It shows the interaction fading while one side keeps supplying information without evidence that the other side wants the next piece.';
  if (parsed.raw.capability === 'start') return 'This episode may not show a general inability to begin. It shows beginning failing under the entry conditions present in this context.';
  return 'This episode can be treated as one condition of an accidental comparison rather than as proof of a broad personal trait.';
}

function intraSuccessReinterpret(parsed) {
  if (['finish','focus','prioritize'].includes(parsed.raw.capability)) return 'This episode shows sustained action occurring when the next move can be selected from what just happened, giving a concrete condition to compare with the difficult episode.';
  if (['influence','sell','teach'].includes(parsed.raw.capability)) return 'This episode shows the interaction becoming active when the other person starts requesting information, giving a concrete contrast with the detailed explanation episode.';
  if (parsed.raw.capability === 'start') return 'This episode shows starting occurring before the whole session is specified, which gives a concrete entry condition to compare rather than a different identity label.';
  return 'This episode is evidence that the capability is not uniformly absent. It gives a condition contrast to inspect.';
}

function intraVisible(parsed) {
  if (['finish','focus','prioritize'].includes(parsed.raw.capability)) return 'Instead of asking how to become more disciplined, test whether choosing the next move from current state preserves execution better than choosing the whole sequence in advance.';
  if (['influence','sell','teach'].includes(parsed.raw.capability)) return 'Instead of adding explanation, test for the smallest truthful example that causes the other person to ask for the next piece voluntarily.';
  if (parsed.raw.capability === 'start') return 'Instead of increasing motivation first, reproduce the successful entry condition: one small local change before deciding what the whole session must become.';
  return 'A new move appears: transfer a condition from the successful episode rather than turning one difficult context into a global label about yourself.';
}

function defaultCompetingFrame(parsed) {
  if (parsed.raw.currentFrame) return `Your original frame may still be right: ${parsed.raw.currentFrame}`;
  return 'The visible problem may still be the main cause. The new representation should be treated as a candidate until it discriminates better.';
}

function humanize(x) { return x.replaceAll('_',' '); }
function humanizeRelations(list) { return list.map(key=>({key,label:humanize(key)})); }
