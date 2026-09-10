import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline, recordRecognition, recordTransfer, recordSelfTransfer, reroute, adjustCalibration, researchCandidateEvidence } from './server/pipeline.mjs';
import { listCases, getProfile, deleteCase, clearCases } from './server/storage.mjs';
import { aiAvailable } from './server/ai.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname,'public');
const PORT = Number(process.env.PORT || 8787);

const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/status' && req.method === 'GET') return json(res,200,{ok:true,ai:aiAvailable(),model:aiAvailable()?(process.env.OPENAI_MODEL||'gpt-5.6-terra'):null});
    if (url.pathname === '/api/profile' && req.method === 'GET') return json(res,200,await getProfile());
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Eureka running at http://localhost:${PORT}`);
  console.log(`AI assisted discovery: ${aiAvailable() ? 'enabled' : 'disabled'}`);
});

async function body(req) {
  const chunks=[];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.length > 1_000_000) throw new Error('BODY_TOO_LARGE');
  return text ? JSON.parse(text) : {};
}

async function serveStatic(pathname,res) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const target = path.normalize(path.join(PUBLIC,rel));
  if (!target.startsWith(PUBLIC)) return json(res,403,{error:'FORBIDDEN'});
  try {
    const data = await fs.readFile(target);
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
