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
  '\n;globalThis.__api = { parseWorkbook, state, reportSections, reportTableParts, downloadReportExcel, downloadDataExcel };', Object.assign(ctx, { __toasts: toasts }));
const api = ctx.__api;

const head = t => [['Pluto Asset Recovery'], [t], ['January-December 2025'], []];
const body = pct => [['Income'], ['Sales', 1000, ...(pct ? ['100.00%'] : [])], ['Total for Income', 1000, ...(pct ? ['100.00%'] : [])],
  ['Expenses'], ['Rent', 400, ...(pct ? ['40.00%'] : [])], ['Total for Expenses', 400, ...(pct ? ['40.00%'] : [])],
  ['Net Income', 600, ...(pct ? ['60.00%'] : [])]];
const pctSheet = (amountHead, pctHead = '% of Income') => [...head('Profit and Loss % of Total Income'), ['', amountHead, pctHead], ...body(true)];
const bs = [...head('Balance Sheet'), ['', 'Total'], ['Assets'], ['Checking', 500], ['Total for Assets', 500],
  ['Liabilities and Equity'], ['Accounts Payable', 100], ['Total for Liabilities and Equity', 500]];

const layouts = {
  'Total column, P&L first': { 'PL': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'PL (% Income)': pctSheet('Total'), 'BS': bs },
  '% sheet is the first tab': { 'PL (% Income)': pctSheet('Total'), 'PL': [...head('Profit and Loss'), ['', 'Total'], ...body(false)], 'BS': bs },
  'period column (Jan - Dec 2025)': { 'PL': [...head('Profit and Loss'), ['', 'Jan - Dec 2025'], ...body(false)], 'PL (% Income)': pctSheet('Jan - Dec 2025'), 'BS': bs },
  'comparative P&L + % sheet': { 'PL': [...head('Profit and Loss'), ['', 'Jan-Dec 2025', 'Jan-Dec 2024 (PY)'], ['Income'], ['Sales', 1000, 900],
    ['Total for Income', 1000, 900], ['Net Income', 600, 500]], 'PL (% Income)': pctSheet('Jan - Dec 2025'), 'BS': bs },
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
  const mainName = Object.keys(sheets).find(n => n !== pctName && n !== 'BS');
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
  check(`${name}: Cover and Disclaimer are not frozen`, !pane(xmls.Cover) && !pane(xmls.Disclaimer));
  const back = XLSX.read(downloads[0].bytes, { type: 'array' });
  check(`${name}: workbook re-opens with all sheets`, back.SheetNames.length === Object.keys(xmls).length && back.Sheets[pctTab]['A5'].v === 'Particulars');
}

/* Data workbook: header row frozen too. */
downloads.length = 0;
api.downloadDataExcel();
const dataXml = sheetXml(downloads[0].bytes);
for (const tab of ['Profit and Loss', 'P&L % of Income', 'BS'])
  check(`Data workbook: "${tab}" freezes rows 1-5 (its column-heading row)`, /ySplit="5"/.test(pane(dataXml[tab])) && /topLeftCell="B6"/.test(pane(dataXml[tab])));
check('No "could not be frozen" warnings', !toasts.some(t => /could not be frozen/.test(t)));

console.log(`${pass + fail} assertions, ${pass} pass, ${fail} fail`);
process.exitCode = fail ? 1 : 0;
