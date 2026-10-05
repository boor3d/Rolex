// Form building blocks shared by the watch editor and the reference editor.
import { FAMILIES, METALS, DIALS, BRACELETS, bezelName, parseBezel } from '../vocab.js';
import { esc } from '../util.js';
import { allRefs } from '../store.js';

export const field = (label, input, hint = '', cls = '') =>
  `<label class="field ${cls}"><span class="field-label">${label}</span>${input}${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;

export const text = (name, v = '', attrs = '') => `<input name="${name}" value="${esc(v ?? '')}" ${attrs}>`;
export const number = (name, v = '', attrs = '') => `<input type="number" name="${name}" value="${esc(v ?? '')}" inputmode="decimal" ${attrs}>`;
export const date = (name, v = '') => `<input type="date" name="${name}" value="${esc(v ?? '')}">`;
export const select = (name, pairs, v, blank = '') =>
  `<select name="${name}">${blank !== null ? `<option value="">${blank}</option>` : ''}${pairs.map(([k, l]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

export const familyPairs = () => FAMILIES.map(f => [f.key, f.name]);
export const metalPairs = () => Object.entries(METALS).map(([k, m]) => [k, m.name]);
export const dialPairs = () => Object.entries(DIALS).map(([k, d]) => [k, d.name]).sort((a, b) => a[1].localeCompare(b[1]));
export const braceletPairs = () => Object.entries(BRACELETS);

const ORDER = ['smooth', 'fluted', 'engine', 'dive', 'gmt', 'e2', 'tachy', 'ym', 'regatta', 'turn'];
export function bezelPairs(current) {
  const codes = new Set(['smooth', 'fluted', 'engine', 'dive:black', 'dive:blue', 'dive:green', 'gmt:black', 'tachy:steel', 'tachy:black', 'e2']);
  allRefs().forEach(r => r.bezel && codes.add(r.bezel));
  if (current) codes.add(current);
  return [...codes]
    .sort((a, b) => ORDER.indexOf(parseBezel(a).type) - ORDER.indexOf(parseBezel(b).type) || bezelName(a).localeCompare(bezelName(b)))
    .map(c => [c, bezelName(c)]);
}

export function readForm(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name || el.type === 'file') continue;
    if (el.type === 'checkbox') {
      if (el.dataset.multi) (o[el.name] ||= []).push(...(el.checked ? [el.value] : []));
      else o[el.name] = el.checked;
    } else o[el.name] = el.value.trim();
  }
  return o;
}
