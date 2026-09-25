/* Unison Direct Management Reporting — report builder
 * buildPages({forExport}) → [{sectionNo, sectionId, title, orientation, html}]
 * One source of truth for the preview, the PDF and the TOC. Every page body —
 * dashboard blocks, statement tables and notes — is paginated by real DOM
 * measurement in #pdfMeasure, so nothing overlaps the footer or is clipped. */
'use strict';

const PAGE_W = 816, PAGE_H = 1056;              // US Letter portrait @ 96 dpi
const PAGE_PAD_TOP = 50, PAGE_PAD_BOTTOM = 46, FOOTER_RESERVE = 72;
const WIDE_TABLE_COLS = 6;                      // more value columns than this → landscape page
const MAX_COLS_PER_PAGE = 20;                   // extended landscape budget keeps monthly P&L columns together
const REPORT_DISCLAIMER =
  'The report we are submitting is for management purpose only. ' +
  'The numbers are based on data submitted and instructed by client.';

function pageDims(orientation){
  return orientation === 'landscape' ? { w: PAGE_H, h: PAGE_W } : { w: PAGE_W, h: PAGE_H };
}

function reportLogo(){
  return '<img class="report-logo" src="./assets/unison-logo.svg" alt="Unison Direct">';
}

/* Bug 6: always a basis — Cash Basis or Accrual Basis — never currency text.
 * Nothing detected and no override → "Accrual Basis". */
function reportBasis(){
  const v = String(state.basisOverride || (state.model && state.model.basisDetected) || '').trim();
  return /cash/i.test(v) && !/accrual/i.test(v) ? 'Cash Basis' : 'Accrual Basis';
}

function watermarkHtml(){
  const t = String((state.settings && state.settings.watermark) || '').trim();
  return t ? `<div class="report-watermark">${escapeHtml(t)}</div>` : '';
}

/* Centered heading: company name, section title, period. */
/* Balance Sheet and aging reports are "as of" a date; P&L statements cover a period. */
function statementPeriodText(sm){
  const md = state.model;
  /* Each statement shows the period its own worksheet states (a Trial Balance "As of …", a P&L "For the 7 months
   * ended …"). A month-by-month sheet titled "For the month ended …" but holding several months shows its month range. */
  const own = sm ? sheetOwnPeriod(state.sheets[sm.name] || [], sm) : '';
  if (own){
    const months = sm.cols.filter(c => c.type === 'month' && c.key !== null && c.key !== undefined);
    if (sm.role === 'plMonthly' && months.length > 1 && /^for the month ended\b/i.test(own)){
      const a = months.reduce((x, y) => (y.key < x.key ? y : x)), b = months.reduce((x, y) => (y.key > x.key ? y : x));
      return a.year === b.year ? `${MONTH_FULL[a.m]} – ${MONTH_FULL[b.m]} ${b.year}` : `${MONTH_FULL[a.m]} ${a.year} – ${MONTH_FULL[b.m]} ${b.year}`;
    }
    return formatPeriodText(own);
  }
  if (sm && ['ar', 'ap'].includes(sm.role)){
    const rows = (state.sheets[sm.name] || []).slice(0, Math.max(0, sm.headerRow));
    for (const row of rows) for (const c of (row || [])){
      const t = cellText(c);
      if (/^as of\b/i.test(t)) return formatPeriodText(t);
    }
    if (md && md.bsAsOf) return md.bsAsOf;
  }
  if (sm && (sm.role === 'bs' || sm.role === 'bsComparative') && md && md.bsAsOf) return md.bsAsOf;
  return state.period;
}

/* An aging report with no open items (e.g. no receivables) says so instead of looking broken. */
function emptySheetText(sm){
  const asOf = statementPeriodText(sm);
  if (sm && sm.role === 'ar') return 'No open receivables' + (asOf ? ' as of ' + asOf.replace(/^as of /i, '') : '') + '.';
  if (sm && sm.role === 'ap') return 'No open payables' + (asOf ? ' as of ' + asOf.replace(/^as of /i, '') : '') + '.';
  return 'No statement lines were found in this worksheet.';
}

function sectionHead(no, title, sub, continued = false){
  return reportLogo() +
    '<div class="report-heading-center">' +
      `<div class="report-company-center">${escapeHtml(state.client)}</div>` +
      `<h2 class="report-title">${no ? no + '. ' : ''}${escapeHtml(title)}` +
      (continued ? ' <span class="report-cont">(continued)</span>' : '') + '</h2>' +
      `<div class="report-sub">${escapeHtml(sub || state.period)}</div>` +
    '</div><div class="report-rule"></div>';
}

/* Rows 48/51: Heading (3) — the period line under each statement title — shows only the period.
 * The currency is stated once on the cover, so it is not repeated here. */
function tableSectionSub(sm){
  return statementPeriodText(sm);
}

function pageFooter(pageNo, pageCount){
  return `<div class="report-footer"><span class="confidential">CONFIDENTIAL — MANAGEMENT PURPOSE ONLY</span>` +
         `<span class="footer-client">${escapeHtml(state.client)}</span>` +
         `<span>Page ${pageNo} of ${pageCount}</span></div>`;
}

/* ---------- report tables ---------- */

function acctNumber(n, withSymbol = true){
  return accounting(n, withSymbol);
}

function formatReportCell(v, colType, opts = {}){
  const s = cellText(v);
  if (s === '') return '';
  /* Financial formatting in every statement table: amounts $1,234.56 / ($1,234.56) — wide tables
   * included (paginateTableSection shrinks a table to fit rather than dropping the $); zero on an
   * account row "–"; percentages 12.5% / (12.5%), including percent text copied from the workbook. */
  if (colType === 'percent'){
    const pt = parsePercentText(s);
    const n = pt === null ? parseAmount(v) : null;
    if (pt === null && n === null) return escapeHtml(s);
    /* opts.fraction: the column's scale (true = fractions, false = whole percents); unknown → per value */
    const p = pt !== null ? pt : opts.fraction === true ? n * 100 : opts.fraction === false ? n : (Math.abs(n) < 1 ? n * 100 : n);
    const r = Math.abs(p).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return p < 0 && Math.abs(p) >= 0.05 ? '(' + r + '%)' : r + '%';
  }
  const n = parseAmount(v);
  if (n !== null && n === 0 && opts.zeroDash) return '&ndash;';
  if (n !== null) return acctNumber(n);
  return escapeHtml(s);
}

function _headLabel(c){
  if (c.label) return c.label;
  if (c.type === 'current') return state.model && state.model.currentLabel !== 'Current Period' ? state.model.currentLabel : 'Amount';
  if (c.type === 'prior') return 'Prior Period';
  return '';
}

/* Build thead + row HTML strings for a parsed sheet.
 * Returns {theadHtml, rows:[{html, orphanGuard}], colCount, valueCols} */
function reportTableParts(sm, { forExport = false, cols = null, compact = false, skipZeros = null } = {}){
  const rows = state.sheets[sm.name] || [];
  const showCols = cols || displayColumns(sm);
  const labelPct = showCols.length > 10 ? 20 : showCols.length > 6 ? 24 : showCols.length > 3 ? 34 : 46;
  const valPct = showCols.length ? (100 - labelPct) / showCols.length : 0;
  const colgroup = `<colgroup><col style="width:${labelPct}%">` + showCols.map(() => `<col style="width:${valPct.toFixed(3)}%">`).join('') + '</colgroup>';
  const thead = '<tr><th class="lbl">Particulars</th>' + showCols.map(c =>
    `<th>${escapeHtml(_headLabel(c))}</th>`).join('') + '</tr>';

  const doSkip = skipZeros === null ? forExport : !!skipZeros;
  const isRowZero = (line) => {
    if (line.kind !== 'account') return false;
    const r = rows[line.r] || [];
    for (const c of showCols){
      const n = parseAmount(r[c.idx]);
      if (n !== null && Math.abs(n) >= 0.005) return false;
      if (n === null && isPercentText(r[c.idx])){
        const pv = parseFloat(String(r[c.idx]).replace(/[^\d.\-]/g, ''));
        if (!isNaN(pv) && Math.abs(pv) >= 0.005) return false;
      }
    }
    return true;
  };

  /* Rows 34 / 52: each percent column is scaled as a whole (fractions → the total of 1 prints 100%;
   * whole percents → a 0.45 line prints 0.45%, not 45%). */
  const fractionCols = new Set(showCols.filter(c => c.type === 'percent' && percentColumnIsFraction(sm, rows, c.idx)).map(c => c.idx));

  const out = [];
  for (const line of sm.lines){
    if (line.kind === 'meta') continue;
    if (doSkip && isRowZero(line)) continue;
    const row = rows[line.r] || [];
    const kind = line.kind;
    const isTotal = kind === 'total' || kind === 'grandTotal' || kind === 'computed';
    const grand = kind === 'grandTotal' ||
      /^total (for )?(assets|liabilities and (stockholders |shareholders |owners |members |partners )?(equity|capital)|income|revenues?|expenses?)$/.test(line.mkey || labelKey(line.label)) ||
      (sm.role !== 'bs' && /^net (income|profit|loss|income loss)$/.test(line.mkey || labelKey(line.label)));
    const trCls = [isTotal ? 'row-total' : '', grand ? 'row-grand' : '', kind === 'section' ? 'row-section' : ''].filter(Boolean).join(' ');
    let tds = `<td class="lbl" style="padding-left:${6 + Math.min(line.indent, 6) * 11}px">${escapeHtml(line.label)}</td>`;
    for (const c of showCols){
      const v = row[c.idx];
      const n = parseAmount(v);
      const edited = !forExport &&
        (state.edited.has(sm.name + ':' + line.r + ':' + c.idx) || state.adjusted.has(sm.name + ':' + line.r + ':' + c.idx));
      const negPct = parsePercentText(v);
      const cls = [(n !== null && n < 0) ? 'neg' : (negPct !== null && negPct < 0) ? 'neg' : '', edited ? 'cell-edited' : ''].filter(Boolean).join(' ');
      tds += `<td class="val${cls ? ' ' + cls : ''}">${formatReportCell(v, c.type, { compact, zeroDash: kind === 'account', fraction: c.type === 'percent' ? fractionCols.has(c.idx) : undefined })}</td>`;
    }
    out.push({ html: `<tr${trCls ? ` class="${trCls}"` : ''}>${tds}</tr>`, orphanGuard: kind === 'section' });
  }
  return { theadHtml: thead, colgroup, rows: out, colCount: showCols.length + 1, valueCols: showCols.length };
}

/* ---------- measurement ---------- */

function _measureShell(orientation){
  const el = $('#pdfMeasure');
  el.innerHTML = '';
  const dims = pageDims(orientation);
  el.style.width = dims.w + 'px';
  const shell = document.createElement('div');
  shell.className = 'report-page' + (orientation === 'landscape' ? ' landscape' : '');
  el.appendChild(shell);
  return shell;
}

function _bodyBudget(orientation){
  return pageDims(orientation).h - PAGE_PAD_TOP - PAGE_PAD_BOTTOM - FOOTER_RESERVE;
}

function _outerHeight(el){
  const cs = getComputedStyle(el);
  return el.getBoundingClientRect().height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
}

/* Split a statement into page bodies that fit. Wide statements go on landscape pages; very wide
 * ones are split into column groups (each group keeps the account labels). */
function paginateTableSection(no, title, sm, opts = {}){
  const all = displayColumns(sm);
  if (!sm.lines.length || !all.length){
    return [{ orientation: 'portrait', body: sectionHead(no, title) +
      '<div class="report-empty">' + escapeHtml(emptySheetText(sm)) + '</div>' }];
  }
  const groups = [];
  const forceLandscape = sm.role === 'plMonthly' || all.length >= 12;
  /* Row 38: a Debit / Credit trial balance fits a portrait page (fewer pages); only a wide one goes landscape. */
  const tbLandscape = sm.role === 'tb' && all.length > 4;
  /* Row 43: monthly P&L must stay on one landscape page.
   * Landscape budget extended to 20 cols so 12 months + Total + prior period + variance %
   * never split into two sheets. Only extreme (>20 col) sheets fall back to column grouping. */
  const LANDSCAPE_MAX_COLS = 20;
  if (forceLandscape && all.length <= LANDSCAPE_MAX_COLS){
    groups.push(all);
  } else if (all.length <= MAX_COLS_PER_PAGE){
    groups.push(all);
  }
  else {
    /* keep Total / comparison columns with the last group */
    for (let i = 0; i < all.length; i += 12) groups.push(all.slice(i, i + 12));
  }
  const bodies = [];
  groups.forEach((cols, gi) => {
    const orientation = forceLandscape || tbLandscape || cols.length > WIDE_TABLE_COLS ? 'landscape' : 'portrait';
    const compact = cols.length > 8;
    const parts = reportTableParts(sm, { ...opts, cols, compact });
    const marker = groups.length > 1 ? `<div class="wide-col-marker">Columns ${escapeHtml(_headLabel(cols[0]))} – ${escapeHtml(_headLabel(cols[cols.length - 1]))}</div>` : '';
    let tableCls = 'report-table' + (compact ? ' compact' : '') + (orientation === 'landscape' ? ' wide' : '') + (cols.length <= 4 || forceLandscape ? ' roomy' : '');
    const shell = _measureShell(orientation);
    shell.innerHTML =
      `<div class="mh1">${sectionHead(no, title, tableSectionSub(sm), gi > 0)}${marker}</div>` +
      `<div class="mh2">${sectionHead(no, title, tableSectionSub(sm), true)}${marker}</div>` +
      `<table class="${tableCls}">${parts.colgroup}<thead>${parts.theadHtml}</thead><tbody>` +
      parts.rows.map(r => r.html).join('') + '</tbody></table>';
    /* Row 21: no column may be cut off. If any amount is wider than its cell (large figures on a
     * 12-month landscape P&L), step the table's font down until every cell fits (floor 6px). */
    const tbl = shell.querySelector('table');
    const overflowing = () => [...tbl.querySelectorAll('td.val, thead th')].some(td => td.scrollWidth > td.clientWidth + 0.5);
    let fitAttr = '';
    if (overflowing()){
      tbl.classList.add('fit');
      let fs = 9;
      for (; fs > 6; fs -= 0.25){ tbl.style.setProperty('--fit-fs', fs + 'px'); if (!overflowing()) break; }
      tableCls += ' fit';
      fitAttr = ` style="--fit-fs:${fs}px"`;
    }
    const h1 = _outerHeight(shell.querySelector('.mh1'));
    const h2 = _outerHeight(shell.querySelector('.mh2'));
    const theadH = shell.querySelector('thead').getBoundingClientRect().height;
    const trs = shell.querySelectorAll('tbody tr');
    const avail = _bodyBudget(orientation);
    const budgetFirst = avail - h1 - theadH - 6;
    const budgetCont = avail - h2 - theadH - 6;

    const chunks = [];
    let cur = [], curH = [], used = 0, budget = budgetFirst;
    for (let i = 0; i < parts.rows.length; i++){
      const h = trs[i].getBoundingClientRect().height || 18;
      if (used + h > budget && cur.length){
        const carry = [], carryH = [];
        while (cur.length > 1 && cur[cur.length - 1].orphanGuard){ carry.unshift(cur.pop()); carryH.unshift(curH.pop()); }
        chunks.push(cur);
        cur = carry; curH = carryH;
        used = carryH.reduce((s, x) => s + x, 0);
        budget = budgetCont;
      }
      cur.push(parts.rows[i]); curH.push(h);
      used += h;
    }
    if (cur.length) chunks.push(cur);
    /* Rows 26/28/43: a monthly P&L (or trial balance) keeps ALL its columns — every month and the
     * Total — on each landscape page; only a statement too long for one page continues by rows onto
     * the next page, with the column header repeated. */
    chunks.forEach((chunk, ci) => bodies.push({
      orientation,
      body: sectionHead(no, title, tableSectionSub(sm), gi > 0 || ci > 0) + marker +
        `<div class="report-table-wrap"><table class="${tableCls}"${fitAttr}>${parts.colgroup}<thead>${parts.theadHtml}</thead><tbody>` +
        chunk.map(r => r.html).join('') + '</tbody></table></div>'
    }));
  });
  $('#pdfMeasure').innerHTML = '';
  return bodies;
}

/* Pack independent blocks (charts, tables) onto as many portrait pages as needed. */
function paginateBlocks(no, title, blocks, sub){
  const padded = blocks.map(b => typeof b === 'string' ? { html: b, orphanGuard: false } : b);
  const shell = _measureShell('portrait');
  shell.innerHTML = `<div class="mh1">${sectionHead(no, title, sub)}</div><div class="mh2">${sectionHead(no, title, sub, true)}</div>` +
    padded.map(b => `<div class="rblock">${b.html}</div>`).join('');
  const h1 = _outerHeight(shell.querySelector('.mh1'));
  const h2 = _outerHeight(shell.querySelector('.mh2'));
  const heights = [...shell.querySelectorAll('.rblock')].map(el => _outerHeight(el));
  $('#pdfMeasure').innerHTML = '';
  const avail = _bodyBudget('portrait');
  const pages = [];
  /* Bug 10: _bodyBudget already keeps FOOTER_RESERVE (the 72px footer safe zone) clear at the
   * bottom of every page; a table block of 20 or more rows also books 40px of font-metric slack.
   * Bug 11: a block is never split, and an orphanGuard block that does not fit the rest of the page
   * starts the next page, so a table's header, body and total always stay together. */
  let cur = [], used = 0, budget = avail - h1;
  padded.forEach((b, i) => {
    const tableRows = (String(b.html).match(/<tr\b/gi) || []).length;
    const h = heights[i] + (tableRows >= 20 ? 40 : 0);
    if (cur.length && used + h > budget){
      pages.push(cur); cur = []; used = 0; budget = avail - h2;
    }
    cur.push(b); used += h;
  });
  if (cur.length) pages.push(cur);
  if (!pages.length) pages.push([]);
  return pages.map((p, i) => ({
    orientation: 'portrait',
    body: sectionHead(no, title, sub, i > 0) + p.map(b => `<div class="rblock">${b.html}</div>`).join('')
  }));
}

/* ---------- section bodies ---------- */

function coverNameSize(name){
  const n = String(name || '').length;
  return n <= 26 ? 34 : n <= 40 ? 28 : n <= 56 ? 23 : n <= 80 ? 19 : 16;
}

function coverBody(){
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const size = coverNameSize(state.client);
  return `
    <div class="cover-top cover-header">
      <h1 class="cover-client-top cover-header-name" style="font-size:${size}px">${escapeHtml(state.client)}</h1>
      ${reportLogo()}
      <div class="cover-brand-rule"></div>
    </div>
    <div class="cover-hero"></div>
    <div class="cover-band">
      <div class="cover-kicker">Management Report</div>
      <h1 style="font-size:${Math.min(size, 32)}px">${escapeHtml(state.client)}</h1>
      <div class="cover-period">${escapeHtml(state.period)}</div>
    </div>
    <div class="cover-body">
      <div class="cover-meta">
        <div class="cover-meta-item"><span class="cover-meta-label">Prepared by</span><b class="cover-meta-value">Unison Direct GCC INC</b></div>
        <div class="cover-meta-item"><span class="cover-meta-label">Report date</span><b class="cover-meta-value">${escapeHtml(today)}</b></div>
        <div class="cover-meta-item"><span class="cover-meta-label">Basis</span><b class="cover-meta-value">${escapeHtml(reportBasis())}</b></div>
        <div class="cover-meta-item"><span class="cover-meta-label">Currency</span><b class="cover-meta-value">US Dollars ($)</b></div>
      </div>
      <div class="cover-confidential">CONFIDENTIAL — Prepared for management use only</div>
    </div>`;
}

/* ---------- shared analytical figures (dashboard + report) ---------- */

function pctText(v, dp = 2){ return v === null || v === undefined || !isFinite(v) ? '—' : (v < 0 ? '-' : '') + Math.abs(v).toFixed(dp) + '%'; }

function varianceChip(cur, pri, cls = 'kchip'){
  if (pri === null || pri === undefined || Math.abs(pri) < 0.005) return '';
  const d = (cur - pri) / Math.abs(pri) * 100;
  return `<span class="${cls} ${d >= 0 ? 'good' : 'bad'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}% vs PY</span>`;
}

/* KPI tiles — every tile carries a percentage. */
function kpiTiles(){
  const md = state.model, m = md.metrics, p = md.prior;
  const ratio = (a, b) => (a === null || b === null || !b) ? null : a / Math.abs(b) * 100;
  const join = (...xs) => xs.filter(Boolean).join(' · ');
  const arNA = m.ar === null;
  const apNA = m.ap === null;
  return [
    { label: 'Revenue / Income', value: m.income, sub: join(varianceChip(m.income, p.income), m.income ? `Expenses ${pctText(ratio(m.expenses, m.income))} of revenue` : '') },
    { label: 'Gross Profit', value: m.gross, sub: join(`${pctText(ratio(m.gross, m.income))} gross margin`, varianceChip(m.gross, p.gross)) },
    { label: 'Net Income', value: m.net, sub: join(m.net < 0 ? 'Net loss' : '', `${pctText(ratio(m.net, m.income))} net margin`, varianceChip(m.net, p.net)) },
    { label: 'Cash / Bank', value: m.bank, sub: m.bank === null ? 'Not shown in Balance Sheet' : join(`${pctText(ratio(m.bank, m.assets))} of total assets`, varianceChip(m.bank, p.bank)) },
    { label: 'A/R Total', value: m.ar, na: arNA, sub: arNA ? (/cash/i.test(reportBasis()) ? 'Not applicable — cash basis' : 'No A/R in Balance Sheet') : join(`${pctText(ratio(m.ar, m.assets))} of total assets`, varianceChip(m.ar, p.ar)) },
    { label: 'A/P Total', value: m.ap, na: apNA, sub: apNA ? (/cash/i.test(reportBasis()) ? 'Not applicable — cash basis' : 'No A/P in Balance Sheet') : join(`${pctText(ratio(m.ap, m.liabilities || m.totalLE))} of total liabilities`, varianceChip(m.ap, p.ap)) }
  ];
}

function comparisonTableHtml(cls){
  const md = state.model;
  if (!md.hasPrior) return '';
  const m = md.metrics, p = md.prior;
  const rows = [['Revenue / Income', m.income, p.income], ['Gross Profit', m.gross, p.gross],
                ['Total Expenses', m.expenses, p.expenses], ['Net Income', m.net, p.net]];
  const td = (v, extra = '') => `<td class="${[v !== null && v < 0 ? 'neg' : '', extra].filter(Boolean).join(' ')}">${v === null || v === undefined ? '—' : money(v)}</td>`;
  return `<table class="${cls}"><thead><tr><th>Metric</th><th>${escapeHtml(md.currentLabel || 'Current Period')}</th><th>${escapeHtml(md.priorLabel || 'Prior Year')}</th><th>Variance</th><th>Variance %</th></tr></thead><tbody>` +
    rows.map(([l, c, pr]) => {
      const varAmt = pr === null || pr === undefined ? null : (c || 0) - pr;
      const varPct = pr ? varAmt / Math.abs(pr) * 100 : null;
      return `<tr><td>${escapeHtml(l)}</td>${td(c)}${td(pr)}${td(varAmt)}<td class="${varPct !== null && varPct < 0 ? 'neg' : ''}">${varPct === null ? '—' : (varPct >= 0 ? '▲ ' : '▼ ') + Math.abs(varPct).toFixed(1) + '%'}</td></tr>`;
    }).join('') + '</tbody></table>';
}

/* What the expense shares are a percentage of. Normally Total Expenses; when credits / refunds make a
 * share exceed 100%, shares use total expense activity instead and the note says so. */
function expenseShareNote(md){
  const base = md.expensePctBase, tot = md.expenseTotal;
  if (base !== null && base !== undefined && tot !== null && tot !== undefined && Math.abs(base - Math.abs(tot)) >= 0.005)
    return `Each category as a percentage of total expense activity (${money(base)}, before credits and refunds). Total Expenses: ${money(tot)}.`;
  return `Each category as a percentage of Total Expenses (${money(tot)}).`;
}

function liabilitiesTableHtml(cls){
  const md = state.model, items = md.liabilityBifurcation || [];
  if (!items.length) return '';
  /* Bug 2: shares come from financials (denominator = sum of these liability rows), so they add to 100%. */
  const totalLiab = items.reduce((s, x) => s + (x.value || 0), 0);
  const row = (label, v, p, extra = '') => `<tr class="${extra}"><td>${escapeHtml(label)}</td><td class="${v < 0 ? 'neg' : ''}">${money(v)}</td><td class="${p !== null && p < 0 ? 'neg' : ''}">${pctText(p)}</td></tr>`;
  return `<table class="${cls}"><thead><tr><th>Liability Type</th><th>Amount</th><th>% of Total Liabilities</th></tr></thead><tbody>` +
    items.map(x => row(x.label, x.value, x.pct)).join('') +
    row('Total Liabilities', totalLiab, Math.abs(totalLiab) >= 0.005 ? 100 : null, 'total') + '</tbody></table>';
}

function monthlyLabels(){
  const md = state.model;
  return md.months.map(x => x.short);
}

function dashboardBodies(no, title){
  const md = state.model, m = md.metrics;
  const blocks = [];

  blocks.push('<div class="report-section-title">Key Financial Indicators — US Dollars ($)</div>' +
    '<div class="report-kpis">' + kpiTiles().map(t =>
      `<div class="rkpi"><div class="rkpi-label">${escapeHtml(t.label)}</div>` +
      `<div class="rkpi-value${t.value !== null && t.value < 0 ? ' neg' : ''}">${t.na || t.value === null ? '—' : escapeHtml(money(t.value))}</div>` +
      `<div class="rkpi-sub">${t.sub || '&nbsp;'}</div></div>`).join('') + '</div>');

  if (md.hasPrior)
    blocks.push('<div class="report-section-title">Current Period vs Prior Year — Comparative Financials</div>' + comparisonTableHtml('report-compare-table'));

  if (md.months.length){
    const labels = monthlyLabels();
    const revNet = [
      { name: 'Revenue / Income', color: CHART_COLORS.blue, values: md.monthlyRevenue },
      { name: 'Net Income', color: CHART_COLORS.red, values: md.monthlyNet }
    ];
    blocks.push('<div class="report-section-title">Monthly Revenue vs Net Income</div>' + chartLegend(revNet) +
      svgGroupedBars({ series: revNet, labels, height: 230 }));
    const margins = md.monthlyRevenue.map((r, i) => r ? (md.monthlyNet[i] || 0) / Math.abs(r) * 100 : null);
    const marginsOk = margins.filter(v => v !== null).length >= labels.length / 2 && margins.every(v => v === null || Math.abs(v) <= 300);
    blocks.push(marginsOk
      ? '<div class="report-section-title">Net Margin by Month</div>' + svgLineTrend({ values: margins.map(v => v ?? 0), labels, height: 160 })
      : '<div class="report-section-title">Monthly Net Income</div>' +
        svgGroupedBars({ series: [{ name: 'Net Income', color: CHART_COLORS.red, values: md.monthlyNet }], labels, height: 160 }));
  } else if (md.periodSeries.length){
    const ps = md.periodSeries;
    const series = [
      { name: 'Revenue / Income', color: CHART_COLORS.blue, values: ps.map(x => x.income) },
      { name: 'Total Expenses', color: CHART_COLORS.grey, values: ps.map(x => x.expenses) },
      { name: 'Net Income', color: CHART_COLORS.red, values: ps.map(x => x.net) }
    ];
    blocks.push(`<div class="report-section-title">${ps.length > 1 ? 'Revenue vs Net Income by Period' : 'Period Revenue vs Net Income'}</div>` +
      chartLegend(series) + svgGroupedBars({ series, labels: ps.map(x => x.label), height: 220 }));
  }

  if (md.expenseGroups.length){
    const top = md.expenseGroups.slice(0, 10);
    blocks.push(`<div class="report-section-title">Expense Breakdown — Top ${top.length} Categories</div>` +
      '<div class="chart-note">' + escapeHtml(expenseShareNote(md)) + '</div>' +
      svgHBars({ items: top, color: CHART_COLORS.teal }));
  }

  /* Bug 5: a cash-basis client (A/R suppressed) gets no Receivables & Payables block at all. */
  if (!md.suppressAR && (md.arAging || md.apAging)){
    const base = (md.arAging || md.apAging).buckets.map(b => b.label);
    const series = [];
    if (md.arAging) series.push({ name: 'A/R ' + moneyShort(md.arAging.total), color: CHART_COLORS.blue, values: md.arAging.buckets.map(b => b.value) });
    if (md.apAging) series.push({ name: 'A/P ' + moneyShort(md.apAging.total), color: CHART_COLORS.amber, values: md.apAging.buckets.map(b => b.value) });
    blocks.push('<div class="report-section-title">Receivables &amp; Payables Aging</div>' + chartLegend(series) +
      svgGroupedBars({ series, labels: base, height: 210 }));
  } else if (!md.suppressAR && (m.ar !== null || m.ap !== null)){
    const items = [];
    if (m.ar !== null) items.push({ label: 'Accounts Receivable', value: m.ar });
    if (m.ap !== null) items.push({ label: 'Accounts Payable', value: m.ap });
    blocks.push('<div class="report-section-title">Receivables &amp; Payables</div>' + svgHBars({ items, color: CHART_COLORS.teal, showPct: false }));
  }

  if (md.bsComposition.assets.length || md.bsComposition.liabEquity.length){
    blocks.push('<div class="report-section-title">Balance Sheet Composition</div><div class="donut-row">' +
      (md.bsComposition.assets.length ? donutChart({ items: md.bsComposition.assets, title: 'Assets — ' + money(m.assets) }) : '') +
      (md.bsComposition.liabEquity.length ? donutChart({ items: md.bsComposition.liabEquity, title: 'Liabilities & Equity — ' + money(m.totalLE ?? (m.liabilities + m.equity)) }) : '') +
      '</div>');
  }
  const lt = liabilitiesTableHtml('report-mini-table');
  if (lt) blocks.push({ html: '<div class="report-section-title">Liabilities Bifurcation</div>' + lt, orphanGuard: true });

  return paginateBlocks(no, title, blocks);
}

/* Summary table for aging built from an Aging Detail report */
function agingTableHtml(ag){
  const pctOf = v => ag.total ? (v / Math.abs(ag.total) * 100) : null;
  const pc = v => v === null ? '—' : (v < 0 ? '-' : '') + Math.abs(v).toFixed(2) + '%';
  const body = ag.buckets.map(b => `<tr><td>${escapeHtml(b.label)}</td><td class="num">${escapeHtml(acctNumber(b.value))}</td><td class="num">${pc(pctOf(b.value))}</td></tr>`).join('');
  return `<table class="report-mini-table aging-summary-table"><thead><tr><th>Aging Bucket</th><th class="num">Open Balance</th><th class="num">% of Total</th></tr></thead>` +
    `<tbody>${body}<tr class="row-total"><td>Total</td><td class="num">${escapeHtml(acctNumber(ag.total))}</td><td class="num">${pc(ag.total ? 100 : null)}</td></tr></tbody></table>` +
    '<div class="chart-note">Summarised from the aging detail report in the uploaded workbook.</div>';
}

function disclaimerBody(no, title){
  const sig = state.signatory;
  const field = (label, v) =>
    `<div class="sig-field"><span>${label}:</span>${v ? `<b>${escapeHtml(v)}</b>` : '<i class="sig-blank"></i>'}</div>`;
  return sectionHead(no, title) +
    `<div class="disclaimer-text">“${escapeHtml(REPORT_DISCLAIMER)}”</div>` +
    `<div class="signatory">
       <div class="signatory-title">Authorised Signatory</div>
       <div class="sig-line"></div>
       ${field('Name', sig.name)}${field('Title', sig.title)}${field('Date', sig.date)}
     </div>`;
}

function paginateNotesSection(no, title){
  const text = state.notes || '';
  const paras = text ? text.split(/\n/) : [];
  const lineHtml = p => {
    const t = p.trim();
    if (!t) return '<div class="report-note-line">&nbsp;</div>';
    const heading = !/ — /.test(t) && t.length < 70 && /comments$|^notes? to|^(assets|liabilities|equity|income|expenses)$/i.test(t);
    return `<div class="report-note-line${heading ? ' note-heading' : ''}">${escapeHtml(t)}</div>`;
  };
  if (!paras.some(p => p.trim())){
    return [{ orientation: 'portrait', body: sectionHead(no, title) + '<div class="report-empty">No notes were found in the workbook and none have been entered.</div>' }];
  }
  const blocks = paras.map(lineHtml);
  const shell = _measureShell('portrait');
  shell.innerHTML = `<div class="mh1">${sectionHead(no, title)}</div><div class="report-notes">${blocks.join('')}</div>`;
  const h1 = _outerHeight(shell.querySelector('.mh1'));
  const hs = [...shell.querySelectorAll('.report-note-line')].map(el => _outerHeight(el));
  $('#pdfMeasure').innerHTML = '';
  const avail = _bodyBudget('portrait') - h1 - 10;
  const chunks = []; let cur = [], used = 0;
  blocks.forEach((b, i) => {
    if (used + hs[i] > avail && cur.length){ chunks.push(cur); cur = []; used = 0; }
    cur.push(b); used += hs[i];
  });
  if (cur.length) chunks.push(cur);
  return chunks.map((c, i) => ({ orientation: 'portrait', body: sectionHead(no, title, null, i > 0) + `<div class="report-notes">${c.join('')}</div>` }));
}

/* ---------- assembly ---------- */

function reportSections(){
  const md = state.model;
  const sections = [{ id: 'cover', title: 'Cover' }, { id: 'toc', title: 'Table of Contents' }];
  if (md){
    sections.push({ id: 'dash', title: 'Analytical Dashboard' });
    if (md.roles.bs) sections.push({ id: 'bs', title: 'Balance Sheet', sheet: md.roles.bs });
    if (md.roles.bsComparative) sections.push({ id: 'bsComparative', title: 'Balance Sheet — Comparative', sheet: md.roles.bsComparative });
    if (md.roles.tb) sections.push({ id: 'tb', title: 'Trial Balance', sheet: md.roles.tb });
    if (md.roles.plMonthly)     sections.push({ id: 'plMonthly', title: 'Profit and Loss — Monthly', sheet: md.roles.plMonthly });
    if (md.roles.plComparative) sections.push({ id: 'plComparative', title: 'Profit and Loss — Comparative', sheet: md.roles.plComparative });
    if (md.roles.pl)
      sections.push({ id: 'pl', title: 'Profit and Loss', sheet: md.roles.pl });
    if (md.roles.plPercent) sections.push({ id: 'plPercent', title: 'Profit and Loss (% of Income)', sheet: md.roles.plPercent });
    if (md.roles.plClass) sections.push({ id: 'plClass', title: 'Profit and Loss — by Class', sheet: md.roles.plClass });
    if (md.roles.ar && !md.suppressAR) sections.push({ id: 'ar', title: 'A/R Aging Summary', sheet: md.roles.ar, aging: md.arAging && md.arAging.fromDetail ? md.arAging : null });
    if (md.roles.ap && !md.suppressAP) sections.push({ id: 'ap', title: 'A/P Aging Summary', sheet: md.roles.ap, aging: md.apAging && md.apAging.fromDetail ? md.apAging : null });
  }
  sections.push({ id: 'notes', title: 'Notes to Financial Statements' });
  sections.push({ id: 'disc', title: 'Management Purpose Disclaimer' });
  return sections;
}

function buildPages({ forExport = false } = {}){
  const sections = reportSections();
  const md = state.model;
  const pages = [];   // {sectionNo, sectionId, title, body, orientation}

  let contentNo = 0;
  sections.forEach(sec => {
    const no = (sec.id === 'cover' || sec.id === 'toc') ? null : ++contentNo;
    let bodies = [];
    try {
      switch (sec.id){
        case 'cover': bodies = [{ body: coverBody() }]; break;
        case 'toc':   bodies = [{ body: '__TOC__' }]; break;
        case 'dash':
          bodies = md ? dashboardBodies(no, sec.title)
                      : [{ body: sectionHead(no, sec.title) + '<div class="report-empty">Upload a workbook to populate the analytical dashboard.</div>' }];
          break;
        case 'notes': bodies = paginateNotesSection(no, sec.title); break;
        case 'disc':  bodies = [{ body: disclaimerBody(no, sec.title) }]; break;
        default: {
          if (sec.aging){ bodies = [{ body: sectionHead(no, sec.title, md.bsAsOf || state.period) + agingTableHtml(sec.aging) }]; break; }
          const sm = md && md.sheetModels[sec.sheet];
          bodies = sm ? paginateTableSection(no, sec.title, sm, { forExport })
                      : [{ body: sectionHead(no, sec.title) + '<div class="report-empty">No matching worksheet found.</div>' }];
        }
      }
    } catch (e){
      console.error('Report section failed:', sec.id, e);
      bodies = [{ body: sectionHead(no, sec.title) + '<div class="report-empty">This section could not be generated from the uploaded worksheet.</div>' }];
    }
    bodies.forEach(b => pages.push({ sectionNo: no, sectionId: sec.id, title: sec.title, body: b.body, orientation: b.orientation || 'portrait' }));
  });

  /* TOC with real page numbers */
  const tocIdx = pages.findIndex(p => p.body === '__TOC__');
  const ranges = new Map();
  pages.forEach((p, i) => {
    if (!ranges.has(p.sectionId)) ranges.set(p.sectionId, { first: i + 1, last: i + 1, no: p.sectionNo, title: p.title, id: p.sectionId });
    else ranges.get(p.sectionId).last = i + 1;
  });
  const tocRows = [...ranges.values()]
    .filter(x => x.no)
    .map(x => `<a class="toc-item" href="#report-section-${x.id}">` +
              `<span>${x.no}. ${escapeHtml(x.title)}</span>` +
              `<span class="toc-page">${x.first === x.last ? x.first : x.first + ' – ' + x.last}</span></a>`)
    .join('');
  pages[tocIdx].body = sectionHead(null, 'Table of Contents', state.period) + `<div class="toc-list">${tocRows}</div>`;

  const count = pages.length;
  const wm = watermarkHtml();
  const firstPageBySection = new Map();
  pages.forEach((p, i) => { if (!firstPageBySection.has(p.sectionId)) firstPageBySection.set(p.sectionId, i); });
  return pages.map((p, i) => {
    const cover = p.sectionId === 'cover';
    const cls = 'report-page' + (cover ? ' cover-page' : '') + (p.orientation === 'landscape' ? ' landscape' : '');
    const anchorId = firstPageBySection.get(p.sectionId) === i ? ` id="report-section-${p.sectionId}"` : '';
    return {
      sectionNo: p.sectionNo, sectionId: p.sectionId, title: p.title, pageNo: i + 1, orientation: p.orientation,
      html: `<div class="${cls}"${anchorId} data-section="${p.sectionId}">` + (cover ? '' : wm) + p.body + (cover ? '' : pageFooter(i + 1, count)) + '</div>'
    };
  });
}

/* ---------- preview ---------- */

function renderReport(){
  const nav = $('#reportNav'), stage = $('#reportStage');
  if (!nav || !stage) return;
  renderReportOptions();
  const pages = buildPages({ forExport: false });
  window.__reportPages = pages;
  if (state.reportPage >= pages.length) state.reportPage = 0;
  const current = pages[state.reportPage];

  const bySection = new Map();
  pages.forEach((p, i) => {
    if (!bySection.has(p.sectionId))
      bySection.set(p.sectionId, { first: i, last: i, no: p.sectionNo, title: p.title });
    else bySection.get(p.sectionId).last = i;
  });
  nav.innerHTML = [...bySection.values()].map(s =>
    `<button data-i="${s.first}" class="${s.first <= state.reportPage && state.reportPage <= s.last ? 'active' : ''}">` +
    `${s.no ? s.no + '. ' : ''}${escapeHtml(s.title)}<span class="nav-pages">p. ${s.first + 1}${s.last > s.first ? '–' + (s.last + 1) : ''}</span></button>`).join('');
  nav.querySelectorAll('button').forEach(b =>
    b.onclick = () => { state.reportPage = +b.dataset.i; renderReport(); });

  stage.innerHTML =
    `<div class="stage-bar">
       <button class="btn" id="pgPrev" ${state.reportPage === 0 ? 'disabled' : ''}>‹ Prev</button>
       <span class="stage-pageno">Page ${current.pageNo} of ${pages.length} — ${current.sectionNo ? current.sectionNo + '. ' : ''}${escapeHtml(current.title)}</span>
       <button class="btn" id="pgNext" ${state.reportPage === pages.length - 1 ? 'disabled' : ''}>Next ›</button>
       ${current.sectionId === 'notes' ? '<button class="btn primary" id="notesEditBtn">✎ Edit notes</button>' : ''}
     </div>` + current.html;

  stage.querySelectorAll('a.toc-item[href^="#report-section-"]').forEach(link => {
    link.onclick = event => {
      event.preventDefault();
      const sectionId = link.getAttribute('href').replace('#report-section-', '');
      const target = pages.findIndex(page => page.sectionId === sectionId);
      if (target >= 0){ state.reportPage = target; renderReport(); }
    };
  });

  $('#pgPrev').onclick = () => { if (state.reportPage > 0){ state.reportPage--; renderReport(); } };
  $('#pgNext').onclick = () => { if (state.reportPage < pages.length - 1){ state.reportPage++; renderReport(); } };
  const editBtn = $('#notesEditBtn');
  if (editBtn) editBtn.onclick = () => openNotesEditor();
}

/* Basis + watermark controls on the Report Preview page. */
function renderReportOptions(){
  const sel = $('#basisSelect'), wm = $('#watermarkInput'), hint = $('#basisHint');
  if (!sel || !wm) return;
  if (document.activeElement !== sel) sel.value = state.basisOverride || '';
  if (document.activeElement !== wm) wm.value = (state.settings && state.settings.watermark) || '';
  const det = state.model && state.model.basisDetected;
  if (hint) hint.textContent = state.model
    ? (det ? `Detected in workbook: ${det} Basis` : 'Basis not stated in the workbook — defaulting to Accrual Basis; choose Cash if applicable.')
    : '';
}

function openNotesEditor(){
  const stage = $('#reportStage');
  const page = stage.querySelector('.report-page');
  if (!page) return;
  const overlay = document.createElement('div');
  overlay.className = 'notes-overlay';
  overlay.innerHTML =
    `<div class="notes-overlay-card">
       <h3>Notes to Financial Statements</h3>
       <p class="help">Notes are imported from the workbook automatically; edits here replace them for this report.</p>
       <textarea id="notesOverlayText" rows="16">${escapeHtml(state.notes)}</textarea>
       <div class="notes-overlay-actions">
         <button class="btn" id="notesOverlayCancel">Cancel</button>
         <button class="btn primary" id="notesOverlaySave">Save notes</button>
       </div>
     </div>`;
  stage.appendChild(overlay);
  $('#notesOverlayText').focus();
  $('#notesOverlayCancel').onclick = () => overlay.remove();
  $('#notesOverlaySave').onclick = () => {
    state.notes = $('#notesOverlayText').value;
    state.notesManual = true;
    const ne = $('#notesEditor'); if (ne) ne.value = state.notes;
    persist();
    overlay.remove();
    renderReport();
    toast('Notes updated');
  };
}
