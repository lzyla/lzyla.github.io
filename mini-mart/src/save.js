// localStorage persistence with a version field for future migrations.
import { SAVE_KEY, SAVE_VERSION } from './config.js';

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return migrate(data);
  } catch (e) {
    console.warn('Save could not be read', e);
    return null;
  }
}

export function writeSave(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, saveVersion: SAVE_VERSION })); return true; }
  catch (e) { console.warn('Save failed', e); return false; }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

// Upgrade older save formats step by step.
function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  let v = data.saveVersion || 0;
  if (v > SAVE_VERSION) return null;   // from a newer build: ignore
  // future: if (v === 1) { ...; v = 2; }
  data.saveVersion = SAVE_VERSION;
  return data;
}
