#!/usr/bin/env node
/* Generated-workbook verification — does the tool work for ANY sheet, not just the client fixtures?
 *
 *   node tests/verify-generated-workbooks.js [count=400] [seed=20260924]
 *
 * Builds `count` random but internally consistent workbooks (P&L + Balance Sheet) whose true figures are
 * known in advance, varying everything a client export varies:
 *   layout   QuickBooks Online ("Total for X", one label column), QuickBooks Desktop (levels across
 *            columns, account codes, "Total X", spacer columns), indented labels, plain spreadsheet
 *   columns  single period, comparative (current / PY / change / % change), 1–12 monthly + Total
 *   content  optional COGS, Other Income, Other Expenses, sub-accounts, refunds (negative lines), net
 *            losses, negative equity, fixed assets with accumulated depreciation, other/long-term
 *            liabilities, cash / accrual / no basis line
 * and checks, for each one, with the real parser + financials + report code:
 *   - it parses without an error and finds the P&L (right type) and the Balance Sheet
 *   - every dashboard figure equals the true figure (income, COGS, gross, expenses, other, net income,
 *     bank, A/R, A/P, assets, current/fixed, liabilities, current/long-term, equity, total L&E)
 *   - monthly series and prior-year figures equal the truth; no prior year when none was uploaded
 *   - expense breakdown sums to total expenses, every share = value ÷ total × 100, none above 100%
 *   - liabilities bifurcation and composition shares add up and stay within ±100%
 *   - every statement table cell is in the financial format ($1,234.56 / ($1,234.56), 12.5% / (12.5%),
 *     "–" for a zero account line) and every negative carries the red "neg" class
 *   - the cover basis matches the basis line
 * Exit code 0 = every workbook passed. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const COUNT = +(process.argv[2] || 400), SEED = +(process.argv[3] || 20260924);

const ctx = {
  console: { log() {}, warn() {}, error() {} },
  document: { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {} }), getElementById: () => null, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout, clearTimeout
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(['src/core/util.js', 'src/core/state.js', 'src/core/parser.js', 'src/core/financials.js', 'src/core/recompute.js',
  'src/report/charts.js', 'src/report/report.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n') +
  '\n;globalThis.__api = { parseWorkbook, state, resetState, reportBasis, reportTableParts, displayColumns, reportSections, dataChecks, visibleSheetNames, reportListingSheets, reportStatementTitles };', ctx);
const XLSX = require('xlsx-js-style/dist/xlsx.bundle.js');
const api = ctx.__api;

/* ---------- deterministic random ---------- */
let seed = SEED;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const chance = p => rnd() < p;
const amt = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
const r2 = n => Math.round(n * 100) / 100;
const sumv = (a, b) => a.map((x, i) => r2(x + b[i]));
const zeros = n => Array(n).fill(0);

/* ---------- statement model: nodes {name, vals} or {name, children} ---------- */
function makeAccounts(names, n, lo, hi, { refunds = false, subs = false } = {}){
  const used = new Set(), out = [];
  const count = 1 + Math.floor(rnd() * Math.min(names.length, 6));
  for (let i = 0; i < count; i++){
    let nm = pick(names); while (used.has(nm)) nm = pick(names); used.add(nm);
    if (subs && chance(0.25)){
      const kids = [];
      for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) kids.push({ name: nm + ' - ' + pick(['Wages', 'Taxes', 'Benefits', 'Fees', 'Other', 'Travel', 'Supplies']) + ' ' + (k + 1), vals: Array.from({ length: n }, () => amt(lo, hi)) });
      out.push({ name: nm, children: kids });
    } else {
      const v = Array.from({ length: n }, () => amt(lo, hi));
      if (refunds && chance(0.12)) v.forEach((x, i) => { v[i] = -r2(x * 0.3); });
      out.push({ name: nm, vals: v });
    }
  }
  return out;
}
const total = (nodes, n) => nodes.reduce((s, x) => sumv(s, x.children ? total(x.children, n) : x.vals), zeros(n));

const INCOME = ['Uncategorized Income', 'Sales', 'Service Revenue', 'Consulting Income', 'Rental Income', 'Product Sales', 'Commission Income', 'Management Fees'];
const COGS = ['Materials', 'Parts', 'Direct Labor', 'Freight In', 'Subcontractors - COS'];
const EXP = ['Uncategorized Expense', 'Rent', 'Payroll Expenses', 'Insurance', 'Utilities', 'Office Supplies', 'Advertising', 'Legal & Professional Fees', 'Bank Service Charges', 'Repairs and Maintenance', 'Travel', 'Meals', 'Telephone', 'Software', 'Depreciation', 'Dues and Subscriptions', 'Interest Expense', 'Taxes and Licenses'];
const OINC = ['Interest Income', 'Gain on Sale', 'Miscellaneous Income'];
const OEXP = ['Penalties', 'Loss on Disposal', 'Other Miscellaneous Expense'];

function makePL(n){
  const scale = pick([1, 10, 100, 1000]);
  const pl = { income: makeAccounts(INCOME, n, 500 * scale, 9000 * scale) };
  if (chance(0.5)) pl.cogs = makeAccounts(COGS, n, 50 * scale, 1500 * scale);
  const lossy = chance(0.25);
  pl.expenses = makeAccounts(EXP, n, (lossy ? 900 : 100) * scale, (lossy ? 6000 : 2500) * scale, { refunds: true, subs: true });
  if (chance(0.35)) pl.otherIncome = makeAccounts(OINC, n, 10 * scale, 400 * scale);
  if (chance(0.35)) pl.otherExpenses = makeAccounts(OEXP, n, 10 * scale, 400 * scale);
  const t = k => pl[k] ? total(pl[k], n) : null;
  const T = { income: t('income'), cogs: t('cogs'), expenses: t('expenses'), otherIncome: t('otherIncome'), otherExpenses: t('otherExpenses') };
  T.gross = T.cogs ? T.income.map((x, i) => r2(x - T.cogs[i])) : T.income.slice();
  T.noi = T.gross.map((x, i) => r2(x - T.expenses[i]));
  T.netOther = zeros(n).map((_, i) => r2((T.otherIncome ? T.otherIncome[i] : 0) - (T.otherExpenses ? T.otherExpenses[i] : 0)));
  T.net = T.noi.map((x, i) => r2(x + T.netOther[i]));
  return { pl, T };
}

function makeBS(n, netIncome){
  const scale = pick([1, 10, 100, 1000]);
  const bank = [{ name: pick(['Business Checking', 'Operating Account', 'Chase Checking']), vals: Array.from({ length: n }, () => amt(1000 * scale, 60000 * scale)) }];
  if (chance(0.5)) bank.push({ name: pick(['Savings', 'Money Market']), vals: Array.from({ length: n }, () => amt(100 * scale, 20000 * scale)) });
  const hasAR = chance(0.7), hasAP = chance(0.7);
  const ar = hasAR ? [{ name: 'Accounts Receivable (A/R)', vals: Array.from({ length: n }, () => amt(500 * scale, 30000 * scale)) }] : null;
  const oca = chance(0.5) ? [{ name: pick(['Prepaid Expenses', 'Undeposited Funds', 'Inventory Asset']), vals: Array.from({ length: n }, () => amt(100 * scale, 9000 * scale)) }] : null;
  const fixed = chance(0.7) ? (() => { const cost = Array.from({ length: n }, () => amt(5000 * scale, 90000 * scale));
    return [{ name: 'Equipment', vals: cost }, { name: 'Accumulated Depreciation', vals: cost.map(x => -r2(x * (0.1 + rnd() * 0.6))) }]; })() : null;
  const ap = hasAP ? [{ name: 'Accounts Payable (A/P)', vals: Array.from({ length: n }, () => amt(200 * scale, 20000 * scale)) }] : null;
  const ocl = chance(0.6) ? [{ name: pick(['Credit Card', 'Payroll Liabilities', 'Sales Tax Payable']), vals: Array.from({ length: n }, () => amt(100 * scale, 15000 * scale)) }] : null;
  const ltl = chance(0.6) ? [{ name: pick(['Business Loan', 'SBA Loan', 'Note Payable']), vals: Array.from({ length: n }, () => amt(5000 * scale, 150000 * scale)) }] : null;
  const T = {};
  T.bank = total(bank, n);
  T.ar = ar ? total(ar, n) : null;
  T.currentAssets = [bank, ar, oca].filter(Boolean).reduce((s, g) => sumv(s, total(g, n)), zeros(n));
  T.fixedAssets = fixed ? total(fixed, n) : null;
  T.assets = sumv(T.currentAssets, T.fixedAssets || zeros(n));
  T.ap = ap ? total(ap, n) : null;
  T.currentLiabilities = [ap, ocl].filter(Boolean).length ? [ap, ocl].filter(Boolean).reduce((s, g) => sumv(s, total(g, n)), zeros(n)) : null;
  T.longTermLiabilities = ltl ? total(ltl, n) : null;
  T.liabilities = sumv(T.currentLiabilities || zeros(n), T.longTermLiabilities || zeros(n));
  /* Equity balances the sheet: opening balance + retained earnings (may be negative) + net income */
  const ni = netIncome.slice(0, n);
  const obe = Array.from({ length: n }, () => amt(1000 * scale, 10000 * scale));
  const re = T.assets.map((a, i) => r2(a - T.liabilities[i] - obe[i] - ni[i] - (chance(0.2) ? a * 1.2 : 0)));
  const equity = [{ name: 'Opening Balance Equity', vals: obe }, { name: 'Retained Earnings', vals: re }, { name: 'Net Income', vals: ni }];
  T.equity = total(equity, n);
  T.totalLE = sumv(T.liabilities, T.equity);
  /* when negative equity was forced, assets no longer match — rebalance with a plug so assets = L + E */
  const diff = T.totalLE.map((x, i) => r2(x - T.assets[i]));
  if (diff.some(d => Math.abs(d) >= 0.005)){ bank[0].vals = bank[0].vals.map((v, i) => r2(v + diff[i])); T.bank = total(bank, n);
    T.currentAssets = sumv(T.currentAssets, diff); T.assets = sumv(T.assets, diff); }
  const bs = { assets: { current: { bank, ar, oca }, fixed }, liabilities: { current: { ap, ocl }, ltl }, equity };
  return { bs, T };
}

/* ---------- render a statement tree as rows in a given layout ---------- */
function render(style, title, client, period, header, blocks, basisLine){
  /* blocks: [{kind:'section', name, level} | {kind:'account', name, level, vals} | {kind:'total', name, level, vals}] */
  const depth = Math.max(...blocks.map(b => b.level)) + 1;
  const rows = [];
  if (style !== 'plain' || chance(0.7)) rows.push([client], [title], [period]);
  if (style === 'qbd' && basisLine) rows.push([basisLine]); else rows.push([]);
  const spacer = style === 'qbd' && chance(0.6);
  const valCells = vals => spacer ? vals.flatMap((v, i) => i ? ['', v] : [v]) : vals;
  const labelCols = style === 'qbd' ? depth + 1 : 1;
  rows.push([...Array(labelCols).fill(''), ...valCells(header)].map((x, i) => i === 0 && style !== 'qbd' ? (style === 'qbo' ? 'Distribution account' : '') : x));
  for (const b of blocks){
    const label = style === 'indent' ? '   '.repeat(b.level) + b.name : b.name;
    const lead = style === 'qbd' ? [...Array(b.level + 1).fill(''), label, ...Array(labelCols - b.level - 2).fill('')] : [label];
    rows.push(b.kind === 'section' ? lead : [...lead, ...valCells(b.vals)]);
  }
  if (basisLine && style !== 'qbd'){ rows.push([]); rows.push([basisLine]); }
  return rows;
}
const code = (style, i) => style === 'qbd' && chance(0.5) ? (4000 + i * 10) + ' · ' : '';
const totalName = (style, name) => style === 'qbo' ? 'Total for ' + name : 'Total ' + name;

function treeBlocks(style, nodes, level, colsOf, i0 = 0){
  const out = [];
  nodes.forEach((x, i) => {
    const nm = code(style, i0 + i) + x.name;
    if (x.children){
      out.push({ kind: 'section', name: nm, level });
      out.push(...treeBlocks(style, x.children, level + 1, colsOf, i0 + i * 7));
      out.push({ kind: 'total', name: totalName(style, nm), level, vals: colsOf(total(x.children, x.children[0].vals.length)) });
    } else out.push({ kind: 'account', name: nm, level, vals: colsOf(x.vals) });
  });
  return out;
}

/* ---------- one generated case ---------- */
function makeCase(id){
  const style = pick(['qbo', 'qbd', 'indent', 'plain']);
  const layout = pick(['single', 'comparative', 'monthly']);
  const months = layout === 'monthly' ? 1 + Math.floor(rnd() * 12) : 1;
  const n = layout === 'comparative' ? 2 : months;              // value periods
  const year = 2019 + Math.floor(rnd() * 8);
  const basis = pick(['Cash', 'Accrual', null]);
  const basisLine = basis ? `${basis} Basis ${pick(['Monday, February 3, 2026 10:14 AM GMT-06:00', 'Friday, January 16, 2026', ''])}`.trim() : null;
  const client = pick(['Pluto Asset Recovery', 'Acme Holdings, LLC', 'Riverside Dental PC', 'Northwind Traders Inc.', 'Blue Harbor Logistics']) + ' ' + id;
  const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const period = layout === 'monthly' ? `January - ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][months - 1]} ${year}` : `January - December ${year}`;

  const { pl, T: PT } = makePL(n);
  /* columns shown for P&L */
  let header, colsOf;
  if (layout === 'single'){ header = [pick(['Total', `Jan - Dec ${year}`])]; colsOf = v => [v[0]]; }
  else if (layout === 'comparative'){
    const pctText = chance(0.5);
    header = [`Jan - Dec ${year}`, `Jan - Dec ${year - 1} (PY)`, 'Change', '% Change'];
    colsOf = v => [v[0], v[1], r2(v[0] - v[1]), v[1] ? (pctText ? ((v[0] - v[1]) / Math.abs(v[1]) * 100).toFixed(1) + '%' : r2((v[0] - v[1]) / Math.abs(v[1]) * 100)) : ''];
  } else {
    header = [...MN.slice(0, months).map(m => `${m} ${year}`), 'Total'];
    colsOf = v => [...v, r2(v.reduce((s, x) => s + x, 0))];
  }
  const blocks = [];
  const sec = (key, name) => {
    if (!pl[key]) return;
    blocks.push({ kind: 'section', name, level: 0 });
    blocks.push(...treeBlocks(style, pl[key], 1, colsOf));
    blocks.push({ kind: 'total', name: totalName(style, name), level: 0, vals: colsOf(PT[key]) });
  };
  sec('income', 'Income'); sec('cogs', 'Cost of Goods Sold');
  if (pl.cogs || style !== 'plain') blocks.push({ kind: 'total', name: 'Gross Profit', level: 0, vals: colsOf(PT.gross) });
  sec('expenses', 'Expenses');
  if (pl.otherIncome || pl.otherExpenses){
    blocks.push({ kind: 'total', name: 'Net Operating Income', level: 0, vals: colsOf(PT.noi) });
    sec('otherIncome', 'Other Income'); sec('otherExpenses', 'Other Expenses');
    blocks.push({ kind: 'total', name: 'Net Other Income', level: 0, vals: colsOf(PT.netOther) });
  }
  blocks.push({ kind: 'total', name: 'Net Income', level: 0, vals: colsOf(PT.net) });
  const plTitle = layout === 'monthly' ? 'Profit and Loss by Month' : 'Profit and Loss';
  const plRows = render(style, 'Profit and Loss', client, period, header, blocks, basisLine);

  /* Balance Sheet: comparative when the P&L is, else a single "Total" column (year-end net income) */
  const bn = layout === 'comparative' ? 2 : 1;
  const niForBs = layout === 'comparative' ? PT.net : [r2(PT.net.reduce((s, x) => s + x, 0))];
  const { bs, T: BT } = makeBS(bn, niForBs);
  const bHead = bn === 2 ? [`As of Dec 31, ${year}`, `As of Dec 31, ${year - 1} (PY)`] : ['Total'];
  const bCols = v => v.slice(0, bn);
  const bb = [];
  const grp = (name, nodes, level) => { if (!nodes) return; bb.push({ kind: 'section', name, level }); bb.push(...treeBlocks(style, nodes, level + 1, bCols)); bb.push({ kind: 'total', name: totalName(style, name), level, vals: bCols(total(nodes, bn)) }); };
  bb.push({ kind: 'section', name: 'Assets', level: 0 }, { kind: 'section', name: 'Current Assets', level: 1 });
  grp('Bank Accounts', bs.assets.current.bank, 2);
  if (bs.assets.current.ar) grp('Accounts Receivable', bs.assets.current.ar, 2);
  if (bs.assets.current.oca) grp('Other Current Assets', bs.assets.current.oca, 2);
  bb.push({ kind: 'total', name: totalName(style, 'Current Assets'), level: 1, vals: bCols(BT.currentAssets) });
  if (bs.assets.fixed) grp('Fixed Assets', bs.assets.fixed, 1);
  bb.push({ kind: 'total', name: totalName(style, 'Assets'), level: 0, vals: bCols(BT.assets) });
  bb.push({ kind: 'section', name: 'Liabilities and Equity', level: 0 }, { kind: 'section', name: 'Liabilities', level: 1 });
  if (BT.currentLiabilities){
    bb.push({ kind: 'section', name: 'Current Liabilities', level: 2 });
    if (bs.liabilities.current.ap) grp('Accounts Payable', bs.liabilities.current.ap, 3);
    if (bs.liabilities.current.ocl) grp('Other Current Liabilities', bs.liabilities.current.ocl, 3);
    bb.push({ kind: 'total', name: totalName(style, 'Current Liabilities'), level: 2, vals: bCols(BT.currentLiabilities) });
  }
  if (bs.liabilities.ltl) grp('Long-Term Liabilities', bs.liabilities.ltl, 2);
  bb.push({ kind: 'total', name: totalName(style, 'Liabilities'), level: 1, vals: bCols(BT.liabilities) });
  grp('Equity', bs.equity, 1);
  bb.push({ kind: 'total', name: totalName(style, 'Liabilities and Equity'), level: 0, vals: bCols(BT.totalLE) });
  const bsRows = render(style, 'Balance Sheet', client, `As of December 31, ${year}`, bHead, bb, basisLine);

  let sheets = { [plTitle]: plRows, 'Balance Sheet': bsRows };
  /* Companion P&L tabs (user, 2026-10-15/21: "1. P&L", "2. P&L monthly", "3. P&L income" — every P&L tab must reach the
   * report and the figures must stay right): the same truth as a full-period P&L and / or a "% of Income" P&L, under
   * numbered or plain names, in a random tab order. A separate random source keeps the base cases unchanged. */
  const extra = [];
  let xs = (SEED ^ (id * 2654435761)) | 0;
  const xr = () => { xs = (xs + 0x6D2B79F5) | 0; let t = Math.imul(xs ^ (xs >>> 15), 1 | xs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const xpick = a => a[Math.floor(xr() * a.length)];
  if (xr() < 0.5){
    const tot = v => layout === 'monthly' ? r2(v.reduce((a, x) => a + x, 0)) : v[0];
    const inc = tot(PT.income);
    const blocksFor = cols => {
      const out = [];
      const sec2 = (key, name) => { if (!pl[key]) return; out.push({ kind: 'section', name, level: 0 }); out.push(...treeBlocks(style, pl[key], 1, cols)); out.push({ kind: 'total', name: totalName(style, name), level: 0, vals: cols(PT[key]) }); };
      sec2('income', 'Income'); sec2('cogs', 'Cost of Goods Sold');
      if (pl.cogs || style !== 'plain') out.push({ kind: 'total', name: 'Gross Profit', level: 0, vals: cols(PT.gross) });
      sec2('expenses', 'Expenses');
      if (pl.otherIncome || pl.otherExpenses){
        out.push({ kind: 'total', name: 'Net Operating Income', level: 0, vals: cols(PT.noi) });
        sec2('otherIncome', 'Other Income'); sec2('otherExpenses', 'Other Expenses');
        out.push({ kind: 'total', name: 'Net Other Income', level: 0, vals: cols(PT.netOther) });
      }
      out.push({ kind: 'total', name: 'Net Income', level: 0, vals: cols(PT.net) });
      return out;
    };
    const per = `Jan - ${layout === 'monthly' ? MN[months - 1] : 'Dec'} ${year}`;
    if (layout === 'monthly' && months > 1)
      extra.push({ kind: 'full', names: ['P&L', 'Profit and Loss', 'PL', 'Income Statement'], rows: render(style, 'Profit and Loss', client, period, [per], blocksFor(v => [tot(v)]), basisLine) });
    if (inc){
      const pctCell = v => (tot(v) / inc * 100).toFixed(2) + '%';
      extra.push({ kind: 'pct', names: ['P&L income', 'PL (% Income)', 'Profit and Loss % of Income', 'P&L (% of Income)'], pctOf: v => r2(tot(v) / inc * 100),
        rows: render(style, 'Profit and Loss % of Total Income', client, period, [per, '% of Income'], blocksFor(v => [tot(v), pctCell(v)]), basisLine) });
    }
    if (extra.length){
      const numbered = xr() < 0.5;
      const mainName = numbered ? (layout === 'monthly' ? xpick(['P&L monthly', 'P&L Monthly', 'PL_MoM', 'Profit and Loss(Monthly)']) : layout === 'comparative' ? xpick(['P&L comparative', 'PL_Comparative']) : xpick(['P&L', 'Profit and Loss'])) : plTitle;
      const tabs = [[mainName, plRows], ...extra.map(x => [xpick(x.names), x.rows, x])];
      for (let k = tabs.length - 1; k > 0; k--){ const j = Math.floor(xr() * (k + 1)); [tabs[k], tabs[j]] = [tabs[j], tabs[k]]; }
      const used = new Set(); sheets = {};
      tabs.forEach(([nm, rows, x], k) => {
        let name = numbered ? `${k + 1}. ${nm}` : nm;
        while (used.has(name) || name === 'Balance Sheet') name += ' (2)';
        used.add(name); sheets[name] = rows; if (x) x.tab = name; else extra.mainTab = name;
      });
      sheets['Balance Sheet'] = bsRows;
      /* Greenwood layout (user, 2026-10-21): "Uncategorized" transaction tabs and Uncategorized lines in the P&L, so the P&L
       * names three other tabs — it must stay the P&L, never be taken for the workbook's index. */
      if (xr() < 0.5){
        const LH = ['Transaction date', 'Transaction type', 'Name', 'Description', 'Amount'];
        sheets['Uncategorized Income'] = [[client], ['Transaction Report'], [], LH, ['03/25/2026', 'Deposit', 'Tenant', 'Deposit', 100]];
        sheets['Uncategorized Exp'] = [[client], ['Transaction Report'], [], LH, ['02/04/2026', 'Expense', 'Vendor', 'Card', 50]];
        extra.uncategorizedTabs = true;
      }
    }
  }
  /* Hidden tabs (user, 2026-10-21: a hidden "Uncategorized" list and an old P&L copy were printed and replaced the real
   * figures): some workbooks also carry tabs hidden in Excel with wrong figures; only the visible tabs may be read. */
  const hidden = {};
  if (xr() < 0.35){
    const junk = v => [['Old copy'], ['', 'Total'], ['Sales', v], ['Total Income', v], ['Rent', 1], ['Total Expenses', 1], ['Net Income', v - 1]];
    const opts = [
      ['Old PL', () => junk(987654.32)], ['P&L (old)', () => junk(123456.78)],
      ['Uncategorized Exp', () => [['Client'], ['Uncategorized Expenses'], [], ['Transaction date', 'Type', 'Name', 'Description', 'Amount'], ['01/05/2026', 'Expense', 'Vendor', 'Card', 250]]],
      ['BS old', () => [['Old'], ['Balance Sheet'], ['', 'Total'], ['Checking', 5], ['Total Assets', 5], ['Total Liabilities', 0], ['Retained Earnings', 5], ['Total Equity', 5], ['Total Liabilities and Equity', 5]]]];
    for (const [nm, mk] of opts) if (xr() < 0.5 && !sheets[nm]) hidden[nm] = { rows: mk(), level: xr() < 0.5 ? 1 : 2 };
  }
  /* Any tab order (the Balance Sheet first, P&L tabs in any order): the report must follow it. */
  if (xr() < 0.4){
    const keys = Object.keys(sheets);
    for (let k = keys.length - 1; k > 0; k--){ const j = Math.floor(xr() * (k + 1)); [keys[k], keys[j]] = [keys[j], keys[k]]; }
    const re = {}; for (const k of keys) re[k] = sheets[k]; sheets = re;
  }
  return { id, style, layout, months, basis, sheets, PT, BT, pl, extra, hidden };
}

/* ---------- checks ---------- */
const MONEY = /^\(\$\d{1,3}(,\d{3})*\.\d{2}\)$|^\$\d{1,3}(,\d{3})*\.\d{2}$/;
const PCT = /^\(\d{1,3}(,\d{3})*\.\d%\)$|^\d{1,3}(,\d{3})*\.\d%$/;   // 1,536.9% has its thousands separator
let failed = 0;
const failures = [];
const stats = {};
const written = [];
for (let i = 1; i <= COUNT; i++){
  const tc = makeCase(i);
  if (process.env.WRITE) written.push({ id: i, style: tc.style, layout: tc.layout, sheets: tc.sheets });
  const tag = `#${i} ${tc.style}/${tc.layout}${tc.layout === 'monthly' ? tc.months : ''}/${tc.basis || 'no-basis'}`;
  stats[tc.style + '/' + tc.layout] = (stats[tc.style + '/' + tc.layout] || 0) + 1;
  if (Object.keys(tc.sheets)[0] === 'Balance Sheet') stats['+Balance Sheet first'] = (stats['+Balance Sheet first'] || 0) + 1;
  if (tc.extra && tc.extra.uncategorizedTabs) stats['+Uncategorized tabs'] = (stats['+Uncategorized tabs'] || 0) + 1;
  if (Object.keys(tc.hidden).length) stats['+hidden tabs'] = (stats['+hidden tabs'] || 0) + 1;
  if (tc.extra && tc.extra.length){ stats['+companion P&L tabs'] = (stats['+companion P&L tabs'] || 0) + 1; if (tc.extra.some(x => x.kind === 'full')) stats['+full-period P&L tab'] = (stats['+full-period P&L tab'] || 0) + 1; if (/^1\. /.test(Object.keys(tc.sheets)[0])) stats['+numbered tab names'] = (stats['+numbered tab names'] || 0) + 1; }
  const F = [];
  const near = (label, got, exp, tol = 0.011) => {
    if (exp === null || exp === undefined) return;
    if (got === null || got === undefined || Math.abs(got - exp) > tol) F.push(`${label}: app ${got} ≠ true ${r2(exp)}`);
  };
  let md;
  try {
    api.resetState();
    if (Object.keys(tc.hidden).length){
      /* Written to a real .xlsx with the hidden tabs and read back the way an upload is (visible tabs only). */
      const wb = XLSX.utils.book_new();
      for (const [n, rows] of Object.entries(tc.sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), n);
      for (const [n, { rows }] of Object.entries(tc.hidden)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), n);
      wb.Workbook = { Sheets: wb.SheetNames.map(n => ({ name: n, Hidden: tc.hidden[n] ? tc.hidden[n].level : 0 })) };
      const back = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
      const vis = api.visibleSheetNames(back);
      for (const n of Object.keys(tc.hidden)) if (vis.includes(n)) F.push(`hidden tab "${n}" read`);
      if (vis.join('|') !== Object.keys(tc.sheets).join('|')) F.push(`visible tabs ${vis.join(', ')} ≠ ${Object.keys(tc.sheets).join(', ')}`);
      const sheets = {};
      for (const n of vis) sheets[n] = XLSX.utils.sheet_to_json(back.Sheets[n], { header: 1, raw: true, defval: '' });
      api.state.sheets = sheets;
    } else api.state.sheets = JSON.parse(JSON.stringify(tc.sheets));
    md = api.parseWorkbook(api.state.sheets); api.state.model = md;
  } catch (e){ F.push('parse error: ' + e.message); }
  if (md){
    const m = md.metrics, P = tc.PT, B = tc.BT;
    const wantRole = tc.layout === 'monthly' && tc.months > 1 ? 'plMonthly' : tc.layout === 'comparative' ? 'plComparative' : null;
    const plRole = ['plMonthly', 'plComparative', 'pl'].find(r => md.roles[r]);
    if (!plRole) F.push('P&L not detected');
    else if (wantRole && plRole !== wantRole) F.push(`P&L detected as ${plRole}, expected ${wantRole}`);
    if (!md.roles.bs) F.push('Balance Sheet not detected');
    const cur = v => v ? (tc.layout === 'monthly' ? r2(v.reduce((s, x) => s + x, 0)) : v[0]) : null;
    near('income', m.income, cur(P.income)); near('cogs', m.cogs, cur(P.cogs)); near('gross', m.gross, cur(P.gross));
    near('expenses', m.expenses, cur(P.expenses)); near('otherIncome', m.otherIncome, cur(P.otherIncome));
    near('otherExpenses', m.otherExpenses, cur(P.otherExpenses)); near('net income', m.net, cur(P.net));
    const b0 = v => v ? v[0] : null;
    near('bank', m.bank, b0(B.bank)); near('assets', m.assets, b0(B.assets)); near('current assets', m.currentAssets, b0(B.currentAssets));
    near('fixed assets', m.fixedAssets, b0(B.fixedAssets)); near('liabilities', m.liabilities, b0(B.liabilities));
    near('current liabilities', m.currentLiabilities, b0(B.currentLiabilities)); near('long-term liabilities', m.longTermLiabilities, b0(B.longTermLiabilities));
    near('equity', m.equity, b0(B.equity)); near('total L&E', m.totalLE, b0(B.totalLE)); near('A/P', m.ap, b0(B.ap));
    if (tc.basis === 'Cash'){ if (m.ar !== null) F.push('A/R shown for a cash-basis workbook'); }
    else near('A/R', m.ar, b0(B.ar));
    /* prior year */
    if (tc.layout === 'comparative'){ near('prior income', md.prior.income, P.income[1]); near('prior net income', md.prior.net, P.net[1]); }
    else if (md.hasPrior) F.push('prior year shown but no comparative uploaded');
    /* monthly series */
    if (tc.layout === 'monthly' && tc.months > 1){
      if (md.months.length !== tc.months) F.push(`months ${md.months.length} ≠ ${tc.months}`);
      else P.income.forEach((x, k) => { near(`revenue ${k + 1}`, md.monthlyRevenue[k], x); near(`net ${k + 1}`, md.monthlyNet[k], P.net[k]); });
    }
    /* expense breakdown */
    const eg = md.expenseGroups || [];
    if (!eg.length) F.push('no expense breakdown');
    else {
      near('expense breakdown sum', r2(eg.reduce((s, x) => s + x.value, 0)), md.expenseTotal, 0.05);
      eg.forEach(x => { if (Math.abs(x.pct) > 100.001) F.push(`expense share ${x.label} ${x.pct.toFixed(2)}%`);
        if (Math.abs(x.pct - x.value / md.expensePctBase * 100) > 0.01) F.push(`expense share formula ${x.label}`); });
      near('Total Expenses shown', md.expenseTotal, cur(P.expenses));
      if (Math.abs(md.expensePctBase - Math.abs(md.expenseTotal)) >= 0.005 && !eg.some(y => y.value < 0)) F.push('share base differs from Total Expenses without any credits');
    }
    /* shares */
    const lb = md.liabilityBifurcation || [];
    if (lb.length && Math.abs(lb.reduce((s, x) => s + (x.pct || 0), 0) - 100) > 0.05) F.push('liabilities bifurcation does not sum to 100%');
    if (!B.liabilities[0] && lb.length) F.push('liabilities bifurcation shown with no liabilities');
    if (B.liabilities[0] && !['Current Liabilities', 'Long-Term Liabilities'].every(l => lb.some(x => x.label === l))) F.push('liabilities bifurcation missing Current or Long-Term row');
    [...md.bsComposition.assets, ...md.bsComposition.liabEquity, ...lb].forEach(x => { if (x.pct !== null && Math.abs(x.pct) > 100.001) F.push(`share ${x.label} ${x.pct.toFixed(2)}%`); });
    /* Companion P&L tabs: every one is detected as a P&L, reaches the report (PDF / TOC sections), and the workbook
     * reconciles with no false mismatch; the "% of Income" figures are right. */
    if (tc.extra && tc.extra.length){
      const plTabs = Object.keys(tc.sheets).filter(n => n !== 'Balance Sheet' && !/^Uncategorized/.test(n));
      if (md.roles.summary) F.push(`"${md.roles.summary}" taken for the workbook's index`);
      if (api.reportSections().some(x => x.id === 'index')) F.push('an index section in a workbook without an index sheet');
      const plRoles = ['pl', 'plMonthly', 'plComparative', 'plPercent'];
      for (const t of plTabs){
        const role = Object.entries(md.roles).find(([, v]) => v === t);
        if (!role || !plRoles.includes(role[0])) F.push(`P&L tab "${t}" not detected as a P&L (${role ? role[0] : 'none'})`);
      }
      api.state.model = md;
      const inReport = api.reportSections().map(x => x.sheet);
      for (const t of plTabs) if (!inReport.includes(t)) F.push(`P&L tab "${t}" missing from the report`);
      const pctX = tc.extra.find(x => x.kind === 'pct');
      if (pctX && md.roles.plPercent !== pctX.tab) F.push(`"% of Income" tab "${pctX.tab}" detected as ${Object.entries(md.roles).find(([, v]) => v === pctX.tab)?.[0]}`);
    }
    /* Strict sheet rules (user, 2026-10-21) for every workbook: the report shows only the client's sheets, every client
     * sheet with figures, in the client's tab order, each under its own tab name. */
    {
      api.state.model = md;
      const tabs = Object.keys(api.state.sheets);
      const secs = api.reportSections();
      const fixed = new Set(['cover', 'toc', 'dash', 'notes', 'disc']);
      for (const x of secs) if (!x.sheet && !fixed.has(x.id)) F.push(`section "${x.title}" (${x.id}) is not a client sheet`);
      for (const x of secs.filter(x => x.sheet)) if (!tabs.includes(x.sheet)) F.push(`section "${x.title}" from "${x.sheet}", not an uploaded tab`);
      const order = secs.filter(x => x.sheet && x.id !== 'index').map(x => tabs.indexOf(x.sheet));
      if (order.some((v, k) => k && v < order[k - 1])) F.push(`sections out of the workbook's tab order: ${secs.filter(x => x.sheet).map(x => x.sheet).join(' → ')} (tabs ${tabs.join(' → ')})`);
      const ids = secs.map(x => x.id);
      if (ids[0] !== 'cover' || ids[1] !== 'toc' || ids[ids.indexOf('dash') - 1] !== (ids.includes('index') ? 'index' : 'toc') || ids[ids.length - 1] !== 'disc') F.push(`fixed pages out of place: ${ids.join(',')}`);
      for (const x of secs.filter(x => x.sheet && x.id !== 'index')) if (x.title !== x.sheet) F.push(`section heading "${x.title}" ≠ tab name "${x.sheet}"`);
      const shown = new Set([...secs.map(x => x.sheet), ...api.reportListingSheets(md)]);
      for (const t of tabs) if (!shown.has(t)) F.push(`client tab "${t}" missing from the report`);
    }
    /* Every generated workbook adds up, so the data checks must not report a mismatch. */
    let checks = [];
    try { checks = api.dataChecks(md, api.state.sheets); } catch (e){ F.push('data checks error: ' + e.message); }
    for (const c of checks.filter(c => c.sev === 'High')) F.push('false data-check mismatch: ' + c.msg);
    /* basis */
    const wantBasis = tc.basis === 'Cash' ? 'Cash Basis' : 'Accrual Basis';
    if (api.reportBasis() !== wantBasis) F.push(`cover basis ${api.reportBasis()} ≠ ${wantBasis}`);
    /* formatting of every statement table cell */
    for (const role of ['bs', plRole].filter(Boolean)){
      const sm = md.sheetModels[md.roles[role]];
      const cols = api.displayColumns(sm);
      for (const row of api.reportTableParts(sm, {}).rows){
        const cells = [...row.html.matchAll(/<td class="([^"]*)"[^>]*>([^<]*)<\/td>/g)];
        cells.slice(1).forEach(([, cls, t], j) => {
          if (!t) return;
          const col = cols[j];
          const ok = t === '&ndash;' || (col && col.type === 'percent' ? PCT.test(t) : MONEY.test(t) || PCT.test(t));
          if (!ok) F.push(`${role} cell "${t}" not in financial format`);
          if (/^\(/.test(t) && !/\bneg\b/.test(cls)) F.push(`${role} negative "${t}" not red`);
        });
      }
    }
  }
  if (process.env.DUMP && +process.env.DUMP === i){
    console.log(JSON.stringify({ style: tc.style, layout: tc.layout }));
    for (const [n, rows] of Object.entries(tc.sheets)){ console.log('=== ' + n); rows.forEach((r, k) => console.log(k, JSON.stringify(r))); }
    if (md){ console.log('lines BS', md.sheetModels['Balance Sheet'].lines.map(l => `${l.r}:${l.kind}:${l.indent}:${l.label}`).join(' | '));
      console.log('liab', JSON.stringify(md.liabilityBifurcation), 'metrics', JSON.stringify(md.metrics));
      console.log('expenseGroups', JSON.stringify(md.expenseGroups.map(x => [x.label, x.value])), 'expenseTotal', md.expenseTotal); }
  }
  if (F.length){ failed++; failures.push(tag + '\n      ' + [...new Set(F)].slice(0, 8).join('\n      ')); }
}
if (process.env.WRITE) fs.writeFileSync(process.env.WRITE, JSON.stringify(written));
failures.slice(0, 25).forEach(f => console.log('  ✗ ' + f));
console.log('\nlayouts covered: ' + Object.entries(stats).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(`${COUNT} generated workbooks, ${COUNT - failed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
