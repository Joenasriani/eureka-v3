const sentenceSplit = text => (text || '')
  .split(/(?:\n+|(?<=[.!?])\s+)/)
  .map(s => s.trim())
  .filter(Boolean);

export function parseCase(input) {
  const raw = {
    story: clean(input.story), goal: clean(input.goal), currentFrame: clean(input.currentFrame),
    tried: clean(input.tried), success: clean(input.success), familiarDomains: clean(input.familiarDomains),
    capability: clean(input.capability || 'understand'),
    reuseHistory: Boolean(input.reuseHistory)
  };
  const anchors = [];
  let n = 1;
  for (const [field,type] of [['story','OBSERVED_EPISODE'],['tried','PRIOR_ATTEMPT'],['success','SUCCESS_EPISODE'],['currentFrame','USER_INTERPRETATION'],['goal','USER_OBJECTIVE']]) {
    for (const text of sentenceSplit(raw[field])) {
      anchors.push({anchorId:`X${n++}`, type, field, text, provenance:'USER_PROVIDED'});
    }
  }

  const episodes = anchors.filter(a => ['OBSERVED_EPISODE','PRIOR_ATTEMPT','SUCCESS_EPISODE'].includes(a.type))
    .map((a,i) => ({episodeId:`EP${i+1}`, anchorIds:[a.anchorId], type:a.type, text:a.text}));

  const combined = [raw.story,raw.tried,raw.success,raw.goal,raw.currentFrame].join(' ').toLowerCase();
  const ahaTarget = classifyTarget(raw, combined);
  const relations = inferRelations(raw, episodes, combined);
  const relationalSignature = inferSignature(raw, combined);
  const stakes = classifyStakes(combined);

  return {
    raw, anchors, episodes, relations, ahaTarget, relationalSignature, stakes,
    oldFrame: raw.currentFrame || inferOldFrame(raw, ahaTarget),
    unresolvedResidue: inferResidue(raw, ahaTarget),
    admittedFacts: anchors.filter(a => a.type !== 'USER_INTERPRETATION').map(a => a.anchorId)
  };
}

function classifyTarget(raw, text) {
  if (raw.success && raw.story) return 'TRANSFER_GAP';
  if (/unexpected|surpris|weird|strange|odd|somehow|didn.t expect/.test(text)) return 'EXPECTATION_VIOLATION';
  if (/\bbut\b|\byet\b|however|although|even though/.test(text)) return 'CONTRADICTION';
  if (/keep |always|again|repeated|every time|constantly|often/.test(text)) return 'REPEATED_FRICTION';
  if (/worked|success|best|easy|effortless|naturally/.test(raw.story.toLowerCase())) return 'SUCCESS_PATTERN';
  if (/opportun|could|want to create|differentiate|grow|improve/.test(raw.goal.toLowerCase())) return 'OPPORTUNITY';
  return 'STUCKNESS';
}

function inferRelations(raw, episodes, text) {
  const out = [];
  if (raw.success && raw.story) out.push({type:'DIFFERENT_OUTCOME_FROM', from:episodes.find(e=>e.type==='SUCCESS_EPISODE')?.episodeId, to:episodes.find(e=>e.type==='OBSERVED_EPISODE')?.episodeId, provenance:'INPUT_SUPPORTED'});
  if (/keep |always|again|repeated|every time|often/.test(text)) out.push({type:'REPEATS', provenance:'INPUT_SUPPORTED'});
  if (/but|yet|however|although/.test(text)) out.push({type:'CONFLICTS_WITH_EXPECTATION', provenance:'INPUT_SUPPORTED'});
  return out.filter(r => r.from !== undefined || r.type === 'REPEATS' || r.type === 'CONFLICTS_WITH_EXPECTATION');
}

function inferSignature(raw, text) {
  const s = new Set();
  const add = (...xs) => xs.forEach(x=>s.add(x));
  if (/\b(schedule|calendar|plan|planning|deadline|tasks?|backlog|busy)\b/.test(text)) add('variable_arrivals','uncertain_duration','work_in_progress','feedback');
  if (raw.capability === 'start' || /\b(procrastinate|procrastination|avoid|avoiding|friction|overwhelmed|overwhelm)\b/.test(text)) add('threshold','startup_cost','friction');
  if (raw.capability === 'focus' || /\b(focus|distracted|distraction|switching|interrupt|interruptions)\b|many things/.test(text)) add('work_in_progress','switching_cost','congestion');
  if (raw.capability === 'finish' || /\b(finish|finishing|complete|completion|perfect|perfection|polish)\b|never done/.test(text)) add('evaluation','commitment','feedback','completion');
  if (['influence','sell','teach'].includes(raw.capability) || /\b(explain|explaining|persuade|persuasion|pitch|attention|presentation|audience|marketing|content)\b/.test(text)) add('attention','sequence','signal','information','next_action');
  if (/\b(share|sharing|viral|followers|distribution|community)\b|word of mouth/.test(text)) add('transmission','nodes','network_position');
  if (raw.capability === 'lead' || /\b(team|meeting|handoff|approval|coordination|roles?)\b/.test(text)) add('coordination','handoff','roles','bottleneck');
  if (/\b(automation|ai|review|verification|workflow)\b/.test(text)) add('bottleneck','verification','handoff','throughput');
  if (/\b(client|clients|revenue|supplier|suppliers|platform|dependency|income)\b/.test(text)) add('concentration','dependency','replacement_latency','failure_cost');
  if (raw.capability === 'decide' || /\b(decide|decision|choice|option|options|commit|commitment|uncertain|research|experiment)\b/.test(text)) add('uncertainty','optionality','exploration','information_value');
  if (raw.capability === 'learn' || /\b(learn|learning|remember|study|practice|teach|teaching)\b/.test(text)) add('feedback','retrieval','error','representation');
  if (/\b(brand|trust|reputation|credibility|price|status)\b/.test(text)) add('signal','receiver','interpretation');
  if (/\b(old|legacy|locked|habit|career|switch|switching)\b/.test(text)) add('history','switching_cost','future_constraints');
  if (s.size === 0) add('mismatch','feedback','hidden_variable');
  return [...s];
}

function classifyStakes(text) {
  if (/suicid|self harm|medical|diagnos|medication|legal case|lawsuit|criminal|investment|securities|surgery|weapon|emergency/.test(text)) return 'HIGH';
  if (/health|legal|financial|money|contract|safety|engineering/.test(text)) return 'MEDIUM';
  return 'LOW';
}

function inferOldFrame(raw, target) {
  const cap = raw.capability || 'understand';
  if (target === 'TRANSFER_GAP') return `The missing capability seems absent in the difficult context even though it appears elsewhere.`;
  if (cap === 'start') return 'Starting appears to require more motivation or discipline.';
  if (cap === 'influence' || cap === 'sell') return 'Better influence appears to require a stronger or more complete explanation.';
  if (cap === 'finish') return 'Finishing appears to require more persistence.';
  if (cap === 'focus') return 'Focus appears to require resisting more distractions.';
  return 'The visible problem is being treated as the main cause.';
}

function inferResidue(raw, target) {
  if (target === 'TRANSFER_GAP') return `Why does a capability appear in one admitted context but not the other?`;
  if (target === 'CONTRADICTION') return 'Which hidden condition lets both reported outcomes coexist?';
  if (target === 'EXPECTATION_VIOLATION') return 'What variable was missing from the expectation?';
  if (target === 'REPEATED_FRICTION') return 'What recurring relation is producing the same friction?';
  if (target === 'SUCCESS_PATTERN') return 'What relation is creating the success, and can it transfer?';
  return 'What representation would explain the friction better than the current frame?';
}

function clean(x='') { return String(x || '').replace(/\s+/g,' ').trim(); }
