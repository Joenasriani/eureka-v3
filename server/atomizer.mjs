export function atomizeCandidates(parsed, candidates) {
  return candidates.map(candidate => {
    const userClaims = candidate.storyReplay.map((r,i)=>({
      claimId:`${candidate.candidateId}.U${i+1}`,
      type:'USER_PROVIDED_EXPERIENCE',
      text:r.text,
      provenance:r.anchorId,
      evidenceStatus:'USER_PROVIDED'
    }));
    const sourceClaim = {
      claimId:`${candidate.candidateId}.S1`,
      type:candidate.diagnostics.aiDiscovered ? 'GENERATED_SOURCE_MODEL' : candidate.sourcePool==='P1' ? 'USER_EXPERIENCE_CONTRAST' : 'FRAMEWORK_HEURISTIC_SOURCE_MODEL',
      text:candidate.secondMatrix,
      provenance:candidate.sourceId,
      evidenceStatus:candidate.sourcePool==='P1' ? 'USER_PROVIDED' : 'UNVERIFIED_EXTERNAL_MODEL'
    };
    const inference = {
      claimId:`${candidate.candidateId}.I1`,
      type:'EUREKA_INFERENCE',
      text:candidate.eureka,
      provenance:`mapping:${candidate.candidateId}`,
      evidenceStatus:'INFERENCE_NOT_FACT'
    };
    const action = {
      claimId:`${candidate.candidateId}.A1`,
      type:'BOUNDED_MICRO_TRANSFER',
      text:candidate.microTransfer,
      provenance:`candidate:${candidate.candidateId}`,
      evidenceStatus:'NOT_TESTED'
    };
    return {
      ...candidate,
      claimAtoms:[...userClaims,sourceClaim,inference,action],
      status:{
        ...candidate.status,
        evidence:candidate.sourcePool==='P1' ? 'USER_PROVIDED_EXPERIENCE' : 'SOURCE_MODEL_UNVERIFIED'
      }
    };
  });
}
