import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline, recordRecognition, recordTransfer, recordSelfTransfer, reroute, adjustCalibration, researchCandidateEvidence } from './server/pipeline.mjs';
import { listCases, getProfile, deleteCase, clearCases, getPersonContext, setPersonContext, clearPersonContext } from './server/storage.mjs';
import { parsePersonImport } from './server/person.mjs';
import { aiAvailable } from './server/ai.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await loadEnvFile(path.join(__dirname,'.env'));

const PUBLIC = path.join(__dirname,'public');
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.EUREKA_HOST || '127.0.0.1';

const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/status' && req.method === 'GET') return json(res,200,{ok:true,ai:aiAvailable(),model:aiAvailable()?(process.env.OPENAI_MODEL||'gpt-5.6-terra'):null});
    if (url.pathname === '/api/profile' && req.method === 'GET') return json(res,200,await getProfile());
    if (url.pathname === '/api/person' && req.method === 'GET') return json(res,200,await getPersonContext());
    if (url.pathname === '/api/person' && req.method === 'POST') { const b=await body(req); return json(res,200,await setPersonContext(parsePersonImport(b.rawImport,b.directNotes,b.permissions||{}))); }
    if (url.pathname === '/api/person/clear' && req.method === 'POST') return json(res,200,await clearPersonContext());
    if (url.pathname === '/api/cases' && req.method === 'GET') return json(res,200,await listCases());
    if (url.pathname === '/api/cases/clear' && req.method === 'POST') return json(res,200,await clearCases());
    if (url.pathname === '/api/case/delete' && req.method === 'POST') { const b=await body(req); return json(res,200,await deleteCase(b.caseId)); }
    if (url.pathname === '/api/calibration' && req.method === 'POST') { const b=await body(req); return json(res,200,await adjustCalibration(b.command)); }
    if (url.pathname === '/api/analyze' && req.method === 'POST') return json(res,200,await runPipeline(await body(req)));
    if (url.pathname === '/api/recognition' && req.method === 'POST') {
      const b = await body(req); return json(res,200,await recordRecognition(b.caseId,b));
    }
    if (url.pathname === '/api/self-transfer' && req.method === 'POST') {
      const b = await body(req); return json(res,200,await recordSelfTransfer(b.caseId,b));
    }
    if (url.pathname === '/api/transfer' && req.method === 'POST') {
      const b = await body(req); return json(res,200,await recordTransfer(b.caseId,b));
    }
    if (url.pathname === '/api/evidence' && req.method === 'POST') {
      const b = await body(req); return json(res,200,await researchCandidateEvidence(b.caseId,b.candidateId));
    }
    if (url.pathname === '/api/reroute' && req.method === 'POST') {
      const b = await body(req); return json(res,200,await reroute(b.caseId,b));
    }
    if (url.pathname.startsWith('/api/')) return json(res,404,{error:'NOT_FOUND'});
    return serveStatic(url.pathname,res);
  } catch (error) {
    console.error(error);
    return json(res,500,{error:error.message || 'SERVER_ERROR'});
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Eureka running at http://${HOST}:${PORT}`);
  console.log(`AI assisted discovery: ${aiAvailable() ? 'enabled' : 'disabled'}`);
});

async function loadEnvFile(file) {
  try {
    const text = await fs.readFile(file,'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const [,key,rawValue] = match;
      if (process.env[key] !== undefined) continue;
      let value = rawValue.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1,-1);
      process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function body(req) {
  const chunks=[];
  let size=0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

async function serveStatic(pathname,res) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const target = path.resolve(PUBLIC,rel);
  const outside = path.relative(PUBLIC,target);
  if (outside === '..' || outside.startsWith(`..${path.sep}`) || path.isAbsolute(outside)) return json(res,403,{error:'FORBIDDEN'});
  try {
    let data = await fs.readFile(target);
    if (rel === 'index.html') {
      let html = data.toString('utf8');
      html = html.replace('<link rel="stylesheet" href="/styles.css">','<link rel="stylesheet" href="/styles.css">\n  <link rel="stylesheet" href="/person.css">');
      html = html.replace('<script type="module" src="/app.js"></script>','<script type="module" src="/person.js"></script>\n  <script type="module" src="/app.js"></script>');
      data = Buffer.from(html);
    }
    res.writeHead(200, {'content-type':mime(target),'cache-control':'no-store'});
    res.end(data);
  } catch {
    const data = await fs.readFile(path.join(PUBLIC,'index.html'));
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(data);
  }
}
function json(res,status,data) { res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); res.end(JSON.stringify(data)); }
function mime(p) {
  const ext = path.extname(p);
  return ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'}[ext] || 'application/octet-stream');
}
