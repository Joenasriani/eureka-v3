import crypto from 'node:crypto';

const LIST_FIELDS = [
  'roles','organizations','projects','skills','tools','knowledgeDomains','familiarWorlds','knownConcepts',
  'goals','constraints','preferences','workPatterns','successPatterns','frictionPatterns','decisionPatterns',
  'communicationPatterns','learningPatterns','creativePractices','openLoops','opportunities','stories','phrases',
  'contradictions','artifacts','timeline','languages','locations'
];

export function emptyPersonContext() {
  return {
    version:1,
    updatedAt:null,
    source:'NONE',
    rawImport:'',
    directNotes:'',
    identity:{name:'',preferredName:'',summary:''},
    roles:[],organizations:[],projects:[],skills:[],tools:[],knowledgeDomains:[],familiarWorlds:[],knownConcepts:[],
    goals:[],constraints:[],preferences:[],workPatterns:[],successPatterns:[],frictionPatterns:[],decisionPatterns:[],
    communicationPatterns:[],learningPatterns:[],creativePractices:[],openLoops:[],opportunities:[],stories:[],phrases:[],
    contradictions:[],artifacts:[],timeline:[],languages:[],locations:[],
    candidateInferences:[],accessAudit:{available:[],notAvailable:[]},
    permissions:{useForPersonalization:true,useStoriesForP1:true,useCandidateInferences:false},
    provenance:{kind:'USER_PASTED_CONTEXT',note:'Imported person context may guide retrieval and personalization. It is not external evidence for a current case.'}
  };
}

export function parsePersonImport(rawText, directNotes='', permissions={}) {
  const base = emptyPersonContext();
  const raw = clean(rawText);
  base.rawImport = raw;
  base.directNotes = clean(directNotes);
  base.updatedAt = new Date().toISOString();
  base.source = raw ? 'CHATGPT_PROFILE_EXPORT' : (base.directNotes ? 'DIRECT_NOTES' : 'NONE');
  base.permissions = {...base.permissions,...normalizePermissions(permissions)};

  if (!raw) {
    if (base.directNotes) {
      base.identity.summary = base.directNotes;
    }
    return base;
  }

  const data = parseJsonObject(raw);
  if (!data) {
    base.identity.summary = raw.slice(0,1200);
    base.stories = [{id:crypto.randomUUID(),text:raw,tags:[],provenance:'USER_PASTED_UNSTRUCTURED'}];
    return base;
  }

  const root = data.person || data.profile || data;
  const identity = root.identity || root.person_identity || {};
  base.identity = {
    name: firstText(identity.name, root.name),
    preferredName:firstText(identity.preferred_name, identity.preferredName, root.preferredName),
    summary:firstText(root.biography_summary, root.biographySummary, identity.summary, root.summary)
  };

  mapList(base,'roles',root.roles,root.work?.roles,root.current_roles,root.currentRoles);
  mapList(base,'organizations',root.organizations,root.work?.organizations,root.companies);
  mapList(base,'projects',root.projects,root.work?.projects,root.current_projects,root.currentProjects);
  mapList(base,'skills',root.skills,root.capabilities);
  mapList(base,'tools',root.tools,root.software,root.platforms);
  mapList(base,'knowledgeDomains',root.knowledge_domains,root.knowledgeDomains,root.domains);
  mapList(base,'familiarWorlds',root.familiar_worlds,root.familiarWorlds,root.source_palette,root.sourcePalette);
  mapList(base,'knownConcepts',root.known_concepts,root.knownConcepts,root.mental_models,root.mentalModels);
  mapList(base,'goals',root.goals,root.current_goals,root.currentGoals);
  mapList(base,'constraints',root.constraints,root.limitations);
  mapList(base,'preferences',root.preferences,root.likes_dislikes,root.likesDislikes);
  mapList(base,'workPatterns',root.work_patterns,root.workPatterns);
  mapList(base,'successPatterns',root.success_patterns,root.successPatterns);
  mapList(base,'frictionPatterns',root.friction_patterns,root.frictionPatterns,root.recurring_problems,root.recurringProblems);
  mapList(base,'decisionPatterns',root.decision_patterns,root.decisionPatterns);
  mapList(base,'communicationPatterns',root.communication_patterns,root.communicationPatterns);
  mapList(base,'learningPatterns',root.learning_patterns,root.learningPatterns);
  mapList(base,'creativePractices',root.creative_practices,root.creativePractices);
  mapList(base,'openLoops',root.open_loops,root.openLoops);
  mapList(base,'opportunities',root.opportunities);
  mapList(base,'stories',root.stories_and_episodes,root.stories,root.episodes);
  mapList(base,'phrases',root.repeated_phrases_metaphors,root.repeatedPhrasesMetaphors,root.phrases,root.metaphors);
  mapList(base,'contradictions',root.contradictions,root.tensions);
  mapList(base,'artifacts',root.artifacts,root.outputs,root.portfolio_items);
  mapList(base,'timeline',root.timeline,root.chronology,root.career_history,root.careerHistory);
  mapList(base,'languages',root.languages);
  mapList(base,'locations',root.locations);
  base.candidateInferences = normalizeItems(root.candidate_inferences || root.candidateInferences || root.inferences || []);
  const audit = root.access_audit || root.accessAudit || root.accessibility_audit || {};
  base.accessAudit = {
    available:normalizeItems(audit.available || audit.sources_used || audit.sourcesUsed || []),
    notAvailable:normalizeItems(audit.not_available || audit.notAvailable || audit.unavailable || [])
  };

  return base;
}

export function personSearchMaterial(person) {
  if (!person?.permissions?.useForPersonalization) return {text:'',domains:[],knownConcepts:[],stories:[]};
  const domains = uniqueTexts([...(person.familiarWorlds||[]),...(person.knowledgeDomains||[]),...(person.skills||[])]).slice(0,80);
  const knownConcepts = uniqueTexts(person.knownConcepts||[]).slice(0,100);
  const stories = person.permissions?.useStoriesForP1 ? (person.stories||[]).map(normalizeStory).filter(x=>x.text.length>20).slice(0,80) : [];
  const text = [
    person.identity?.summary, person.directNotes,
    ...uniqueTexts(person.roles||[]),...uniqueTexts(person.projects||[]),...uniqueTexts(person.goals||[]),
    ...uniqueTexts(person.successPatterns||[]),...uniqueTexts(person.frictionPatterns||[]),...uniqueTexts(person.workPatterns||[])
  ].filter(Boolean).join(' ');
  return {text,domains,knownConcepts,stories};
}

function mapList(base,key,...values) {
  base[key] = normalizeItems(values.flatMap(v=>Array.isArray(v)?v:(v==null?[]:[v]))).slice(0,120);
}
function normalizeItems(items) {
  return items.map((x,i)=>normalizeItem(x,i)).filter(x=>x.text);
}
function normalizeItem(x,i) {
  if (typeof x === 'string' || typeof x === 'number') return {id:`I${i+1}`,text:clean(x),status:'EXPLICIT_OR_REPORTED',sourceRef:'',date:'',confidence:'UNKNOWN',tags:[]};
  if (!x || typeof x !== 'object') return {id:`I${i+1}`,text:'',status:'UNKNOWN',sourceRef:'',date:'',confidence:'UNKNOWN',tags:[]};
  const text = firstText(x.text,x.name,x.title,x.description,x.event,x.project,x.role,x.skill,x.domain,x.value,x.item,x.summary,x.episode,x.pattern);
  return {
    id:String(x.id || `I${i+1}`),
    text,
    status:String(x.status || x.provenance_status || x.provenanceStatus || 'EXPLICIT_OR_REPORTED').toUpperCase(),
    sourceRef:firstText(x.source_ref,x.sourceRef,x.source,x.chat,x.conversation),
    date:firstText(x.date,x.period,x.when),
    confidence:firstText(x.confidence,x.certainty,'UNKNOWN').toUpperCase(),
    tags:Array.isArray(x.tags)?x.tags.map(v=>clean(v)).filter(Boolean).slice(0,12):[]
  };
}
function normalizeStory(item,i=0) {
  const x = normalizeItem(item,i);
  return {...x,id:x.id || `S${i+1}`};
}
function uniqueTexts(items) {
  const seen=new Set(), out=[];
  for (const x of items) {
    const text=typeof x==='string'?clean(x):clean(x?.text);
    if (!text) continue;
    const key=text.toLowerCase(); if (seen.has(key)) continue; seen.add(key); out.push(text);
  }
  return out;
}
function normalizePermissions(p) {
  return {
    useForPersonalization:p.useForPersonalization !== false,
    useStoriesForP1:p.useStoriesForP1 !== false,
    useCandidateInferences:p.useCandidateInferences === true
  };
}
function parseJsonObject(text) {
  const cleaned=String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start=cleaned.indexOf('{'), end=cleaned.lastIndexOf('}');
  if (start>=0 && end>start) { try { return JSON.parse(cleaned.slice(start,end+1)); } catch {} }
  return null;
}
function firstText(...xs) { for (const x of xs) { const c=clean(x); if (c) return c; } return ''; }
function clean(x='') { if (x && typeof x === 'object') return ''; return String(x || '').replace(/\s+/g,' ').trim(); }
