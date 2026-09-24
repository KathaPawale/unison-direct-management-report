#!/usr/bin/env node
/* Source-marker regression checks for the 11 production bugs. */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const financials = fs.readFileSync(path.join(root, 'src/core/financials.js'), 'utf8');
const parser = fs.readFileSync(path.join(root, 'src/core/parser.js'), 'utf8');
const report = fs.readFileSync(path.join(root, 'src/report/report.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/report.css'), 'utf8');
let pass = 0;
let fail = 0;

function check(label, condition){
  if (condition) pass++;
  else { fail++; console.error('FAIL:', label); }
}

const dashboard = report.slice(report.indexOf('function dashboardBodies'), report.indexOf('/* Summary table'));
const expense = financials.slice(financials.indexOf('function expenseBreakdown'), financials.indexOf('/* ---------- Balance Sheet'));
const basis = financials.slice(financials.indexOf('function detectBasis'), financials.indexOf('const STATEMENT_TITLE_RE'));

check('BUG 1 dashboard renders one liabilities table call', (dashboard.match(/liabilitiesTableHtml\(/g) || []).length === 1);
check('BUG 2 liability table denominator is liability rows', /const totalLiab = items\.reduce/.test(report) && !/totalLE/.test(report.slice(report.indexOf('function liabilitiesTableHtml'), report.indexOf('function monthlyLabels'))));
check('BUG 4 expense denominator uses Expenses leaf sum', /sectionLeaf = _leafSum/.test(expense) && /const denominator = \(sectionTotal/.test(expense));
check('BUG 4 expense percentages hard-cap shown rows', /const shown = list\.slice\(0, 10\)/.test(expense) && /shown\.some\(x => Math\.abs\(x\.pct\) > 100\)/.test(expense));
check('BUG 6 report basis has only cash/accrual defaults', /return \/cash\/i\.test\(v\).*Cash Basis.*Accrual Basis/s.test(report) && /if \(!v\) return 'Accrual Basis'/.test(report));
check('BUG 6 basis scans every sheet first 15 and last 5 rows', /rows\.slice\(0, 15\)\.concat\(rows\.slice\(-5\)\)/.test(basis) && /cash\\s\*basis|accrual\\s\*basis|basis\\s\*\[\\:\-\]\?\\s\*cash/.test(basis));
check('BUG 7 long cover names wrap', /\.cover-header\{min-height:96px;padding-top:8px/.test(css) && /\.cover-header-name\{line-height:1\.15;overflow:visible;white-space:normal;word-break:break-word\}/.test(css) && /cover-header-name/.test(report));
check('BUG 8 disclaimer has no grey duplicate line', /REPORT_DISCLAIMER/.test(report) && !/This report is confidential and intended solely for management use\./.test(report));
check('BUG 10 reserves footer and table space', /FOOTER_RESERVE = 72/.test(report) && /tableRows >= 20 \? 40 : 0/.test(report));
check('BUG 11 liabilities block has orphan guard', /Liabilities Bifurcation[\s\S]*orphanGuard: true/.test(dashboard) && /b\.orphanGuard/.test(report));
check('BUG 3 preserves negative equity percentages', /label: 'Equity', value: equity, pct:.*equity \/ totalLE/.test(financials) && !/value: Math\.abs\(equity\)/.test(financials));
check('BUG 5 cash suppression scans the whole workbook', /const workbookCashBasis = Object\.values\(sheets\)/.test(financials) && /const suppressAR = cashBasis/.test(financials));
check('BUG 9 meta rows are tagged and filtered', /kind: 'meta'/.test(parser) && /line\.kind === 'meta'\)\s*continue/.test(report));

console.log(`${pass + fail}/${pass + fail} assertions, ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
