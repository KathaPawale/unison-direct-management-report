#!/usr/bin/env node
/* Tracker regression fixes (Bugs 1-11) — run with: node tests/verify-regression-fixes.js
 *
 * Part 1 — the 13 source-marker assertions from the tracker spec, unchanged.
 * Part 2 — behaviour: the real parser + financials + report code run against the client fixture
 *          workbooks (Hinton, ML Jones, Seneca, Jacob, RX Angle) and small synthetic workbooks.
 * Exit code 0 = all passed. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const src = read('src/core/financials.js');
const rep = read('src/report/report.js');
const css = read('css/report.css');
let p = 0, f = 0;
const c = (n, ok) => { console.log((ok ? '  ✓ ' : '  ✗ ') + n); ok ? p++ : f++; };

console.log('Part 1 — tracker source markers');
// Bug 1
c('Bug 1 Liab table exactly once per section', (rep.match(/liabilitiesTableHtml/g) || []).length <= 2);
// Bug 2
c('Bug 2 liab bifurcation denominator = sum of items', /liabilitySumForPct|sumOfLiabRows|(currentLiabilities.*longTermLiabilities.*otherLiabilities)/.test(src));
// Bug 3
c('Bug 3 equity sign preserved', !/Math\.abs\(.*equity.*\)/i.test(src));
// Bug 4
c('Bug 4 expense denominator = leafSum', /_leafSum|leafSum/.test(src));
c('Bug 4 no pct > 100 on expenses hard-cap', /if\s*\(.*pct\s*>\s*100/.test(src) || /Math\.min\(.*100/.test(src));
// Bug 5
c('Bug 5 suppressAR whole workbook scan', /cash\s*basis/i.test(src) && /suppressAR\s*=\s*true/.test(src));
// Bug 6
c('Bug 6 reportBasis returns Cash/Accrual default', /Accrual Basis|Cash Basis/.test(rep));
c('Bug 6 no fallback to Amounts in US Dollars', !/reportBasis[\s\S]{0,200}Amounts in US Dollars/.test(rep));
// Bug 7
c('Bug 7 cover-header min-height', /cover-header[\s\S]{0,200}min-height/.test(css));
// Bug 8
c('Bug 8 disclaimer one sentence only', !/This report is confidential and intended solely for management use/.test(rep));
// Bug 9
c('Bug 9 meta rows filtered from body', /kind\s*===\s*['"]meta['"]/.test(rep) || /line\.kind\s*===\s*['"]meta['"]/.test(rep));
// Bug 10
c('Bug 10 footer safe zone reserved', /footerSafeZone|72|BOTTOM_SAFE/.test(rep));
// Bug 11
c('Bug 11 orphanGuard on liab table', /orphanGuard.*liab|liab.*orphanGuard/is.test(rep));

console.log('\nPart 2 — behaviour on the client fixture workbooks');
const ctx = {
  console: { log() {}, warn() {}, error() {} },
  document: { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {} }), getElementById: () => null, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout, clearTimeout
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(['src/core/util.js', 'src/core/state.js', 'src/core/parser.js', 'src/core/financials.js', 'src/core/recompute.js',
  'src/report/charts.js', 'src/report/report.js'].map(read).join('\n;\n') +
  '\n;globalThis.__api = { parseWorkbook, state, reportBasis, reportSections, liabilitiesTableHtml, reportTableParts };', ctx);
const api = ctx.__api;
const load = sheets => { api.state.sheets = sheets; api.state.basisOverride = ''; const md = api.parseWorkbook(sheets); api.state.model = md; return md; };
const fx = JSON.parse(read('tests/calc-fixtures.json')).fixtures;
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

for (const [k, sheets] of Object.entries(fx)){
  const md = load(JSON.parse(JSON.stringify(sheets)));
  const tag = `[${k} ${String(md.client || '').slice(0, 22)}]`;
  const lb = md.liabilityBifurcation;
  c(`${tag} Bug 2 liabilities bifurcation rows sum to 100%`, lb.length > 0 && near(lb.reduce((s, x) => s + (x.pct || 0), 0), 100) && lb.every(x => x.pct === null || Math.abs(x.pct) <= 100.001));
  c(`${tag} Bug 2 table header is "% of Total Liabilities"`, /% of Total Liabilities</.test(api.liabilitiesTableHtml('t')) && !/Liabilities &amp; Equity</.test(api.liabilitiesTableHtml('t')));
  const eg = md.expenseGroups;
  c(`${tag} Bug 4 every expense share ≤ 100% and shares sum to 100%`, eg.length > 0 && eg.every(x => Math.abs(x.pct) <= 100) && near(eg.reduce((s, x) => s + x.pct, 0), 100, 0.05));
  c(`${tag} Bug 6 cover basis is a basis`, /^(Cash|Accrual) Basis$/.test(api.reportBasis()));
  const bs = md.sheetModels[md.roles.bs];
  const firstLabels = bs.lines.slice(0, 3).map(l => l.label).join(' | ');
  c(`${tag} Bug 9 title rows tagged meta and kept out of the Balance Sheet body (starts: ${firstLabels})`,
    bs.metaLines.length > 0 && bs.metaLines.every(l => l.kind === 'meta') &&
    !bs.lines.some(l => l.r < bs.bodyStart) && !bs.lines.some(l => l.label === md.client));
}

/* Jacob (tracker figures): 61,541 / 66,746.70 = 92.20%, 5,205.70 / 66,746.70 = 7.80% */
{
  const md = load(JSON.parse(JSON.stringify(fx.D)));
  const [cur, lt] = md.liabilityBifurcation;
  c('Jacob Bug 2 Current 92.20% + Long-Term 7.80% = 100%', near(cur.pct, 92.20) && near(lt.pct, 7.80));
}
/* Hinton: cash basis, negative equity */
for (const k of ['A', 'F']){
  const md = load(JSON.parse(JSON.stringify(fx[k])));
  const eq = md.bsComposition.liabEquity.find(x => x.label === 'Equity');
  c(`Hinton ${k} Bug 3 equity stays negative (${md.metrics.equity}) and its share is < 0`, md.metrics.equity < 0 && eq && eq.pct < 0);
  c(`Hinton ${k} Bug 5 cash basis: no A/R figure, no A/R aging, no A/R section`,
    md.suppressAR === true && md.metrics.ar === null && md.arAging === null && !api.reportSections().some(s => s.id === 'ar'));
}

console.log('\nPart 2 — behaviour on synthetic workbooks');
const head = t => [['Pluto Test Co'], [t], ['As of December 31, 2025'], []];
/* Bug 3: a Total Equity cell of -117,310 must come through as exactly -117,310. */
{
  const md = load({
    'Balance Sheet': [...head('Balance Sheet'), ['', 'Total'], ['Assets'], ['Checking', 400000], ['Total Assets', 400000],
      ['Liabilities and Equity'], ['Liabilities'], ['Current Liabilities'], ['Loan Payable', 300000], ['Total Current Liabilities', 300000],
      ['Long-Term Liabilities'], ['Note Payable', 217310], ['Total Long-Term Liabilities', 217310], ['Total Liabilities', 517310],
      ['Equity'], ['Retained Earnings', -116701], ['Net Income', -609], ['Total Equity', -117310],
      ['Total Liabilities and Equity', 400000]]
  });
  const eq = md.bsComposition.liabEquity.find(x => x.label === 'Equity');
  c('Bug 3 Total Equity -117,310 → md.metrics.equity === -117310', md.metrics.equity === -117310);
  c('Bug 3 Balance Sheet Composition Equity.pct < 0', !!eq && eq.pct < 0);
  c('Bug 2 liabilities split 57.99% + 42.01% (not % of L&E)', near(md.liabilityBifurcation[0].pct, 300000 / 517310 * 100) && near(md.liabilityBifurcation[1].pct, 217310 / 517310 * 100));
}
/* Bug 5: "Cash Basis" on ANY sheet (here only the A/R aging footer) → whole workbook is cash basis. */
{
  const md = load({
    'Balance Sheet': [...head('Balance Sheet'), ['', 'Total'], ['Assets'], ['Checking', 1000], ['Accounts Receivable', 318.32], ['Total Assets', 1318.32],
      ['Liabilities and Equity'], ['Equity'], ['Retained Earnings', 1318.32], ['Total Equity', 1318.32], ['Total Liabilities and Equity', 1318.32]],
    'A/R Aging Summary': [...head('A/R Aging Summary'), ['', 'Current', '1 - 30', 'Total'], ['Customer A', 300, 18.32, 318.32], ['TOTAL', 300, 18.32, 318.32], [], ['Cash Basis Monday, February 3, 2026']]
  });
  c('Bug 5 cash basis text on any sheet → suppressAR, A/R null, no A/R aging, no A/R section',
    md.suppressAR === true && md.metrics.ar === null && md.arAging === null && !api.reportSections().some(s => s.id === 'ar'));
}
/* Bug 5 control: an accrual workbook keeps its A/R. */
{
  const md = load({
    'Balance Sheet': [...head('Balance Sheet'), ['', 'Total'], ['Assets'], ['Checking', 1000], ['Accounts Receivable', 500], ['Total Assets', 1500],
      ['Liabilities and Equity'], ['Equity'], ['Retained Earnings', 1500], ['Total Equity', 1500], ['Total Liabilities and Equity', 1500], [], ['Accrual Basis Monday, February 3, 2026']]
  });
  c('Bug 5 accrual workbook keeps A/R', md.suppressAR === false && md.metrics.ar === 500);
}
/* Bug 6: basis labels and the fallback. */
{
  const basisOf = text => load({ 'Balance Sheet': [...head('Balance Sheet'), ['', 'Total'], ['Checking', 1], ['Total Assets', 1], [], [text]] }) && api.reportBasis();
  c('Bug 6 "Basis of Preparation: Cash" → Cash Basis', basisOf('Basis of Preparation: Cash') === 'Cash Basis');
  c('Bug 6 "Reporting Basis: Accrual" → Accrual Basis', basisOf('Reporting Basis: Accrual') === 'Accrual Basis');
  c('Bug 6 "Modified Cash Basis" → Cash Basis', basisOf('Modified Cash Basis') === 'Cash Basis');
  c('Bug 6 only "Amounts in US Dollars ($)" → Accrual Basis', basisOf('Amounts in US Dollars ($)') === 'Accrual Basis');
}
/* Bug 4: an over-100% share (Total for Expenses line smaller than the section) is impossible. */
{
  const md = load({
    'Profit and Loss': [...head('Profit and Loss'), ['', 'Total'], ['Income'], ['Sales', 5000], ['Total Income', 5000],
      ['Expenses'], ['Payroll expenses', 1886.1], ['Interest Expense', 1926.1], ['Rent', 187.8], ['Total Expenses', 1000], ['Net Income', 1000]]
  });
  c('Bug 4 wrong "Total Expenses" line cannot push a share above 100%', md.expenseGroups.every(x => Math.abs(x.pct) <= 100) && near(md.expenseGroups.reduce((s, x) => s + x.pct, 0), 100, 0.05));
}

console.log(`\n${p + f} regression assertions, ${p} pass, ${f} fail`);
process.exit(f ? 1 : 0);
