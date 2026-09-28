#!/usr/bin/env node
/* Any uploaded figure is read and formatted the same way: US, European, Indian grouping; currency symbols and codes;
 * CR / DR; Excel's accounting zero; text-forced numbers. Checked value by value and through whole workbooks (figures, PDF
 * cells, Excel cells). Run with: node tests/verify-amount-formats.js (needs `npm install` for xlsx-js-style). */
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
  '\n;globalThis.__api = { parseWorkbook, state, reportSections, reportTableParts, downloadReportExcel, downloadDataExcel, _workbookBytes, _verifySheetRules, reportExtraSheets, parseAmount, formatReportCell };', Object.assign(ctx, { __toasts: toasts }));
const api = ctx.__api;
const cases = [
  [1234.5, 1234.5], ['1,234.50', 1234.5], ['$1,234.50', 1234.5], ['($1,234.50)', -1234.5], ['-$1,234.50', -1234.5], ['$-1,234.50', -1234.5], ['1,234.50-', -1234.5],
  ['(1,234.50)', -1234.5], [' 1 234.50 ', 1234.5], ['€1,234.50', 1234.5], ['£1,234.50', 1234.5], ['₹1,23,456.00', 123456], ['USD 1,234.50', 1234.5], ['1,234.50 USD', 1234.5],
  ['1,234.50 CR', -1234.5], ['1,234.50 DR', 1234.5], ['1,234.50Cr', -1234.5], ['1234.5', 1234.5], ['1e6', 1000000], ['0', 0], ['-0', 0], [-0.001, -0.001], ['—', null], ['-', null], ['N/A', null],
  ['$ -', 0], ['$    -   ', 0], ['1.234,50', 1234.5], ['(0.00)', 0], ["'1,234.50", 1234.5], ['=SUM(B2:B4)', null], ['1,234', 1234], ['12.5%', null],
];
for (const [v, want] of cases){
  const got = api.parseAmount(v);
  check(`${JSON.stringify(v)} reads as ${want}`, want === null ? got === null : got !== null && Math.abs(got - want) < 1e-9);
}
for (const v of ['2026-01-20', '12/05/2026', '12.05.2026', 'Jan 2026', '4000-01', 'Q1 2026', 'Total', '1.2.3', 'CR', '$', 'USD', '1,2,3', 'ABC123', '(Note 3)'])
  check(`${JSON.stringify(v)} stays text`, api.parseAmount(v) === null);
check('a tiny negative prints $0.00, never ($0.00)', api.formatReportCell(-0.001, 'value', {}) === '$0.00');
check("Excel's accounting zero prints as a dash", api.formatReportCell('$ -', 'value', { zeroDash: true }) === '&ndash;');
function sheetXml(bytes){
  const zip = XLSX.CFB.read(bytes, { type: 'array' });
  const wbXml = new TextDecoder().decode(zip.FileIndex[zip.FullPaths.findIndex(p => p.endsWith('/xl/workbook.xml'))].content);
  const names = [...wbXml.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
  return Object.fromEntries(names.map((n, i) => [n, new TextDecoder().decode(zip.FileIndex[zip.FullPaths.findIndex(p => p.endsWith('/xl/worksheets/sheet' + (i + 1) + '.xml'))].content)]));
}
const H = t => [['Euro Test GmbH'], [t], ['January - December 2025'], []];
const styles = {
  'European text': v => v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
  'Euro symbol': v => (v < 0 ? '-' : '') + '€' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 }),
  'CR/DR': v => Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) + (v < 0 ? ' CR' : ' DR'),
  'Indian rupee': v => '₹' + (v < 0 ? '-' : '') + Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
  'trailing USD': v => v.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' USD',
  'apostrophe text': v => "'" + v.toLocaleString('en-US', { minimumFractionDigits: 2 }),
};
for (const [name, f] of Object.entries(styles)){
  const pl = [...H('Profit and Loss'), ['', 'Total'], ['Income'], ['Sales', f(1234567.5)], ['Total Income', f(1234567.5)], ['Expenses'], ['Rent', f(234567.25)], ['Refund', f(-1000)],
    ['Total Expenses', f(233567.25)], ['Net Income', f(1001000.25)]];
  const bs = [...H('Balance Sheet'), ['', 'Total'], ['Assets'], ['Bank', f(1500000)], ['Total Assets', f(1500000)], ['Liabilities and Equity'], ['Loan', f(498999.75)],
    ['Total Liabilities', f(498999.75)], ['Equity'], ['Retained Earnings', f(1001000.25)], ['Total Equity', f(1001000.25)], ['Total Liabilities and Equity', f(1500000)]];
  const sheets = { 'PL': pl, 'BS': bs };
  api.state.sheets = sheets; api.state.client = 'Euro Test GmbH'; api.state.period = 'January - December 2025';
  const md = api.parseWorkbook(sheets); api.state.model = md;
  const figs = md.metrics.income === 1234567.5 && md.metrics.net === 1001000.25 && md.metrics.assets === 1500000 && md.metrics.expenses === 233567.25;
  const pdfCells = api.reportTableParts(md.sheetModels.PL, {}).rows.map(r => [...r.html.matchAll(/<td class="val[^"]*">([^<]*)<\/td>/g)].map(m => m[1])).flat();
  const pdfOk = pdfCells.filter(Boolean).every(t => /^\(?\$\d{1,3}(,\d{3})*\.\d{2}\)?$|^&ndash;$/.test(t));
  downloads.length = 0; api.downloadReportExcel();
  const xml = sheetXml(downloads[0].bytes)['Balance Sheet'] || '';
  const xlOk = /<v>1500000<\/v>/.test(xml) && !/t="str"><v>[^<]*(€|₹|CR|DR|USD|,\d{2}<)/.test(xml);
  check(`${name}: figures read (income 1,234,567.50, net 1,001,000.25, assets 1,500,000)`, figs);
  check(`${name}: every PDF amount in accounting format`, pdfOk);
  check(`${name}: Excel holds real numbers, no currency text`, xlOk);
}

console.log(`${pass + fail} amount-format assertions, ${pass} pass, ${fail} fail`);
process.exitCode = fail ? 1 : 0;
