#!/usr/bin/env node
/* Tracker rows 44-53 verification. Run with: node tests/verify-rows-44-53.js */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/report/exports.js'), 'utf8');
const parser = fs.readFileSync(path.join(root, 'src/core/parser.js'), 'utf8');
const rep = fs.readFileSync(path.join(root, 'src/report/report.js'), 'utf8');
let pass = 0;
let fail = 0;

function check(label, condition){
  if (condition) pass++;
  else { fail++; console.error('FAIL:', label); }
}

check('Row 44 PL name detection', /\b(pl|p&l|profit)/i.test(parser) && /detectRoles/.test(parser));
check('Row 45 BS_Comparative regex', /bs.*comparative|bsComparative/i.test(parser));
check('Row 46 TrialBalance role', /trial ?balance|role.*['"]tb['"]/i.test(parser) || /['"]tb['"]/.test(src));
check('Row 46 tb tabColor', /tb:\s*['"]?[0-9A-F]{6}/i.test(src));
check('Row 47 freeze row 5', /freezeRow\s*=\s*5|ySplit:\s*5/.test(src));
check('Row 48/51 statement heading has no USD note', !/function tableSectionSub[\s\S]*?US Dollars[\s\S]*?\n}/.test(rep.slice(rep.indexOf('function tableSectionSub'), rep.indexOf('function pageFooter'))));
check('Row 48/51 Excel heading row 3 uses the shared subtitle', /_wsSetCell\(ws, 2, 0, tableSectionSub\(sm\)/.test(src));
check('Row 52 A/P total pct format', /numFmt.*'0\.00%/.test(src) && /totalVal/.test(src));

/* Behaviour: parse a Pluto-style workbook with the real parser + report code. */
const vm = require('vm');
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  document: { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {} }), getElementById: () => null, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout, clearTimeout
};
ctx.window = ctx;
vm.createContext(ctx);
const files = ['src/core/util.js', 'src/core/state.js', 'src/core/parser.js', 'src/core/financials.js', 'src/core/recompute.js',
  'src/report/charts.js', 'src/report/report.js'];
vm.runInContext(files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n') +
  '\n;globalThis.__api = { parseWorkbook, state, keepPercentCells, tableSectionSub, reportSections, reportTableParts, agingTableHtml };', ctx);
const api = ctx.__api;
const head = t => [['Pluto Asset Recovery'], [t], ['January-December 2025'], []];
const sheets = {
  'PL': [...head('Profit and Loss'), ['', 'Jan-Dec 2025', 'Jan-Dec 2024 (PY)'], ['Income'], ['Sales', 1000, 900], ['Total for Income', 1000, 900],
    ['Expenses'], ['Rent', 400, 300], ['Total for Expenses', 400, 300], ['Net Income', 600, 600]],
  'BS_Comparative': [...head('Balance Sheet'), ['', 'As of Dec 31, 2025', 'As of Dec 31, 2024 (PY)'], ['Assets'], ['Checking', 500, 400],
    ['Total for Assets', 500, 400], ['Liabilities and Equity'], ['Accounts Payable', 100, 50], ['Total for Liabilities and Equity', 500, 400]],
  'TrialBalance': [...head('Trial Balance'), ['', 'Debit', 'Credit'], ['Checking', 500, ''], ['Accounts Payable', '', 100], ['Sales', '', 1000],
    ['Rent', 400, ''], ['TOTAL', 900, 1100]],
  'A/P Aging Summary': [...head('A/P Aging Summary'), ['', 'Current', '1 - 30', 'Total', '% of Total'], ['Vendor A', 60, 15, 75, 0.75],
    ['Vendor B', 25, 0, 25, 0.25], ['TOTAL', 85, 15, 100, 1]]
};
api.state.sheets = sheets;
const md = api.parseWorkbook(sheets);
api.state.model = md;
const ids = api.reportSections().map(x => x.sheet).filter(Boolean);
check('Row 44/49 "PL" tab captured', [md.roles.pl, md.roles.plMonthly, md.roles.plComparative].includes('PL') && ids.includes('PL'));
check('Row 45/50 "BS_Comparative" tab captured', [md.roles.bs, md.roles.bsComparative].includes('BS_Comparative') && ids.includes('BS_Comparative'));
check('Row 46/53 "TrialBalance" tab captured', md.roles.tb === 'TrialBalance' && ids.includes('TrialBalance'));
check('Row 48/51 statement headings drop the USD note',
  Object.values(md.sheetModels).every(sm => !/US Dollars/.test(api.tableSectionSub(sm))));
const apRows = api.reportTableParts(md.sheetModels[md.roles.ap], {}).rows;
check('Row 52 A/P aging bottom-line % shows 100.0%', /100\.0%<\/td><\/tr>$/.test(apRows[apRows.length - 1].html));
check('Row 52 A/P aging detail total % shows 100.00%',
  /<td class="num">100\.00%<\/td><\/tr>/.test(api.agingTableHtml({ total: 100, buckets: [{ label: 'Current', value: 85 }, { label: '1 - 30', value: 15 }] })));

/* Row 52: a %-formatted column with a plain header ("Share") must still come through as percentages. */
const apWs = { '!ref': 'A1:E8', E6: { t: 'n', v: 0.75, z: '0.00%' }, E7: { t: 'n', v: 0.25, z: '0.00%' }, E8: { t: 'n', v: 1, z: '0.00%' }, D8: { t: 'n', v: 100, z: '#,##0.00' } };
const apAoa = [...head('A/P Aging Summary'), ['', 'Current', '1 - 30', 'Total', 'Share'], ['Vendor A', 60, 15, 75, 0.75], ['Vendor B', 25, 0, 25, 0.25], ['TOTAL', 85, 15, 100, 1]];
api.keepPercentCells(apWs, apAoa);
check('Row 52 %-formatted cells kept as percent text, amounts untouched', apAoa[7][4] === '100%' && apAoa[5][4] === '75%' && apAoa[7][3] === 100);
const fmtSheets = { 'A/P Aging Summary': apAoa };
api.state.sheets = fmtSheets;
const fmtMd = api.parseWorkbook(fmtSheets);
api.state.model = fmtMd;
const fmtRows = api.reportTableParts(fmtMd.sheetModels[fmtMd.roles.ap], {}).rows;
check('Row 52 %-formatted A/P column prints %, not $', /100(\.0+)?%<\/td><\/tr>$/.test(fmtRows[fmtRows.length - 1].html) && !fmtRows.some(r => /\$0\.75|\$1\.00/.test(r.html)));

console.log(`${pass + fail} assertions, ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);