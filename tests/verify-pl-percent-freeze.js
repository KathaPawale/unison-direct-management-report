#!/usr/bin/env node
/* PL (% Income) capture + frozen headings (rows 1-5, through "Particulars") in the downloaded Excel files.
 * Runs the real parser, report and export code with the same xlsx-js-style build the app loads from the CDN.
 * Run with: node tests/verify-pl-percent-freeze.js (needs `npm install` for xlsx-js-style). */
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
  '\n;globalThis.__api = { parseWorkbook, state, reportSections, reportTableParts, downloadReportExcel, downloadDataExcel, _workbookBytes, _verifySheetRules };', Object.assign(ctx, { __toasts: toasts }));
const api = ctx.__api;

const head = t => [['Pluto Asset Recovery'], [t], ['January-December 2025'], []];
const body = pct => [['Income'], ['Sales', 1000, ...(pct ? ['100.00%'] : [])], ['Total for Income', 1000, ...(pct ? ['100.00%'] : [])],
  ['Expenses'], ['Rent', 400, ...(pct ? ['40.00%'] : [])], ['Total for Expenses', 400, ...(pct ? ['40.00%'] : [])],
  ['Net Income', 600, ...(pct ? ['60.00%'] : [])]];
const pctSheet = (amountHead, pctHead = '% of Income') => [...head('Profit and Loss % of Total Income'), ['', amountHead, pctHead], ...body(true)];
const fracBody = () => body(true).map(r => r.length > 2 ? [r[0], r[1], parseFloat(r[2]) / 100] : r);
const bs = [...head('Balance Sheet'), ['', 'Total'], ['Assets'], ['Checking', 500], ['Total for Assets', 500],
  ['Liabilities and Equity'], ['Accounts Payable', 100], ['Total for Liabilities and Equity', 500]];

const layouts = {
  'Total column, P&L first': { 'PL': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'PL (% Income)': pctSheet('Total'), 'BS': bs },
  '% sheet is the first tab': { 'PL (% Income)': pctSheet('Total'), 'PL': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'BS': bs },
  'period column (Jan - Dec 2025)': { 'PL': [...head('Profit and Loss'), ['', 'Jan - Dec 2025'], ...body(false)], 'PL (% Income)': pctSheet('Jan - Dec 2025'), 'BS': bs },
  'comparative P&L + % sheet': { 'PL': [...head('Profit and Loss'), ['', 'Jan-Dec 2025', 'Jan-Dec 2024 (PY)'], ['Income'], ['Sales', 1000, 900],
    ['Total for Income', 1000, 900], ['Net Income', 600, 500]], 'PL (% Income)': pctSheet('Jan - Dec 2025'), 'BS': bs },
  /* QuickBooks stacked heading: the period over "Amount | % of Income". */
  'two-row heading': { 'PL': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'BS': bs,
    'PL (% Income)': [...head('Profit and Loss % of Total Income'), ['', 'Jan - Dec, 2025', ''], ['', 'Amount', '% of Income'], ...fracBody()] },
  /* The % column has no heading: its figures are each line's share of income. */
  'unlabelled % column': { 'PL': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'BS': bs,
    'PL (% Income)': [...head('Profit and Loss % of Total Income'), ['', 'Total', ''], ...fracBody()] },
  /* Month-by-month % sheet next to the monthly P&L: the % sheet must not take the monthly P&L's place. */
  'monthly % sheet': { 'PL (% Income)': [...head('Profit and Loss % of Total Income'), ['', 'Jan 2025', 'Feb 2025', 'Total', '% of Income'],
    ...fracBody().map(r => r.length > 1 ? [r[0], r[1] / 2, r[1] / 2, r[1], r[2]] : r)], 'PL': [...head('Profit and Loss'), ['', 'Jan 2025', 'Feb 2025', 'Total'],
    ...body(false).map(r => r.length > 1 ? [r[0], r[1] / 2, r[1] / 2, r[1]] : r)], 'BS': bs },
  /* The client's full set: PL, PL (% Income), PL_MoM, PL_Comparative, BS, BS_Comparative, TrialBalance. */
  'full Pluto set': { 'PL': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'PL (% Income)': pctSheet('Total'),
    'PL_MoM': [...head('Profit and Loss'), ['', 'Jan 2025', 'Feb 2025', 'Total'], ...body(false).map(r => r.length > 1 ? [r[0], r[1] / 2, r[1] / 2, r[1]] : r)],
    'PL_Comparative': [...head('Profit and Loss'), ['', 'Jan - Dec 2025', 'Jan - Dec 2024 (PY)'], ...body(false).map(r => r.length > 1 ? [r[0], r[1], r[1] * 0.9] : r)],
    'BS': bs, 'BS_Comparative': [...head('Balance Sheet'), ['', 'As of Dec 31, 2025', 'As of Dec 31, 2024 (PY)'], ['Assets'], ['Checking', 500, 400],
      ['Total for Assets', 500, 400], ['Liabilities and Equity'], ['Accounts Payable', 100, 80], ['Total for Liabilities and Equity', 500, 400]],
    'TrialBalance': [...head('Trial Balance'), ['Account', 'Account Type', 'Debit', 'Credit'], ['Checking', 'Bank', 500, ''],
      ['Accounts Payable', 'Accounts Payable', '', 100], ['Sales', 'Revenue', '', 400], ['TOTAL', '', 500, 500]] },
  '"% of Total Income" header': { 'Profit and Loss': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'P&L % of Income': pctSheet('Total', '% of Total Income'), 'BS': bs }
};

function sheetXml(bytes){
  const zip = XLSX.CFB.read(bytes, { type: 'array' });
  const wbXml = new TextDecoder().decode(zip.FileIndex[zip.FullPaths.findIndex(p => p.endsWith('/xl/workbook.xml'))].content);
  const names = [...wbXml.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
  return Object.fromEntries(names.map((n, i) => [n,
    new TextDecoder().decode(zip.FileIndex[zip.FullPaths.findIndex(p => p.endsWith('/xl/worksheets/sheet' + (i + 1) + '.xml'))].content)]));
}
const pane = xml => (xml.match(/<pane [^>]*\/>/) || [''])[0];

for (const [name, sheets] of Object.entries(layouts)){
  api.state.sheets = sheets;
  api.state.client = 'Pluto Asset Recovery';
  api.state.period = 'January-December 2025';
  const md = api.parseWorkbook(sheets);
  api.state.model = md;
  const pctName = Object.keys(sheets).find(n => /%/.test(n));
  const mainName = Object.keys(sheets).find(n => n !== pctName && !/^(BS|TrialBalance)/.test(n) && !/_(MoM|Comparative)$/.test(n));
  check(`${name}: % of Income sheet detected`, md.roles.plPercent === pctName);
  check(`${name}: main P&L stays the amount sheet`, [md.roles.pl, md.roles.plComparative, md.roles.plMonthly].includes(mainName));
  check(`${name}: dashboard income from the main P&L`, md.metrics.income === 1000);
  const sec = api.reportSections().find(s => s.id === 'plPercent');
  check(`${name}: PDF/report has a "Profit and Loss (% of Income)" section`, sec && sec.sheet === pctName);
  const parts = api.reportTableParts(md.sheetModels[pctName], {});
  const net = parts.rows.find(r => /Net Income/.test(r.html));
  check(`${name}: % of Income table shows amount and % columns`, /% of (Total )?Income/.test(parts.head || JSON.stringify(parts)) &&
    net && /\$600\.00/.test(net.html) && /60\.0+%/.test(net.html));

  downloads.length = 0;
  api.downloadReportExcel();
  check(`${name}: report workbook downloaded`, downloads.length === 1 && downloads[0].bytes instanceof Uint8Array);
  if (!downloads.length) continue;
  const xmls = sheetXml(downloads[0].bytes);
  const pctTab = Object.keys(xmls).find(n => /% of Income/.test(n));
  check(`${name}: Excel has the % of Income sheet`, !!pctTab);
  check(`${name}: Excel % of Income sheet has 60.00% as a number`, pctTab && /<v>0\.6<\/v>/.test(xmls[pctTab]));
  /* Every statement sheet: heading rows 1-5 frozen (row 5 = "Particulars"), first column frozen. */
  for (const [tab, xml] of Object.entries(xmls)){
    if (['Cover', 'Disclaimer', 'Analytical Summary', 'Notes'].includes(tab)) continue;
    check(`${name}: "${tab}" freezes rows 1-5 and column A`,
      /xSplit="1"/.test(pane(xml)) && /ySplit="5"/.test(pane(xml)) && /topLeftCell="B6"/.test(pane(xml)) && /state="frozen"/.test(pane(xml)));
    check(`${name}: "${tab}" row 5 is Particulars`, /<c r="A5"[^>]*><v>Particulars<\/v><\/c>/.test(xml));
  }
  for (const [tab, xml] of Object.entries(xmls))
    check(`${name}: "${tab}" has a tab color`, /^<\?xml[^>]*>\s*<worksheet\b[^>]*><sheetPr><tabColor rgb="FF[0-9A-F]{6}"\/><\/sheetPr>/.test(xml));
  if (sheets.TrialBalance){
    check(`${name}: every uploaded sheet is captured`, Object.keys(sheets).every(n => Object.values(md.roles).includes(n)));
    for (const t of ['Trial Balance', 'Profit and Loss', 'Profit and Loss (Monthly)', 'Profit and Loss (Comparative)', 'Balance Sheet — Comparative'])
      check(`${name}: Excel has "${t}"`, t in xmls);
  }
  check(`${name}: Cover and Disclaimer are not frozen`, !pane(xmls.Cover) && !pane(xmls.Disclaimer));
  const back = XLSX.read(downloads[0].bytes, { type: 'array' });
  check(`${name}: workbook re-opens with all sheets`, back.SheetNames.length === Object.keys(xmls).length && !!pctTab && back.Sheets[pctTab]['A5'].v === 'Particulars');
}

/* Data workbook: header row frozen too. */
downloads.length = 0;
api.downloadDataExcel();
const dataXml = sheetXml(downloads[0].bytes);
for (const tab of ['Profit and Loss', 'P&L % of Income', 'BS'])
  check(`Data workbook: "${tab}" freezes rows 1-5 (its column-heading row)`, /ySplit="5"/.test(pane(dataXml[tab])) && /topLeftCell="B6"/.test(pane(dataXml[tab])));
for (const [tab, xml] of Object.entries(dataXml))
  check(`Data workbook: "${tab}" has a tab color`, /<sheetPr><tabColor rgb="FF[0-9A-F]{6}"\/><\/sheetPr>/.test(xml));
check('No Excel formatting-rule failures', !toasts.some(t => /could not be frozen|not downloaded/.test(t)));

/* ---------- strict rules ---------- */

/* Trial Balance: captured by tab name (any "TB" / "Trial Balance" name) or by its title, whatever its columns. */
const tbRows = t => [...head(t), ['Account', 'Debit', 'Credit'], ['Checking', 500, ''], ['Accounts Payable', '', 100], ['Sales', '', 400], ['Total', 500, 500]];
for (const [tab, title] of [['TB_July', 'Trial Balance'], ['Trial Balance Summary', 'Trial Balance'], ['TrialBalance', 'Trial Balance'], ['Sheet3', 'Trial Balance'],
                            ['TB', 'Report'], ['Adjusted Trial Balance', 'Adjusted Trial Balance']]){
  const md = api.parseWorkbook({ 'PL': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'BS': bs, [tab]: tbRows(title) });
  check(`Strict rule: tab "${tab}" titled "${title}" is the Trial Balance`, md.roles.tb === tab);
}
/* PL (% Income): captured even when it is the workbook's only P&L; the figures then come from it. */
{
  const sheets = { 'PL (% Income)': pctSheet('Total'), 'BS': bs };
  api.state.sheets = sheets; const md = api.parseWorkbook(sheets); api.state.model = md;
  check('Strict rule: the only P&L titled "% of Income" is captured as PL (% Income)', md.roles.plPercent === 'PL (% Income)');
  check('Strict rule: its figures reach the dashboard (income 1,000, net 600)', md.metrics.income === 1000 && md.metrics.net === 600);
  check('Strict rule: the report has the "Profit and Loss (% of Income)" section', api.reportSections().some(x => x.id === 'plPercent'));
  downloads.length = 0; api.downloadReportExcel();
  check('Strict rule: the Excel file has the "% of Income" sheet', downloads.length === 1 && Object.keys(sheetXml(downloads[0].bytes)).some(n => /% of Income/.test(n)));
}
/* A "% Change" column followed by a "Total Income" line is not a "% of Total Income" title. */
{
  const md = api.parseWorkbook({ 'Profit and Loss': [...head('Profit and Loss'), ['', 'Jan - Dec 2025', 'Jan - Dec 2024 (PY)', '% Change'],
    ['Income'], ['Sales', 1000, 900, '11.1%'], ['Total Income', 1000, 900, '11.1%'], ['Net Income', 600, 500, '20.0%']], 'BS': bs });
  check('Strict rule: a comparative P&L with a % Change column stays the comparative P&L', md.roles.plComparative === 'Profit and Loss' && !md.roles.plPercent);
}
/* Every downloaded sheet gets a tab color and frozen headings, even one built without them; a file missing them is refused. */
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Heading', 'Amount'], ['Line', 1]]), 'Bare');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Cover text']]), 'Cover');
  const xmls = sheetXml(api._workbookBytes(wb));
  check('Strict rule: a sheet built without a tab color gets one', /<tabColor rgb="FF0B2F59"\/>/.test(xmls.Bare) && /<tabColor /.test(xmls.Cover));
  check('Strict rule: a sheet built without frozen headings gets them', /ySplit="1"/.test(pane(xmls.Bare)) && /xSplit="1"/.test(pane(xmls.Bare)) && !pane(xmls.Cover));
  const plain = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(plain, XLSX.utils.aoa_to_sheet([['Heading', 'Amount']]), 'Plain');
  let refused = false;
  try { api._verifySheetRules(new Uint8Array(XLSX.write(plain, { type: 'array', bookType: 'xlsx' })), plain); } catch (e){ refused = /no tab color/.test(e.message) && /not frozen/.test(e.message); }
  check('Strict rule: a file without tab colors and frozen headings is refused', refused);
}

console.log(`${pass + fail} assertions, ${pass} pass, ${fail} fail`);
process.exitCode = fail ? 1 : 0;
