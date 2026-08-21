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
  sheets: {},
  model: null,
  active: '',
  client: 'Client',
  period: 'For the period ended',
  basis: 'Amounts in US Dollars ($)',
  notes: '',
  edited: new Set(),
  adjusted: new Set(),
  signatory: { name: '', title: '', date: '' },
  reportPage: 0,
  settings: { ...DEFAULT_SETTINGS }
};

function hasData(){ return Object.keys(state.sheets).length > 0; }

function loadSettings(){
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {}
}

function saveSettings(){
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }
  catch (e) { toast('Could not save settings (storage unavailable)'); }
}

function sessionSnapshot(includeOtherSheets = true){
  const sheets = {};
  for (const [name, rows] of Object.entries(state.sheets)){
    if (!includeOtherSheets && state.model && state.model.sheetModels[name] && state.model.sheetModels[name].role === 'other') continue;
    sheets[name] = rows;
  }
  return JSON.stringify({
    fileName: state.fileName,
    sheets,
    client: state.client,
    period: state.period,
    basis: state.basis,
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

/* Deliberately do not restore old report data when the site opens.
 * Every fresh page load starts blank and waits for a new workbook upload.
 * Settings (such as Groq/model preferences) are still loaded separately. */
function restoreSession(){
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  return false;
}

function clearSession(){
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

function resetState(){
  state.fileName = '';
  state.sheets = {};
  state.model = null;
  state.active = '';
  state.client = 'Client';
  state.period = 'For the period ended';
  state.basis = 'Amounts in US Dollars ($)';
  state.notes = '';
  state.edited = new Set();
  state.adjusted = new Set();
  state.signatory = { name: '', title: '', date: '' };
  state.reportPage = 0;
  clearSession();
}
