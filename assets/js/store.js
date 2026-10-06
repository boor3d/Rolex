// Data layer.
// Signed out: a read-only demo collection (data/collection.json).
// Signed in: the user's own collection in Supabase (Postgres + Storage), loaded into memory
// so views can read synchronously; every write goes to the database, then reloads.
import { sb, PHOTO_BUCKET } from './supabase.js';

const EMPTY = { profile: { name: 'My Collection', tagline: '', owner: '', currency: 'USD' }, watches: [], customReferences: [] };

export const state = {
  catalogMeta: {},
  baseRefs: [],
  photos: {},
  demo: structuredClone(EMPTY),
  data: structuredClone(EMPTY),
  user: null,
  loading: false,
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

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const blank = v => (v === undefined || v === '' ? null : v);
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- mapping between the app's flat watch object and the tables ---------- */
function fromDb(row, urls, history) {
  const f = (Array.isArray(row.watch_finance) ? row.watch_finance[0] : row.watch_finance) || {};
  const photoRefs = [...(row.watch_photos || [])].sort((a, b) => a.sort - b.sort)
    .map(p => ({ id: p.id, path: p.path, url: urls.get(p.path) }))
    .filter(p => p.url);
  return {
    id: row.id, ref: row.ref, family: row.family, model: row.model, nickname: row.nickname, year: row.year,
    size: row.size === null ? null : +row.size, metal: row.metal, bezel: row.bezel, dial: row.dial,
    bracelet: row.bracelet, caliber: row.caliber, set: row.box_papers, condition: row.condition,
    lastService: row.last_service, notes: row.notes, featured: row.featured, addedAt: row.created_at,
    purchaseDate: f.purchase_date, purchasePrice: f.purchase_price === null || f.purchase_price === undefined ? null : +f.purchase_price,
    purchasedFrom: f.purchased_from, estimatedValue: f.estimated_value === null || f.estimated_value === undefined ? null : +f.estimated_value,
    valuationDate: f.valuation_date,
    photoRefs, photos: photoRefs.map(p => p.url),
    valuations: history.get(row.id) || [],
  };
}
const watchRow = w => ({
  id: w.id, ref: blank(w.ref), family: blank(w.family), model: blank(w.model), nickname: blank(w.nickname),
  year: blank(w.year), size: blank(w.size), metal: blank(w.metal), bezel: blank(w.bezel), dial: blank(w.dial),
  bracelet: blank(w.bracelet), caliber: blank(w.caliber), box_papers: blank(w.set), condition: blank(w.condition),
  last_service: blank(w.lastService), notes: blank(w.notes), featured: !!w.featured,
});
const financeRow = w => ({
  watch_id: w.id, purchase_date: blank(w.purchaseDate), purchase_price: blank(w.purchasePrice),
  purchased_from: blank(w.purchasedFrom), estimated_value: blank(w.estimatedValue), valuation_date: blank(w.valuationDate),
});

function normaliseDemo(d) {
  return {
    profile: { ...EMPTY.profile, ...(d?.profile || {}) },
    watches: (d?.watches || []).map(w => ({ photos: [], ...w, sample: true })),
    customReferences: [],
  };
}

async function fetchJSON(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

/* ---------- session ---------- */
async function loadUser() {
  const uid = state.user.id;
  const [profile, rows, refs, vals] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle().then(must),
    sb.from('watches').select('*, watch_finance(*), watch_photos(id, path, sort)').order('created_at').then(must),
    sb.from('custom_references').select('ref, data').then(must),
    sb.from('valuations').select('watch_id, valued_on, value').order('valued_on').then(must),
  ]);
  const paths = rows.flatMap(r => (r.watch_photos || []).map(p => p.path));
  const urls = new Map();
  if (paths.length) {
    const signed = must(await sb.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60 * 6));
    signed.forEach(s => s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  const history = new Map();
  for (const v of vals) (history.get(v.watch_id) || history.set(v.watch_id, []).get(v.watch_id)).push({ date: v.valued_on, value: +v.value });
  state.data = {
    profile: { ...EMPTY.profile, ...Object.fromEntries(Object.entries(profile || {}).filter(([, v]) => v !== null)) },
    watches: rows.map(r => fromDb(r, urls, history)),
    customReferences: refs.map(r => ({ ...r.data, ref: r.ref })),
  };
  reindex();
}

async function switchUser(user) {
  state.user = user;
  if (!user) {
    state.data = structuredClone(state.demo);
    reindex();
    return;
  }
  state.loading = true;
  try { await loadUser(); } finally { state.loading = false; }
}

export async function init() {
  const [cat, demo, photos] = await Promise.all([
    fetchJSON('data/catalog.json'),
    fetchJSON('data/collection.json').catch(() => EMPTY),
    fetchJSON('data/photos.json').catch(() => ({ photos: {} })),
  ]);
  state.photos = Object.fromEntries(Object.entries(photos.photos || {}).map(([k, v]) => [normRef(k), v]));
  state.catalogMeta = { version: cat.version, note: cat.note };
  state.baseRefs = cat.references;
  state.demo = normaliseDemo(demo);
  const { data: { session } } = await sb.auth.getSession();
  if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
  await switchUser(session?.user || null);
  sb.auth.onAuthStateChange((_event, session) => {
    const next = session?.user || null;
    if ((next?.id || null) === (state.user?.id || null)) { state.user = next; return; }
    // Supabase advises against awaiting its own calls inside this callback.
    setTimeout(async () => {
      if ((next?.id || null) === (state.user?.id || null)) return; // already adopted
      try { await switchUser(next); } catch (e) { console.error(e); }
      emit();
    }, 0);
  });
}
/** Load a session's data immediately (used right after sign-in so the next page isn't the demo). */
export async function adopt(session) {
  const next = session?.user || null;
  if ((next?.id || null) === (state.user?.id || null)) return;
  await switchUser(next);
  emit();
}
export const reload = async () => { if (state.user) { await loadUser(); emit(); } };

/* ---------- reads ---------- */
export const isDemo = () => !state.user;
export const user = () => state.user;
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
/** Freely licensed reference photos (Wikimedia Commons), each with its credit. */
export const refPhotos = ref => state.photos[normRef(ref)] || [];
export const allRefPhotos = () => state.photos;
export const ownedRefSet = () => new Set(state.data.watches.map(w => normRef(w.ref)).filter(Boolean));
export const hasSamples = () => isDemo();

/* ---------- auth ---------- */
export const signOut = () => sb.auth.signOut();

/* ---------- writes (signed-in only) ---------- */
function uidOrThrow() {
  if (!state.user) throw new Error('Sign in to make changes');
  return state.user.id;
}
const dataUrlToBlob = async url => (await fetch(url)).blob();

/**
 * Save a watch. `photos` is the full ordered list the user wants:
 * existing items carry {id, path}; new uploads carry {dataUrl}.
 */
export async function saveWatch(w, photos = null, { reload: doReload = true } = {}) {
  const uid = uidOrThrow();
  const prev = state.data.watches.find(x => x.id === w.id);
  must(await sb.from('watches').upsert(watchRow(w)));
  if (w.featured) must(await sb.from('watches').update({ featured: false }).neq('id', w.id).eq('featured', true));
  must(await sb.from('watch_finance').upsert(financeRow(w)));
  if (w.estimatedValue !== null && w.estimatedValue !== undefined && (!prev || prev.estimatedValue !== w.estimatedValue)) {
    must(await sb.from('valuations').insert({ watch_id: w.id, valued_on: w.valuationDate || today(), value: w.estimatedValue }));
  }
  if (photos) {
    const keep = new Set(photos.filter(p => p.id).map(p => p.id));
    const removed = (prev?.photoRefs || []).filter(p => !keep.has(p.id));
    if (removed.length) {
      must(await sb.storage.from(PHOTO_BUCKET).remove(removed.map(p => p.path)));
      must(await sb.from('watch_photos').delete().in('id', removed.map(p => p.id)));
    }
    for (const [i, p] of photos.entries()) {
      if (p.id) {
        must(await sb.from('watch_photos').update({ sort: i }).eq('id', p.id));
        continue;
      }
      const blob = await dataUrlToBlob(p.dataUrl);
      const path = `${uid}/${w.id}/${crypto.randomUUID()}.jpg`;
      must(await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg' }));
      must(await sb.from('watch_photos').insert({ watch_id: w.id, path, sort: i }));
    }
  }
  if (doReload) { await loadUser(); emit(); }
  return w.id;
}

export async function deleteWatch(id) {
  uidOrThrow();
  const w = watchById(id);
  if (w?.photoRefs?.length) must(await sb.storage.from(PHOTO_BUCKET).remove(w.photoRefs.map(p => p.path)));
  must(await sb.from('watches').delete().eq('id', id));
  await loadUser();
  emit();
}

export async function saveReference(r, { reload: doReload = true } = {}) {
  uidOrThrow();
  const { ref, custom, ...data } = r;
  must(await sb.from('custom_references').upsert({ ref, data }, { onConflict: 'user_id,ref' }));
  if (doReload) { await loadUser(); emit(); }
}
export async function deleteReference(ref) {
  uidOrThrow();
  must(await sb.from('custom_references').delete().eq('ref', ref));
  await loadUser();
  emit();
}

export async function saveProfile(p) {
  const uid = uidOrThrow();
  const { name, owner, tagline, currency: cur } = p;
  must(await sb.from('profiles').update({ name: name || 'My Collection', owner: blank(owner), tagline: blank(tagline), currency: cur || 'USD' }).eq('id', uid));
  await loadUser();
  emit();
}

/** Import a collection.json / backup file into the signed-in account. Returns the number of watches added. */
export async function importData(obj, onProgress = () => {}) {
  uidOrThrow();
  if (!obj || !Array.isArray(obj.watches)) throw new Error('That file has no "watches" list.');
  const list = obj.watches.filter(w => !w.sample);
  for (const r of obj.customReferences || []) await saveReference(r, { reload: false });
  for (const [i, w] of list.entries()) {
    onProgress(i + 1, list.length);
    const photos = (w.photos || []).filter(p => typeof p === 'string' && p.startsWith('data:')).map(dataUrl => ({ dataUrl }));
    const clean = { ...w, id: crypto.randomUUID() };
    await saveWatch(clean, photos, { reload: false });
  }
  if (obj.profile && !state.data.watches.length) await saveProfile({ ...state.data.profile, ...obj.profile });
  await loadUser();
  emit();
  return list.length;
}

export async function deleteAllData() {
  uidOrThrow();
  const paths = state.data.watches.flatMap(w => (w.photoRefs || []).map(p => p.path));
  if (paths.length) must(await sb.storage.from(PHOTO_BUCKET).remove(paths));
  must(await sb.from('watches').delete().eq('user_id', state.user.id));
  must(await sb.from('custom_references').delete().eq('user_id', state.user.id));
  await loadUser();
  emit();
}

const blobToDataUrl = blob => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(blob);
});
const FINANCIAL = ['purchasePrice', 'estimatedValue', 'valuationDate', 'purchasedFrom', 'purchaseDate'];
/** A portable JSON backup (same shape the original static site used). */
export async function exportData({ financials = true, photos = true, notes = true } = {}) {
  const d = structuredClone({ profile: state.data.profile, customReferences: state.data.customReferences });
  d.watches = [];
  for (const w of state.data.watches) {
    const { photoRefs, valuations, ...rest } = w;
    const out = structuredClone(rest);
    if (!financials) FINANCIAL.forEach(k => delete out[k]);
    if (!notes) delete out.notes;
    out.photos = [];
    if (photos) for (const url of w.photos) out.photos.push(await blobToDataUrl(await (await fetch(url)).blob()));
    if (financials && valuations?.length) out.valuations = valuations;
    d.watches.push(out);
  }
  d.exportedAt = new Date().toISOString();
  return JSON.stringify(d, null, 2);
}

/* ---------- data saved by the earlier, browser-only version ---------- */
export async function legacyLocal() {
  try {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('rolex-collection', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const v = await new Promise((res, rej) => {
      const q = db.transaction('kv').objectStore('kv').get('state-v1');
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    return v?.watches?.some(w => !w.sample) ? v : null;
  } catch { return null; }
}
export async function clearLegacy() {
  try { indexedDB.deleteDatabase('rolex-collection'); } catch { /* ignore */ }
}
