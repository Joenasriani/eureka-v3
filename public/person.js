const personState={record:null,prompt:''};

installPersonView();
await Promise.all([loadPerson(),loadPrompt()]);
renderPerson();

function installPersonView(){
  const nav=document.querySelector('.mast nav');
  const work=document.querySelector('#view-work');
  if(!nav||!work||document.querySelector('[data-view="person"]')) return;
  const button=document.createElement('button');
  button.className='nav';
  button.dataset.view='person';
  button.innerHTML='<span>01</span>PERSON';
  nav.prepend(button);
  [...nav.querySelectorAll('.nav')].forEach((el,index)=>{const n=el.querySelector('span');if(n)n.textContent=String(index+1).padStart(2,'0')});

  const section=document.createElement('section');
  section.className='view';
  section.id='view-person';
  section.innerHTML=`
    <div class="personGrid">
      <aside class="personLead">
        <p class="locator">PERSON / CONTEXT BODY</p>
        <h1>Give Eureka the person before the case.</h1>
        <p class="lead">A current episode is one slice. This record gives the search prior work, fields you know, projects, repeated friction, strange successes, known concepts, and earlier episodes that may contain the missing comparison.</p>
        <div class="personRule"><span>USE RULE</span><p>Person context can change retrieval, bridge distance, and story comparison. It cannot raise evidence or structural status.</p></div>
        <div class="personReadout" id="personReadout"></div>
      </aside>
      <div class="personBody">
        <section class="personSection">
          <div class="personSectionHead"><span>01 / DIRECT CONTEXT</span><p>Add anything Eureka should know that is not in the imported record.</p></div>
          <textarea id="personDirectNotes" class="personText" placeholder="Work, fields you know, current projects, repeated situations, old successes, failures, constraints, or anything else worth linking across cases."></textarea>
        </section>
        <section class="personSection importSection">
          <div class="personSectionHead"><span>02 / CHATGPT EXPORT</span><p>Run the prompt in your ChatGPT. Copy its JSON reply and place it here.</p></div>
          <div class="promptBand"><button type="button" id="copyPersonPrompt">COPY CHATGPT PROMPT</button><button type="button" id="showPersonPrompt">READ PROMPT</button><span id="promptCopyState"></span></div>
          <div class="historySourceNote"><span>OLDER CHAT HISTORY</span><p>If the current ChatGPT cannot inspect older chats, export your data, upload the conversation JSON into ChatGPT, then run the same prompt against that file.</p><a href="https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpthistory-and-data" target="_blank" rel="noreferrer">OPENAI EXPORT INSTRUCTIONS</a></div>
          <pre class="promptText hidden" id="personPrompt"></pre>
          <textarea id="personImport" class="personImport" placeholder="Paste the JSON reply from ChatGPT here."></textarea>
        </section>
        <section class="personSection personPermissions">
          <div class="personSectionHead"><span>03 / PERMISSION</span><p>Choose which material can enter later searches.</p></div>
          <label><input id="personUse" type="checkbox" checked><span>Use this context for source selection and bridge distance.</span></label>
          <label><input id="personStories" type="checkbox" checked><span>Allow imported episodes to enter P1 comparison search.</span></label>
          <label><input id="personInferences" type="checkbox"><span>Allow candidate inferences from the export. Off is the default.</span></label>
        </section>
        <div class="personWriteBand"><button type="button" id="savePerson">WRITE PERSON CONTEXT</button><button type="button" id="erasePerson">ERASE PERSON CONTEXT</button></div>
      </div>
    </div>`;
  work.before(section);
  bindPersonControls();
}

function bindPersonControls(){
  const copy=document.querySelector('#copyPersonPrompt');
  const show=document.querySelector('#showPersonPrompt');
  const save=document.querySelector('#savePerson');
  const erase=document.querySelector('#erasePerson');
  copy?.addEventListener('click',async()=>{
    if(!personState.prompt) await loadPrompt();
    await navigator.clipboard.writeText(personState.prompt);
    const out=document.querySelector('#promptCopyState'); if(out) out.textContent='COPIED';
    setTimeout(()=>{if(out)out.textContent=''},1400);
  });
  show?.addEventListener('click',()=>document.querySelector('#personPrompt')?.classList.toggle('hidden'));
  save?.addEventListener('click',async()=>{
    save.disabled=true;
    try{
      personState.record=await api('/api/person',{method:'POST',body:{
        directNotes:value('#personDirectNotes'),rawImport:value('#personImport'),permissions:{
          useForPersonalization:checked('#personUse'),useStoriesForP1:checked('#personStories'),useCandidateInferences:checked('#personInferences')
        }
      }});
      renderPerson();
      save.textContent='PERSON CONTEXT WRITTEN';
      setTimeout(()=>save.textContent='WRITE PERSON CONTEXT',1500);
    }finally{save.disabled=false}
  });
  erase?.addEventListener('click',async()=>{
    if(!confirm('Erase the stored person context on this installation?')) return;
    personState.record=await api('/api/person/clear',{method:'POST',body:{}});
    renderPerson();
  });
}

async function loadPerson(){personState.record=await api('/api/person');return personState.record}
async function loadPrompt(){const r=await fetch('/person-prompt.txt',{cache:'no-store'});personState.prompt=await r.text();const p=document.querySelector('#personPrompt');if(p)p.textContent=personState.prompt;return personState.prompt}

function renderPerson(){
  const p=personState.record;if(!p)return;
  const loaded=Boolean(p.updatedAt&&(p.rawImport||p.directNotes||p.identity?.summary));
  const name=p.identity?.preferredName||p.identity?.name||'';
  setValue('#personDirectNotes',p.directNotes||'');
  setValue('#personImport',p.rawImport||'');
  setChecked('#personUse',p.permissions?.useForPersonalization!==false);
  setChecked('#personStories',p.permissions?.useStoriesForP1!==false);
  setChecked('#personInferences',p.permissions?.useCandidateInferences===true);
  const counts={roles:(p.roles||[]).length,projects:(p.projects||[]).length,skills:(p.skills||[]).length,fields:(p.familiarWorlds||[]).length+(p.knowledgeDomains||[]).length,concepts:(p.knownConcepts||[]).length,episodes:(p.stories||[]).length};
  const readout=document.querySelector('#personReadout');
  if(readout){
    if(!loaded) readout.innerHTML='<span>CONTEXT STATE</span><strong>EMPTY</strong><p>No person context is entering source selection.</p>';
    else readout.innerHTML=`<span>CONTEXT STATE</span><strong>${escapeHtml(name||'LOADED')}</strong><div class="personFacts">${[['ROLES',counts.roles],['PROJECTS',counts.projects],['SKILLS',counts.skills],['FIELDS',counts.fields],['KNOWN CONCEPTS',counts.concepts],['EPISODES',counts.episodes]].map(([k,v])=>`<div><i>${k}</i><b>${v}</b></div>`).join('')}</div>`;
  }
  const gate=document.querySelector('.historyGate span');
  if(gate&&loaded&&!gate.querySelector('.personLinked')) gate.insertAdjacentHTML('beforeend',`<small class="personLinked">PERSON CONTEXT: ${escapeHtml(name||`${counts.episodes} EPISODES`)}</small>`);
}

async function api(url,{method='GET',body}={}){const r=await fetch(url,{method,headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});if(!r.ok){const x=await r.json().catch(()=>({}));throw new Error(x.error||`HTTP ${r.status}`)}return r.json()}
const value=s=>document.querySelector(s)?.value.trim()||'';
const checked=s=>Boolean(document.querySelector(s)?.checked);
function setValue(s,v){const e=document.querySelector(s);if(e)e.value=v}
function setChecked(s,v){const e=document.querySelector(s);if(e)e.checked=v}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
