import { promises as fs } from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.resolve(process.env.EUREKA_STATE_FILE || 'data/state.json');
let writeChain = Promise.resolve();

export async function readState() {
  const raw = await fs.readFile(STATE_FILE, 'utf8');
  return JSON.parse(raw);
}

export async function writeState(next) {
  writeChain = writeChain.then(async () => {
    const tmp = `${STATE_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2));
    await fs.rename(tmp, STATE_FILE);
  });
  return writeChain;
}

export async function saveCase(record) {
  const state = await readState();
  const idx = state.cases.findIndex(c => c.caseId === record.caseId);
  if (idx >= 0) state.cases[idx] = record;
  else state.cases.unshift(record);
  state.cases = state.cases.slice(0, 100);
  await writeState(state);
  return record;
}

export async function listCases() {
  const state = await readState();
  return state.cases;
}

export async function updateCase(caseId, updater) {
  const state = await readState();
  const idx = state.cases.findIndex(c => c.caseId === caseId);
  if (idx < 0) throw new Error('CASE_NOT_FOUND');
  const next = updater(structuredClone(state.cases[idx]));
  state.cases[idx] = next;
  await writeState(state);
  return next;
}

export async function deleteCase(caseId) {
  const state = await readState();
  const before = state.cases.length;
  state.cases = state.cases.filter(c => c.caseId !== caseId);
  if (state.cases.length === before) throw new Error('CASE_NOT_FOUND');
  await writeState(state);
  return {ok:true,caseId};
}

export async function clearCases() {
  const state = await readState();
  state.cases = [];
  await writeState(state);
  return {ok:true};
}

export async function getProfile() {
  return (await readState()).profile;
}

export async function setProfile(profile) {
  const state = await readState();
  state.profile = profile;
  await writeState(state);
  return profile;
}
