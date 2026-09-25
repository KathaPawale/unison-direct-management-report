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
      excelSheets: ['Balance Sheet', 'Balance Sheet — Comparative', 'Profit and Loss (Monthly)', 'Profit and Loss (by Class)'],
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
      excelSheets: ['Profit and Loss (Comparative)', 'Profit and Loss (% of Income)', 'Trial Balance', 'AP Aging'],
      tbAccounts: ['Checking', 'Accounts Payable', 'Rent'], apBuckets: ['Current', '1 - 30 Days', 'Older'], emptyAR: true,
      periods: { tb: 'As of December 31, 2025', plPercent: 'January – December 2025' },
      sections: ['bs', 'tb', 'plComparative', 'plPercent', 'ap'] } };
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
  const out = { roles: md.roles, metrics: md.metrics, prior: md.prior, hasPrior: !!md.hasPrior, months: md.months.map(m => m.short),
    periodSeries: md.periodSeries.map(p => p.label), suppressAR: !!md.suppressAR, basis: reportBasis(), client: state.client, period: state.period,
    expenseGroups: md.expenseGroups.map(g => ({ label: g.label, value: g.value, pct: g.pct })), expenseTotal: md.expenseTotal,
    liab: (md.liabilityBifurcation || []).map(x => ({ label: x.label, value: x.value, pct: x.pct })),
    composition: [...md.bsComposition.assets, ...md.bsComposition.liabEquity].map(x => ({ label: x.label, pct: x.pct })),
    equityPct: (md.bsComposition.liabEquity.find(x => /equity/i.test(x.label)) || {}).pct ?? null };

  /* Dashboard (portal) */
  goPage('dashboard');
  const tiles = [...document.querySelectorAll('#kpiGrid .kpi')].map(k => ({ label: k.querySelector('small').textContent, value: k.querySelector('b').textContent,
    neg: k.querySelector('b').classList.contains('neg'), sub: k.querySelector('.help').textContent }));
  out.tiles = tiles;
  out.dashText = document.querySelector('#dashboard').innerText;
  out.expenseChartText = (document.querySelector('#chartExpenses') || {}).textContent || '';
  out.liabDash = (document.querySelector('#chartLiab') || {}).innerText || '';
  out.money = { income: money(md.metrics.income), bank: md.metrics.bank === null ? null : money(md.metrics.bank) };

  /* Review & Edit */
  goPage('editor');
  const inputs = [...document.querySelectorAll('#editorTable td.num input')].map(i => i.value);
  out.editorNumeric = inputs.length;
  out.editorBad = inputs.filter(v => !/^\(?\$\d{1,3}(,\d{3})*\.\d{2}\)?$/.test(v)).slice(0, 5);

  /* Financial Statements page */
  goPage('financials');
  const fin = document.querySelector('#financials');
  out.finText = fin.innerText;
  out.finOrder = [...fin.querySelectorAll('.stmt-title')].map(e => e.textContent);
  out.finNegNetOk = [...fin.querySelectorAll('tr')].filter(tr => /^net income$/i.test((tr.cells[0] || {}).textContent || '')).every(tr =>
    [...tr.cells].slice(1).every(td => !/^\(/.test(td.textContent.trim()) || td.classList.contains('neg')));

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
    pageInfo.push({
      id: p.sectionId, orientation: p.orientation, text: el.innerText, overFooter: contentBottom - fTop, rightOverflow, cutCells, headers, pctCells,
      titleBold: tcs ? +tcs.fontWeight >= 700 : null, titleColor: tcs ? tcs.color : null, titleSize: tcs ? parseFloat(tcs.fontSize) : null,
      centered: hc ? getComputedStyle(hc).textAlign === 'center' : null,
      netNegOk: netRows.every(tr => [...tr.cells].slice(1).every(td => !/^\(\$/.test(td.textContent.trim()) || td.classList.contains('neg') && getComputedStyle(td).color === 'rgb(201, 52, 56)')),
      tableRows: el.querySelectorAll('.report-table tbody tr').length,
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
    const val = a => (ws[a] || {}).v ?? '';
    return { name, xml, cells, val, tabColor: (xml.match(/<sheetPr>[^]*?<tabColor rgb="([0-9A-F]{8})"/) || [])[1] || null,
      pane: pane && /state="frozen"/.test(pane[0]) ? ((pane[0].match(/topLeftCell="([A-Z]+\d+)"/) || [])[1] || null) : null,
      xSplit: pane ? +((pane[0].match(/xSplit="(\d+)"/) || [])[1] || 0) : 0, ySplit: pane ? +((pane[0].match(/ySplit="(\d+)"/) || [])[1] || 0) : 0 };
  });
}

/* ---------- checks ---------- */

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
  const tIdx = re => toc.findIndex(t => re.test(t.text));
  const bsI = tIdx(/Balance Sheet/), plI = tIdx(/Profit and Loss/);
  if (bsI >= 0 && plI >= 0) check(`${tag} Row 15 Balance Sheet listed before Profit and Loss`, bsI < plI);
  if (r.finOrder.length >= 2 && r.finOrder.some(t => /Balance Sheet/.test(t)) && r.finOrder.some(t => /Profit and Loss/.test(t)))
    check(`${tag} Row 15 portal shows Balance Sheet before Profit and Loss`, r.finOrder.findIndex(t => /Balance Sheet/.test(t)) < r.finOrder.findIndex(t => /Profit and Loss/.test(t)), r.finOrder.join(', '));
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

  /* Row 13, 27: aging + cash basis */
  if (e.noAR) check(`${tag} Row 27 cash basis: no A/R anywhere in the report`, r.suppressAR && !r.pages.some(p => p.id === 'ar') && !r.pages.some(p => /5,205\.70/.test(p.text)));
  if (r.roles.ar && !r.suppressAR) check(`${tag} Row 13 A/R aging in PDF and Excel`, r.pages.some(p => p.id === 'ar') && excel.sheets.some(s => s.name === 'AR Aging'));
  if (r.roles.ap && !r.pages.every(p => p.id !== 'ap')) check(`${tag} Row 13 A/P aging in Excel`, excel.sheets.some(s => s.name === 'AP Aging'));

  /* Row 16 / 40: notes */
  for (const n of e.notes || []) check(`${tag} Row 16 note "${n}" in the report`, page('notes').some(p => p.text.includes(n)));
  if (w.fixture === 'D') check(`${tag} Row 16 imported notes reach the report`, page('notes').length && !/No notes were found/.test(page('notes')[0].text));

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
    const monthHeads = p.headers.filter(h => /^[A-Z][a-z]{2}( \d{4})?$/.test(h));
    check(`${tag} Row 26 monthly P&L page carries every month and the Total`, monthHeads.length === r.months.length && p.headers.includes('Total'), p.headers.join(','));
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
  check(`${tag} Row 33 disclaimer sentence appears once`, (disc.match(/for management purpose only/gi) || []).length === 1);

  /* Row 37: zero rows left out of the PDF */
  for (const z of e.zeroRows || []) check(`${tag} Row 37 zero-balance ledger "${z}" left out of the PDF`, !content.some(p => p.id !== 'dash' && new RegExp('^\\s*' + z.replace(/[&]/g, '\\$&') + '\\s', 'm').test(p.text)));

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
  check(`${tag} Row 34 PDF saves with every page`, pdf.ok && pdf.pages === r.pageCount, pdf.error || (pdf.pages + ' of ' + r.pageCount));
  check(`${tag} Row 39 PDF TOC entries are clickable links`, pdf.links >= toc.length && toc.length > 0, pdf.links + ' links, ' + toc.length + ' entries');

  /* Excel: rows 7, 25, 41, 42, 44-48, 52, 54 */
  check(`${tag} Excel downloads`, excel.ok, excel.error);
  if (!excel.ok) return;
  for (const s of e.excelSheets || []) check(`${tag} Rows 44-54 Excel sheet "${s}"`, excel.sheets.some(x => x.name === s), excel.sheets.map(x => x.name).join(', '));
  const stmts = excel.sheets.filter(s => !['Cover', 'Analytical Summary', 'Notes', 'Disclaimer'].includes(s.name));
  check(`${tag} Row 7 every statement cell has a border`, stmts.every(s => s.unbordered === 0), stmts.map(s => s.name + ':' + s.unbordered).join(','));
  check(`${tag} Row 25 every Excel amount has a number format and right alignment`, stmts.every(s => s.unformatted === 0), stmts.map(s => s.name + ':' + s.unformatted).join(','));
  check(`${tag} Row 41 every Excel sheet has a tab colour`, excel.sheets.every(s => s.tab), excel.sheets.filter(s => !s.tab).map(s => s.name).join(','));
  check(`${tag} Rows 42/47 statement sheets freeze rows 1-5 and column A in the file`, stmts.every(s => s.pane === 'B6'), stmts.map(s => s.name + ':' + s.pane).join(','));
  check(`${tag} Row 47 row 5 is "Particulars" on the model statement sheets`, stmts.filter(s => !s.aging).every(s => s.a5 === 'Particulars'), stmts.map(s => s.name + ':' + s.a5).join(','));
  check(`${tag} Rows 48/51 no "Amounts in US Dollars" under the heading`, stmts.every(s => !/US Dollars/.test(s.a3)));
  check(`${tag} Row 23 Excel heading rows centred`, stmts.filter(s => !s.aging).every(s => s.centered), stmts.filter(s => !s.aging && !s.centered).map(s => s.name).join(','));
  check(`${tag} Rows 44/45 every Excel amount uses the accounting format ($ negatives in parentheses)`, stmts.every(s => !s.nonAccounting.length),
    stmts.filter(s => s.nonAccounting.length).map(s => s.name + ': ' + s.nonAccounting.slice(0, 3).join(', ')).join(' | '));
  check(`${tag} Row 41 tab colours differ by statement type`, new Set(excel.sheets.map(s => s.tabColor)).size >= Math.min(3, excel.sheets.length));
  /* Row 40: Notes sheet formatted as a table (title, Line Item / Category | Note headings) */
  const notesWs = excel.sheets.find(s => s.name === 'Notes');
  check(`${tag} Row 40 Notes sheet has its title and "Line Item / Category" / "Note" headings`, notesWs && /Notes to Financial Statements/.test(String(notesWs.val('A1'))) &&
    notesWs.val('A4') === 'Line Item / Category' && notesWs.val('B4') === 'Note', notesWs && [notesWs.val('A1'), notesWs.val('A4'), notesWs.val('B4')].join(' | '));
  for (const n of e.notes || []) check(`${tag} Row 40 note "${n}" in the Excel Notes sheet`, notesWs && /<v>[^<]*/.test(notesWs.xml) && notesWs.xml.includes(n));
  /* Data workbook (as uploaded): every sheet has a tab colour; every sheet with columns freezes its heading rows and column A */
  const data = excel.data || [];
  check(`${tag} Row 41 every data-workbook sheet has a tab colour`, data.length && data.every(s => s.tabColor), data.filter(s => !s.tabColor).map(s => s.name).join(','));
  check(`${tag} Rows 42/47 every data-workbook sheet freezes its heading rows`, data.length && data.every(s => s.ySplit >= 1), data.filter(s => s.ySplit < 1).map(s => s.name).join(','));
}

/* ---------- run ---------- */

(async () => {
  const exe = chromiumPath();
  const server = await serve();
  /* TRACKER_URL=https://… runs the checks against a deployed site instead of this checkout. */
  const base = process.env.TRACKER_URL || 'http://127.0.0.1:' + server.address().port + '/index.html';
  const browser = await chromium.launch({ executablePath: exe });
  /* TRACKER_XLSX=path/to/client.xlsx runs every check on a real client workbook instead of the built-in set. */
  const books = (process.env.TRACKER_XLSX
    ? [{ name: path.basename(process.env.TRACKER_XLSX), file: fs.readFileSync(process.env.TRACKER_XLSX),
         /* TRACKER_EXPECT=expect.json adds the figures to check: { client, expect: { income, net, roles, periods, … } } */
         ...(process.env.TRACKER_EXPECT ? JSON.parse(fs.readFileSync(process.env.TRACKER_EXPECT, 'utf8')) : { expect: {} }) }]
    : [row54Workbook(), plutoWorkbook(), comparativePctWorkbook(), halfYearCashWorkbook(), ...fixtureWorkbooks()])
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
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.evaluate(() => { localStorage.clear(); resetState(); });
      await page.evaluate(() => goPage('uploads'));
      await page.setInputFiles('#fileInput', { name: 'workbook.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: w.file || toXlsx(w) });
      await page.click('#processBtn');
      await page.waitForFunction(() => document.querySelector('#loadedStatus').classList.contains('ok') && state.model, null, { timeout: 20000 });
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
        const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.evaluate(() => downloadReportExcel())]);
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
        const [dd] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.evaluate(() => downloadDataExcel())]);
        const dfile = path.join(tmp, 'data.xlsx');
        await dd.saveAs(dfile);
        excel.data = readXlsxFile(dfile);
      } catch (err){ excel.error = String(err.message || err); }

      /* PDF: save through the app's own savePdf and read the file back */
      const pdf = { ok: false };
      try {
        const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }), page.evaluate(() => savePdf(false))]);
        const file = path.join(tmp, 'report.pdf');
        await dl.saveAs(file);
        const txt = fs.readFileSync(file).toString('latin1');
        pdf.pages = (txt.match(/\/Type \/Page\b(?!s)/g) || []).length;
        pdf.links = (txt.match(/\/Subtype \/Link/g) || []).length;
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
