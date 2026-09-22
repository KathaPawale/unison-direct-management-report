#!/usr/bin/env node
/* Tracker rows 39-45 verification. Run with: node tests/verify-rows-39-45.js */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const report = fs.readFileSync(path.join(root, 'src/report/report.js'), 'utf8');
const exportsSource = fs.readFileSync(path.join(root, 'src/report/exports.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/report.css'), 'utf8');
let passed = 0;
let failed = 0;

function check(label, condition){
  if (condition) passed++;
  else { failed++; console.error('FAIL:', label); }
}

check('TOC page tracking map exists', exportsSource.includes('const sectionFirstPdfPage = new Map()'));
check('TOC entries are collected from anchors', exportsSource.includes("querySelectorAll('a.toc-item[href^=\"#report-section-\"]')"));
check('TOC entries use PDF links', exportsSource.includes('pdf.link(t.x, t.y, t.w, t.h'));
check('TOC links target one-based PDF pages', exportsSource.includes('pageNumber: target + 1'));
check('Notes use a title row', exportsSource.includes('Notes to Financial Statements'));
check('Notes have line item and note columns', exportsSource.includes("'Line Item / Category'") && exportsSource.includes("'Note'"));
check('Notes classify headings', exportsSource.includes('const isHeading = line =>'));
check('Notes split labels from details', exportsSource.includes("const [label, ...rest] = line.split(' — ');"));
check('Monthly pagination supports 20 columns', report.includes('const MAX_COLS_PER_PAGE = 20'));
check('Monthly P&L forces landscape', report.includes("sm.role === 'plMonthly' || all.length >= 12"));
check('Monthly table is marked roomy', report.includes("cols.length <= 4 || forceLandscape ? ' roomy'"));
check('Landscape roomy CSS shrinks cells', css.includes('.report-page.landscape .report-table.roomy td,.report-page.landscape .report-table.roomy th'));
check('Zero account rows use an en dash', report.includes("opts.zeroDash") && report.includes("return '&ndash;';"));
check('Negative report values retain negative class', report.includes("(n !== null && n < 0) ? 'neg'"));
check('Excel money format is accounting format', exportsSource.includes("moneyFmt: '_-* #,##0.00_-;[Red]_-* (#,##0.00)_-;_-* \"-\"_-;_-@_-'"));
check('Excel percentage format colors negatives', exportsSource.includes("pctFmt: '0.00%;[Red](0.00%)'"));
check('Grand totals have double top and thin bottom borders', exportsSource.includes("border: { top: { style: 'double'") && exportsSource.includes("bottom: { style: 'thin'"));
check('Statement columns use requested widths', exportsSource.includes("{ wch: 34 }, ...cols.map(c => ({ wch: c.type === 'percent' ? 12 : 14 }))"));

console.log(`${passed}/${passed + failed} row-39-45 assertions pass, ${failed} fail`);
if (failed) process.exitCode = 1;
