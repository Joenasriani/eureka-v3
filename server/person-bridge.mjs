export function personHistoryRecords(personMaterial={}) {
  const stories = Array.isArray(personMaterial.stories) ? personMaterial.stories : [];
  return stories.map((story,index)=>({
    caseId:`person_${String(story.id || index+1).replace(/[^a-zA-Z0-9_]/g,'').slice(0,36)}`,
    input:{reuseHistory:true,capability:''},
    analysis:{relationalSignature:inferRelations(story)},
    experienceGraph:{anchors:[{anchorId:`PX${index+1}`,type:'SUCCESS_EPISODE',text:String(story.text || '').trim()}]},
    candidates:[],
    personContextSource:{sourceRef:story.sourceRef || '',status:story.status || 'EXPLICIT_OR_REPORTED'}
  })).filter(x=>x.experienceGraph.anchors[0].text.length>20 && x.analysis.relationalSignature.length>=2);
}

export function markKnownSources(retrieval, knownConcepts=[]) {
  const knownText = knownConcepts.join(' ').toLowerCase();
  if (!knownText) return retrieval;
  const scored = (retrieval.ranked || []).map(source=>{
    const probes=[source.id?.replaceAll('_',' '),source.name,...(source.keywords||[])].filter(Boolean).map(x=>String(x).toLowerCase());
    const known=probes.some(x=>x.length>3 && knownText.includes(x));
    return known ? {...source,known:true,score:(source.score||0)-.16} : {...source,known:false};
  }).sort((a,b)=>(b.score||0)-(a.score||0));
  const p1=(retrieval.selected||[]).find(x=>x.pool==='P1');
  const selected=p1?[p1]:[];
  const p2=scored.find(x=>x.pool==='P2');
  if(p2&&!selected.some(x=>x.id===p2.id)) selected.push(p2);
  for(const s of scored.filter(x=>x.pool==='P3')){
    if(selected.length>=4) break;
    if(!selected.some(x=>x.id===s.id)) selected.push(s);
  }
  for(const s of scored){
    if(selected.length>=3) break;
    if(!selected.some(x=>x.id===s.id)) selected.push(s);
  }
  return {...retrieval,ranked:scored,selected:selected.slice(0,4)};
}

function inferRelations(item={}) {
  const text=[item.text,...(item.tags||[])].join(' ').toLowerCase();
  const s=new Set(), add=(...xs)=>xs.forEach(x=>s.add(x));
  if(/schedule|calendar|plan|deadline|backlog|busy|tasks?/.test(text)) add('variable_arrivals','uncertain_duration','work_in_progress','feedback');
  if(/start|procrast|avoid|friction|overwhelm|first step/.test(text)) add('threshold','startup_cost','friction');
  if(/focus|distract|interrupt|switching|many things/.test(text)) add('work_in_progress','switching_cost','congestion');
  if(/finish|complete|perfect|polish|done/.test(text)) add('evaluation','commitment','feedback','completion');
  if(/explain|persuad|pitch|attention|presentation|audience|marketing|content|question/.test(text)) add('attention','sequence','signal','information','next_action');
  if(/share|viral|distribution|community|followers|word of mouth/.test(text)) add('transmission','nodes','network_position');
  if(/team|meeting|handoff|approval|coordination|roles?/.test(text)) add('coordination','handoff','roles','bottleneck');
  if(/automation|ai|review|verification|workflow/.test(text)) add('bottleneck','verification','handoff','throughput');
  if(/client|revenue|supplier|platform|dependency|income/.test(text)) add('concentration','dependency','replacement_latency','failure_cost');
  if(/decid|choice|option|commit|uncertain|research|experiment/.test(text)) add('uncertainty','optionality','exploration','information_value');
  if(/learn|remember|study|practice|teach/.test(text)) add('feedback','retrieval','error','representation');
  if(/brand|trust|reputation|credibility|price|status/.test(text)) add('signal','receiver','interpretation');
  if(/old|legacy|locked|habit|career|switch/.test(text)) add('history','switching_cost','future_constraints');
  return [...s];
}
