#!/usr/bin/env node
/* Statement types detected from content, the way an accountant reads them, whatever the tab or title says: generic tab
 * names, IFRS / UK / US synonyms, a misleading tab name, an unnamed Trial Balance, cash flow and ledger sheets.
 * Run with: node tests/verify-auto-detect.js (needs `npm install` for xlsx-js-style). */
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
  '\n;globalThis.__api = { parseWorkbook, state, reportSections, reportTableParts, downloadReportExcel, downloadDataExcel, _workbookBytes, _verifySheetRules, reportExtraSheets, dataChecks };', Object.assign(ctx, { __toasts: toasts }));
const api = ctx.__api;
const MON = ['Jan','Feb','Mar','Apr','May','Jun'];
const T = (on, t) => on ? [['Acme Holdings Ltd'], [t], ['For the six months ended June 30, 2026'], []] : [];
const plBody = (cols) => [['Revenue'], ['Consulting fees', ...cols(9000)], ['Product sales', ...cols(3000)], ['Total Revenue', ...cols(12000)], ['Cost of Sales'], ['Materials', ...cols(4000)],
  ['Total Cost of Sales', ...cols(4000)], ['Gross Profit', ...cols(8000)], ['Operating Expenses'], ['Salaries and wages', ...cols(3000)], ['Rent', ...cols(1000)], ['Utilities', ...cols(200)],
  ['Advertising', ...cols(300)], ['Depreciation', ...cols(500)], ['Total Operating Expenses', ...cols(5000)], ['Operating Profit', ...cols(3000)], ['Interest expense', ...cols(100)],
  ['Profit before tax', ...cols(2900)], ['Income tax expense', ...cols(600)], ['Profit for the period', ...cols(2300)]];
const bsBody = cols => [['Assets'], ['Current Assets'], ['Cash at bank', ...cols(20000)], ['Trade debtors', ...cols(5000)], ['Inventory', ...cols(3000)], ['Prepaid expenses', ...cols(500)],
  ['Total Current Assets', ...cols(28500)], ['Non-current Assets'], ['Plant and equipment', ...cols(15000)], ['Accumulated depreciation', ...cols(-3000)], ['Total Non-current Assets', ...cols(12000)],
  ['Total Assets', ...cols(40500)], ['Liabilities'], ['Trade creditors', ...cols(4000)], ['Accrued expenses', ...cols(1500)], ['Bank loan', ...cols(10000)], ['Total Liabilities', ...cols(15500)],
  ['Equity'], ['Share capital', ...cols(10000)], ['Retained earnings', ...cols(15000)], ['Total Equity', ...cols(25000)], ['Total Liabilities and Equity', ...cols(40500)]];
const one = v => [v], two = v => [v, Math.round(v * 0.9)], mon = v => [...MON.map(() => Math.round(v / 6 * 100) / 100), v];
const tb = [['Account', 'Debit', 'Credit'], ['Cash at bank', 20000, ''], ['Trade debtors', 5000, ''], ['Trade creditors', '', 4000], ['Share capital', '', 10000], ['Retained earnings', '', 15000],
  ['Consulting fees', '', 9000], ['Salaries and wages', 3000, ''], ['Rent', 1000, ''], ['Inventory', 3000, ''], ['Plant and equipment', 6000, ''], ['Total', 38000, 38000]];
const cf = [['Operating activities'], ['Profit for the period', 2300], ['Depreciation', 500], ['Increase in trade debtors', -1000], ['Net cash from operating activities', 1800],
  ['Investing activities'], ['Purchase of equipment', -2000], ['Net cash used in investing activities', -2000], ['Net decrease in cash', -200], ['Cash at the beginning of the period', 20200], ['Cash at the end of the period', 20000]];
const gl = [['Date', 'Account', 'Description', 'Debit', 'Credit'], ['2026-01-02', 'Rent', 'January rent', 1000, ''], ['2026-01-02', 'Cash at bank', 'January rent', '', 1000], ['2026-01-05', 'Consulting fees', 'Invoice 12', '', 1500]];
const agedDebtors = [['Customer', 'Current', '1 - 30', '31 - 60', '61 - 90', '> 90', 'Total'], ['Client A', 2000, 500, 0, 0, 0, 2500], ['Client B', 1500, 1000, 0, 0, 0, 2500], ['Total', 3500, 1500, 0, 0, 0, 5000]];
const cases = {
  'generic tab names, no titles': [{ 'Sheet1': [['', 'Jun 2026'], ...bsBody(one)], 'Sheet2': [['', 'Jan-Jun 2026'], ...plBody(one)] }, { bs: 'Sheet1', pl: 'Sheet2' }],
  'generic names + monthly + comparative': [{ 'Sheet1': [['', ...MON.map(m => m + ' 2026'), 'Total'], ...plBody(mon)], 'Sheet2': [['', 'Jun 30, 2026', 'Jun 30, 2025'], ...bsBody(two)],
      'Sheet3': [['', 'Jan-Jun 2026', 'Jan-Jun 2025'], ...plBody(two)] }, { plMonthly: 'Sheet1', bs: 'Sheet2', plComparative: 'Sheet3' }],
  'IFRS titles (Statement of Financial Position / Profit or Loss)': [{ 'SFP': [...T(1, 'Statement of Financial Position'), ['', '30 June 2026'], ...bsBody(one)],
      'SOPL': [...T(1, 'Statement of Profit or Loss'), ['', 'Six months 2026'], ...plBody(one)] }, { bs: 'SFP', pl: 'SOPL' }],
  'UK: Trading and P&L Account / Statement of Assets and Liabilities': [{ 'Accounts': [...T(1, 'Trading and Profit and Loss Account'), ['', '2026'], ...plBody(one)],
      'Position': [...T(1, 'Statement of Assets and Liabilities'), ['', '2026'], ...bsBody(one)] }, { pl: 'Accounts', bs: 'Position' }],
  'Statement of Earnings / Statement of Condition': [{ 'Earnings': [...T(1, 'Statement of Earnings'), ['', 'YTD'], ...plBody(one)], 'Condition': [...T(1, 'Statement of Condition'), ['', 'YTD'], ...bsBody(one)] }, { pl: 'Earnings', bs: 'Condition' }],
  'misleading tab name (P&L in a tab called "Balance Sheet")': [{ 'Balance Sheet': [['', 'Jan-Jun 2026'], ...plBody(one)], 'Report 2': [['', 'Jun 2026'], ...bsBody(one)] }, { pl: 'Balance Sheet', bs: 'Report 2' }],
  'unnamed TB, cash flow, GL, aged debtors': [{ 'Sheet1': [['', 'Jan-Jun 2026'], ...plBody(one)], 'Sheet2': [['', 'Jun 2026'], ...bsBody(one)], 'Sheet3': tb, 'Sheet4': [['', '2026'], ...cf], 'Sheet5': gl,
      'Aged Debtors': agedDebtors }, { pl: 'Sheet1', bs: 'Sheet2', tb: 'Sheet3', ar: 'Aged Debtors' }],
};
for (const [name, [sheets, want]] of Object.entries(cases)){
  api.state.sheets = sheets; const md = api.parseWorkbook(sheets); api.state.model = md;
  for (const [role, sheet] of Object.entries(want)) check(`${name}: "${sheet}" detected as ${role}`, md.roles[role] === sheet);
  check(`${name}: figures (income 12,000, net 2,300, assets 40,500)`, md.metrics.income === 12000 && md.metrics.net === 2300 && md.metrics.assets === 40500);
  const dc = api.dataChecks(md, sheets);
  check(`${name}: no data check raised`, !dc.length);
  if (dc.length) console.error("   ", dc.map(x => x.msg).join(" | "));
  if (sheets.Sheet4){
    check(`${name}: the cash flow sheet is not taken for a P&L or Balance Sheet`, !Object.values(md.roles).includes('Sheet4'));
    check(`${name}: the cash flow sheet is printed as its own section`, api.reportSections().some(x => x.sheet === 'Sheet4'));
    check(`${name}: the unnamed ledger (Date column) is not printed`, !api.reportSections().some(x => x.sheet === 'Sheet5') && !Object.values(md.roles).includes('Sheet5'));
  }
}

console.log(`${pass + fail} auto-detect assertions, ${pass} pass, ${fail} fail`);
process.exitCode = fail ? 1 : 0;
