const state = { current:null, profile:null, cases:[], pendingRecognition:new Map(), pendingReason:new Map(), pendingTransfer:new Map() };

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const examples = {
  productivity:{
    story:'I make detailed schedules for the day, then I stop following them as soon as one task takes longer or something unexpected arrives. I keep rebuilding the schedule and feel behind. A short unordered list often works better, which makes no sense to me.',
    goal:'Finish important work without spending the day repairing the plan.',
    currentFrame:'I assume I am inconsistent and need more discipline.',
    tried:'I tried stricter time blocks, more reminders, and planning the night before. I still abandon the plan when the day changes.',
    success:'When I compose music, I can work for hours. I usually react to what I just made and decide the next move from there.',
    capability:'finish', familiarDomains:'music, design, production'
  },
  influence:{
    story:'When I explain my service in detail, people become passive and the conversation fades. When I show one short before and after example and stop, they start asking questions. I keep thinking the detailed version should be more convincing.',
    goal:'Make people understand the value quickly without pressuring them.',
    currentFrame:'I assume people need more information before they can care.',
    tried:'I added more features, proof points, and explanation to the pitch. Attention usually dropped.',
    success:'The best conversations start after a small visual example. The other person asks for the details instead of me pushing them.',
    capability:'influence', familiarDomains:'film, advertising, visual design'
  },
  transfer:{
    story:'I avoid starting administrative work even when it is simple. I can stare at it for an hour. The strange part is that I start music or visual experiments immediately even when those projects are much harder.',
    goal:'Start necessary work with less friction.',
    currentFrame:'I assume I dislike boring work and therefore lack motivation for it.',
    tried:'I tried promising myself rewards after finishing and making strict task lists. I still delay the first step.',
    success:'With music I open the project and make a tiny change without deciding what the whole session must accomplish. Once something changes, the next move is easier to see.',
    capability:'start', familiarDomains:'music, 3D, visual design'
  }
};

boot();

async function boot() {
  bindNav();
  bindForm();
  bindCalibrationControls();
  await Promise.all([loadStatus(), loadProfile(), loadCases()]);
  renderCalibration();
  renderHistory();
  renderMethod();
  bindLedgerTools();
}

function bindLedgerTools() {
  const clear = $('#clearLedger');
  if (!clear) return;
  clear.addEventListener('click', async () => {
    if (!confirm('Erase every stored case on this local installation?')) return;
    await api('/api/cases/clear',{method:'POST',body:{}});
    state.cases=[];
    renderHistory();
  });
}

function bindNav() {
  $$('[data-view]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
}

function showView(name) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  $$('.nav').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  if (name === 'cases') loadCases().then(renderHistory);
  if (name === 'calibration') loadProfile().then(renderCalibration);
  window.scrollTo({top:0,behavior:'instant'});
}


function bindCalibrationControls() {
  $$('[data-calibrate]').forEach(btn => btn.addEventListener('click', async () => {
    btn.disabled=true;
    try { state.profile=await api('/api/calibration',{method:'POST',body:{command:btn.dataset.calibrate}}); renderCalibration(); }
    finally { btn.disabled=false; }
  }));
}

function bindForm() {
  $$('[data-example]').forEach(btn => btn.addEventListener('click', () => fillExample(btn.dataset.example)));
  $('#caseForm').addEventListener('submit', async event => {
    event.preventDefault();
    const payload = formPayload();
    await analyze(payload);
  });
  $('#newCase').addEventListener('click', resetWork);
}

function fillExample(key) {
  const ex = examples[key];
  if (!ex) return;
  for (const [k,v] of Object.entries(ex)) {
    const el = document.getElementById(k);
    if (el) el.value = v;
  }
}

function formPayload() {
  return {
    story:$('#story').value.trim(), goal:$('#goal').value.trim(), currentFrame:$('#currentFrame').value.trim(),
    tried:$('#tried').value.trim(), success:$('#success').value.trim(), capability:$('#capability').value,
    familiarDomains:$('#familiarDomains').value.trim(), reuseHistory:$('#reuseHistory').checked
  };
}

async function analyze(payload) {
  const submit = $('.submit');
  submit.disabled = true;
  $('#intake').classList.add('hidden');
  $('#run').classList.remove('hidden');
  renderLoading();
  try {
    const result = await api('/api/analyze', {method:'POST',body:payload});
    state.current = result;
    renderCase(result);
    await Promise.all([loadProfile(),loadCases()]);
  } catch (error) {
    $('#candidateList').innerHTML = `<div class="errorBox">${escapeHtml(error.message)}</div>`;
  } finally {
    submit.disabled = false;
  }
}

function renderLoading() {
  $('#caseIdLabel').textContent = '';
  $('#trace').innerHTML = '';
  $('#frameStrip').innerHTML = '';
  $('#nullResult').classList.add('hidden');
  $('#candidateList').innerHTML = `<div class="loading"><div class="loadingLine">Holding the episode still while the representations change.</div><div class="loadingSteps">PRESERVE EPISODES<br>LOCATE THE RESIDUE<br>SEARCH SOURCE FIELDS<br>MAP THE RELATIONS<br>ATTACK THE TRANSFER<br>SEPARATE THE FIVE AXES</div></div>`;
}

function renderCase(record) {
  state.current = record;
  $('#caseIdLabel').textContent = record.caseId.slice(0,8).toUpperCase();
  $('#caseHeadline').textContent = record.outcome === 'CANDIDATES_SURVIVED' ? 'Representations that survived' : humanOutcome(record.outcome);
  $('#caseSubhead').textContent = record.outcome === 'CANDIDATES_SURVIVED'
    ? 'These cleared the first structure and experience gates. Recognition is still yours. Transfer is still untested.'
    : record.reason || '';
  $('#outcomeLocator').textContent = `CASE  /  ${record.analysis.ahaTarget.replaceAll('_',' ')}`;
  renderTrace(record.trace);
  renderFrameStrip(record);

  if (!record.candidates.length) {
    $('#candidateList').innerHTML = '';
    const box = $('#nullResult');
    box.classList.remove('hidden');
    box.innerHTML = `<strong>${escapeHtml(record.outcome.replaceAll('_',' '))}</strong><h3>No candidate cleared the current gates.</h3><p>${escapeHtml(record.reason || 'The system stopped instead of forcing a story.')}</p>`;
    return;
  }

  $('#nullResult').classList.add('hidden');
  $('#candidateList').innerHTML = '';
  record.candidates.forEach((c,i) => renderCandidate(c,i));
}

function renderTrace(trace=[]) {
  $('#trace').innerHTML = trace.map((t,i)=>`<div class="traceItem ${t.pass?'pass':'fail'}"><div class="traceMark">${String(i+1).padStart(2,'0')}</div><div><strong>${escapeHtml(t.id)}</strong><p>${escapeHtml(t.detail)}</p></div></div>`).join('');
}

function renderFrameStrip(record) {
  const c = record.analysis.calibration || {};
  const cells = [
    ['CURRENT ACCOUNT',record.analysis.oldFrame],
    ['RESIDUE',record.analysis.unresolvedResidue],
    ['LEVELER CUT',`${c.label || 'unknown'}  /  distance ${format01(c.targetDistance)}  /  bridge ${format01(c.bridgeTolerance)}`]
  ];
  $('#frameStrip').innerHTML = cells.map(([a,b])=>`<div class="frameCell"><span>${escapeHtml(a)}</span><p>${escapeHtml(b||'')}</p></div>`).join('');
}

function renderCandidate(c,index) {
  const node = $('#candidateTemplate').content.cloneNode(true);
  const root = node.querySelector('.candidate');
  root.dataset.candidateId = c.candidateId;
  root.querySelector('.candidateIndex').textContent = `C${String(index+1).padStart(2,'0')}`;
  root.querySelector('.sourcePool').textContent = `${c.sourcePool}  /  ${c.generatorIds.join(' + ')}`;
  root.querySelector('.frontierTag').textContent = `${c.frontierBand.replaceAll('_',' ')}  /  bridge ${format01(c.bridgeCost)}`;
  root.querySelector('.yourMoment').textContent = c.yourMoment;
  root.querySelector('.gap').textContent = c.gap;
  root.querySelector('.sourceName').textContent = c.sourceName;
  root.querySelector('.secondMatrix').textContent = c.secondMatrix;
  root.querySelector('.eureka').textContent = c.eureka;
  root.querySelector('.whatVisible').textContent = c.whatBecomesVisible;
  root.querySelector('.microTransfer').textContent = c.microTransfer;
  root.querySelector('.counterAnchor').textContent = c.counterAnchor;
  root.querySelector('.boundary').textContent = c.boundary;
  root.querySelector('.competingFrame').textContent = c.competingFrame;

  const collision = root.querySelector('.collisionRows');
  collision.innerHTML = (c.mapping || []).map(m=>`<div class="collisionRow"><span>${escapeHtml(m.target)}</span><b>↔</b><span>${escapeHtml(m.source)}</span></div>`).join('');

  const replay = root.querySelector('.replayRows');
  replay.innerHTML = (c.storyReplay || []).map(r=>`<div class="replayRow"><div class="replayOriginal"><small>${escapeHtml(r.anchorId)}  /  REPORTED</small>${escapeHtml(r.text)}</div><div class="replayInterpretation"><small>UNDER THIS REPRESENTATION</small>${escapeHtml(r.reinterpretation)}</div></div>`).join('');

  renderAxes(root.querySelector('.statusAxes'),c.status);
  renderEvidence(root,c);
  bindCandidate(root,c);
  $('#candidateList').appendChild(node);
}

function renderEvidence(root,c) {
  const summary = root.querySelector('.evidenceSummary');
  const button = root.querySelector('.researchEvidence');
  const result = root.querySelector('.evidenceResult');
  if (c.sourcePool === 'P1') {
    summary.textContent = 'This source is another episode from your own report. External source inspection is not the basis of this matrix.';
    button.textContent = 'USER MATERIAL';
    button.disabled = true;
  }
  if (!c.evidenceReview) return;
  result.classList.remove('hidden');
  root.querySelector('.evidenceScope').innerHTML = `<span class="evidenceStamp"><strong>${escapeHtml(c.evidenceReview.status || 'UNVERIFIED')}</strong></span>  ${escapeHtml(c.evidenceReview.scope || '')}`;
  root.querySelector('.evidenceText').textContent = c.evidenceReview.summary || '';
  const sources = c.evidenceReview.sources || [];
  root.querySelector('.evidenceSources').innerHTML = sources.map(x=>`<a href="${escapeHtml(x.url)}" target="_blank" rel="noreferrer">${escapeHtml(x.title || x.url)}</a>`).join('');
  button.textContent = c.evidenceReview.used ? 'SOURCE INSPECTED' : 'NO EXTERNAL CHECK';
}

function renderAxes(el,status) {
  const axes = [
    ['EVIDENCE',status.evidence],['STRUCTURE',status.structural],['PERSONAL FIT',status.personalFit],['RECOGNITION',status.recognition],['TRANSFER',status.transfer]
  ];
  el.innerHTML = axes.map(([a,b])=>`<div class="axis"><span>${a}</span><strong>${escapeHtml(String(b).replaceAll('_',' '))}</strong></div>`).join('');
}

function bindCandidate(root,c) {
  const recognitionButtons = [...root.querySelectorAll('[data-recognition]')];
  const reasonButtons = [...root.querySelectorAll('[data-reason]')];
  const transferButtons = [...root.querySelectorAll('[data-transfer]')];

  root.querySelector('.researchEvidence').addEventListener('click', async () => {
    const button = root.querySelector('.researchEvidence');
    if (button.disabled) return;
    button.disabled = true;
    const prior = button.textContent;
    button.textContent = 'INSPECTING SOURCE';
    try {
      const record = await api('/api/evidence',{method:'POST',body:{caseId:state.current.caseId,candidateId:c.candidateId}});
      state.current = record;
      const updated = record.candidates.find(x=>x.candidateId===c.candidateId);
      renderAxes(root.querySelector('.statusAxes'),updated.status);
      renderEvidence(root,updated);
    } catch (error) {
      root.querySelector('.evidenceSummary').textContent = error.message;
      button.textContent = prior;
      button.disabled = false;
    }
  });

  recognitionButtons.forEach(btn => btn.addEventListener('click', () => {
    recognitionButtons.forEach(x=>x.classList.remove('selected'));
    btn.classList.add('selected');
    state.pendingRecognition.set(c.candidateId,btn.dataset.recognition);
    root.querySelector('.reasonPanel').classList.remove('hidden');
  }));

  reasonButtons.forEach(btn => btn.addEventListener('click', () => {
    reasonButtons.forEach(x=>x.classList.remove('selected'));
    btn.classList.add('selected');
    state.pendingReason.set(c.candidateId,btn.dataset.reason);
  }));

  root.querySelector('.recordRecognition').addEventListener('click', async () => {
    const recognition = state.pendingRecognition.get(c.candidateId);
    if (!recognition) return;
    const reason = state.pendingReason.get(c.candidateId) || null;
    const reflection = root.querySelector('.reflection').value.trim();
    const result = await api('/api/recognition',{method:'POST',body:{caseId:state.current.caseId,candidateId:c.candidateId,recognition,reason,reflection}});
    state.current = result.case;
    const updated = state.current.candidates.find(x=>x.candidateId===c.candidateId);
    renderAxes(root.querySelector('.statusAxes'),updated.status);
    root.querySelector('.reasonPanel').classList.add('hidden');
    root.querySelector('.afterRecognition').classList.remove('hidden');
    if (!['KNOWN_ALREADY','DOES_NOT_FIT'].includes(recognition)) root.querySelector('.reroute').classList.add('hidden');
    await loadProfile(); renderCalibration();
  });

  root.querySelector('.reroute').addEventListener('click', async () => {
    root.querySelector('.reroute').disabled = true;
    const result = await api('/api/reroute',{method:'POST',body:{caseId:state.current.caseId}});
    state.current = result;
    renderCase(result);
    await loadProfile();
  });

  root.querySelector('.openSelfTransfer').addEventListener('click', () => root.querySelector('.selfTransferPanel').classList.toggle('hidden'));

  root.querySelector('.recordSelfTransfer').addEventListener('click', async () => {
    const restatement = root.querySelector('.selfRestatement').value.trim();
    const anotherEpisode = root.querySelector('.anotherEpisode').value.trim();
    if (!restatement && !anotherEpisode) return;
    const record = await api('/api/self-transfer',{method:'POST',body:{caseId:state.current.caseId,candidateId:c.candidateId,restatement,anotherEpisode}});
    state.current = record;
    root.querySelector('.recordSelfTransfer').textContent = 'RECORDED';
  });

  root.querySelector('.openTransfer').addEventListener('click', () => root.querySelector('.transferPanel').classList.toggle('hidden'));

  transferButtons.forEach(btn => btn.addEventListener('click', () => {
    transferButtons.forEach(x=>x.classList.remove('selected'));
    btn.classList.add('selected');
    state.pendingTransfer.set(c.candidateId,btn.dataset.transfer);
  }));

  root.querySelector('.recordTransfer').addEventListener('click', async () => {
    const outcome = state.pendingTransfer.get(c.candidateId);
    if (!outcome) return;
    const note = root.querySelector('.transferNote').value.trim();
    const result = await api('/api/transfer',{method:'POST',body:{caseId:state.current.caseId,candidateId:c.candidateId,outcome,note}});
    state.current = result.case;
    const updated = state.current.candidates.find(x=>x.candidateId===c.candidateId);
    renderAxes(root.querySelector('.statusAxes'),updated.status);
    root.querySelector('.recordTransfer').textContent = 'RECORDED';
    await loadProfile(); renderCalibration();
  });
}

async function loadStatus() {
  const s = await api('/api/status');
  const runtime = $('#runtime');
  runtime.classList.toggle('ai',s.ai);
  runtime.querySelector('span:last-child').textContent = s.ai ? `MODEL ROUTE  /  ${s.model}` : 'LOCAL STRUCTURE ROUTE';
}
async function loadProfile() { state.profile = await api('/api/profile'); return state.profile; }
async function loadCases() { state.cases = await api('/api/cases'); return state.cases; }

function renderCalibration() {
  if (!state.profile) return;
  const p=state.profile;
  $('#frontierNeedle').style.left = `${Math.round((p.targetDistance ?? .55)*100)}%`;
  const facts = [
    ['SOURCE DISTANCE',distanceWord(p.targetDistance)],
    ['EXPLANATION DEPTH',depthWord(p.abstractionPreference)],
    ['BRIDGE LOAD',bridgeWord(p.bridgeTolerance)],
    ['NOVELTY FLOOR',noveltyWord(p.noveltyFloor)]
  ];
  $('#calibrationFacts').innerHTML = facts.map(([a,b])=>`<div class="calibrationFact"><span>${a}</span><strong>${b}</strong></div>`).join('');
}

function renderHistory() {
  const el=$('#caseHistory');
  if (!state.cases.length) { el.innerHTML='<div class="nullResult"><h3>The ledger is empty.</h3><p>Enter one episode to create the first case.</p></div>'; return; }
  el.innerHTML = state.cases.map(c=>{
    const recognized=(c.candidates||[]).filter(x=>x.status?.recognition && x.status.recognition!=='UNKNOWN').length;
    const transferred=(c.candidates||[]).filter(x=>x.status?.transfer && x.status.transfer!=='NOT_TESTED').length;
    return `<article class="historyItem"><button class="historyOpen" data-open-case="${escapeHtml(c.caseId)}"><span class="historyDate">${escapeHtml(new Date(c.createdAt).toLocaleString())}</span><h3>${escapeHtml(shorten(c.input?.story||'',115))}</h3><div class="historyMeta"><span>${escapeHtml(c.analysis?.ahaTarget||'')}</span><span>${(c.candidates||[]).length} CANDIDATES</span><span>${recognized} RECOGNIZED</span><span>${transferred} TESTED</span></div></button><button class="historyErase" data-delete-case="${escapeHtml(c.caseId)}">ERASE</button></article>`;
  }).join('');
  $$('[data-open-case]').forEach(btn=>btn.addEventListener('click',()=>{
    const c=state.cases.find(x=>x.caseId===btn.dataset.openCase); if(!c)return;
    state.current=c; showView('work'); $('#intake').classList.add('hidden'); $('#run').classList.remove('hidden'); renderCase(c);
  }));
  $$('[data-delete-case]').forEach(btn=>btn.addEventListener('click',async()=>{
    const caseId=btn.dataset.deleteCase;
    if (!confirm('Erase this stored case?')) return;
    await api('/api/case/delete',{method:'POST',body:{caseId}});
    state.cases=state.cases.filter(x=>x.caseId!==caseId);
    renderHistory();
  }));
}

function renderMethod() {
  const rows=[
    ['00','ADMISSION','Preserve reported experience before abstraction.','USER MATERIAL'],
    ['01','TARGET','Name the tension, opportunity, success pattern, contradiction, or transfer gap.','ROUTER'],
    ['02','STRUCTURE','Extract relations the current account does not explain well.','G3 + G5'],
    ['03','SOURCE FIELDS','Search P1 own episodes, P2 familiar fields, P3 remote fields, P4 contrastive cases.','RETRIEVAL'],
    ['04','LEVELER','Set conceptual distance, abstraction, and bridge cost for this person and case.','ADAPTIVE'],
    ['05','CROSSING','Require explicit relation mapping and a material change in story meaning.','G2'],
    ['06','ATTACK','Use counter anchors, rival accounts, boundaries, and independent review when available.','ADVERSARIAL'],
    ['07','FIVE AXES','Evidence, structure, personal fit, recognition, and transfer remain independent.','SEPARATE'],
    ['08','RECOGNITION','Only the user reports whether the representation clicked, was known, or failed.','USER ONLY'],
    ['09','TRANSFER','Test a bounded move. Record only what that context supports.','REALITY'],
    ['10','LOOP','Feedback changes routing priors, never truth status by repetition.','RETRIEVAL']
  ];
  $('#methodTable').innerHTML=rows.map(r=>`<div class="methodRow"><span>${r[0]}</span><strong>${r[1]}</strong><p>${r[2]}</p><em>${r[3]}</em></div>`).join('');
}

function resetWork() {
  state.current=null;
  $('#run').classList.add('hidden');
  $('#intake').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'instant'});
}

async function api(url, options={}) {
  const init={...options,headers:{'content-type':'application/json',...(options.headers||{})}};
  if (options.body && typeof options.body !== 'string') init.body=JSON.stringify(options.body);
  const res=await fetch(url,init);
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||`Request failed ${res.status}`);
  return data;
}
function format01(n){return typeof n==='number'?`${Math.round(n*100)}/100`:'unknown'}
function distanceWord(n=.55){return n<.3?'ALREADY MINE':n<.48?'WITHIN REACH':n<.68?'EDGE':n<.84?'STRAIN':'LOST'}
function depthWord(n=.5){return n<.32?'CONCRETE':n<.58?'RELATIONAL':n<.78?'ABSTRACT':'DENSE'}
function bridgeWord(n=.55){return n<.35?'LOW':n<.65?'MODERATE':'HIGH'}
function noveltyWord(n=.45){return n<.35?'LOW':n<.6?'MID':'HIGH'}
function shorten(s,n){return s.length>n?s.slice(0,n-1)+'…':s}
function humanOutcome(x=''){return x.replaceAll('_',' ').toLowerCase().replace(/^./,m=>m.toUpperCase())}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
