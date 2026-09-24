#!/usr/bin/env node
/* Financial formatting standard — guards every surface against drifting apart again.
 *   amounts  $1,234.56 / ($1,234.56)     percents  12.50% / (12.50%)
 *   Excel amounts (client choice: no $ symbol)  1,234.56 / (1,234.56)
 * Run with: node tests/verify-financial-formatting.js */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
let pass = 0;
let fail = 0;

function check(label, got, want){
  if (got === want) pass++;
  else { fail++; console.error(`FAIL: ${label}\n      got:  ${got}\n      want: ${want}`); }
}

const ctx = {
  console: { log() {}, warn() {}, error() {} },
  document: { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {} }), getElementById: () => null, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout, clearTimeout
};
ctx.window = ctx;
vm.createContext(ctx);
const files = ['src/core/util.js', 'src/core/state.js', 'src/core/parser.js', 'src/core/financials.js', 'src/core/recompute.js',
  'src/report/charts.js', 'src/report/report.js', 'src/report/exports.js'];
vm.runInContext(files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n') +
  '\n;globalThis.__api = { accounting, money, percentText, pct, pctText, formatReportCell, varianceChip, XL };', ctx);
const a = ctx.__api;

/* Amounts */
check('accounting positive', a.accounting(1234.5), '$1,234.50');
check('accounting negative', a.accounting(-1234.5), '($1,234.50)');
check('accounting rounds to cents', a.accounting(1234.567), '$1,234.57');
check('accounting tiny negative is not ($0.00)', a.accounting(-0.004), '$0.00');
check('accounting without symbol', a.accounting(-1234.5, false), '(1,234.50)');
check('money() matches accounting()', a.money(-98765.4), '($98,765.40)');

/* Percents */
check('percent positive', a.percentText(12.5), '12.50%');
check('percent negative', a.percentText(-12.5), '(12.50%)');
check('percent tiny negative is not (0.00%)', a.percentText(-0.001), '0.00%');
check('pct() matches', a.pct(-3.456), '(3.46%)');
check('pctText() matches', a.pctText(-3.456), '(3.46%)');

/* Report table cells */
check('report amount cell', a.formatReportCell(-2500, 'current'), '($2,500.00)');
check('report percent cell (fraction)', a.formatReportCell(0.125, 'percent'), '12.50%');
check('report percent cell (whole)', a.formatReportCell(-12.5, 'percent'), '(12.50%)');
check('report percent cell (fraction column total)', a.formatReportCell(1, 'percent', { fraction: true }), '100.00%');
check('report percent cell (text "75%")', a.formatReportCell('75%', 'percent'), '75.00%');
check('report percent cell (text "(3.5%)")', a.formatReportCell('(3.5%)', 'percent'), '(3.50%)');
check('report percent cell (text "-3.5%")', a.formatReportCell('-3.5%', 'percent'), '(3.50%)');
check('variance chip uses 2 decimals', /▼ 50\.00% vs PY/.test(a.varianceChip(50, 100)), true);

/* Excel number formats */
check('Excel money format: no $, (negatives)', a.XL.moneyFmt, '_-* #,##0.00_-;[Red]_-* (#,##0.00)_-;_-* "-"_-;_-@_-');
check('Excel total format: no $, (negatives), 0.00 for zero', a.XL.totalFmt, '_-* #,##0.00_-;[Red]_-* (#,##0.00)_-;_-* 0.00_-;_-@_-');
check('Excel percent format', a.XL.pctFmt, '0.00%;[Red](0.00%)');

/* No hand-rolled number formatting outside util.js */
for (const f of ['src/app.js', 'src/report/charts.js', 'src/report/report.js', 'src/report/exports.js']){
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  check(`${f} has no ad-hoc % formatting`, /toFixed\([0-2]\)\s*\+\s*'%'|toFixed\([0-2]\)\}%/.test(src), false);
  const allowed = [a.XL.moneyFmt, a.XL.totalFmt, a.XL.pctFmt];
  const odd = [...src.matchAll(/numFmt:\s*'([^']*)'/g)].map(m => m[1]).filter(fmt => !allowed.includes(fmt));
  check(`${f} Excel formats all follow the standard`, odd.join(' | '), '');
}

console.log(`${pass + fail} assertions, ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
