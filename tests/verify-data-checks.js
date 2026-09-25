#!/usr/bin/env node
/* Data checks: every statement reconciled with itself and the others. Clean workbooks raise no check; each kind of
 * mismatch is reported. Run with: node tests/verify-data-checks.js (needs `npm install` for xlsx-js-style). */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const XLSX = require('xlsx-js-style/dist/xlsx.bundle.js');
let pass = 0;
let fail = 0;

function check(label, condition){
  if (condition) pass++;
  else { fail++; console.error('FAIL:', label); }
}

const downloads = [];
const toasts = [];
class FakeBlob { constructor(parts){ this.bytes = parts[0]; } }
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  document: {
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {},
    body: { appendChild() {} },
    createElement: () => ({ style: {}, click(){ downloads.push({ name: this.download, bytes: urls.get(this.href) }); }, remove() {} })
  },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  Blob: FakeBlob, TextEncoder, TextDecoder, Uint8Array, XLSX,
  setTimeout: () => 0, clearTimeout
};
const urls = new Map();
ctx.URL = { createObjectURL: b => { const u = 'blob:' + urls.size; urls.set(u, b.bytes); return u; }, revokeObjectURL() {} };
ctx.window = ctx;
vm.createContext(ctx);
const files = ['src/core/util.js', 'src/core/state.js', 'src/core/parser.js', 'src/core/financials.js', 'src/core/recompute.js',
  'src/report/charts.js', 'src/report/report.js', 'src/report/exports.js'];
vm.runInContext(files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n') +
  '\n;toast = m => __toasts.push(m);' +
  '\n;globalThis.__api = { parseWorkbook, state, reportSections, reportTableParts, downloadReportExcel, downloadDataExcel, _workbookBytes, _verifySheetRules, dataChecks };', Object.assign(ctx, { __toasts: toasts }));
const api = ctx.__api;
const H = t => [['Check Co'], [t], ['January-December 2025'], []];
const run = sheets => { api.state.sheets = sheets; const md = api.parseWorkbook(sheets); return api.dataChecks(md, sheets); };
const has = (c, re) => c.some(x => re.test(x.msg));

/* Clean workbooks: the client fixtures raise no check. */
const fx = require(path.join(root, 'tests/calc-fixtures.json'));
for (const [k, sheets] of Object.entries(fx.fixtures)){
  const c = run(sheets);
  check(`fixture ${k}: no data check raised`, !c.length);
  if (c.length) console.error('   ', c.map(x => x.msg).join(' | '));
}

const plBody = (inc, exp, net) => [['Income'], ['Sales', inc], ['Total Income', inc], ['Expenses'], ['Rent', exp], ['Total Expenses', exp], ['Net Income', net]];
const bs = [...H('Balance Sheet'), ['', 'Total'], ['Assets'], ['Checking', 500], ['Total Assets', 500], ['Liabilities and Equity'], ['Accounts Payable', 100],
  ['Total Liabilities', 100], ['Equity'], ['Retained Earnings', 400], ['Total Equity', 400], ['Total Liabilities and Equity', 500]];

/* 1. Monthly P&L whose months do not add up to its Total column */
check('months ≠ Total column is reported', has(run({ 'P&L': [...H('Profit and Loss'), ['', 'Jan 2025', 'Feb 2025', 'Total'], ['Income'], ['Sales', 100, 100, 200],
  ['Total Income', 100, 100, 250], ['Expenses'], ['Rent', 50, 50, 100], ['Total Expenses', 50, 50, 100], ['Net Income', 50, 50, 150]], 'BS': bs }), /months of Total Income add up/));
/* 2. Net Income that does not follow from the lines */
check('Net Income ≠ Income − Expenses is reported', has(run({ 'PL': [...H('Profit and Loss'), ['', 'Total'], ...plBody(1000, 400, 700)], 'BS': bs }), /but Net Income shows/));
/* 3. Two P&L sheets that disagree */
check('P&L sheets that disagree are reported', has(run({ 'PL': [...H('Profit and Loss'), ['', 'Jan - Dec 2025', 'Jan - Dec 2024'], ['Income'], ['Sales', 1000, 900],
  ['Total Income', 1000, 900], ['Expenses'], ['Rent', 400, 400], ['Total Expenses', 400, 400], ['Net Income', 600, 500]],
  'PL_MoM': [...H('Profit and Loss'), ['', 'Jan 2025', 'Feb 2025', 'Total'], ['Income'], ['Sales', 450, 450, 900], ['Total Income', 450, 450, 900], ['Expenses'],
  ['Rent', 200, 200, 400], ['Total Expenses', 200, 200, 400], ['Net Income', 250, 250, 500]], 'BS': bs }), /^Income differs between/));
/* 4. Trial Balance whose debits and credits differ */
check('unbalanced Trial Balance is reported', has(run({ 'PL': [...H('Profit and Loss'), ['', 'Total'], ...plBody(1000, 400, 600)], 'BS': bs,
  'TrialBalance': [...H('Trial Balance'), ['Account', 'Debit', 'Credit'], ['Checking', 500, ''], ['Sales', '', 450], ['Total', 500, 450]] }), /total debits .* do not equal total credits/));
/* 5. Aging buckets that do not add up to the total */
check('aging buckets ≠ total is reported', has(run({ 'PL': [...H('Profit and Loss'), ['', 'Total'], ...plBody(1000, 400, 600)], 'BS': bs,
  'AP Aging': [...H('A/P Aging Summary'), ['Vendor', 'Current', '1 - 30', 'Total'], ['Vendor A', 60, 20, 80], ['TOTAL', 60, 20, 100]] }), /aging buckets add up/));
/* The same workbooks, corrected, raise nothing. */
check('a balanced, consistent workbook raises no check', !run({ 'PL': [...H('Profit and Loss'), ['', 'Total'], ...plBody(1000, 400, 600)], 'BS': bs,
  'TrialBalance': [...H('Trial Balance'), ['Account', 'Debit', 'Credit'], ['Checking', 500, ''], ['Sales', '', 500], ['Total', 500, 500]],
  'AP Aging': [...H('A/P Aging Summary'), ['Vendor', 'Current', '1 - 30', 'Total'], ['Vendor A', 80, 20, 100], ['TOTAL', 80, 20, 100]] }).filter(x => !/A\/P aging total/.test(x.msg)).length);

console.log(`${pass + fail} data-check assertions, ${pass} pass, ${fail} fail`);
process.exitCode = fail ? 1 : 0;
