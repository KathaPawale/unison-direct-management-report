#!/usr/bin/env node
/* Tracker rows 1-54, verified in the real app in Chromium.
 *
 * Each workbook (the seven client fixtures plus synthetic ones for the layouts the tracker names) is
 * written as a real .xlsx, uploaded through the Upload page file input and processed with the
 * Process button. The test then checks the dashboard, Review & Edit, Financial Statements page, every
 * rendered report page, the saved PDF file and the Excel management report.
 *
 * Needs `npm install` (xlsx-js-style, playwright-core), a Playwright Chromium build
 * (npx playwright-core install chromium, or CHROMIUM_PATH) and network access for the CDN scripts.
 * Run with: node tests/verify-tracker-browser.js   (exit code 0 = every check passed) */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const XLSX = require('xlsx-js-style/dist/xlsx.bundle.js');
const { chromium } = require('playwright-core');

const root = path.join(__dirname, '..');
let pass = 0, fail = 0;
const failures = [];
function check(label, ok, detail){
  if (ok) pass++;
  else { fail++; failures.push(label + (detail ? ' — ' + detail : '')); console.error('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}

/* ---------- workbooks ---------- */

const T = (client, title, period) => [[client], [title], [period], []];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function row54Workbook(){
  const client = 'Acme Hospitality LLC', period = 'January-December 2025';
  const heads = MONTHS.map(m => m + ' 2025');
  const mr = (label, v) => [label, ...heads.map(() => v), +(v * 12).toFixed(2)];
  const pl = [...T(client, 'Profit and Loss', period), ['', ...heads, 'Total'],
    ['Income'], mr('   Sales', 1000), mr('Total for Income', 1000),
    ['Expenses'], ['   Payroll Expenses'], mr('      Wages', 600), mr('      Payroll Taxes', 100), mr('      Employee Benefits', 50),
    mr('   Total for Payroll Expenses', 750), mr('   Rent', 350), mr('   Dues & Subscriptions', 0),
    mr('Total for Expenses', 1100), mr('Net Operating Income', -100), mr('Net Income', -100)];
  const cls = ['Admin', 'Rooms', 'F&B'];
  const cr = (label, v) => [label, ...cls.map(() => v), v * 3];
  const plc = [...T(client, 'Profit and Loss by Class', period), ['', ...cls, 'Total'],
    ['Income'], cr('Sales', 4000), cr('Total for Income', 4000), ['Expenses'], cr('Payroll Expenses', 3000), cr('Rent', 1400),
    cr('Total for Expenses', 4400), cr('Net Income', -400)];
  const bs = [...T(client, 'Balance Sheet', 'As of December 31, 2025'), ['', 'Total'],
    ['Assets'], ['   Current Assets'], ['      Bank Accounts'], ['         Checking', 5000], ['         Savings', 2000],
    ['      Total for Bank Accounts', 7000], ['      Accounts Receivable', 0], ['   Total for Current Assets', 7000],
    ['   Fixed Assets'], ['      Equipment', 3000], ['   Total for Fixed Assets', 3000], ['Total for Assets', 10000],
    ['Liabilities and Equity'], ['   Liabilities'], ['      Current Liabilities'], ['         Accounts Payable', 1000], ['         Credit Card', 500],
    ['      Total for Current Liabilities', 1500], ['      Long-Term Liabilities'], ['         Bank Loan', 2500],
    ['      Total for Long-Term Liabilities', 2500], ['   Total for Liabilities', 4000],
    ['   Equity'], ['      Retained Earnings', 7200], ['      Net Income', -1200], ['   Total for Equity', 6000],
    ['Total for Liabilities and Equity', 10000]];
  /* BS_Comparative is the first tab: it must not take the Balance Sheet role from "BS". */
  const bsc = [...T(client, 'Balance Sheet', 'As of December 31, 2025'), ['', 'As of Dec 31, 2025', 'As of Dec 31, 2024 (PY)'],
    ['Assets'], ['Checking', 7000, 6000], ['Equipment', 3000, 3500], ['Total for Assets', 10000, 9500], ['Liabilities and Equity'],
    ['Accounts Payable', 1500, 1200], ['Bank Loan', 2500, 3100], ['Total for Liabilities', 4000, 4300], ['Retained Earnings', 6000, 5200],
    ['Total for Equity', 6000, 5200], ['Total for Liabilities and Equity', 10000, 9500]];
  const notes = [['Notes to Financial Statements'], ['Bank Accounts — Reconciled to bank statements as of December 31, 2025'],
    ['Payroll Expenses — Includes the year-end bonus accrual']];
  return { name: 'Row 54 BS_Comparative + BS + P&L(Monthly) + P&l(Classwise)', client, period,
    sheets: { 'BS_Comparative': bsc, 'BS': bs, 'P&L(Monthly)': pl, 'P&l(Classwise)': plc, 'Notes': notes },
    expect: { roles: { bs: 'BS', bsComparative: 'BS_Comparative', plMonthly: 'P&L(Monthly)', plClass: 'P&l(Classwise)', notes: 'Notes' }, income: 12000, net: -1200, expenses: 13200,
      bank: 7000, months: 12, hasPrior: false, payroll: 9000, currentLiab: 1500, longLiab: 2500,
      zeroRows: ['Accounts Receivable', 'Dues & Subscriptions'], notes: ['Reconciled to bank statements', 'year-end bonus accrual'],
      excelSheets: ['BS', 'BS_Comparative', 'P&L(Monthly)', 'P&l(Classwise)'],
      sections: ['bs', 'bsComparative', 'plMonthly', 'plClass'] } };
}

function plutoWorkbook(){
  const client = 'Pluto Asset Recovery', period = 'January-December 2025';
  const pl = [...T(client, 'Profit and Loss', period), ['', 'Jan - Dec 2025', 'Jan - Dec 2024 (PY)'],
    ['Income'], ['Sales', 10000, 9000], ['Total for Income', 10000, 9000], ['Expenses'], ['Travel', 268.2, 250], ['Legal & Professional Fees', 126.6, 100],
    ['Rent', 4000, 3600], ['Total for Expenses', 4394.8, 3950], ['Net Income', 5605.2, 5050]];
  const pct = [...T(client, 'Profit and Loss % of Total Income', period), ['', 'Jan - Dec 2025', '% of Income'],
    ['Income'], ['Sales', 10000, '100.00%'], ['Total for Income', 10000, '100.00%'], ['Expenses'], ['Travel', 268.2, '2.68%'],
    ['Legal & Professional Fees', 126.6, '1.27%'], ['Rent', 4000, '40.00%'], ['Total for Expenses', 4394.8, '43.95%'], ['Net Income', 5605.2, '56.05%']];
  const bsc = [...T(client, 'Balance Sheet', 'As of December 31, 2025'), ['', 'As of Dec 31, 2025', 'As of Dec 31, 2024 (PY)'],
    ['Assets'], ['Checking', 8000, 6000], ['Total for Assets', 8000, 6000], ['Liabilities and Equity'], ['Current Liabilities'], ['Accounts Payable', 1000, 800],
    ['Total for Current Liabilities', 1000, 800], ['Total for Liabilities', 1000, 800], ['Equity'], ['Retained Earnings', 7000, 5200], ['Total for Equity', 7000, 5200],
    ['Total for Liabilities and Equity', 8000, 6000]];
  /* As in the client's file: an "Account Type" column between the account and Debit / Credit. */
  const tb = [...T(client, 'Trial Balance', 'As of December 31, 2025'), ['Account', 'Account Type', 'Debit', 'Credit'], ['Checking', 'Bank', 8000, ''],
    ['Accounts Payable', 'Accounts Payable', '', 1000], ['Retained Earnings', 'Equity', '', 1394.8], ['Sales', 'Revenue', '', 10000], ['Rent', 'Expense', 4000, ''],
    ['Travel', 'Expense', 268.2, ''], ['Legal & Professional Fees', 'Expense', 126.6, ''], ['TOTAL', '', 12394.8, 12394.8]];
  const ap = [...T(client, 'A/P Aging Summary', 'As of December 31, 2025'), ['Contact', 'Current', '1 - 30 Days', 'Older', 'Total', '% of Total'],
    ['Vendor A', 600, 150, 0, 750, 0.75], ['Vendor B', 150, 0, 100, 250, 0.25], ['TOTAL', 750, 150, 100, 1000, 1]];
  /* An aging report with no open items. */
  const ar = [['Accounts Receivable Aging Summary'], [client], ['As of December 31, 2025'], ['Aging by due date']];
  return { name: 'Pluto: PL / PL (% Income) / BS_Comparative / TrialBalance / A/P aging', client, period,
    sheets: { 'PL': pl, 'PL (% Income)': pct, 'BS_Comparative': bsc, 'TrialBalance': tb, 'AR_Aging': ar, 'AP Aging Summary': ap },
    pctFormatted: { 'AP Aging Summary': [5] },
    expect: { roles: { plComparative: 'PL', plPercent: 'PL (% Income)', tb: 'TrialBalance', ap: 'AP Aging Summary' }, income: 10000, net: 5605.2,
      hasPrior: true, priorIncome: 9000, months: 0,
      pctRows: { 'PL (% Income)': { 'Travel': '2.7%', 'Legal & Professional Fees': '1.3%', 'Net Income': '56.1%' } },
      excelSheets: ['PL', 'PL (% Income)', 'TrialBalance', 'AP Aging Summary'],
      tbAccounts: ['Checking', 'Accounts Payable', 'Rent'], apBuckets: ['Current', '1 - 30 Days', 'Older'], emptyAR: true,
      periods: { tb: 'As of December 31, 2025', plPercent: 'January – December 2025' },
      sections: ['bs', 'tb', 'plComparative', 'plPercent', 'ap'] } };
}

/* The client's Pluto Asset Recovery workbook layout (Pluto_summary.txt): PL is the % of Income statement, the title sits
 * above the company name, PL_MoM runs newest month first, Balance Sheet labels span three columns, empty A/R aging, A/P
 * aging with a "Percentage of total" row, Account Type column in the Trial Balance, a General Ledger, negative equity.
 * Figures reconcile to the file: income 576,101.75, operating expenses 144,320.77, net income 12,580.40. */
function plutoClientWorkbook(){
  const C = 'Pluto Asset Recovery, Inc';
  const T = (t, p, w) => [[t, ...Array(w - 1).fill('')], [C, ...Array(w - 1).fill('')], [p, ...Array(w - 1).fill('')], Array(w).fill('')];
  const inc = [['Commission Income', 46541.12, 14781.95], ['Settlement Revenue', 529560.63, 0]];
  const cogs = [['Cost to Settlements', 418716.16, 0], ['Filing Fees', 484.42, 0]];
  /* Visible operating expenses from the summary + TrialBalance; the rest of the 144,320.77 is in the (truncated) remaining lines. */
  const opex = [['Advertising', 3569.07, 2722.7], ['ASK MY ACCOUNTANT', 80, 0], ['Automobile Expense', 2558.68, 201.27], ['Bank Service Charges', 107.75, 284.99],
    ['Charity', 5317.5, 1000], ['Claimant Surplus funds', -13556.8, 0], ['Mobile Notary', 2105, 0], ['Rent Expenses', 38200, 0], ['Utilities', 2807.37, 0]];
  const known = opex.reduce((s, r) => s + r[1], 0);
  opex.push(['Contract Labor', +(144320.77 - known).toFixed(2), 1200]);
  opex.sort((a, b) => a[0].localeCompare(b[0]));
  const sum = (rows, i) => +rows.reduce((s, r) => s + r[i], 0).toFixed(2);
  const I = sum(inc, 1), CG = sum(cogs, 1), GP = +(I - CG).toFixed(2), OX = sum(opex, 1), NI = +(GP - OX).toFixed(2);
  const Ip = sum(inc, 2), CGp = sum(cogs, 2), GPp = +(Ip - CGp).toFixed(2), OXp = sum(opex, 2), NIp = +(GPp - OXp).toFixed(2);
  const blank = w => Array(w).fill('');
  function plRows(val){
    const L = (label, row) => [label, ...val(row)];
    return [['Income'], ...inc.map(r => L(r[0], r)), L('Total Income', ['', I, Ip]), [], ['Cost of Goods Sold'], ...cogs.map(r => L(r[0], r)),
      L('Total Cost of Goods Sold', ['', CG, CGp]), [], L('Gross Profit', ['', GP, GPp]), [], ['Operating Expenses'], ...opex.map(r => L(r[0], r)),
      L('Total Operating Expenses', ['', OX, OXp]), [], L('Operating Income', ['', NI, NIp]), [], L('Net Income', ['', NI, NIp])];
  }
  const pl = [...T('Income Statement (Profit and Loss)', 'For the 7 months ended July 31, 2026', 3), ['Account', 'Jan-Jul 2026', 'Jan-Jul 2026 % of Income'], blank(3),
    ...plRows(r => [r[1], r[1] / I])];
  const plc = [...T('Income Statement (Profit and Loss)', 'For the 7 months ended July 31, 2026', 3), ['Account', 'Jan-Jul 2026', 'Jan-Jul 2025'], blank(3),
    ...plRows(r => [r[1], r[2]])];
  /* Month-by-month, newest month first; a line's months add to its total. */
  const W = [0.01, 0.08, 0.09, 0.01, 0.11, 0.69, 0.01];
  const split = v => { const m = W.map(w => +(v * w).toFixed(2)); m[6] = +(v - m.slice(0, 6).reduce((s, x) => s + x, 0)).toFixed(2); return [...m, v]; };
  const mom = [...T('Income Statement (Profit and Loss)', 'For the month ended July 31, 2026', 9),
    ['Account', 'Jul 2026', 'Jun 2026', 'May 2026', 'Apr 2026', 'Mar 2026', 'Feb 2026', 'Jan 2026', 'Total'], blank(9), ...plRows(r => split(r[1]))];
  const bsBody = (cur, pri) => {
    const v = (a, b) => pri ? [a, b] : [a];
    return [['Assets'], ['', 'Current Assets'], ['', '', 'Cash and Cash Equivalents'], ['', '', 'Chase Bus Complete Chk #1861', ...v(105200.58, 9307.81)],
      ['', '', 'Chase Bus Total Sav #3175', ...v(4.97, 4.97)], ['', '', 'Total Cash and Cash Equivalent', ...v(105205.55, 9312.78)],
      ...(pri ? [['', '', 'Customer Advances - Other', 0, 100]] : []),
      ['', 'Total Current Assets', '', ...v(105205.55, 9412.78)], ['', 'Fixed Assets'], ['', '', 'Computer & Office Equipment', ...v(500, 0)], ['', '', 'Vehicles', ...v(12045.7, 0)],
      ['', 'Total Fixed Assets', '', ...v(12545.7, 0)], ['Total Assets', '', '', ...v(117751.25, 9412.78)], [], ['Liabilities and Equity'], ['', 'Liabilities'],
      ['', '', 'Current Liabilities'], ['', '', 'Accounts Payable', ...v(166060.06, 0)], ['', '', 'Refund from County', ...v(75916.37, 66080.53)],
      ['', '', 'Total Current Liabilities', ...v(241976.43, 66080.53)], ['', 'Total Liabilities', '', ...v(241976.43, 66080.53)], ['', 'Equity'],
      ['', '', "Owner's Capital", ...v(-16557.56, 0)], ['', '', "Owner's Capital: Owner's Investment", ...v(94542, 50000)], ['', '', "Owner's Capital: Owner's Draw", ...v(-12250.93, -4000)],
      ['', '', 'Retained Earnings', ...v(-202539.09, -104548.2)], ['', '', 'Current Year Earnings', ...v(NI, 1880.45)],
      ['', 'Total Equity', '', ...v(-124225.18, -56667.75)], ['Total Liabilities and Equity', '', '', ...v(117751.25, 9412.78)]];
  };
  const bs = [...T('Balance Sheet', 'As of July 31, 2026', 4), ['', '', 'Account', 'Jul 31, 2026'], blank(4), ...bsBody(true, false)];
  const bsc = [...T('Balance Sheet', 'As of July 31, 2026', 5), ['', '', 'Account', 'Jul 31, 2026', 'Jul 31, 2025'], blank(5), ...bsBody(true, true)];
  const ar = [['Accounts Receivable Aging Summary'], [C], ['As of July 31, 2026'], ['Aging by due date']];
  const vendors = [['Ahmed Bamaga', 3737.87], ['Connie LaCroix', 3560.67], ['Delfin Ramirez', 1200.89], ['Donald Small', 6165.86], ['Glorell Marie-Bannister', 6302.2],
    ['James Wright', 9844.92], ['Jeffrey Hall', 6037.81], ['Joe Lazaro Niz', 7341.4], ['Maria Giblin', 399.99], ['Maria Henao', 5609.2], ['Neil Gribb', 33026.98],
    ['RAH Signing Service', 120], ['Sidney June', 78818.45], ['Thomas Boland', 3893.82]];
  const ap = [['Accounts Payable Aging Summary', '', '', '', '', '', ''], [C], ['As of July 31, 2026'], ['Aging by due date'], blank(7),
    ['Contact', 'Current', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', 'Older', 'Total'], blank(7), ['Aged Payables'],
    ...vendors.map(([n, x]) => [n, x, 0, 0, 0, 0, x]), ['Total Aged Payables', 166060.06, 0, 0, 0, 0, 166060.06], blank(7), ['Total', 166060.06, 0, 0, 0, 0, 166060.06],
    blank(7), ['Percentage of total', 1, 0, 0, 0, 0, 1]];
  const tbLines = [['Chase Bus Complete Chk #1861', 'Bank', 105200.58, ''], ['Chase Bus Total Sav #3175', 'Bank', 4.97, ''], ['Computer & Office Equipment', 'Fixed Asset', 500, ''],
    ['Vehicles', 'Fixed Asset', 12045.7, ''], ['Accounts Payable', 'Current Liability', '', 166060.06], ['Refund from County', 'Current Liability', '', 75916.37],
    ["Owner's Capital", 'Equity', 16557.56, ''], ["Owner's Capital: Owner's Investment", 'Equity', '', 94542], ["Owner's Capital: Owner's Draw", 'Equity', 12250.93, ''],
    ['Retained Earnings', 'Equity', 202539.09, ''], ...inc.map(r => [r[0], r[0] === 'Settlement Revenue' ? 'Sales' : 'Revenue', '', r[1]]),
    ...cogs.map(r => [r[0], 'Direct Costs', r[1], '']), ...opex.map(r => [r[0], 'Expense', r[1] >= 0 ? r[1] : '', r[1] < 0 ? -r[1] : ''])];
  const dr = +tbLines.reduce((s, r) => s + (+r[2] || 0), 0).toFixed(2), cr = +tbLines.reduce((s, r) => s + (+r[3] || 0), 0).toFixed(2);
  const tb = [...T('Trial Balance', 'As of July 31, 2026', 4), ['Account', 'Account Type', 'Debit', 'Credit'], ...tbLines, ['Total', '', dr, cr]];
  const gl = [...T('General Ledger Detail', 'For the period January 1, 2026 to July 31, 2026', 8),
    ['Date', 'Source', 'Description', 'Reference', 'Debit', 'Credit', 'Running Balance', 'Related account'], blank(8)];
  let n = 0;
  for (const [acct] of [...cogs, ...opex, ...inc]){
    gl.push([acct.replace(/^/, (10 + n) + ' - ')], ['Opening Balance', '', '', '', 0, 0, 0, '']);
    let run = 0;
    for (let i = 0; i < 230 && gl.length < 300; i++){
      const d = new Date(Date.UTC(2026, i % 7, 1 + (i % 27))), amt = +(5 + (i * 37 % 400) + 0.5).toFixed(2); run = +(run + amt).toFixed(2);
      gl.push([d, 'Spend Money', 'Vendor ' + (i % 13), '', amt, 0, run, '10100 - Chase Bus Complete Chk']);
    }
    gl.push(['Total ' + (10 + n) + ' - ' + acct, '', '', '', run, 0, run, ''], ['Net movement', '', '', '', run, 0, 0, ''], ['Closing Balance', '', '', '', run, 0, run, '']);
    n++;
  }
  return { name: 'Pluto client layout (PL % of Income, PL_MoM, BS, comparatives, aging, TrialBalance, GeneralLedger)', client: C, period: 'For the 7 months ended July 31, 2026',
    sheets: { 'PL': pl, 'PL_MoM': mom, 'BS': bs, 'PL_Comparative': plc, 'BS_Comparative': bsc, 'AR_Aging': ar, 'AP_Aging': ap, 'TrialBalance': tb, 'GeneralLedger': gl },
    expect: { roles: { plPercent: 'PL', plMonthly: 'PL_MoM', bs: 'BS', plComparative: 'PL_Comparative', bsComparative: 'BS_Comparative', ar: 'AR_Aging', ap: 'AP_Aging', tb: 'TrialBalance' },
      income: 576101.75, expenses: 144320.77, net: 12580.4, bank: 105205.55, hasPrior: true, priorIncome: 14781.95, months: 7, currentLiab: 241976.43, longLiab: 0,
      tbAccounts: ['Chase Bus Complete Chk #1861', 'Accounts Payable', 'Rent Expenses'], apBuckets: ['Current', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', 'Older'], emptyAR: true,
      periods: { tb: 'As of July 31, 2026', ap: 'As of July 31, 2026', bs: 'As of July 31, 2026', plMonthly: 'For the month ended July 31, 2026' },
      pctRows: { 'PL': { 'Total Income': '100.0%', 'Gross Profit': '27.2%', 'Net Income': '2.2%', 'Claimant Surplus funds': '(2.4%)' } }, editorPct: 20,
      excelSheets: ['BS', 'BS_Comparative', 'TrialBalance', 'PL_MoM', 'PL_Comparative', 'PL', 'AR_Aging', 'AP_Aging'],
      sections: ['bs', 'bsComparative', 'tb', 'plMonthly', 'plComparative', 'plPercent', 'ar', 'ap'] } };
}

/* Seneca: a Summary index tab first (sheet names, "Click here to view!", NOTE), statements, and transaction lists
 * (Invoice required, Uncategorized Exp / Income) that go into Excel only. */
function senecaWorkbook(){
  const client = 'Seneca Real Estate Services, Inc.', period = 'January-July, 2026';
  const T = (t, p) => [[client], [t], [p || period], []];
  const serial = (m, d) => Math.round((Date.UTC(2026, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5);
  const names = ['Profit and Loss(Comparative)', 'Profit and Loss(Monthly)', 'Profit and Loss(% of Income)', 'Balance Sheet', 'AP Aging', 'AR Aging',
    'Invoice required', 'Uncategorized Expenses', 'Uncategorized Income'];
  const summary = [['', client], [], ...names.map((n, i) => [i + 1, n, 'Click here to view!']), [], ['NOTE :', 'Intercompany balances may vary as per july 2026 because The Greenwood Seneca LLC & Greenwood Seneca Foundation books are not closed.']];
  const body = f => [['Income'], ['Rental Income', ...f(90000)], ['Management Fees', ...f(10000)], ['Total Income', ...f(100000)], ['Expenses'], ['Rent', ...f(30000)],
    ['Payroll', ...f(40000)], ['Uncategorized Expense', ...f(2000)], ['Total Expenses', ...f(72000)], ['Net Income', ...f(28000)]];
  const plc = [...T('Profit and Loss'), ['', 'Jan - Jul 2026', 'Jan - Jul 2025 (PY)'], ...body(v => [v, v * 0.9])];
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const plm = [...T('Profit and Loss'), ['', ...M.map(m => m + ' 2026'), 'Total'], ...body(v => [...M.map(() => +(v / 7).toFixed(2)), v])];
  const plp = [...T('Profit and Loss % of Total Income'), ['', 'Jan - Jul 2026', '% of Income'], ...body(v => [v, v / 100000])];
  const bs = [...T('Balance Sheet', 'As of Jul 31, 2026'), ['', 'Total'], ['Assets'], ['Checking', 150000], ['Accounts Receivable', 20000], ['Total Assets', 170000],
    ['Liabilities and Equity'], ['Accounts Payable', 15000], ['Total Liabilities', 15000], ['Equity'], ['Retained Earnings', 127000], ['Net Income', 28000], ['Total Equity', 155000],
    ['Total Liabilities and Equity', 170000]];
  const ap = [...T('A/P Aging Summary', 'As of Jul 31, 2026'), ['Vendor', 'Current', '1 - 30', '31 - 60', 'Total'], ['Vendor A', 10000, 3000, 0, 13000], ['Vendor B', 2000, 0, 0, 2000], ['TOTAL', 12000, 3000, 0, 15000]];
  const ar = [...T('A/R Aging Summary', 'As of Jul 31, 2026'), ['Customer', 'Current', '1 - 30', '31 - 60', 'Total'], ['Tenant A', 15000, 5000, 0, 20000], ['TOTAL', 15000, 5000, 0, 20000]];
  const LH = ['Transaction date', 'Transaction type', 'Name', 'Description', 'Item split account', 'Amount', "Unison's Comment"];
  const inv = [...T('Transaction Report'), LH, [serial(3, 9), 'Expense', 'Alternative LDA', 'ALTERNATIVE LDA', 'SRS Credit Card -0183', 116.23, 'Please provide the invoice'],
    [serial(3, 5), 'Expense', 'GovSpend Smart Procure, Inc.', 'BLS*GOVSPEND PARKLAND FL', 'Business Platinum Card 43000', 7210, 'Please provide the invoice']];
  const ue = [...T('Transaction Report'), LH, [serial(2, 23), 'Expense', 'Choice Builder', 'CHOICE BUILDER DES:ONLIN PMNT ID:82246219 INDN:Del Richardson Associ CO ID:XXXXX15986 WEB', 'BOA-3193-Operational', 300.18, 'Please advise the nature of this transaction?'],
    [serial(2, 4), 'Expense', 'LA Tax', 'LA TAX BILL PAYMENT 844-663-4411 CA TAX BILL', 'Business Platinum Card 43000', 1699.82, 'Please advise the nature of this transaction?']];
  const ui = [...T('Transaction Report'), LH, [serial(3, 25), 'Deposit', 'WSP - WSP USA, Inc.', 'WSP USA Administ DES:PAYMENTS ID:1011711', 'BOA-3193-Operational', 2547.42, 'Can you please advise nature of this transaction?'],
    [serial(4, 30), 'Deposit', '', 'Counter Credit', 'BOA-3193-Operational', 993.79, 'Can you please advise nature of this transaction?']];
  return { name: 'Seneca: Summary index, statements, Invoice required, Uncategorized lists', client, period,
    sheets: { 'Summary': summary, 'Profit and Loss(Comparative)': plc, 'Profit and Loss(Monthly)': plm, 'Profit and Loss(% of Income)': plp, 'Balance Sheet': bs,
      'AP Aging': ap, 'AR Aging': ar, 'Invoice required': inv, 'Uncategorized Exp': ue, 'Uncategorized Income': ui },
    expect: { roles: { plComparative: 'Profit and Loss(Comparative)', plMonthly: 'Profit and Loss(Monthly)', plPercent: 'Profit and Loss(% of Income)', bs: 'Balance Sheet',
        ap: 'AP Aging', ar: 'AR Aging' }, income: 100000, net: 28000,
      excelSheets: ['Summary', 'Profit and Loss(Comparative)', 'Profit and Loss(Monthly)', 'Profit and Loss(% of Income)', 'Balance Sheet', 'AP Aging', 'AR Aging',
        'Invoice required', 'Uncategorized Exp', 'Uncategorized Income'],
      indexLinks: 9, listings: { 'Uncategorized Exp': 2, 'Uncategorized Income': 2, 'Invoice required': 2 }, pdfLacks: ['Choice Builder', 'Counter Credit'], pdfHas: ['Uncategorized Expense'],
      sections: ['index', 'plComparative', 'plMonthly', 'plPercent', 'bs', 'ap', 'ar'] } };
}

/* Uncategorized lines: counted in the figures and shown in the P&L / Balance Sheet in both the PDF and Excel. */
function uncategorizedWorkbook(){
  const client = 'Harbor Uncategorized LLC', period = 'January-December 2025';
  const pl = [...T(client, 'Profit and Loss', period), ['', 'Total'], ['Income'], ['Sales', 9000], ['Uncategorized Income', 1000], ['Total Income', 10000],
    ['Expenses'], ['Rent', 3000], ['Uncategorized Expense', 500], ['Total Expenses', 3500], ['Net Income', 6500]];
  const bs = [...T(client, 'Balance Sheet', 'As of December 31, 2025'), ['', 'Total'], ['Assets'], ['Checking', 8000], ['Uncategorized Asset', 200], ['Total Assets', 8200],
    ['Liabilities and Equity'], ['Accounts Payable', 1700], ['Total Liabilities', 1700], ['Equity'], ['Retained Earnings', 6500], ['Total Equity', 6500],
    ['Total Liabilities and Equity', 8200]];
  return { name: 'Uncategorized lines (PDF and Excel)', client, period, sheets: { 'BS': bs, 'P&L': pl },
    expect: { roles: { bs: 'BS', pl: 'P&L' }, income: 10000, net: 6500, expenses: 3500, excelLines: ['Uncategorized Income', 'Uncategorized Expense', 'Uncategorized Asset'],
      pdfHas: ['Uncategorized Income', 'Uncategorized Expense', 'Uncategorized Asset'], sections: ['bs', 'pl'] } };
}

/* Row 34: comparative P&L whose % of Income columns are whole percents (2.48 = 2.48%). */
function comparativePctWorkbook(){
  const client = 'Harbor Front Desk Services', period = 'January-December 2025';
  const pl = [...T(client, 'Profit and Loss', period), ['', 'Jan - Dec 2025', '% of Income', 'Jan - Dec 2024 (PY)', '% of Income'],
    ['Income'], ['Sales – Front Desk', 2480, 2.48, 2300, 2.4], ['Rooms', 97520, 97.52, 93500, 97.6], ['Total for Income', 100000, 100, 95800, 100],
    ['Expenses'], ['Travel', 2682, 2.68, 2500, 2.61], ['General & Administrative', 9449, 9.45, 9000, 9.39], ['Legal & Professional Fees', 1266, 1.27, 1200, 1.25],
    ['Cost of Operations', 96234, 96.23, 90000, 93.95], ['Total for Expenses', 109631, 109.63, 102700, 107.2],
    ['Net Operating Income', -9631, -9.63, -6900, -7.2], ['Other Income'], ['Interest Income', 2534, 2.53, 2000, 2.09],
    ['Net Income', -7097, -7.1, -4900, -5.11]];
  const bs = [...T(client, 'Balance Sheet', 'As of December 31, 2025'), ['', 'Total'], ['Assets'], ['Checking', 20000], ['Total for Assets', 20000],
    ['Liabilities and Equity'], ['Liabilities'], ['Current Liabilities'], ['Credit Card', 3000], ['Total for Current Liabilities', 3000], ['Total for Liabilities', 3000],
    ['Equity'], ['Retained Earnings', 24097], ['Net Income', -7097], ['Total for Equity', 17000], ['Total for Liabilities and Equity', 20000]];
  return { name: 'Row 34 comparative P&L with % of Income (whole percents)', client, period,
    sheets: { 'Balance Sheet': bs, 'P&L — Comparative': pl },
    expect: { roles: { bs: 'Balance Sheet', plComparative: 'P&L — Comparative' }, income: 100000, net: -7097, hasPrior: true, months: 0,
      pctRows: { 'P&L — Comparative': { 'Sales – Front Desk': '2.5%', 'Travel': '2.7%', 'General & Administrative': '9.4%', 'Legal & Professional Fees': '1.3%',
        'Net Operating Income': '(9.6%)', 'Net Income': '(7.1%)' } },
      sections: ['bs', 'plComparative'] } };
}

/* Rows 5, 17, 27, 29: six months, very long name, cash basis, A/R aging sheet that must not appear. */
function halfYearCashWorkbook(){
  const client = 'The Very Long Named Hospitality And Real Estate Management Holdings Company International LLC';
  const period = 'January-June 2026';
  const heads = MONTHS.slice(0, 6).map(m => m + ' 2026');
  const mr = (label, v) => [label, ...heads.map(() => v), v * 6];
  const pl = [[client], ['Profit and Loss'], [period], ['Cash Basis'], ['', ...heads, 'Total'],
    ['Income'], mr('Consulting Income', 2000), mr('Total for Income', 2000), ['Expenses'], mr('Office Supplies', 300), mr('Software', 200),
    mr('Total for Expenses', 500), mr('Net Income', 1500)];
  const bs = [[client], ['Balance Sheet'], ['As of June 30, 2026'], ['Cash Basis'], ['', 'Total'], ['Assets'], ['Bank Accounts'], ['Operating Account', 12000],
    ['Total for Bank Accounts', 12000], ['Total for Assets', 12000], ['Liabilities and Equity'], ['Liabilities'], ['Current Liabilities'], ['Payroll Liabilities', 1000],
    ['Total for Current Liabilities', 1000], ['Total for Liabilities', 1000], ['Equity'], ['Opening Balance Equity', 2000], ['Net Income', 9000],
    ['Total for Equity', 11000], ['Total for Liabilities and Equity', 12000]];
  const ar = [[client], ['A/R Aging Summary'], ['As of June 30, 2026'], [], ['', 'Current', '1 - 30', 'Total'], ['Customer A', 5205.7, 0, 5205.7], ['TOTAL', 5205.7, 0, 5205.7]];
  return { name: 'Half year, long name, cash basis', client, period,
    sheets: { 'Profit and Loss by Month': pl, 'Balance Sheet': bs, 'AR Aging Summary': ar },
    expect: { income: 12000, net: 9000, months: 6, hasPrior: false, basis: 'Cash Basis', noAR: true, bank: 12000, currentLiab: 1000, longLiab: 0,
      sections: ['bs', 'plMonthly'] } };
}

/* Three Balance Sheet tabs (BS, BS_Comparative and a third "Balance Sheet" tab) with "Net Profit (Loss)" inside Capital:
 * none of them shows the Balance Sheet Composition — it is on the dashboard only (user, 2026-10-08). */
function threeBalanceSheetsWorkbook(){
  const client = 'ML Jones LLC', period = 'For the Years Ended December 31, 2025 and 2024';
  const bs = [[client], ['Balance Sheet'], ['As of December 31, 2025 and 2024'], [], ['Particulars', '2024', '2025'],
    ['ASSETS'], ['Current Assets'], ['Checking', 160000, 202000], ['Accounts Receivable (A/R)', 90000, 110000], ['Prepaid Expenses', 5779.27, 11813.08],
    ['Total Current Assets', 255779.27, 323813.08], ['Fixed Assets'], ['Equipment', 100000, 100000], ['Total Fixed Assets', 100000, 100000],
    ['TOTAL ASSETS', 355779.27, 423813.08], ['LIABILITIES AND CAPITAL'], ['Liabilities'], ['Current Liabilities'],
    ['Accounts Payable (A/P)', 221753.85, 191124.20], ['Loan from Owner', 1200000, 1200000], ['Total Current Liabilities', 1421753.85, 1391124.20],
    ['Total Liabilities', 1421753.85, 1391124.20], ['Capital'], ['Retained Earnings', -1131750.66, -1063974.58], ['Owner draws', -3000, -3167],
    ['ML Jones Contributed Capital', 1000, 1000], ['Net Profit (Loss)', 67776.08, 98830.46], ['Total Capital', -1065974.58, -967311.12],
    ['Total Liabilities & Capital', 355779.27, 423813.08], [], ['Note : Supporting Ledger detail is available for all line items in the Notes section.']];
  const pl = [[client], ['Profit and Loss'], [period], [], ['Particulars', '2024', '2025'], ['Income'], ['Sales', 600000, 700000],
    ['Total Income', 600000, 700000], ['Expenses'], ['Rent', 120000, 130000], ['Wages', 412223.92, 471169.54], ['Total Expenses', 532223.92, 601169.54],
    ['Net Profit (Loss)', 67776.08, 98830.46]];
  return { name: 'Three Balance Sheet tabs (composition on the dashboard only)', client, period, sheets: { 'BS': bs, 'BS_Comparative': bs, 'Balance Sheet': bs, 'Profit and Loss': pl },
    expect: {} };
}

/* Alfaro layout (user, 2026-10-08): one "Notes" tab (Sr. No. | Notes) whose notes name the other tabs and use Balance
 * Sheet words — it is the one Notes section (text), never an index or a statement, and no "Notes to Financial Statements". */
function notesTabWorkbook(){
  const client = "Alfaro's Industrial Services LLC", period = 'January - September, 2026';
  const pl = [[client], ['Profit and Loss'], [period], [], ['', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Total'], ['Income'], ['Sales', 1000000, 1100000, 1200000, 3300000],
    ['Total Income', 1000000, 1100000, 1200000, 3300000], ['Expenses'], ['Wages', 600000, 650000, 700000, 1950000], ['Rent', 100000, 100000, 100000, 300000],
    ['Total Expenses', 700000, 750000, 800000, 2250000], ['Net Income', 300000, 350000, 400000, 1050000]];
  const bs = [[client], ['Balance Sheet'], ['As of September 30, 2026'], [], ['', 'Total'], ['ASSETS'], ['Checking', 8458.07], ['Accounts Receivable (A/R)', 1165780.79],
    ['Total Current Assets', 1174238.86], ['Equipment', 1000000], ['Total Fixed Assets', 1000000], ['TOTAL ASSETS', 2174238.86], ['LIABILITIES AND EQUITY'],
    ['Accounts Payable (A/P)', 349168.28], ['Total Current Liabilities', 349168.28], ['Notes Payable', 500000], ['Total Long-Term Liabilities', 500000],
    ['Total Liabilities', 849168.28], ['Retained Earnings', 275070.58], ['Net Income', 1050000], ['Total Equity', 1325070.58], ['TOTAL LIABILITIES AND EQUITY', 2174238.86]];
  const ar = [[client], ['A/R Aging Summary'], ['As of September 30, 2026'], [], ['', 'Current', '1 - 30', '31 - 60', '61 - 90', '91 and over', 'Total'],
    ['Customer A', 300000, 80000, 20000, 60000, 705780.79, 1165780.79], ['TOTAL', 300000, 80000, 20000, 60000, 705780.79, 1165780.79]];
  const ap = [[client], ['A/P Aging Summary'], ['As of September 30, 2026'], [], ['', 'Current', '1 - 30', '31 - 60', '61 - 90', '91 and over', 'Total'],
    ['Vendor A', 10000, 20000, 15000, 54168.28, 250000, 349168.28], ['TOTAL', 10000, 20000, 15000, 54168.28, 250000, 349168.28]];
  const notes = [[client], ['Notes'], [], ['Sr. No.', 'Notes'],
    ...['Bank balances agree with the bank statements as of September 30, 2026.', 'Account Receivable aging over 90 days is under follow-up with customers.',
      'Account Payable includes vendor bills recorded on accrual basis.', 'Trial balance has been reviewed and reconciled.',
      'Fixed assets are shown at cost less accumulated depreciation.', 'Long-term loan balance confirmed with the lender statement.',
      'Payroll liabilities were paid after month end.', 'Sales tax payable reconciled to filed returns.', 'Prepaid insurance amortised monthly.',
      'Owner draws recorded under equity.', 'Balance sheet and Profit & Loss reviewed with the client.', 'Profit & Loss figures are unaudited.'].map((t, i) => [i + 1, t]),
    [], ['Balance Sheet Comments'], [1, 'Retained earnings agree with the prior year closing balance.'], [2, 'Credit card balances agree with statements.']];
  return { name: 'Alfaro Notes tab (one Notes section)', client, period, sheets: { 'Profit & Loss': pl, 'Balance sheet': bs, 'Account Receivable': ar, 'Account Payable': ap, 'Notes': notes },
    expect: { roles: { notes: 'Notes' }, notes: ['Bank balances agree with the bank statements', 'Profit & Loss figures are unaudited', 'Balance Sheet Comments', 'Credit card balances agree'],
      notesLack: [client, 'Notes', 'Sr. No. — Notes'] } };
}

function fixtureWorkbooks(){
  const fx = JSON.parse(fs.readFileSync(path.join(root, 'tests/calc-fixtures.json'), 'utf8'));
  const exp = fx.expected || {};
  const names = { A: 'Hinton Heavy Equipment (monthly)', B: 'ML Jones (comparative)', C: 'Seneca Real Estate (aging)', D: 'Jacob Nursing (notes)',
    R: 'RX Angle (monthly)', F: 'Hinton (cash basis)', ML: 'ML Jones (aging detail)' };
  return Object.entries(fx.fixtures).map(([k, sheets]) => ({ name: 'Fixture ' + k + ' ' + (names[k] || ''), sheets, fixture: k, expected: exp[k] || null, expect: {} }));
}

function toXlsx(wbDef){
  const wb = XLSX.utils.book_new();
  for (const [n, aoa] of Object.entries(wbDef.sheets)){
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    /* Excel tab names cannot contain / (fixtures captured "A/R Aging Summary" from report titles). */
    const tab = n.replace(/[\\\/?*\[\]:]/g, '');
    for (const c of (wbDef.pctFormatted || {})[n] || []){
      for (let r = 0; r < aoa.length; r++){
        const a = XLSX.utils.encode_cell({ r, c });
        if (ws[a] && ws[a].t === 'n') ws[a].z = '0.00%';
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, tab);
  }
  return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

/* ---------- static server ---------- */

function serve(){
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

function chromiumPath(){
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = path.join(os.homedir(), '.cache/ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  for (const d of fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()){
    for (const sub of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']){
      const f = path.join(base, d, sub);
      if (fs.existsSync(f)) return f;
    }
  }
  return undefined;
}

/* ---------- in-page inspection ---------- */

/* Runs in the page after a workbook is processed. Returns plain data for the Node-side checks. */
function inspectPage(){
  const md = state.model;
  /* The app's own helper when it has one (older deployments do not). */
  const tabOfPage = n => String(n || '').replace(/\bA\/([PR])\b/g, 'A$1').replace(/[\\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31);
  const nonStatementTabs = [md.roles.summary, ...(typeof window.reportListingSheets === 'function' ? window.reportListingSheets(md) : [])].filter(Boolean).map(tabOfPage);
  const firstHeads = {};
  for (const n of Object.values(md.roles).filter(Boolean)) if (md.sheetModels[n] && n !== md.roles.summary)
    firstHeads[tabOfPage(n)] = typeof window.firstColumnHeading === 'function' ? window.firstColumnHeading(md.sheetModels[n]) : 'Particulars';
  const isPercentRowLabel = typeof window.isPercentRowLabel === 'function' ? window.isPercentRowLabel
    : t => /^(percentage|percent|pct|%)\s*(of\s*)?(the\s*)?(grand\s*)?total$/i.test(String(t || '').trim());
  const out = { roles: md.roles, metrics: md.metrics, prior: md.prior, hasPrior: !!md.hasPrior, months: md.months.map(m => m.short),
    periodSeries: md.periodSeries.map(p => p.label), suppressAR: !!md.suppressAR, basis: reportBasis(), client: state.client, period: state.period,
    expenseGroups: md.expenseGroups.map(g => ({ label: g.label, value: g.value, pct: g.pct })), expenseTotal: md.expenseTotal,
    liab: (md.liabilityBifurcation || []).map(x => ({ label: x.label, value: x.value, pct: x.pct })),
    composition: [...md.bsComposition.assets, ...md.bsComposition.liabEquity].map(x => ({ label: x.label, pct: x.pct })),
    equityPct: (md.bsComposition.liabEquity.find(x => /equity/i.test(x.label)) || {}).pct ?? null, firstHeads, nonStatementTabs };

  /* Dashboard (portal) */
  goPage('dashboard');
  const tiles = [...document.querySelectorAll('#kpiGrid .kpi')].map(k => ({ label: k.querySelector('small').textContent, value: k.querySelector('b').textContent,
    neg: k.querySelector('b').classList.contains('neg'), sub: k.querySelector('.help').textContent }));
  out.tiles = tiles;
  out.dashText = document.querySelector('#dashboard').innerText;
  out.expenseChartText = (document.querySelector('#chartExpenses') || {}).textContent || '';
  out.liabDash = (document.querySelector('#chartLiab') || {}).innerText || '';
  out.money = { income: money(md.metrics.income), bank: md.metrics.bank === null ? null : money(md.metrics.bank) };
  out.attention = (document.querySelector('#attention') || {}).innerText || '';
  out.equityPctText = out.equityPct === null ? null : pctText(out.equityPct);

  /* Review & Edit (on a statement sheet: the first tab may be an index with no amounts) */
  const stmtSheet = md.roles.plMonthly || md.roles.pl || md.roles.plComparative || md.roles.bs;
  if (stmtSheet && md.roles.summary && (!state.active || state.active === md.roles.summary)){ state.active = stmtSheet; renderEditor(); }
  goPage('editor');
  const inputs = [...document.querySelectorAll('#editorTable td.num:not(.pct) input')].map(i => i.value);
  out.editorNumeric = inputs.length;
  out.editorBad = inputs.filter(v => !/^\(?\$\d{1,3}(,\d{3})*\.\d{2}\)?$/.test(v)).slice(0, 5);
  /* Every sheet's percent columns and "Percentage of total" rows show percentages, never dollars */
  const keepActive = state.active;
  out.editorPctCells = 0; out.editorPctBad = [];
  for (const [name, sm] of Object.entries(md.sheetModels)){
    const rows = state.sheets[name] || [];
    const pctCols = new Set(sm.cols.filter(c => c.type === 'percent').map(c => c.idx));
    const valIdx = displayColumns(sm).map(c => c.idx);
    const pctRows = new Set(sm.lines.filter(l => isPercentRowLabel(l.label)).map(l => l.r));
    if (!pctCols.size && !pctRows.size) continue;
    state.active = name; renderEditor();
    for (const inp of document.querySelectorAll('#editorTable input')){
      const r = +inp.dataset.r, c = +inp.dataset.c, v = (rows[r] || [])[c];
      if (r === sm.headerRow || r >= 600 || !(pctCols.has(c) || (pctRows.has(r) && valIdx.includes(c)))) continue;
      if (parseAmount(v) === null && !isPercentText(v)) continue;
      out.editorPctCells++;
      if (!/^\(?\d[\d,]*\.\d%\)?$/.test(inp.value)) out.editorPctBad.push(name + '!' + (r + 1) + ':' + inp.value);
    }
  }
  state.active = keepActive; renderEditor();

  /* Review & Edit on a transaction list: dates shown as dates (mm/dd/yyyy), never dollar amounts */
  out.editorDates = [];
  const listingSheets = typeof window.reportListingSheets === 'function' ? window.reportListingSheets(md) : [];
  if (listingSheets.length){
    const keep = state.active; state.active = listingSheets[0]; renderEditor();
    out.editorDates = [...document.querySelectorAll('#editorTable td.date input')].map(i => i.value);
    out.editorDollarDates = [...document.querySelectorAll('#editorTable td.num input')].map(i => i.value).filter(v => /^\$4\d,\d{3}\.00$/.test(v));
    state.active = keep; renderEditor();
  }

  /* A/R & A/P Aging page */
  goPage('aging');
  out.agingAr = (document.querySelector('#arView') || {}).innerText || '';
  out.agingPctRows = [...document.querySelectorAll('#aging tr')].filter(tr => isPercentRowLabel((tr.cells[0] || {}).textContent || ''))
    .map(tr => [...tr.cells].slice(1).map(td => td.textContent.trim()).filter(Boolean));

  /* Financial Statements page */
  goPage('financials');
  const fin = document.querySelector('#financials');
  out.finText = fin.innerText;
  out.finOrder = [...fin.querySelectorAll('.stmt-title')].map(e => e.textContent);
  out.finNegNetOk = [...fin.querySelectorAll('tr')].filter(tr => /^net income$/i.test((tr.cells[0] || {}).textContent || '')).every(tr =>
    [...tr.cells].slice(1).every(td => !/^\(/.test(td.textContent.trim()) || td.classList.contains('neg')));

  out.hasNotes = !!(state.notes || '').trim();
  out.notesText = state.notes || '';
  out.graphCount = typeof window.dashboardGraphBlocks === 'function' ? window.dashboardGraphBlocks().length : 0;
  out.hasComposition = typeof window.dashboardGraphBlocks === 'function' && window.dashboardGraphBlocks().some(h => /Balance Sheet Composition/.test(h));

  /* Report pages, rendered one by one exactly as the PDF export does */
  const pages = buildPages({ forExport: true });
  out.pageCount = pages.length;
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:0;top:0;z-index:9998;background:#fff';
  document.body.appendChild(host);
  const pageInfo = [];
  for (const p of pages){
    const land = p.orientation === 'landscape';
    host.style.width = (land ? PAGE_H : PAGE_W) + 'px';
    host.innerHTML = p.html;
    const el = host.firstElementChild;
    const r0 = el.getBoundingClientRect();
    const footer = el.querySelector('.report-footer');
    const fTop = footer ? footer.getBoundingClientRect().top : r0.bottom;
    let contentBottom = 0, rightOverflow = 0;
    for (const child of el.children){
      if (child.classList.contains('report-footer') || child.classList.contains('report-watermark') || child.classList.contains('report-logo')) continue;
      const cr = child.getBoundingClientRect();
      if (cr.height) contentBottom = Math.max(contentBottom, cr.bottom);
    }
    for (const t of el.querySelectorAll('table')){ const tr = t.getBoundingClientRect(); rightOverflow = Math.max(rightOverflow, tr.right - r0.right); }
    const cutCells = [...el.querySelectorAll('.report-table td.val, .report-table thead th')].filter(td => td.scrollWidth > td.clientWidth + 1).map(td => td.textContent).slice(0, 3);
    const title = el.querySelector('.report-title');
    const tcs = title ? getComputedStyle(title) : null;
    const hc = el.querySelector('.report-heading-center');
    const headers = [...el.querySelectorAll('.report-table thead th')].map(th => th.textContent);
    const netRows = [...el.querySelectorAll('.report-table tr')].filter(tr => /^net (income|operating income)$/i.test((tr.cells[0] || {}).textContent.trim()));
    const pctCells = {};
    for (const tr of el.querySelectorAll('.report-table tbody tr')){
      const cells = [...tr.cells].map(td => td.textContent.trim());
      pctCells[cells[0]] = cells.slice(1);
    }
    /* Space above every section heading that follows other content on the page (the previous block's lowest edge). */
    const headingGaps = [];
    const blockEls = [...el.querySelectorAll('.rblock, .rblock *')];
    for (const h of el.querySelectorAll('.report-section-title')){
      const before = blockEls.filter(x => (x.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) && !x.contains(h) && x.getBoundingClientRect().height);
      if (!before.length) continue;
      headingGaps.push({ text: h.textContent.trim(), gap: h.getBoundingClientRect().top - Math.max(...before.map(x => x.getBoundingClientRect().bottom)) });
    }
    pageInfo.push({
      id: p.sectionId, orientation: p.orientation, text: el.innerText, overFooter: contentBottom - fTop, headingGaps, rightOverflow, cutCells, headers, pctCells,
      titleBold: tcs ? +tcs.fontWeight >= 700 : null, titleColor: tcs ? tcs.color : null, titleSize: tcs ? parseFloat(tcs.fontSize) : null,
      centered: hc ? getComputedStyle(hc).textAlign === 'center' : null,
      netNegOk: netRows.every(tr => [...tr.cells].slice(1).every(td => !/^\(\$/.test(td.textContent.trim()) || td.classList.contains('neg') && getComputedStyle(td).color === 'rgb(201, 52, 56)')),
      tableRows: el.querySelectorAll('.report-table tbody tr').length,
      freeBelow: fTop - contentBottom,
      compH: (() => { const c = el.querySelector('.bs-composition-block'); if (!c) return null; const cs = getComputedStyle(c);
        return c.getBoundingClientRect().height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0); })(),
      tableFs: (() => { const td = el.querySelector('.report-table tbody td.lbl'); return td ? parseFloat(getComputedStyle(td).fontSize) : null; })(),
      usedFraction: (contentBottom - r0.top) / (fTop - r0.top),
      watermark: (el.querySelector('.report-watermark') || {}).textContent || '',
      coverNameFits: p.sectionId === 'cover' ? [...el.querySelectorAll('h1')].every(h => h.scrollWidth <= h.clientWidth + 1 && h.getBoundingClientRect().right <= r0.right + 0.5) : null,
      tocItems: p.sectionId === 'toc' ? [...el.querySelectorAll('a.toc-item')].map(a => ({ text: a.children[0].textContent, page: a.children[1].textContent, href: a.getAttribute('href') })) : null,
      anchor: el.id || ''
    });
  }
  host.remove();
  out.pages = pageInfo;
  return out;
}

/* ---------- downloaded Excel file ---------- */

/* Reads what Excel will actually see: every value, style (border, number format, alignment), tab color and
 * frozen pane comes from the saved .xlsx, not from the app's in-memory workbook. */
function readXlsxFile(file){
  const buf = fs.readFileSync(file);
  const zip = XLSX.CFB.read(buf, { type: 'buffer' });
  const get = suffix => { const i = zip.FullPaths.findIndex(p => p.endsWith(suffix)); return i < 0 ? '' : Buffer.from(zip.FileIndex[i].content).toString(); };
  const unxml = t => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const styles = get('/xl/styles.xml');
  const section = tag => (styles.match(new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)</' + tag + '>')) || ['', ''])[1];
  const fmts = Object.fromEntries([...section('numFmts').matchAll(/<numFmt numFmtId="(\d+)" formatCode="([^"]*)"/g)].map(m => [m[1], unxml(m[2])]));
  const borders = [...section('borders').matchAll(/<border\b[^>]*?(?:\/>|>([\s\S]*?)<\/border>)/g)]
    .map(m => ['left', 'right', 'top', 'bottom'].every(side => new RegExp('<' + side + '\\b[^>]*style="').test(m[1] || '')));
  const xfs = [...section('cellXfs').matchAll(/<xf\b([^>]*?)(?:\/>|>([\s\S]*?)<\/xf>)/g)].map(m => {
    const id = (m[1].match(/numFmtId="(\d+)"/) || [])[1] || '0';
    /* Excel's built-in formats: 9 = 0%, 10 = 0.00%. */
    return { fmt: fmts[id] || { 0: '', 9: '0%', 10: '0.00%' }[id] || 'builtin ' + id, border: borders[+((m[1].match(/borderId="(\d+)"/) || [])[1] || 0)] || false,
             horizontal: ((m[2] || '').match(/horizontal="(\w+)"/) || [])[1] || '' };
  });
  const back = XLSX.read(buf, { type: 'buffer' });
  const names = [...get('/xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"/g)].map(m => unxml(m[1]));
  return names.map((name, i) => {
    const xml = get('/xl/worksheets/sheet' + (i + 1) + '.xml');
    const ws = back.Sheets[name] || {};
    const cells = [...xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g)].map(m => {
      const st = xfs[+((m[3].match(/\bs="(\d+)"/) || [])[1] || 0)] || {};
      const t = (m[3].match(/\bt="(\w+)"/) || [])[1] || 'n';
      return { col: m[1], row: +m[2], numeric: t === 'n' && ws[m[1] + m[2]] && typeof ws[m[1] + m[2]].v === 'number', ...st };
    });
    const pane = xml.match(/<pane [^>]*\/>/);
    const relI = zip.FullPaths.findIndex(p => p.endsWith('/xl/worksheets/_rels/sheet' + (i + 1) + '.xml.rels'));
    const drawRel = relI >= 0 ? (Buffer.from(zip.FileIndex[relI].content).toString().match(/Target="\.\.\/drawings\/(drawing\d+\.xml)"/) || [])[1] : null;
    const drawI = drawRel ? zip.FullPaths.findIndex(p => p.endsWith('/xl/drawings/' + drawRel)) : -1;
    const drawXml = drawI >= 0 ? Buffer.from(zip.FileIndex[drawI].content).toString() : '';
    const pictures = (drawXml.match(/<xdr:pic>/g) || []).length;
    const pictureNames = [...drawXml.matchAll(/<xdr:cNvPr [^>]*name="([^"]*)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
    const pictureCol = +((drawXml.match(/<xdr:from><xdr:col>(\d+)<\/xdr:col>/) || [])[1] ?? -1);
    const pictureRow = Math.min(...[...drawXml.matchAll(/<xdr:row>(\d+)<\/xdr:row>/g)].map(m => +m[1]), 1e9);
    const val = a => (ws[a] || {}).v ?? '';
    return { name, xml, cells, val, pictures, pictureNames, pictureCol, pictureRow, tabColor: (xml.match(/<sheetPr>[^]*?<tabColor rgb="([0-9A-F]{8})"/) || [])[1] || null,
      pane: pane && /state="frozen"/.test(pane[0]) ? ((pane[0].match(/topLeftCell="([A-Z]+\d+)"/) || [])[1] || null) : null,
      xSplit: pane ? +((pane[0].match(/xSplit="(\d+)"/) || [])[1] || 0) : 0, ySplit: pane ? +((pane[0].match(/ySplit="(\d+)"/) || [])[1] || 0) : 0 };
  });
}

/* ---------- checks ---------- */

/* The Excel tab of an uploaded sheet: its own name, made tab-safe as the app does ("A/R Aging" → "AR Aging"). */
const tabOf = n => String(n || '').replace(/\bA\/([PR])\b/g, 'A$1').replace(/[\\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31);
const isPctLabel = t => /^(percentage|percent|pct|%)\s*(of\s*)?(the\s*)?(grand\s*)?total$/i.test(String(t || '').trim());

function near(a, b, tol = 0.011){ return a !== null && a !== undefined && Math.abs(a - b) <= tol; }

function checkWorkbook(w, r, excel, pdf, errors){
  const tag = '[' + w.name + ']';
  const e = w.expect || {};
  const page = id => r.pages.filter(p => p.id === id);
  const content = r.pages.filter(p => !['cover', 'toc'].includes(p.id));

  check(`${tag} Row 20 workbook processes with no errors`, !errors.length, errors.slice(0, 3).join(' | '));
  for (const [role, sheet] of Object.entries(e.roles || {})) check(`${tag} Rows 44-54 "${sheet}" captured as ${role}`, r.roles[role] === sheet, JSON.stringify(r.roles));

  /* Row 1: Revenue / Income on the dashboard */
  const inc = r.tiles.find(t => t.label === 'Revenue / Income');
  check(`${tag} Row 1 Revenue / Income tile shows the P&L income`, inc && inc.value === r.money.income && r.metrics.income !== 0 && r.metrics.income !== null, inc && inc.value);
  if (e.income !== undefined) check(`${tag} Row 1 income = ${e.income}`, near(r.metrics.income, e.income), r.metrics.income);
  if (e.net !== undefined) check(`${tag} Net income = ${e.net}`, near(r.metrics.net, e.net), r.metrics.net);
  if (e.expenses !== undefined) check(`${tag} Total expenses = ${e.expenses}`, near(r.metrics.expenses, e.expenses), r.metrics.expenses);
  if (w.expected){
    check(`${tag} Row 35 fixture has independently computed values`, ['income', 'net'].every(k => typeof (w.expected[k] ?? w.expected['m.' + k]) === 'number'));
    for (const k of ['income', 'gross', 'expenses', 'net', 'assets', 'equity', 'bank']){
      const want = w.expected[k] ?? w.expected['m.' + k] ?? (w.expected.metrics || {})[k];
      if (typeof want === 'number') check(`${tag} Row 35 ${k} matches the independently computed fixture value`, near(r.metrics[k], want), r.metrics[k] + ' vs ' + want);
    }
  }

  /* Row 2: negative Net Income is red (report pages and portal) */
  check(`${tag} Row 2 negative Net Income red in every report table`, r.pages.every(p => p.netNegOk));
  check(`${tag} Row 2 negative Net Income red on the Financial Statements page`, r.finNegNetOk);

  /* Row 3: Review & Edit amounts in accounting format, two decimals */
  check(`${tag} Row 3 Review & Edit amounts $1,234.56 / ($1,234.56)`, r.editorNumeric > 0 && !r.editorBad.length, r.editorBad.join(' | '));

  /* Rows 4, 15, 39: Table of Contents */
  const toc = (r.pages.find(p => p.id === 'toc') || {}).tocItems || [];
  check(`${tag} Row 4 TOC is page 2 and numbering starts at 1`, r.pages[1] && r.pages[1].id === 'toc' && toc.length && /^1\. /.test(toc[0].text), toc[0] && toc[0].text);
  check(`${tag} Row 4 TOC numbers are consecutive`, toc.every((t, i) => new RegExp('^' + (i + 1) + '\\. ').test(t.text)));
  /* Report order: Disclaimer, Dashboard, P&L (% of Income), Monthly, Comparative, Balance Sheets, Aging, Trial Balance, Notes. */
  /* Report order (user, 2026-09-30): Disclaimer, Dashboard, the statements in the uploaded workbook's tab order, Notes last. */
  const wbOrder = Object.keys(w.sheets || {}).map(tabOf);
  const pageIds = r.pages.map(p => p.id).filter((id, i, a) => !['cover', 'toc'].includes(id) && a.indexOf(id) === i);
  const stmtIds = pageIds.filter(id => r.roles[id]);
  const byWb = [...stmtIds].sort((a, b) => wbOrder.indexOf(tabOf(r.roles[a])) - wbOrder.indexOf(tabOf(r.roles[b])));
  /* Order (user, 2026-10-07): [uploaded Summary], Dashboard, statements in workbook order, Notes, Disclaimer on the last page. */
  const at = pageIds[0] === 'index' ? 1 : 0;
  check(`${tag} Report order: [Summary], Dashboard, statements in workbook order, Notes, Disclaimer last`, pageIds[at] === 'dash' &&
    (r.hasNotes ? pageIds[pageIds.length - 2] === 'notes' : !pageIds.includes('notes')) && pageIds[pageIds.length - 1] === 'disc' && (process.env.TRACKER_XLSX || stmtIds.join(',') === byWb.join(',')), pageIds.join(','));
  check(`${tag} Report order: Disclaimer is the last TOC entry and the last page`, toc.length && /Management Purpose Disclaimer/.test(toc[toc.length - 1].text) &&
    (!r.hasNotes || /Notes/i.test((toc[toc.length - 2] || {}).text || '')) && r.pages[r.pages.length - 1].id === 'disc', toc.map(t => t.text).join(' | '));
  /* Headings are the uploaded sheets' own ("Profit & Loss", "Statement of Activities"), so match any P&L / BS wording. */
  const BS_T = /balance sheet|financial position|financial condition|assets and liabilities|^b ?s\b|^bs[_ ]/i,
        PL_T = /profit|loss|income statement|activit|operations|earnings|^p ?& ?l|^pl\b|^pl[_ (]|soa\b/i;
  if (r.finOrder.length >= 2 && r.finOrder.some(t => BS_T.test(t)) && r.finOrder.some(t => PL_T.test(t) && !BS_T.test(t)))
    check(`${tag} Row 15 portal shows Balance Sheet before Profit and Loss`, r.finOrder.findIndex(t => BS_T.test(t)) < r.finOrder.findIndex(t => PL_T.test(t) && !BS_T.test(t)), r.finOrder.join(', '));
  const anchors = new Set(r.pages.map(p => p.anchor).filter(Boolean));
  check(`${tag} Row 39 every TOC entry links to its section page`, toc.every(t => anchors.has(t.href.slice(1))));
  check(`${tag} Row 39 TOC page numbers point at the section pages`, toc.every(t => {
    const first = +t.page.split(/\s*–\s*/)[0];
    return r.pages[first - 1] && r.pages[first - 1].anchor === t.href.slice(1);
  }));

  /* Row 5: period text keeps its dash */
  const cover = r.pages[0];
  check(`${tag} Row 5 cover shows the period with its dash`, cover.text.includes(r.period), r.period);

  /* Row 6: Analytical Dashboard in the PDF */
  const dash = page('dash');
  check(`${tag} Row 6 PDF has the Analytical Dashboard with KPIs`, dash.length && /REVENUE \/ INCOME/i.test(dash[0].text));

  /* Rows 8, 10, 24: comparative financials */
  if (e.hasPrior !== undefined) check(`${tag} Row 10 prior year shown only when uploaded (${e.hasPrior})`, r.hasPrior === e.hasPrior);
  if (Object.values(r.prior).every(v => v === null || v === undefined))
    check(`${tag} Row 10 no prior-year figures or "vs PY" on the dashboard`, !/vs PY|Prior Year/.test(r.dashText));
  if (e.priorIncome !== undefined) check(`${tag} Row 8 prior-year income = ${e.priorIncome}`, near(r.prior.income, e.priorIncome), r.prior.income);
  check(`${tag} Row 24 no year / period heading printed as dollars`, content.every(p => p.headers.every(h => !/^\(?\$\s*[\d,]+(\.\d+)?\)?$/.test(h.trim()))),
    content.flatMap(p => p.headers).filter(h => /^\(?\$\s*[\d,]+/.test(h.trim())).slice(0, 3).join(', '));

  /* Rows 11, 17, 18: monthly series */
  if (e.months !== undefined) check(`${tag} Rows 17/18 every month column charted (${e.months})`, r.months.length === e.months, r.months.join(','));
  if (!r.months.length) check(`${tag} Row 11 year-end figures not put into January`, !r.periodSeries.some(l => /^jan(uary)?\.?( \d{2,4})?$/i.test(l.trim())), r.periodSeries.join(','));

  /* Rows 9, 12, 19, 28, 36: percentages */
  const eg = r.expenseGroups;
  if (eg.length){
    /* A credit inside expenses (refund, surplus returned) is a negative share; no share passes 100% and all add to 100%. */
    check(`${tag} Rows 9/19/36 every expense share within ±100% with the sign of its amount`,
      eg.every(g => Math.abs(g.pct) <= 100.001 && (g.value >= 0 ? g.pct >= -0.001 : g.pct <= 0.001)), eg.map(g => g.pct.toFixed(2)).join(','));
    check(`${tag} Row 12 share = expense ÷ total expenses × 100`, eg.every(g => Math.abs(r.expenseTotal) < 0.01 || near(g.pct, g.value / Math.abs(r.expenseTotal) * 100, 0.02) || /activity/.test(r.expenseChartText)));
    check(`${tag} Row 28 expense % shown on the portal chart`, /\d+(\.\d+)?%/.test(r.expenseChartText));
  }
  check(`${tag} Row 28 every KPI tile carries a percentage or reason`, r.tiles.every(t => /%|Not applicable|No A\/[RP]|Not shown/.test(t.sub)), r.tiles.map(t => t.sub).join(' | '));
  check(`${tag} Row 36 composition shares within ±100%`, r.composition.every(x => x.pct === null || Math.abs(x.pct) <= 100.001));
  if (r.metrics.equity !== null && r.metrics.equity < 0) check(`${tag} Row 28 negative equity has a negative %`, r.equityPct < 0, r.equityPct);
  if (e.payroll !== undefined){
    const pay = eg.find(g => /payroll/i.test(g.label));
    check(`${tag} Row 26 Payroll Expenses include every sub-ledger (${e.payroll})`, pay && near(pay.value, e.payroll), pay && pay.value);
  }

  /* Rows 14, 22, 31: liabilities bifurcation */
  if (r.liab.length){
    check(`${tag} Row 14 Current and Long-Term Liabilities both listed`, r.liab.some(x => /current/i.test(x.label)) && r.liab.some(x => /long/i.test(x.label)), r.liab.map(x => x.label).join(','));
    check(`${tag} Row 9 liability shares add to 100%`, near(r.liab.reduce((s, x) => s + (x.pct || 0), 0), 100, 0.05));
  }
  if (e.currentLiab !== undefined) check(`${tag} Row 22 Current Liabilities total = ${e.currentLiab}`, near((r.liab.find(x => /current/i.test(x.label)) || {}).value, e.currentLiab));
  if (e.longLiab !== undefined) check(`${tag} Row 22 Long-Term Liabilities total = ${e.longLiab}`, near((r.liab.find(x => /long/i.test(x.label)) || {}).value ?? 0, e.longLiab));
  const liabTitles = r.pages.reduce((n, p) => n + (p.text.match(/LIABILITIES BIFURCATION/gi) || []).length, 0);
  check(`${tag} Rows 26/31 Liabilities Bifurcation appears at most once in the PDF`, liabTitles <= 1, liabTitles);

  /* Trial Balance: Debit / Credit headings, account type not glued onto the account name */
  for (const p of page('tb')) check(`${tag} Row 46 Trial Balance shows Debit and Credit columns`, p.headers.includes('Debit') && p.headers.includes('Credit'), p.headers.join(','));

  for (const a of e.tbAccounts || [])
    check(`${tag} Row 46 Trial Balance account "${a}" without its account type`, page('tb').some(p => p.pctCells[a] !== undefined), Object.keys((page('tb')[0] || {}).pctCells || {}).slice(0, 4).join(' | '));
  for (const b of e.apBuckets || []) check(`${tag} Row 13 A/P aging bucket "${b}"`, page('ap').some(p => p.headers.includes(b)), page('ap').map(p => p.headers.join(',')).join(' / '));
  if (e.emptyAR) check(`${tag} Row 13 empty A/R aging says there are no open receivables`, page('ar').some(p => /No open receivables as of/.test(p.text)));
  for (const [id, want] of Object.entries(e.periods || {}))
    check(`${tag} Row 23 ${id} heading shows its own period "${want}"`, page(id).length && page(id).every(p => p.text.includes(want)), (page(id)[0] || {}).text && page(id)[0].text.slice(0, 120));

  /* Row 13: the A/R & A/P Aging page — an empty A/R says so; "Percentage of total" rows print percentages */
  if (e.emptyAR) check(`${tag} Row 13 Aging page: empty A/R says there are no open receivables`, /No open receivables as of/.test(r.agingAr), r.agingAr.slice(0, 80));
  const pctRowCells = [...r.agingPctRows.flat(), ...r.pages.flatMap(p => Object.entries(p.pctCells).filter(([k]) => isPctLabel(k)).flatMap(([, v]) => v.filter(Boolean)))];
  if (pctRowCells.length) check(`${tag} Row 52 "Percentage of total" rows print %, not $ (Aging page and PDF)`, pctRowCells.every(v => /%\)?$/.test(v) && !/\$/.test(v)), pctRowCells.slice(0, 6).join(' '));
  /* Row 3/52: Review & Edit shows percent columns / rows as percentages */
  if (r.editorPctCells) check(`${tag} Row 3 Review & Edit shows % of Income / percentage cells as %, not $`, !r.editorPctBad.length, r.editorPctBad.slice(0, 4).join(' | '));
  if (e.editorPct) check(`${tag} Row 3 Review & Edit has percentage cells to show`, r.editorPctCells >= e.editorPct, r.editorPctCells);
  /* Rows 1-54: every statement reconciles (months = Total, P&L arithmetic, P&L sheets agree, TB balances, aging totals, shares) */
  check(`${tag} Data checks passed on the dashboard`, /Data checks passed/.test(r.attention), (r.attention.match(/Data check —[^\n]*/g) || []).slice(0, 2).join(' | '));
  /* Row 36: the dashboard never shows two different equity shares */
  if (r.metrics.equity !== null && r.metrics.equity < 0)
    check(`${tag} Row 36 negative-equity alert uses the composition share (${r.equityPctText})`, r.attention.includes('which is ' + r.equityPctText + ' of total'), (r.attention.match(/Equity is negative[^\n]*/) || [''])[0]);

  /* Row 13, 27: aging + cash basis */
  if (e.noAR) check(`${tag} Row 27 cash basis: no A/R anywhere in the report`, r.suppressAR && !r.pages.some(p => p.id === 'ar') && !r.pages.some(p => /5,205\.70/.test(p.text)));
  if (r.roles.ar && !r.suppressAR) check(`${tag} Row 13 A/R aging in PDF and Excel`, r.pages.some(p => p.id === 'ar') && excel.sheets.some(s => s.name === tabOf(r.roles.ar)));
  if (r.roles.ap && !r.pages.every(p => p.id !== 'ap')) check(`${tag} Row 13 A/P aging in Excel`, excel.sheets.some(s => s.name === tabOf(r.roles.ap)));

  /* Notes (user, 2026-10-08): one Notes section, only when the workbook has notes (or notes were entered) — never an
   * automatic "Notes to Financial Statements" section; no sheet prints "No statement lines were found". */
  check(`${tag} At most one Notes entry in the report and Table of Contents`, toc.filter(t => /\bnotes?\b/i.test(t.text)).length <= 1 && toc.filter(t => /\bnotes?\b/i.test(t.text)).length === (r.hasNotes ? 1 : 0),
    toc.map(t => t.text).join(' | '));
  check(`${tag} No "No statement lines were found" page`, !r.pages.some(p => /No statement lines were found/i.test(p.text)), r.pages.filter(p => /No statement lines/i.test(p.text)).map(p => p.id).join(','));
  check(`${tag} No empty "No notes were found" page`, !r.pages.some(p => /No notes were found/i.test(p.text)));
  /* Row 16 / 40: notes */
  for (const n of e.notes || []) check(`${tag} Row 16 note "${n}" in the report`, page('notes').some(p => p.text.includes(n)));
  if (w.fixture === 'D') check(`${tag} Row 16 imported notes reach the report`, page('notes').length && !/No notes were found/.test(page('notes')[0].text));
  for (const n of e.notesLack || []) check(`${tag} Notes leave out the sheet's title / heading line "${n}"`, !r.notesText.split('\n').some(l => l.trim() === n), r.notesText.split('\n').slice(0, 3).join(' | '));

  /* Rows 21, 27, 43: nothing cut off or over the footer */
  check(`${tag} Row 21 no amount or heading cut off in any table`, content.every(p => !p.cutCells.length), content.flatMap(p => p.cutCells).slice(0, 3).join(' | '));
  check(`${tag} Row 21 no table wider than its page`, r.pages.every(p => p.rightOverflow <= 0.5), Math.max(...r.pages.map(p => p.rightOverflow)).toFixed(1));
  check(`${tag} Row 27 no content runs into the footer`, r.pages.every(p => p.overFooter <= 0.5), r.pages.filter(p => p.overFooter > 0.5).map(p => p.id + ':' + p.overFooter.toFixed(1)).join(','));
  check(`${tag} Row 27 long company name fits on the cover`, cover.coverNameFits === true);

  /* Rows 23, 32: headings */
  check(`${tag} Row 23 company / statement / period centred on every page`, content.every(p => p.centered === true));
  check(`${tag} Row 32 statement headings bold, one colour and size`, content.every(p => p.titleBold) && new Set(content.map(p => p.titleColor + p.titleSize)).size === 1);

  /* Row 26/28/43: monthly P&L keeps all months + Total on one page width */
  for (const p of page('plMonthly')){
    /* Headings are shown as uploaded ("Jan 25", "January 2025", "TOTAL"). */
    const monthHeads = p.headers.filter(h => /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?([ \-]?'?\d{2,4})?$/i.test(h.trim()));
    check(`${tag} Row 26 monthly P&L page carries every month and the Total`, monthHeads.length === r.months.length && p.headers.some(h => /^total$/i.test(h.trim())), p.headers.join(','));
  }

  /* Row 43: the monthly P&L never splits its columns across pages and is printed landscape */
  const mp = page('plMonthly');
  if (mp.length){
    check(`${tag} Row 43 monthly P&L pages are landscape`, mp.every(p => p.orientation === 'landscape'), mp.map(p => p.orientation).join(','));
    check(`${tag} Row 43 monthly P&L columns not split across pages`, mp.every(p => p.headers.join('|') === mp[0].headers.join('|')), mp.map(p => p.headers.length).join(','));
  }

  /* Rows 29, 30, 33 */
  if (e.basis) check(`${tag} Row 29 basis is ${e.basis}`, r.basis === e.basis);
  check(`${tag} Row 29 cover basis is Cash or Accrual, never currency text`, /Basis\s*(Cash|Accrual) Basis/i.test(cover.text.replace(/\n/g, ' ')), cover.text.slice(0, 300));
  check(`${tag} Row 30 "Confidential" appears once on the cover`, (cover.text.match(/confidential/gi) || []).length === 1);
  const disc = page('disc').map(p => p.text).join('\n');
  /* Disclaimer text without quotation marks (user, 2026-10-08). */
  check(`${tag} Disclaimer has no quotation marks around it`, disc.includes('The report we are submitting is for management purpose only.') && !/["“”]/.test(disc));
  /* Section spacing (user, 2026-10-08): no section heading touches the section above it (24px or more of space). */
  const tight = r.pages.flatMap(p => (p.headingGaps || []).filter(g => g.gap < 24).map(g => p.id + ': ' + g.text + ' ' + g.gap.toFixed(1) + 'px'));
  check(`${tag} Every section heading has clear space above it (24px or more)`, !tight.length, tight.slice(0, 4).join(' | '));
  check(`${tag} Row 33 disclaimer sentence appears once`, (disc.match(/for management purpose only/gi) || []).length === 1);

  /* Uncategorized lines are never printed in the PDF (they stay in Excel and on the app pages). */
  for (const l of e.pdfLacks || []) check(`${tag} PDF leaves out "${l}"`, !content.some(p => p.text.includes(l)));
  for (const l of e.pdfHas || []) check(`${tag} PDF shows "${l}" in its statement`, content.some(p => p.id !== 'dash' && p.text.includes(l)));
  /* Balance Sheet Composition (user, 2026-10-08): only on the Analytical Dashboard with the other analytical diagrams —
   * shown once, never on a Balance Sheet (or any statement) page, never into the footer. */
  const compPages = r.pages.filter(p => /BALANCE SHEET COMPOSITION/i.test(p.text));
  if (r.hasComposition){
    check(`${tag} Balance Sheet Composition is on the PDF Analytical Dashboard, shown once`,
      compPages.length === 1 && compPages[0].id === 'dash' && compPages[0].overFooter <= 0.5, compPages.map(p => p.id).join(',') || 'not shown');
    check(`${tag} Balance Sheet Composition is not on the Balance Sheet pages`, !compPages.some(p => p.id !== 'dash'), compPages.map(p => p.id).join(','));
  }
  if (r.hasComposition && r.pages.some(p => /LIABILITIES BIFURCATION/i.test(p.text)))
    check(`${tag} Balance Sheet Composition is on the same dashboard page as the Liabilities Bifurcation, above it`,
      compPages.some(p => /LIABILITIES BIFURCATION/i.test(p.text) && p.text.search(/BALANCE SHEET COMPOSITION/i) < p.text.search(/LIABILITIES BIFURCATION/i)),
      compPages.map(p => p.id + ' page ' + r.pages.indexOf(p)).join(','));
  check(`${tag} Liabilities Bifurcation stays on the dashboard`, !r.pages.some(p => p.id !== 'dash' && /LIABILITIES BIFURCATION/i.test(p.text)));

  /* Row 37: zero rows left out of the PDF */
  for (const z of e.zeroRows || []) check(`${tag} Row 37 zero-balance ledger "${z}" left out of the PDF`, !content.some(p => p.id !== 'dash' && new RegExp('^\\s*' + z.replace(/[&]/g, '\\$&') + '\\s', 'm').test(p.text)));

  /* One font size for every statement table in the PDF (Balance Sheet = P&L); only a very wide table (12+ columns) may shrink. */
  const fsPages = content.filter(p => p.id !== 'dash' && p.tableFs && p.headers.length <= 10);
  check(`${tag} Same font size on every statement page (${[...new Set(fsPages.map(p => p.tableFs))].join(', ')}px)`, new Set(fsPages.map(p => p.tableFs)).size <= 1,
    fsPages.map(p => p.id + ':' + p.tableFs).join(', '));

  /* Row 38: no half-empty page before a continuation page */
  const early = r.pages.filter((p, i) => i + 1 < r.pages.length && r.pages[i + 1].id === p.id && p.id !== 'cover' && p.usedFraction < 0.5);
  check(`${tag} Row 38 no section breaks to a new page while half the page is empty`, !early.length, early.map(p => p.id + ':' + p.usedFraction.toFixed(2)).join(','));

  /* Row 34 (P&L comparative): % of Income printed at the right scale */
  for (const [sheet, rows] of Object.entries(e.pctRows || {})){
    const role = Object.entries(r.roles).find(([, n]) => n === sheet);
    const ps = role ? page(role[0]) : [];
    for (const [label, want] of Object.entries(rows)){
      const cells = ps.map(p => p.pctCells[label]).find(Boolean) || [];
      check(`${tag} Row 34 ${label} % of Income = ${want}`, cells.includes(want), cells.join(' '));
    }
  }

  /* Sections present in the PDF */
  for (const s of e.sections || []) check(`${tag} Rows 44-54 PDF has the ${s} section`, r.pages.some(p => p.id === s));

  /* PDF file (row 34 save, row 39 links) */
  if (!pdf.skipped){
  check(`${tag} Row 34 PDF saves with every page`, pdf.ok && pdf.pages === r.pageCount, pdf.error || (pdf.pages + ' of ' + r.pageCount));
  /* Searchable PDF: the words of every page are in the file as text (invisible layer over the page picture). */
  check(`${tag} PDF is searchable: its text is in the file`, pdf.invisibleText && pdf.text.includes(r.client) &&
    /Table of Contents/.test(pdf.text) && /Management Purpose Disclaimer/.test(pdf.text), (pdf.text || '').slice(0, 120));
  if (pdf.ok) check(`${tag} PDF is high quality: every page drawn at 3x (2448 px or more across) and stored losslessly`,
    pdf.imageWidths.length >= pdf.pages && pdf.imageWidths.every(w => w >= 2448) && !pdf.jpeg,
    'widths ' + [...new Set(pdf.imageWidths)].join(',') + (pdf.jpeg ? ', JPEG' : ''));
  check(`${tag} Row 39 PDF TOC entries are clickable links`, pdf.links >= toc.length && toc.length > 0, pdf.links + ' links, ' + toc.length + ' entries');
  }

  /* Excel: rows 7, 25, 41, 42, 44-48, 52, 54 */
  check(`${tag} Excel downloads`, excel.ok, excel.error);
  if (!excel.ok) return;
  for (const s of e.excelSheets || []) check(`${tag} Rows 44-54 Excel sheet "${s}"`, excel.sheets.some(x => x.name === s), excel.sheets.map(x => x.name).join(', '));
  const notesTab = r.roles.notes && !/^(sheet|tab|page|table|data|worksheet|report)\s*\d*$/i.test(r.roles.notes) ? tabOf(r.roles.notes) : 'Notes';
  const others = excel.sheets.filter(s => r.nonStatementTabs.includes(s.name));
  const stmts = excel.sheets.filter(s => !['Cover', 'Analytical Summary', notesTab, 'Disclaimer'].includes(s.name) && !r.nonStatementTabs.includes(s.name));
  if (e.indexLinks){
    const idx = others.find(s => /<hyperlink /.test(s.xml));
    const links = idx ? (idx.xml.match(/<hyperlink [^>]*location="[^"]+"/g) || []).length : 0;
    check(`${tag} Summary index: ${e.indexLinks} "Click here to view!" links to this file's tabs`, links === e.indexLinks, links);
    check(`${tag} Summary index: No. | Particulars | Link headings and the NOTE`, idx && idx.val('A5') === 'No.' && idx.val('B5') === 'Particulars' && /NOTE/.test(idx.xml));
    check(`${tag} Summary is section 1 of the PDF / TOC and the first tab after the Cover`, r.pages.map(p => p.id).filter(id => !['cover', 'toc'].includes(id))[0] === 'index' &&
      /^1\. Summary/.test(((r.pages.find(p => p.id === 'toc') || {}).tocItems || [{}])[0].text || '') && excel.sheets.map(x => x.name)[1] === 'Summary');
  }
  if (e.listings) check(`${tag} Review & Edit shows transaction dates as dates, not dollars`, r.editorDates.length > 0 && r.editorDates.every(v => /^\d{2}\/\d{2}\/\d{4}$/.test(v)) && !(r.editorDollarDates || []).length,
    r.editorDates.slice(0, 3).join(' ') + ' | ' + (r.editorDollarDates || []).slice(0, 3).join(' '));
  for (const [tab, n] of Object.entries(e.listings || {})){
    const sh = excel.sheets.find(s => s.name === tab);
    const dataRows = sh ? new Set(sh.cells.filter(c => c.row > 5).map(c => c.row)).size : 0;
    check(`${tag} Excel has the transaction list "${tab}" with its ${n} rows`, dataRows === n, dataRows);
    check(`${tag} "${tab}": dates as dates, amounts in accounting format, headings frozen`, sh && sh.cells.some(c => c.col === 'A' && c.row === 6 && /yy/.test(c.fmt)) &&
      sh.cells.some(c => c.row === 6 && c.numeric && /\(#,##0\.00\)/.test(c.fmt)) && sh.pane === 'B6');
    check(`${tag} "${tab}" is not in the PDF`, !r.pages.some(p => p.text.includes(tab + '\n')) && !r.pages.some(p => p.anchor && p.anchor.includes(tab)));
  }
  /* Tabs keep the uploaded names, in report order by statement type. */
  /* Excel tabs: Cover, Disclaimer, Analytical Summary, the statements in the uploaded workbook's tab order, notes last. */
  const tabs = excel.sheets.map(x => x.name);
  const stmtTabs = tabs.filter(t => !['Cover', 'Disclaimer', 'Analytical Summary', notesTab].includes(t));
  const wbTabs = Object.keys(w.sheets || {}).map(tabOf);
  check(`${tag} Report order: Excel tabs Cover, [Summary], Analytical Summary, statements in workbook order, notes, Disclaimer last`,
    tabs[0] === 'Cover' && tabs.filter(t => t !== tabs[1] || !r.nonStatementTabs.includes(t)).slice(0, 2).join('|') === 'Cover|Analytical Summary' &&
    (r.hasNotes ? tabs[tabs.length - 2] === notesTab : !tabs.includes(notesTab)) && tabs[tabs.length - 1] === 'Disclaimer' &&
    (process.env.TRACKER_XLSX || stmtTabs.join('|') === [...stmtTabs].sort((a, b) => wbTabs.indexOf(a) - wbTabs.indexOf(b)).join('|')), tabs.join(' | '));
  for (const l of e.excelLines || [])
    check(`${tag} Excel keeps "${l}"`, stmts.some(s => s.cells.some(c => c.col === 'A' && String(s.val('A' + c.row)) === l)));
  check(`${tag} Row 7 every statement cell has a border`, stmts.every(s => s.unbordered === 0), stmts.map(s => s.name + ':' + s.unbordered).join(','));
  check(`${tag} Row 25 every Excel amount has a number format and right alignment`, stmts.every(s => s.unformatted === 0), stmts.map(s => s.name + ':' + s.unformatted).join(','));
  check(`${tag} Row 41 every Excel sheet has a tab colour`, excel.sheets.every(s => s.tab), excel.sheets.filter(s => !s.tab).map(s => s.name).join(','));
  check(`${tag} Rows 42/47 statement sheets freeze rows 1-5 and column A in the file`, stmts.every(s => s.pane === 'B6'), stmts.map(s => s.name + ':' + s.pane).join(','));
  /* Row 47: row 5 (frozen) is the column-heading row, with the uploaded first-column heading ("Particulars" when blank). */
  check(`${tag} Row 47 row 5 is the column-heading row (uploaded first-column heading)`, stmts.filter(s => !s.aging).every(s => s.a5 && s.a5 === (r.firstHeads[s.name] || 'Particulars')),
    stmts.map(s => s.name + ':' + s.a5 + '/' + (r.firstHeads[s.name] || 'Particulars')).join(','));
  check(`${tag} Rows 48/51 no "Amounts in US Dollars" under the heading`, stmts.every(s => !/US Dollars/.test(s.a3)));
  check(`${tag} Row 23 Excel heading rows centred`, stmts.filter(s => !s.aging).every(s => s.centered), stmts.filter(s => !s.aging && !s.centered).map(s => s.name).join(','));
  check(`${tag} Rows 44/45 every Excel amount uses the accounting format ($ negatives in parentheses)`, stmts.every(s => !s.nonAccounting.length),
    stmts.filter(s => s.nonAccounting.length).map(s => s.name + ': ' + s.nonAccounting.slice(0, 3).join(', ')).join(' | '));
  const pctRowXl = stmts.flatMap(s => s.cells.filter(c => c.numeric && c.col !== 'A' && isPctLabel(s.val('A' + c.row))).map(c => s.name + '!' + c.col + c.row + ' ' + c.fmt));
  if (pctRowXl.length) check(`${tag} Row 52 Excel "Percentage of total" rows use a % format`, pctRowXl.every(x => /%/.test(x)), pctRowXl.slice(0, 4).join(' | '));
  /* One tab colour (the header navy) on every tab, no gridlines on any sheet (user, 2026-10-07). */
  check(`${tag} Row 41 one tab colour on every Excel tab`, new Set(excel.sheets.map(s => s.tabColor)).size === 1 && excel.sheets[0].tabColor === 'FF0B2F59',
    [...new Set(excel.sheets.map(s => s.tabColor))].join(','));
  check(`${tag} Gridlines hidden on every Excel sheet`, excel.sheets.every(s => /<sheetView\b[^>]*showGridLines="0"/.test(s.xml)), excel.sheets.filter(s => !/showGridLines="0"/.test(s.xml)).map(s => s.name).join(','));
  /* The Analytical Summary shows the PDF's dashboard pages (the same graphs) as pictures. */
  /* Excel Analytical Summary: one picture per dashboard graph — the graphs only, not whole pages (user, 2026-10-07). */
  const summaryWs = excel.sheets.find(s => s.name === 'Analytical Summary');
  check(`${tag} Excel graphs are on the right of the summary tables (tables unchanged on the left)`, summaryWs && summaryWs.pictureCol > 1 &&
    summaryWs.cells.filter(c => c.col === 'A').length > 5 && String(summaryWs.val('A1')).includes('Analytical Summary'), summaryWs && summaryWs.pictureCol);
  /* The Balance Sheet Composition diagram is in the PDF only (user, 2026-10-08): not on any Excel sheet. */
  const compGraphs = r.hasComposition ? 1 : 0;
  check(`${tag} Excel Analytical Summary has one picture per dashboard graph except the Balance Sheet Composition (${r.graphCount - compGraphs})`,
    summaryWs && (summaryWs.pictures || 0) === r.graphCount - compGraphs, summaryWs && summaryWs.pictures);
  check(`${tag} No Balance Sheet Composition picture anywhere in the Excel file`,
    excel.sheets.every(x => !(x.pictureNames || []).some(n => /Balance Sheet Composition/i.test(n))), excel.sheets.filter(x => x.pictures).map(x => x.name + ':' + x.pictureNames.join('/')).join(' | '));
  check(`${tag} Excel pictures start below the frozen heading rows (never cut by the freeze line)`,
    excel.sheets.filter(x => x.pictures).every(x => x.pictureRow >= 5), excel.sheets.filter(x => x.pictures).map(x => x.name + ':' + x.pictureRow).join(','));
  check(`${tag} Excel graph pictures are graphs only (no page header / footer)`, summaryWs && summaryWs.pictureNames.length > 0 &&
    summaryWs.pictureNames.every(n => !/page \d|Analytical Dashboard/i.test(n)), summaryWs && summaryWs.pictureNames.join(' | '));
  /* Row 40: Notes sheet formatted as a table (title, Line Item / Category | Note headings) */
  const notesWs = excel.sheets.find(s => s.name === notesTab);
  if (r.hasNotes) check(`${tag} Row 40 Notes sheet has its title and "Line Item / Category" / "Note" headings`, notesWs && /notes/i.test(String(notesWs.val('A1'))) &&
    notesWs.val('A4') === 'Line Item / Category' && notesWs.val('B4') === 'Note', notesWs && [notesWs.val('A1'), notesWs.val('A4'), notesWs.val('B4')].join(' | '));
  for (const n of e.notes || []) check(`${tag} Row 40 note "${n}" in the Excel Notes sheet`, notesWs && /<v>[^<]*/.test(notesWs.xml) && (notesWs.xml.includes(n) || notesWs.xml.includes(n.replace(/&/g, '&amp;'))));
  /* Data workbook (as uploaded): every sheet has a tab colour; every sheet with columns freezes its heading rows and column A */
  const data = excel.data || [];
  check(`${tag} Row 41 every data-workbook sheet has a tab colour`, data.length && data.every(s => s.tabColor), data.filter(s => !s.tabColor).map(s => s.name).join(','));
  check(`${tag} Data workbook: one tab colour, no gridlines`, new Set(data.map(s => s.tabColor)).size === 1 && data.every(s => /showGridLines="0"/.test(s.xml)));
  /* Serial numbers (1, 2, 3 …) centred, as whole numbers, in both downloads */
  if (e.indexLinks){
    const idxR = excel.sheets.find(s => s.name === 'Summary'), idxD = data.find(s => s.name === 'Summary');
    const centred = sh => sh && sh.cells.filter(c => c.col === 'A' && c.numeric).length >= 3 && sh.cells.filter(c => c.col === 'A' && c.numeric).every(c => c.horizontal === 'center' && !/\./.test(c.fmt));
    check(`${tag} Serial numbers centred in the Summary (report and data workbook)`, centred(idxR) && centred(idxD));
  }
  check(`${tag} Rows 42/47 every data-workbook sheet freezes its heading rows`, data.length && data.every(s => s.ySplit >= 1), data.filter(s => s.ySplit < 1).map(s => s.name).join(','));
}

/* ---------- run ---------- */

(async () => {
  const exe = chromiumPath();
  const server = await serve();
  /* TRACKER_URL=https://… runs the checks against a deployed site instead of this checkout. */
  const base = process.env.TRACKER_URL || 'http://127.0.0.1:' + server.address().port + '/index.html';
  /* Containers often give /dev/shm only 64 MB, which crashes Chromium on large pages ("Target crashed"). */
  const browser = await chromium.launch({ executablePath: exe, args: ['--disable-dev-shm-usage', '--disable-gpu'] });
  /* TRACKER_XLSX=path/to/client.xlsx runs every check on a real client workbook instead of the built-in set. */
  const books = (process.env.TRACKER_XLSX
    ? [{ name: path.basename(process.env.TRACKER_XLSX), file: fs.readFileSync(process.env.TRACKER_XLSX),
         /* TRACKER_EXPECT=expect.json adds the figures to check: { client, expect: { income, net, roles, periods, … } } */
         ...(process.env.TRACKER_EXPECT ? JSON.parse(fs.readFileSync(process.env.TRACKER_EXPECT, 'utf8')) : { expect: {} }) }]
    : [row54Workbook(), plutoWorkbook(), plutoClientWorkbook(), uncategorizedWorkbook(), senecaWorkbook(), comparativePctWorkbook(), halfYearCashWorkbook(), threeBalanceSheetsWorkbook(), notesTabWorkbook(), ...fixtureWorkbooks()])
    .filter(w => !process.env.TRACKER_ONLY || w.name.includes(process.env.TRACKER_ONLY));   // e.g. TRACKER_ONLY="Row 54"
  if (!books.length) throw new Error('No workbook matches TRACKER_ONLY=' + process.env.TRACKER_ONLY);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'udmr-'));
  try {
    for (const w of books){
      const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error' && !/favicon|supabase|Failed to load resource|net::ERR/i.test(m.text())) errors.push(m.text()); });
      /* A slow CDN load must not abort the run: one retry with a longer wait. */
      try { await page.goto(base, { waitUntil: 'networkidle' }); }
      catch (e){ await page.goto(base, { waitUntil: 'networkidle', timeout: 90000 }); }
      await page.waitForFunction(() => typeof resetState === 'function', null, { timeout: 30000 });
      await page.evaluate(() => { localStorage.clear(); resetState(); });
      await page.evaluate(() => goPage('uploads'));
      /* Row 54: a previous session held a Balance-Sheet-only workbook; choosing the new file must replace it at once. */
      if (w === books[0] && !process.env.TRACKER_XLSX){
        const bsOnly = { sheets: { 'Old BS': [['Old Client'], ['Balance Sheet'], ['As of December 31, 2024'], [], ['', 'Total'], ['Assets'], ['Checking', 10],
          ['Total Assets', 10], ['Liabilities and Equity'], ['Retained Earnings', 10], ['Total Liabilities and Equity', 10]] } };
        await page.setInputFiles('#fileInput', { name: 'old.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: toXlsx(bsOnly) });
        await page.waitForFunction(() => state.fileName === 'old.xlsx' && state.model, null, { timeout: 60000 });
      }
      await page.setInputFiles('#fileInput', { name: 'workbook.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: w.file || toXlsx(w) });
      /* Choosing the file processes it — no Process click needed, so a stale workbook can never be exported. */
      const autoProcessed = await page.waitForFunction(() => state.fileName === 'workbook.xlsx' && state.model, null, { timeout: 60000 }).then(() => true, () => false);
      check(`[${w.name}] Row 54 choosing the file processes it (no Process click, no stale workbook)`, autoProcessed);
      /* The Process button still re-runs the chosen file. */
      await page.evaluate(() => { state.fileName = ''; goPage('uploads'); });
      await page.click('#processBtn');
      await page.waitForFunction(() => state.fileName === 'workbook.xlsx', null, { timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('#loadedStatus').classList.contains('ok') && state.model, null, { timeout: 60000 });
      const toastText = await page.evaluate(() => document.querySelector('#toast').textContent);
      if (/could not|failed/i.test(toastText)) errors.push('toast: ' + toastText);
      const r = await page.evaluate(inspectPage);
      if (w.client) check(`[${w.name}] client name read from the workbook`, r.client === w.client, r.client);

      /* Excel management report: capture the workbook object and the downloaded file */
      const excel = { ok: false, sheets: [] };
      try {
        await page.evaluate(() => {
          const orig = _saveWorkbook;
          window._saveWorkbook = (wb, name) => { window.__lastWb = wb; return orig(wb, name); };
        });
        const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.evaluate(() => downloadReportExcel())]);
        const file = path.join(tmp, 'report.xlsx');
        await dl.saveAs(file);
        excel.sheets = readXlsxFile(file).map(sh => {
          const body = sh.cells.filter(c => c.row >= 5);
          const a5 = String(sh.val('A5'));
          return { ...sh, tab: !!sh.tabColor, a3: String(sh.val('A3')), a5, aging: /Aging Bucket/.test(a5),
            unbordered: body.filter(c => !c.border).length,
            unformatted: body.filter(c => c.numeric && (!c.fmt || c.horizontal !== 'right')).length,
            nonAccounting: body.filter(c => c.numeric && c.fmt && !/%/.test(c.fmt) && !/\(#,##0\.00\)/.test(c.fmt)).map(c => c.col + c.row + ' ' + c.fmt),
            centered: (sh.cells.find(c => c.col === 'A' && c.row === 1) || {}).horizontal === 'center' };
        });
        excel.ok = true;
        /* Data workbook: every uploaded sheet colored and frozen at its heading row */
        const [dd] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.evaluate(() => downloadDataExcel())]);
        const dfile = path.join(tmp, 'data.xlsx');
        await dd.saveAs(dfile);
        excel.data = readXlsxFile(dfile);
      } catch (err){ excel.error = String(err.message || err); }

      /* PDF: save through the app's own savePdf and read the file back */
      const pdf = { ok: false, skipped: !!process.env.TRACKER_SKIP_PDF };
      /* TRACKER_SKIP_PDF=1 skips saving the PDF file (memory-constrained machines); every rendered page is still checked. */
      if (!pdf.skipped) try {
        const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }), page.evaluate(() => savePdf(false))]);
        const file = path.join(tmp, 'report.pdf');
        await dl.saveAs(file);
        const txt = fs.readFileSync(file).toString('latin1');
        pdf.pages = (txt.match(/\/Type \/Page\b(?!s)/g) || []).length;
        pdf.links = (txt.match(/\/Subtype \/Link/g) || []).length;
        pdf.invisibleText = /\b3 Tr\b/.test(txt);
        /* Page pictures: their pixel widths and whether any is stored as JPEG (blurred text). */
        pdf.imageWidths = [...txt.matchAll(/\/Subtype \/Image[^>]*?\/Width (\d+)/g)].map(m => +m[1]);
        pdf.jpeg = /\/DCTDecode/.test(txt);
        pdf.text = [...txt.matchAll(/\((?:[^()\\]|\\.)*\)\s*Tj/g)].map(m => m[0].slice(1, m[0].lastIndexOf(')')).replace(/\\(.)/g, '$1')).join(' ');
        pdf.ok = pdf.pages > 0;
      } catch (err){ pdf.error = String(err.message || err); }

      console.log(`• ${w.name}: ${r.pageCount} pages`);
      checkWorkbook(w, r, excel, pdf, errors);

      /* Watermark (row after 30): none by default, customisable text when entered */
      if (w === books[0]){
        check('[watermark] no watermark by default', r.pages.every(p => !p.watermark));
        const wm = await page.evaluate(() => { state.settings.watermark = 'DRAFT FOR BANK'; const p = buildPages({ forExport: true }); state.settings.watermark = ''; return p.filter(x => x.sectionId !== 'cover').every(x => x.html.includes('DRAFT FOR BANK')); });
        check('[watermark] custom watermark text printed on every content page', wm);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`\n${pass + fail} checks, ${pass} pass, ${fail} fail`);
  if (fail) console.log('\nFailures:\n' + failures.map(f => '  - ' + f).join('\n'));
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
