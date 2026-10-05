// Data layer.
// Published data lives in data/collection.json (served by GitHub Pages).
// Edits made in the browser are kept in IndexedDB until you export them and commit the file.
import { uid } from './util.js';

const DB = 'rolex-collection', STORE = 'kv', KEY = 'state-v1';
let dbp;
function db() {
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function kv(mode, fn) {
  try {
    const d = await db();
    return await new Promise((res, rej) => {
      const tx = d.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => res(req?.result);
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) {
    console.warn('Local storage unavailable', e);
    return undefined;
  }
}
const kvGet = k => kv('readonly', s => s.get(k));
const kvSet = (k, v) => kv('readwrite', s => s.put(v, k));
const kvDel = k => kv('readwrite', s => s.delete(k));

const EMPTY = { profile: { name: 'The Collection', tagline: '', owner: '', currency: 'USD' }, watches: [], customReferences: [] };

export const state = {
  catalogMeta: {},
  baseRefs: [],
  published: structuredClone(EMPTY),
  data: structuredClone(EMPTY),
  local: false,
};
const listeners = new Set();
export const onChange = fn => listeners.add(fn);
const emit = () => listeners.forEach(fn => fn());

let refIndex = new Map();
export const normRef = r => String(r || '').toUpperCase().replace(/\s+/g, '').replace(/^M(?=\d)/, '').replace(/-\d{4}$/, '');

function reindex() {
  refIndex = new Map();
  for (const r of allRefs()) refIndex.set(normRef(r.ref), r);
}

function normalise(d) {
  return {
    profile: { ...EMPTY.profile, ...(d?.profile || {}) },
    watches: Array.isArray(d?.watches) ? d.watches.map(w => ({ id: w.id || uid(), photos: [], ...w })) : [],
    customReferences: Array.isArray(d?.customReferences) ? d.customReferences : [],
  };
}

async function fetchJSON(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export async function init() {
  const [cat, pub, local] = await Promise.all([
    fetchJSON('data/catalog.json'),
    fetchJSON('data/collection.json').catch(() => EMPTY),
    kvGet(KEY),
  ]);
  state.catalogMeta = { version: cat.version, note: cat.note };
  state.baseRefs = cat.references;
  state.published = normalise(pub);
  state.local = !!local;
  state.data = normalise(local || pub);
  reindex();
}

async function commit() {
  state.data.updatedAt = new Date().toISOString();
  state.local = true;
  reindex();
  await kvSet(KEY, state.data);
  emit();
}

/* ---------- reads ---------- */
export const profile = () => state.data.profile;
export const currency = () => state.data.profile.currency || 'USD';
export const watches = () => state.data.watches;
export const watchById = id => state.data.watches.find(w => w.id === id);
export function allRefs() {
  const custom = state.data.customReferences.map(r => ({ ...r, custom: true }));
  const seen = new Set(custom.map(r => normRef(r.ref)));
  return [...state.baseRefs.filter(r => !seen.has(normRef(r.ref))), ...custom];
}
export const refByKey = key => refIndex.get(normRef(key));
export function ownedRefSet() {
  return new Set(state.data.watches.map(w => normRef(w.ref)).filter(Boolean));
}
export const hasSamples = () => state.data.watches.some(w => w.sample);

/* ---------- writes ---------- */
export async function saveWatch(w) {
  const i = state.data.watches.findIndex(x => x.id === w.id);
  if (i >= 0) state.data.watches[i] = w;
  else state.data.watches.push({ ...w, id: w.id || uid(), addedAt: new Date().toISOString() });
  await commit();
  return w.id;
}
export async function deleteWatch(id) {
  state.data.watches = state.data.watches.filter(w => w.id !== id);
  await commit();
}
export async function saveReference(r) {
  const k = normRef(r.ref);
  state.data.customReferences = state.data.customReferences.filter(x => normRef(x.ref) !== k);
  state.data.customReferences.push(r);
  await commit();
}
export async function deleteReference(ref) {
  const k = normRef(ref);
  state.data.customReferences = state.data.customReferences.filter(x => normRef(x.ref) !== k);
  await commit();
}
export async function saveProfile(p) {
  state.data.profile = { ...state.data.profile, ...p };
  await commit();
}
export async function removeSamples() {
  state.data.watches = state.data.watches.filter(w => !w.sample);
  await commit();
}
export async function importData(obj) {
  if (!obj || !Array.isArray(obj.watches)) throw new Error('That file has no "watches" list.');
  state.data = normalise(obj);
  await commit();
}
export async function resetToPublished() {
  await kvDel(KEY);
  state.data = structuredClone(state.published);
  state.local = false;
  reindex();
  emit();
}

const FINANCIAL = ['purchasePrice', 'estimatedValue', 'valuationDate', 'purchasedFrom'];
export function exportData({ financials = true, photos = true, notes = true } = {}) {
  const d = structuredClone(state.data);
  d.watches = d.watches.map(w => {
    if (!financials) FINANCIAL.forEach(k => delete w[k]);
    if (!photos) w.photos = [];
    if (!notes) delete w.notes;
    return w;
  });
  d.exportedAt = new Date().toISOString();
  delete d.updatedAt;
  return JSON.stringify(d, null, 2);
}
