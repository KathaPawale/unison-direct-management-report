/* Unison Direct Management Reporting — shared utilities */
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const MONTHS_FALLBACK = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function money(n){
  const v = Number(n || 0);
  const a = Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  return v < 0 ? `($${a})` : `$${a}`;
}

/* Compact money for chart labels: $1.2M / $45K / $980 */
function moneyShort(n){
  const v = Number(n || 0), a = Math.abs(v), sign = v < 0 ? '-' : '';
  if (a >= 1e6) return sign + '$' + (a / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return sign + '$' + (a / 1e3).toFixed(0) + 'K';
  return sign + '$' + a.toFixed(0);
}

function pct(n, dp = 2){
  return (Number(n) || 0).toFixed(dp) + '%';
}

/* Parse "$1,234.00", "(500)", "-1,234.56" → number; '' / text → NaN-safe 0 */
function num(v){
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v === null || v === undefined) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)){ neg = true; s = s.slice(1, -1); }
  s = s.replace(/[$,\s]/g, '');
  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return neg ? -n : n;
}

/* Is the raw cell value numeric-ish (so we know to store it back as a number)? */
function isNumericCell(v){
  if (typeof v === 'number') return true;
  if (v === null || v === undefined || String(v).trim() === '') return false;
  return /^\(?-?\$?[\d,]+(?:\.\d+)?\)?$/.test(String(v).trim());
}

function round2(n){ return Math.round((Number(n) || 0) * 100) / 100; }

function escapeHtml(v){
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttr(v){ return escapeHtml(v); }

function debounce(fn, ms){
  let t = null;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

let _toastTimer = null;
function toast(msg){
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* "Jan 2026" → "Jan" (short label for chart axes) */
function shortMonthLabel(label){
  const m = String(label || '').match(/^([A-Z][a-z]{2})/);
  return m ? m[1] : String(label || '');
}
