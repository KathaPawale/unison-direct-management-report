'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const exportSource = fs.readFileSync(path.join(root, 'src/report/exports.js'), 'utf8');
const context = {
  console,
  setTimeout,
  clearTimeout,
  document: { querySelector: () => null },
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  toast: () => {}
};
vm.createContext(context);
for (const file of [
  'src/core/util.js', 'src/core/state.js', 'src/core/parser.js',
  'src/report/report.js', 'src/report/exports.js'
]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });

const sourceChecks = [
  ['savePdf tracks first section pages', exportSource.includes('sectionFirstPdfPage')],
  ['savePdf adds native PDF links', exportSource.includes('pdf.link(')],
  ['savePdf selects the TOC page', exportSource.includes('pdf.setPage(tocPdfPage')],
  ['savePdf links measured rectangles', exportSource.includes('pdf.link(t.x, t.y, t.w, t.h')]
];

let writtenWorkbook = null;
const encodeCell = ({ r, c }) => String.fromCharCode(65 + c) + (r + 1);
const decodeRange = ref => {
  const [start, end] = ref.split(':').map(cell => cell.match(/^([A-Z]+)(\d+)$/));
  return { s: { c: start[1].charCodeAt(0) - 65, r: Number(start[2]) - 1 },
    e: { c: end[1].charCodeAt(0) - 65, r: Number(end[2]) - 1 } };
};
const encodeRange = range => `${encodeCell(range.s)}:${encodeCell(range.e)}`;
context.XLSX = {
  utils: {
    book_new: () => ({ SheetNames: [], Sheets: {} }),
    book_append_sheet: (wb, ws, name) => { wb.SheetNames.push(name); wb.Sheets[name] = ws; },
    encode_cell: encodeCell,
    decode_range: decodeRange,
    encode_range: encodeRange
  },
  writeFile: wb => { writtenWorkbook = wb; }
};

const roles = ['plMonthly', 'plComparative', 'plPercent', 'bs', 'ar', 'ap'];
const sheetModels = {};
const sheets = { source: [] };
const roleMap = {};
for (const role of roles){
  const name = `${role} source`;
  roleMap[role] = name;
  sheets[name] = [];
  sheetModels[name] = {
    name, role, headerRow: -1,
    cols: [{ idx: 0, type: 'label', label: 'Line Item' }, { idx: 1, type: 'month', label: 'Current' }],
    lines: []
  };
}
context.__testSheets = sheets;
context.__testModel = {
  roles: roleMap,
  sheetModels,
  metrics: { income: 1, gross: 1, expenses: 1, net: 1, bank: 1, ar: 1, ap: 1, assets: 1 },
  prior: { income: 1, gross: 1, expenses: 1, net: 1, bank: 1, ar: 1, ap: 1 },
  months: [], monthlyRevenue: [], monthlyNet: []
};
vm.runInContext("state.sheets = __testSheets; state.client = 'Example Client'; state.period = 'Year ended 31 December 2025'; state.basis = 'Accrual basis'; state.notes = 'Assets\\nCash — Operating account'; state.model = __testModel; downloadReportExcel();", context);
assert(writtenWorkbook, 'downloadReportExcel should write a workbook');

let passed = 0;
let failed = 0;
function check(label, condition){
  try { assert(condition, label); passed++; }
  catch (error){ failed++; console.error('FAIL:', error.message); }
}

for (const [label, condition] of sourceChecks) check(label, condition);
const expectedColors = [
  '0B2F59', '1D6FB8', 'B54B8E', 'B54B8E', 'B54B8E',
  '0FA5A5', 'E28C1B', 'C93438', '6D7887', '2F4A6B'
];
writtenWorkbook.SheetNames.forEach((sheetName, i) =>
  check(`${sheetName} tab color`, writtenWorkbook.Sheets[sheetName]['!tabColor'].rgb === expectedColors[i]));

const summaryView = writtenWorkbook.Sheets['Analytical Summary']['!views'][0];
const statementView = writtenWorkbook.Sheets['Balance Sheet']['!views'][0];
const notes = writtenWorkbook.Sheets.Notes;
const notesView = notes['!views'][0];
check('summary panes are frozen', summaryView.state === 'frozen' && summaryView.ySplit >= 3 && summaryView.xSplit >= 1);
check('statement panes are frozen', statementView.state === 'frozen' && statementView.ySplit >= 3 && statementView.xSplit >= 1);
check('notes panes are frozen', notesView.state === 'frozen' && notesView.ySplit >= 3 && notesView.xSplit >= 1);
check('cover has no freeze view', !writtenWorkbook.Sheets.Cover['!views'] || writtenWorkbook.Sheets.Cover['!views'][0].ySplit === 0 && writtenWorkbook.Sheets.Cover['!views'][0].xSplit === 0);
check('disclaimer has no freeze view', !writtenWorkbook.Sheets.Disclaimer['!views'] || writtenWorkbook.Sheets.Disclaimer['!views'][0].ySplit === 0 && writtenWorkbook.Sheets.Disclaimer['!views'][0].xSplit === 0);
check('notes header has line item label', notes['A4'].v === 'Line Item / Category');
check('notes header has note label', notes['B4'].v === 'Note');

console.log(`${passed + failed} row 39-42 assertions, ${passed} pass, ${failed} fail`);
if (failed) process.exitCode = 1;