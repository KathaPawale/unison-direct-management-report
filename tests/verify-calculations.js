#!/usr/bin/env node
/* Unison Direct Management Report — calculation verification (no dependencies)
 *
 *   node tests/verify-calculations.js
 *
 * 1. Script chain   — every <script src="./src/..."> in index.html exists; no leftover patch scripts.
 * 2. Globals        — no function/const/let/class is declared in more than one loaded file
 *                     (a second copy silently replaces the first in the browser, or crashes the file).
 * 3. Calculations   — loads the real core files and compares every dashboard figure for synthetic
 *                     QuickBooks Online / QuickBooks Desktop / spreadsheet workbooks against values
 *                     computed independently (tests/calc-fixtures.json).
 * 4. Edits          — applies edits through computeImpact/applyImpact and checks Total Income,
 *                     Total Expenses, P&L Net Income and Balance Sheet Net Income move by exactly the edit.
 * Exit code 0 = all passed.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let failures = 0, checks = 0;
const fail = msg => { failures++; console.log('  FAIL ' + msg); };
const near = (tag, got, exp, tol = 0.011) => {
  checks++;
  if (got === null || got === undefined || typeof got !== 'number' || Math.abs(got - exp) > tol)
    fail(`${tag}: app=${got} expected=${Math.round(exp * 10000) / 10000}`);
};

/* ---------- 1. script chain ---------- */
console.log('1. Script chain (index.html)');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="\.\/(src\/[^"]+)"/g)].map(m => m[1]);
for (const s of scripts) if (!fs.existsSync(path.join(ROOT, s))) fail('missing file referenced by index.html: ' + s);
const EXPECTED = ['src/core/util.js', 'src/core/state.js', 'src/core/parser.js', 'src/core/financials.js', 'src/core/recompute.js',
  'src/core/groq.js', 'src/core/supabase.js', 'src/report/charts.js', 'src/report/report.js', 'src/report/exports.js', 'src/app.js'];
if (JSON.stringify(scripts) !== JSON.stringify(EXPECTED))
  fail('index.html script chain differs from the expected order:\n      found:    ' + scripts.join(', ') + '\n      expected: ' + EXPECTED.join(', '));
for (const dir of ['src/core', 'src/report']){
  for (const f of fs.readdirSync(path.join(ROOT, dir))){
    const rel = dir + '/' + f;
    if (f.endsWith('.js') && !EXPECTED.includes(rel)) fail('leftover script not used by the app (delete it): ' + rel);
  }
}
console.log(failures ? '' : '  ok');

/* ---------- 2. duplicate globals ---------- */
console.log('2. Duplicate global declarations');
const before2 = failures;
const decl = new Map();
for (const s of scripts){
  const src = fs.readFileSync(path.join(ROOT, s), 'utf8');
  for (const m of src.matchAll(/^(?:async\s+)?(?:function\s*\*?\s*([A-Za-z_$][\w$]*)|(?:const|let|var|class)\s+([A-Za-z_$][\w$]*))/gm)){
    const name = m[1] || m[2];
    if (!decl.has(name)) decl.set(name, []);
    decl.get(name).push(s);
  }
}
for (const [name, files] of decl) if (files.length > 1) fail(`"${name}" is declared in more than one file: ${files.join(', ')}`);
console.log(failures === before2 ? '  ok' : '');

/* ---------- 3. calculations ---------- */
console.log('3. Calculations against independently computed values');
const store = {};
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  document: { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {} }) },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  setTimeout, clearTimeout
};
ctx.window = ctx;
vm.createContext(ctx);
const core = ['src/core/util.js', 'src/core/state.js', 'src/core/parser.js', 'src/core/financials.js', 'src/core/recompute.js'];
try {
  /* One combined script = same shared global scope the browser gives separate <script> tags. */
  vm.runInContext(core.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
    '\n;globalThis.__api = { parseWorkbook, computeImpact, applyImpact, state };', ctx, { filename: 'core-bundle.js' });
} catch (e){
  fail('core files failed to load together: ' + e.message);
  console.log(`\n${checks} checks, ${failures} failures`);
  process.exit(1);
}
const api = ctx.__api;
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'calc-fixtures.json'), 'utf8'));
const norm = s => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
const clone = o => JSON.parse(JSON.stringify(o));

function load(sheets){
  api.state.sheets = sheets;
  const md = api.parseWorkbook(sheets);
  api.state.model = md;
  return md;
}
function verify(k, md){
  const e = data.expected[k];
  for (const [key, v] of Object.entries(e)){
    if (key.startsWith('m.')) near(`${k} ${key}`, md.metrics[key.slice(2)], v);
    else if (key.startsWith('p.')) near(`${k} ${key}`, md.prior[key.slice(2)], v);
    else if (key === 'monthlyRevenue' || key === 'monthlyNet'){
      const arr = md[key];
      if (arr.length !== v.length) fail(`${k} ${key} has ${arr.length} months, expected ${v.length}`);
      v.forEach((x, i) => near(`${k} ${key}[${i}]`, arr[i], x));
    } else if (key === 'cats'){
      const got = new Map(md.expenseGroups.map(x => [norm(x.label), x]));
      for (const [label, [val, pct]] of Object.entries(v)){
        const g = got.get(label);
        if (!g){ fail(`${k} expense category missing: ${label}`); continue; }
        near(`${k} expense ${label}`, g.value, val);
        near(`${k} expense % ${label}`, g.pct, pct);
      }
      if (got.size !== Object.keys(v).length) fail(`${k} expense categories: app has ${got.size}, expected ${Object.keys(v).length}`);
    } else if (key.startsWith('pct.')){
      const lab = key.slice(4);
      const item = [...md.bsComposition.assets, ...md.bsComposition.liabEquity].find(x => x.label === lab);
      if (item) near(`${k} ${lab} %`, item.pct, v);
      else if (Math.abs(v) > 0.005) fail(`${k} composition item missing: ${lab}`);
    }
  }
  near(`${k} liabilities bifurcation adds to 100%`, md.liabilityBifurcation.reduce((s, x) => s + x.pct, 0), 100);
}
for (const k of Object.keys(data.expected)){
  const b = failures;
  try { verify(k, load(clone(data.fixtures[k]))); } catch (e){ fail(`${k} crashed: ${e.stack}`); }
  console.log(`  ${k}: ${failures === b ? 'ok' : 'FAILED'}`);
}
/* cash-basis A/R suppression + asset composition with separate accumulated depreciation */
{
  const b = failures;
  const md = load(clone(data.fixtures.F));
  checks++; if (md.arAging !== null || md.metrics.ar !== null) fail('F cash basis: A/R must not appear');
  data.extra.F.assetsPct.forEach((p, i) => near(`F asset % [${i}]`, md.bsComposition.assets[i] && Math.round(md.bsComposition.assets[i].pct * 100) / 100, p, 0.006));
  checks++; if (md.bsComposition.assets.length !== 2) fail('F asset donut must have only Current and Fixed Assets');
  console.log(`  F (cash basis / accumulated depreciation): ${failures === b ? 'ok' : 'FAILED'}`);
}
{
  const b = failures;
  const md = load(clone(data.fixtures.ML));
  checks++; if (!md.apAging) fail('ML A/P aging detail was not summarised');
  else { near('ML A/P aging total', md.apAging.total, data.extra.ML.apAgingTotal); checks++; if (md.apAging.buckets.length !== data.extra.ML.apBuckets) fail('ML A/P bucket count'); }
  console.log(`  ML (aging detail): ${failures === b ? 'ok' : 'FAILED'}`);
}

/* ---------- 4. edits ---------- */
console.log('4. Edit recalculation (Review & Edit)');
const specs = { A: ['Balance Sheet', 1], B: ['Balance Sheet', 2], C: ['Balance Sheet', 5], D: ['Balance Sheet', 1], R: ['Balance Sheet', 1] };
const cellNum = v => { if (typeof v === 'number') return v; const s = String(v ?? '').replace(/[$,]/g, '').trim(); const n = s.startsWith('(') ? -parseFloat(s.slice(1)) : parseFloat(s); return isNaN(n) ? 0 : n; };
for (const ed of data.edits){
  const b = failures;
  try {
    const sheets = clone(data.fixtures[ed.fixture]);
    const md0 = load(sheets);
    const m0 = { ...md0.metrics };
    const bsRows = sheets[specs[ed.fixture][0]];
    const bsNi = rows => { const r = rows.find(x => x && x.slice(0, 5).some(c => typeof c === 'string' && norm(c) === 'net income')); return cellNum(r[specs[ed.fixture][1]]); };
    const ni0 = bsNi(bsRows);
    const r = sheets[ed.sheet].findIndex(x => x && x.slice(0, 5).some(c => typeof c === 'string' && norm(c) === norm(ed.label)));
    const old = cellNum(sheets[ed.sheet][r][ed.col]);
    const imp = api.computeImpact(ed.sheet, r, ed.col, old, old + ed.delta);
    if (imp.blocked) fail(`edit ${ed.fixture}/${ed.label} was blocked: ${imp.blockReason}`);
    sheets[ed.sheet][r][ed.col] = Math.round((old + ed.delta) * 100) / 100;
    api.applyImpact(imp.steps);
    const md1 = load(sheets);
    const d = ed.delta, inc = ed.kind === 'income', oth = ed.kind === 'other';
    near(`edit ${ed.fixture}/${ed.label}: Total Income change`, md1.metrics.income - m0.income, inc ? d : 0);
    near(`edit ${ed.fixture}/${ed.label}: Total Expenses change`, md1.metrics.expenses - m0.expenses, (inc || oth) ? 0 : d);
    near(`edit ${ed.fixture}/${ed.label}: P&L Net Income change`, md1.metrics.net - m0.net, inc ? d : -d);
    near(`edit ${ed.fixture}/${ed.label}: Balance Sheet Net Income change`, bsNi(sheets[specs[ed.fixture][0]]) - ni0, inc ? d : -d);
  } catch (e){ fail(`edit ${ed.fixture}/${ed.label} crashed: ${e.stack}`); }
  console.log(`  ${ed.fixture} ${ed.label} ${ed.delta > 0 ? '+' : ''}${ed.delta}: ${failures === b ? 'ok' : 'FAILED'}`);
}

console.log(`\n${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
