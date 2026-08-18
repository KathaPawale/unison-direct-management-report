/* Unison Direct Management Reporting — application state + persistence */
'use strict';

const SETTINGS_KEY = 'udmr.settings';
const SESSION_KEY  = 'udmr.session.v1';

const DEFAULT_SETTINGS = {
  groqKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  aiEnabled: true
};

const state = {
  fileName: '',
  sheets: {},            // { sheetName: any[][] } — raw truth, mutated by the editor
  model: null,           // parser output (parseWorkbook), rebuilt on every mutation
  active: '',            // sheet selected in the editor
  client: 'Client',
  period: 'For the period ended',
  notes: '',
  edited: new Set(),     // "sheet:r:c" cells typed by the user  → red in preview
  adjusted: new Set(),   // "sheet:r:c" cells recomputed by the engine → red in preview
  signatory: { name: '', title: '', date: '' },
  reportPage: 0,
  settings: { ...DEFAULT_SETTINGS }
};

function hasData(){ return Object.keys(state.sheets).length > 0; }

function loadSettings(){
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) { /* corrupted settings — keep defaults */ }
}

function saveSettings(){
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }
  catch (e) { toast('Could not save settings (storage unavailable)'); }
}

function sessionSnapshot(includeOtherSheets = true){
  const sheets = {};
  for (const [name, rows] of Object.entries(state.sheets)){
    if (!includeOtherSheets && state.model &&
        state.model.sheetModels[name] &&
        state.model.sheetModels[name].role === 'other') continue;
    sheets[name] = rows;
  }
  return JSON.stringify({
    fileName: state.fileName,
    sheets,
    client: state.client,
    period: state.period,
    notes: state.notes,
    edited: [...state.edited],
    adjusted: [...state.adjusted],
    signatory: state.signatory,
    savedAt: new Date().toISOString()
  });
}

const persist = debounce(() => {
  if (!hasData()){
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    return;
  }
  try {
    localStorage.setItem(SESSION_KEY, sessionSnapshot(true));
  } catch (e1) {
    try {
      localStorage.setItem(SESSION_KEY, sessionSnapshot(false));
      toast('Workbook is large — auto-saved without supplementary sheets');
    } catch (e2) {
      try { localStorage.removeItem(SESSION_KEY); } catch (e3) {}
      toast('Workbook too large to auto-save; edits will not survive a reload');
    }
  }
}, 500);

/* Returns true if a saved session was restored into state (caller re-analyzes). */
function restoreSession(){
  let raw = null;
  try { raw = localStorage.getItem(SESSION_KEY); } catch (e) { return false; }
  if (!raw) return false;
  try {
    const s = JSON.parse(raw);
    if (!s.sheets || !Object.keys(s.sheets).length) return false;
    state.fileName = s.fileName || '';
    state.sheets   = s.sheets;
    state.client   = s.client || 'Client';
    state.period   = s.period || 'For the period ended';
    state.notes    = s.notes  || '';
    state.edited   = new Set(s.edited   || []);
    state.adjusted = new Set(s.adjusted || []);
    state.signatory = { name: '', title: '', date: '', ...(s.signatory || {}) };
    return true;
  } catch (e) {
    try { localStorage.removeItem(SESSION_KEY); } catch (e2) {}
    return false;
  }
}

function clearSession(){
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

/* Full reset — everything except settings. */
function resetState(){
  state.fileName = '';
  state.sheets = {};
  state.model = null;
  state.active = '';
  state.client = 'Client';
  state.period = 'For the period ended';
  state.notes = '';
  state.edited = new Set();
  state.adjusted = new Set();
  state.signatory = { name: '', title: '', date: '' };
  state.reportPage = 0;
  clearSession();
}
