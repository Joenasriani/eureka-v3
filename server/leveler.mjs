const clamp = (n, lo=0, hi=1) => Math.max(lo, Math.min(hi, n));

export function deriveCalibration(caseInput, profile) {
  const text = [caseInput.story, caseInput.goal, caseInput.currentFrame, caseInput.tried, caseInput.success].join(' ').toLowerCase();
  const explicitDomains = splitDomains(caseInput.familiarDomains);
  const conceptualMarkers = ['feedback','system','constraint','tradeoff','trade-off','bottleneck','signal','incentive','probability','uncertainty','network','optimization','iteration','hypothesis','causal','correlation','explore','exploit'];
  const markerCount = conceptualMarkers.filter(x => text.includes(x)).length;

  const caseAbstraction = clamp(0.35 + markerCount * 0.055);
  const targetDistance = clamp(profile.targetDistance ?? 0.55);
  const abstractionPreference = clamp((profile.abstractionPreference ?? 0.5) * 0.7 + caseAbstraction * 0.3);
  const bridgeTolerance = clamp(profile.bridgeTolerance ?? 0.55);
  const noveltyFloor = clamp(profile.noveltyFloor ?? 0.45);

  return {
    targetDistance,
    abstractionPreference,
    bridgeTolerance,
    noveltyFloor,
    explicitDomains,
    caseAbstraction,
    label: distanceLabel(targetDistance)
  };
}

export function rankByFrontier(matrix, structuralScore, calibration, familiar=false, sourceStats={}) {
  const distanceGap = Math.abs(matrix.distance - calibration.targetDistance);
  const distanceFit = 1 - distanceGap;
  const abstractionGap = Math.abs(matrix.abstraction - calibration.abstractionPreference);
  const abstractionFit = 1 - abstractionGap;
  const bridgeCost = familiar ? Math.max(0.12, matrix.distance * 0.42) : matrix.distance * (0.72 + matrix.abstraction * 0.22);
  const bridgeFit = 1 - Math.max(0, bridgeCost - calibration.bridgeTolerance);
  const stats = sourceStats[matrix.id] || {};
  const recognitionPrior = clamp((stats.clicks || 0) * 0.03 + (stats.strong || 0) * 0.05 - (stats.known || 0) * 0.05 - (stats.miss || 0) * 0.06, -0.2, 0.2);
  const noveltyPenalty = matrix.distance < calibration.noveltyFloor && !familiar ? 0.12 : 0;

  return {
    score: structuralScore * 0.52 + distanceFit * 0.18 + abstractionFit * 0.1 + bridgeFit * 0.1 + recognitionPrior - noveltyPenalty,
    bridgeCost: clamp(bridgeCost),
    distanceFit: clamp(distanceFit),
    abstractionFit: clamp(abstractionFit),
    frontierBand: band(matrix.distance, calibration.targetDistance)
  };
}

export function updateProfile(profile, feedback) {
  const next = structuredClone(profile);
  const reason = feedback.reason || '';
  const recognition = feedback.recognition || '';
  const sourceId = feedback.sourceId;

  if (recognition === 'KNOWN_ALREADY' || reason === 'TOO_OBVIOUS' || reason === 'KNOWN_CONCEPT') {
    next.targetDistance = clamp((next.targetDistance ?? .55) + .08);
    next.noveltyFloor = clamp((next.noveltyFloor ?? .45) + .06);
  }
  if (reason === 'TOO_REMOTE') {
    next.targetDistance = clamp((next.targetDistance ?? .55) - .08);
    next.bridgeTolerance = clamp((next.bridgeTolerance ?? .55) - .03);
  }
  if (reason === 'TOO_ABSTRACT' || reason === 'TOO_COMPLEX') {
    next.abstractionPreference = clamp((next.abstractionPreference ?? .5) - .08);
    next.bridgeTolerance = clamp((next.bridgeTolerance ?? .55) - .04);
  }
  if (reason === 'TOO_SIMPLE') {
    next.abstractionPreference = clamp((next.abstractionPreference ?? .5) + .08);
  }
  if (recognition === 'CLICKS' || recognition === 'STRONG_AHA') {
    if (typeof feedback.matrixDistance === 'number') {
      next.targetDistance = clamp((next.targetDistance ?? .55) * .75 + feedback.matrixDistance * .25);
    }
  }

  if (sourceId) {
    next.sourceStats ||= {};
    next.sourceStats[sourceId] ||= {clicks:0,strong:0,known:0,miss:0,transfers:0};
    if (recognition === 'CLICKS') next.sourceStats[sourceId].clicks += 1;
    if (recognition === 'STRONG_AHA') next.sourceStats[sourceId].strong += 1;
    if (recognition === 'KNOWN_ALREADY') next.sourceStats[sourceId].known += 1;
    if (recognition === 'DOES_NOT_FIT') next.sourceStats[sourceId].miss += 1;
    if (feedback.transfer === 'TRANSFER_HELPED') next.sourceStats[sourceId].transfers += 1;
  }

  return next;
}

export function splitDomains(value='') {
  return [...new Set(value.toLowerCase().split(/[,;/\n]+/).map(x=>x.trim()).filter(Boolean))];
}

function distanceLabel(n) {
  if (n < .28) return 'near';
  if (n < .48) return 'familiar stretch';
  if (n < .68) return 'productive surprise';
  if (n < .84) return 'far';
  return 'very far';
}

function band(sourceDistance, target) {
  const d = sourceDistance - target;
  if (d < -.25) return 'TOO_CLOSE';
  if (d < -.08) return 'FAMILIAR';
  if (d <= .12) return 'PRODUCTIVE_SURPRISE';
  if (d <= .28) return 'BRIDGEABLE_CHALLENGE';
  return 'TOO_REMOTE';
}
