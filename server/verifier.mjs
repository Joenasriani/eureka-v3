export function verifyCandidates(parsed, candidates) {
  const admitted = new Set(parsed.anchors.map(a=>a.anchorId));
  return candidates.map(candidate => {
    const anchorOk = candidate.momentAnchorIds.every(id=>admitted.has(id)) && candidate.storyReplay.every(x=>admitted.has(x.anchorId));
    const mappingCount = candidate.mapping.length;
    const structureOk = mappingCount >= 2 && candidate.diagnostics.structuralRetrievalScore >= .3;
    const reframeGain = hasMoveDelta(candidate) && candidate.eureka.length > 70;
    const genericity = genericityCheck(candidate, parsed);
    const personalOk = anchorOk && candidate.storyReplay.length >= 1 && !genericity.failed;
    const adversarial = adversarialReview(parsed, candidate);
    const survive = structureOk && personalOk && reframeGain && adversarial.verdict !== 'REJECT';

    const status = {
      ...candidate.status,
      structural: structureOk ? (adversarial.verdict === 'NARROW' ? 'STRUCTURALLY_NARROWED' : 'STRUCTURALLY_SUPPORTED') : 'STRUCTURALLY_WEAK',
      personalFit: personalOk ? 'TRACEABLY_ANCHORED' : 'PERSONAL_FIT_WEAK'
    };

    return {
      ...candidate,
      status,
      checks:{anchorOk, structureOk, reframeGain, genericity, adversarial},
      survive
    };
  });
}

export function adjudicate(parsed, verified) {
  if (parsed.stakes === 'HIGH') {
    return {
      outcome:'INSUFFICIENT_EVIDENCE_FOR_CONSEQUENTIAL_GUIDANCE',
      reason:'This case appears consequential enough that a personal analogy should not substitute for domain appropriate evidence or qualified review.',
      candidates:[]
    };
  }
  const survivors = verified.filter(x=>x.survive);
  if (!survivors.length) {
    return {
      outcome:'NO_HIGH_QUALITY_EUREKA_FOUND',
      reason:'The generated representations did not clear structural and personal fit gates without forcing the story.',
      candidates:[]
    };
  }
  return {outcome:'CANDIDATES_SURVIVED', reason:null, candidates:survivors.slice(0,3)};
}

function hasMoveDelta(c) {
  const a = normalize(c.eureka);
  const b = normalize(c.microTransfer);
  return b.length > 30 && a !== b;
}

function genericityCheck(candidate, parsed) {
  const storyTokens = meaningfulTokens(parsed.raw.story);
  const replay = normalize(candidate.storyReplay.map(x=>x.text).join(' '));
  const overlap = storyTokens.filter(t=>replay.includes(t));
  return {failed: overlap.length === 0, overlap:overlap.slice(0,8)};
}

function adversarialReview(parsed, c) {
  const warnings = [];
  if (!c.counterAnchor || c.counterAnchor.length < 25) warnings.push('missing_counter_anchor');
  if (!c.boundary || c.boundary.length < 25) warnings.push('missing_boundary');
  if (!c.competingFrame || c.competingFrame.length < 25) warnings.push('missing_competing_frame');
  if (c.sourceId !== 'intra_personal' && c.diagnostics.relationOverlap.length === 0) warnings.push('surface_only_mapping');
  if (parsed.raw.capability === 'influence' || parsed.raw.capability === 'sell') {
    if (!/voluntary|consent|autonomy|decept|withholding|receiver|audience/.test((c.boundary+' '+c.microTransfer).toLowerCase())) {
      warnings.push('influence_autonomy_boundary_missing');
    }
  }
  return {verdict:warnings.includes('surface_only_mapping') ? 'REJECT' : warnings.length ? 'NARROW' : 'SURVIVE', warnings};
}

function meaningfulTokens(text='') {
  return [...new Set(normalize(text).split(' ').filter(x=>x.length>4 && !STOP.has(x)))];
}
function normalize(x='') { return String(x).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
const STOP = new Set(['about','there','their','would','could','should','because','which','where','while','after','before','again','thing','things','really','trying','every','sometimes']);
