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
  /* Each statement shows the period line its own worksheet states, as uploaded ("As of July 31, 2026", "For the month
   * ended July 31, 2026"); only the dash spacing is normalised (row 5). */
  const own = sm ? sheetOwnPeriod(state.sheets[sm.name] || [], sm) : '';
  if (own) return formatPeriodText(own);
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
/* The uploaded first-column heading ("Account", "Particulars", "Description"), or "Particulars" when it is blank. */
function firstColumnHeading(sm){
  const row = sm && sm.headerRow >= 0 ? (state.sheets[sm.name] || [])[sm.headerRow] || [] : [];
  const t = (sm ? sm.cols.filter(c => c.type === 'label').map(c => cellText(row[c.idx])).filter(Boolean) : []).join(' ');
  return t || 'Particulars';
}

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

/* Column headings are shown exactly as uploaded; a generated label is used only for a column with no heading. */
function _headLabel(c){
  if (c.rawLabel) return c.rawLabel;
  if (c.label) return c.label;
  if (c.type === 'current') return state.model && state.model.currentLabel !== 'Current Period' ? state.model.currentLabel : 'Amount';
  if (c.type === 'prior') return 'Prior Period';
  return '';
}

/* Build thead + row HTML strings for a parsed sheet.
 * Returns {theadHtml, rows:[{html, orphanGuard}], colCount, valueCols} */
/* "Uncategorized Income / Expense / Asset …" lines: kept in Excel and on the app's statement pages, left out of the PDF. */
const UNCATEGORIZED_LINE_RE = /^(total (for )?)?uncategori[sz]ed\b/;

function reportTableParts(sm, { forExport = false, cols = null, compact = false, skipZeros = null, hideUncategorized = false } = {}){
  const rows = state.sheets[sm.name] || [];
  const showCols = cols || displayColumns(sm);
  /* Amount columns are at most 22% wide, so a one- or two-column statement keeps its figures near their labels. */
  let labelPct = showCols.length > 10 ? 20 : showCols.length > 6 ? 24 : showCols.length > 3 ? 34 : 46;
  let valPct = showCols.length ? (100 - labelPct) / showCols.length : 0;
  if (valPct > 22){ valPct = 22; labelPct = 100 - valPct * showCols.length; }
  const colgroup = `<colgroup><col style="width:${labelPct}%">` + showCols.map(() => `<col style="width:${valPct.toFixed(3)}%">`).join('') + '</colgroup>';
  const thead = '<tr><th class="lbl">' + escapeHtml(firstColumnHeading(sm)) + '</th>' + showCols.map(c =>
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
    if (hideUncategorized && UNCATEGORIZED_LINE_RE.test(line.mkey || labelKey(line.label))) continue;
    const row = rows[line.r] || [];
    const kind = line.kind;
    const isTotal = kind === 'total' || kind === 'grandTotal' || kind === 'computed';
    const grand = kind === 'grandTotal' ||
      /^total (for )?(assets|liabilities and (stockholders |shareholders |owners |members |partners )?(equity|capital)|income|revenues?|expenses?)$/.test(line.mkey || labelKey(line.label)) ||
      (sm.role !== 'bs' && NET_LINE_RE.test(line.mkey || labelKey(line.label)));
    const trCls = [isTotal ? 'row-total' : '', grand ? 'row-grand' : '', kind === 'section' ? 'row-section' : ''].filter(Boolean).join(' ');
    let tds = `<td class="lbl" style="padding-left:${6 + Math.min(line.indent, 6) * 11}px">${escapeHtml(line.label)}</td>`;
    const pctRow = isPercentRowLabel(line.label), pctRowFrac = pctRow && percentRowIsFraction(row, showCols.map(c => c.idx));
    for (const c of showCols){
      const v = row[c.idx];
      const n = parseAmount(v);
      const edited = !forExport &&
        (state.edited.has(sm.name + ':' + line.r + ':' + c.idx) || state.adjusted.has(sm.name + ':' + line.r + ':' + c.idx));
      const negPct = parsePercentText(v);
      const cls = [(n !== null && n < 0) ? 'neg' : (negPct !== null && negPct < 0) ? 'neg' : '', edited ? 'cell-edited' : ''].filter(Boolean).join(' ');
      tds += `<td class="val${cls ? ' ' + cls : ''}">${pctRow
        ? formatReportCell(v, 'percent', { fraction: pctRowFrac })
        : formatReportCell(v, c.type, { compact, zeroDash: kind === 'account', fraction: c.type === 'percent' ? fractionCols.has(c.idx) : undefined })}</td>`;
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
/* The one font size of every statement table in the PDF (the P&L size), see paginateTableSection. */
const STATEMENT_FONT_PX = 12;

/* Splits table rows into page-sized chunks; a section heading row is never left alone at the foot of a page. */
function _chunkRows(rows, heights, budgetFirst, budgetCont){
  const chunks = [];
  let cur = [], curH = [], used = 0, budget = budgetFirst;
  for (let i = 0; i < rows.length; i++){
    const h = heights[i];
    if (used + h > budget && cur.length){
      const carry = [], carryH = [];
      while (cur.length > 1 && cur[cur.length - 1].orphanGuard){ carry.unshift(cur.pop()); carryH.unshift(curH.pop()); }
      chunks.push(cur);
      cur = carry; curH = carryH;
      used = carryH.reduce((s, x) => s + x, 0);
      budget = budgetCont;
    }
    cur.push(rows[i]); curH.push(h);
    used += h;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

/* The largest font (≤ STATEMENT_FONT_PX) at which a statement's table shows every figure uncut on its page width. */
function _fittingFontPx(sm){
  const cols = displayColumns(sm);
  if (!sm.lines.length || !cols.length) return STATEMENT_FONT_PX;
  const orientation = sm.role === 'plMonthly' || cols.length >= 12 || (sm.role === 'tb' && cols.length > 4) || cols.length > WIDE_TABLE_COLS ? 'landscape' : 'portrait';
  const parts = reportTableParts(sm, { forExport: true, cols, compact: cols.length > 8 });
  const shell = _measureShell(orientation);
  shell.innerHTML = `<table class="report-table grow${cols.length > 8 ? ' compact' : ''}${orientation === 'landscape' ? ' wide' : ''}">${parts.colgroup}<thead>${parts.theadHtml}</thead><tbody>` +
    parts.rows.map(r => r.html).join('') + '</tbody></table>';
  const tbl = shell.querySelector('table');
  const overflowing = () => [...tbl.querySelectorAll('td.val, thead th')].some(td => td.scrollWidth > td.clientWidth + 0.5);
  let fs = STATEMENT_FONT_PX;
  tbl.style.setProperty('--grow-fs', fs + 'px');
  while (overflowing() && fs > 6){ fs -= 0.25; tbl.style.setProperty('--grow-fs', fs + 'px'); }
  $('#pdfMeasure').innerHTML = '';
  return fs;
}

/* One font size for the whole report: the largest size every statement table (up to 10 columns) fits at. Wider tables
 * (12 months + Total) may step down further so no figure is cut off. */
function reportStatementFontPx(sections){
  const md = state.model;
  let fs = STATEMENT_FONT_PX;
  for (const sec of sections){
    const sm = sec.sheet && !sec.aging && !sec.index && md ? md.sheetModels[sec.sheet] : null;
    if (!sm || displayColumns(sm).length > 10) continue;
    try { fs = Math.min(fs, _fittingFontPx(sm)); } catch (e){ /* measurement unavailable: keep the standard size */ }
  }
  return fs;
}

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
    /* One font size for every statement table (user, 2026-10-01: Balance Sheet and P&L must not differ) — STATEMENT_FONT_PX.
     * Row 21: a column is never cut off — only a table too wide for that size (a 12-month P&L) steps down until every
     * cell fits (floor 6px). */
    const tbl = shell.querySelector('table');
    const overflowing = () => [...tbl.querySelectorAll('td.val, thead th')].some(td => td.scrollWidth > td.clientWidth + 0.5);
    tbl.classList.add('grow');
    let fs = Math.min(STATEMENT_FONT_PX, opts.fontPx || STATEMENT_FONT_PX);
    tbl.style.setProperty('--grow-fs', fs + 'px');
    while (overflowing() && fs > 6){ fs -= 0.25; tbl.style.setProperty('--grow-fs', fs + 'px'); }
    tableCls += ' grow';
    const fitAttr = ` style="--grow-fs:${fs}px"`;
    const avail = _bodyBudget(orientation);
    const layout = () => {
      const h1 = _outerHeight(shell.querySelector('.mh1'));
      const h2 = _outerHeight(shell.querySelector('.mh2'));
      const theadH = shell.querySelector('thead').getBoundingClientRect().height;
      const heights = [...shell.querySelectorAll('tbody tr')].map(tr => tr.getBoundingClientRect().height || 18);
      return _chunkRows(parts.rows, heights, avail - h1 - theadH - 6, avail - h2 - theadH - 6);
    };
    const chunks = layout();
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

function dashboardBodies(no, title, opts = {}){
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

  const pdfGroups = md.expenseGroups;
  if (pdfGroups.length){
    const top = pdfGroups.slice(0, 10);
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

  /* Balance Sheet Composition: only on the Analytical Dashboard with the other analytical diagrams, never on the Balance
   * Sheet pages (user, 2026-10-08). The Liabilities Bifurcation always stays on the dashboard. */
  const comp = bsCompositionHtml(md);
  if (comp) blocks.push({ html: comp });
  const lt = liabilitiesTableHtml('report-mini-table');
  if (lt) blocks.push({ html: '<div class="report-section-title">Liabilities Bifurcation</div>' + lt, orphanGuard: true });

  if (opts.blocksOnly) return blocks.map(b => typeof b === 'string' ? b : b.html);
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

/* The statements the report prints (PDF, Table of Contents, Excel). They appear in the uploaded workbook's tab order
 * (reportSections sorts them), after the Disclaimer and Dashboard and before the Notes. */
const REPORT_STATEMENT_ORDER = [
  ['plPercent', 'Profit and Loss (% of Income)'], ['plMonthly', 'Profit and Loss — Monthly'], ['plComparative', 'Profit and Loss — Comparative'],
  ['bs', 'Balance Sheet'], ['bsComparative', 'Balance Sheet — Comparative'],
  ['ar', 'A/R Aging Summary'], ['ap', 'A/P Aging Summary'], ['tb', 'Trial Balance']
];
const REPORT_TRAILING_ORDER = [['pl', 'Profit and Loss'], ['plClass', 'Profit and Loss — by Class']];

/* Strict rule: a statement keeps the heading its uploaded sheet gives it ("Statement of Activities" stays "Statement of
 * Activities", never "Profit and Loss") in the PDF, Table of Contents, Excel and the Financial Statements page. The title is
 * the line above the column headings that names the statement — never the company name or the period line. */
const SOURCE_TITLE_WORDS = /statement|profit|loss|\bp ?(&|and) ?l\b|\bpnl\b|income|balance|trial|ag(e)?ing|aged|activities|financial position|operations|earnings|revenue|expenditure|\baccount\b|debtors|creditors|receivable|payable|cash flow|position|condition|net assets|summary|report/i;
function sourceStatementTitle(sm){
  if (!sm) return '';
  const rows = state.sheets[sm.name] || [];
  const top = Math.min(sm.headerRow >= 0 ? sm.headerRow : 6, 8, rows.length);
  const client = normLabel(state.client || '');
  for (let r = 0; r < top; r++){
    for (const v of rows[r] || []){
      if (typeof v !== 'string') continue;
      const t = cellText(v).replace(/\s+/g, ' ');
      if (!t || t.length > 90 || isMetaText(t) || _periodLike(t) || parseAmount(t) !== null) continue;
      if (client && normLabel(t) === client) continue;
      if (SOURCE_TITLE_WORDS.test(t)) return t;
    }
  }
  /* No statement wording ("Management Accounts", "Monthly Summary"): the first other text line above the headings. */
  for (let r = 0; r < top; r++){
    for (const v of rows[r] || []){
      if (typeof v !== 'string') continue;
      const t = cellText(v).replace(/\s+/g, ' ');
      if (!t || t.length < 3 || t.length > 90 || !/[a-z]/i.test(t) || isMetaText(t) || _periodLike(t) || parseAmount(t) !== null) continue;
      if (client && normLabel(t) === client) continue;
      if (/^(aging by|by due date|basis|currency|amounts? in)\b/i.test(t)) continue;
      return t;
    }
  }
  return '';
}

/* A tab name that says nothing ("Sheet1", "Tab 2") is not a heading. */
function isGenericTabName(n){
  return /^(sheet|tab|page|table|data|worksheet|report)\s*\d*$/i.test(cellText(n));
}

/* Strict heading rule (user, 2026-09-30): a statement's heading is its sheet (tab) name exactly as uploaded — "PL_MoM",
 * "BS_Comparative", "Class wise SOA". Only a generic tab ("Sheet1") falls back to the sheet's own title line, then the
 * standard name. */
function sheetHeading(sm, standard){
  if (!sm) return standard;
  if (!isGenericTabName(sm.name) && cellText(sm.name)) return cellText(sm.name);
  return sourceStatementTitle(sm) || standard;
}

/* Notes: the uploaded notes sheet's own heading, else "Notes to Financial Statements". */
function notesHeading(md){
  const sm = md && md.roles.notes ? md.sheetModels[md.roles.notes] : null;
  return sm ? sheetHeading(sm, 'Notes to Financial Statements') : 'Notes to Financial Statements';
}

/* Section title for each captured statement: the sheet's own heading exactly as uploaded (title line, else tab name),
 * else — only for a generic tab such as "Sheet1" — the standard name. */
function reportStatementTitles(md){
  const out = {};
  if (!md) return out;
  const all = [...REPORT_STATEMENT_ORDER, ...REPORT_TRAILING_ORDER];
  for (const [role, std] of all){
    const sm = md.roles[role] ? md.sheetModels[md.roles[role]] : null;
    out[role] = sheetHeading(sm, std);
  }
  for (const n of reportExtraSheets(md)) out['sheet:' + n] = sheetHeading(md.sheetModels[n], n);
  return out;
}

function _roleSection(md, role, title){
  if (!md.roles[role] || skipReportSection(md, role)) return null;
  if ((role === 'ar' && md.suppressAR) || (role === 'ap' && md.suppressAP)) return null;
  const ag = role === 'ar' ? md.arAging : role === 'ap' ? md.apAging : null;
  title = reportStatementTitles(md)[role] || title;
  return { id: role, title, sheet: md.roles[role], ...(role === 'ar' || role === 'ap' ? { aging: ag && ag.fromDetail ? ag : null } : {}) };
}

/* A full-period P&L next to the "% of Income" statement repeats its amounts (the data checks confirm they agree),
 * so the report prints the % of Income statement only (row 38: fewer pages). */
function skipReportSection(md, role){
  return role === 'pl' && !!md.roles.plPercent;
}

/* Strict rule: every uploaded worksheet with figures reaches the report. A sheet that is not one of the standard
 * statements (and not transaction detail such as a General Ledger) is printed as its own section, named after its tab,
 * with its figures exactly as uploaded. */
function isTransactionDetailSheet(name, rows){
  const t = normLabel(name + ' ' + (rows || []).slice(0, 4).flat().filter(v => typeof v === 'string').join(' '));
  return /ledger|journal|detail|transaction|register/.test(t);
}

/* ---------- index sheet and transaction lists ---------- */

/* An index sheet ("Summary"): lists the workbook's other sheets — "1 | Profit and Loss(Comparative) | Click here to view!"
 * — with an optional "NOTE :" line. Each entry is matched to the uploaded sheet it names ("Uncategorized Expenses" →
 * the "Uncategorized Exp" tab). */
function indexSheetEntries(name, rows){
  const others = Object.keys(state.sheets || {}).filter(n => n !== name);
  const match = t => {
    const k = normLabel(t);
    if (k.length < 3 || /^click here/.test(k)) return null;
    return others.find(o => normLabel(o) === k) ||
      others.find(o => { const a = normLabel(o); return a.length >= 5 && (k.startsWith(a) || a.startsWith(k)); }) || null;
  };
  const entries = [], notes = [];
  for (const row of rows || []){
    const cells = (row || []).map(cellText);
    const noteAt = cells.findIndex(c => /^notes?\s*:/i.test(c) || /^notes?$/i.test(c));
    if (noteAt >= 0){
      const text = cells.slice(noteAt).join(' ').replace(/^notes?\s*:?\s*/i, '').trim();
      if (text) notes.push(text);
      continue;
    }
    for (const c of cells){
      const sheet = match(c);
      if (sheet){ entries.push({ no: cells.find(x => /^\d+\.?$/.test(x)) || String(entries.length + 1), label: c, sheet }); break; }
    }
  }
  return { entries, notes };
}

function isIndexSheet(name, rows){
  return isIndexLikeSheet(name, rows, Object.keys(state.sheets || {}));
}

/* A transaction list ("Uncategorized Expenses", "Invoice required": Transaction date | Type | Name | Description | Amount |
 * Comment). It goes into the Excel report (Excel only, like uncategorized lines); a General Ledger / journal does not. */
const LISTING_DATE_HEAD_RE = /^(date|txn date|transaction date|posting date|invoice date|due date|payment date)$/i;
function isLedgerSheet(name, rows){
  return /ledger|journal/.test(normLabel(name + ' ' + (rows || []).slice(0, 4).flat().filter(v => typeof v === 'string').join(' ')));
}

function reportListingSheets(md){
  if (!md) return [];
  const captured = new Set(Object.values(md.roles).filter(Boolean));
  return Object.keys(state.sheets).filter(n => {
    const sm = md.sheetModels[n], rows = state.sheets[n] || [];
    if (captured.has(n) || !sm || isIndexSheet(n, rows) || isLedgerSheet(n, rows)) return false;
    const hr = listingHeaderRow(sm, rows);
    if (hr < 0) return false;
    const header = (rows[hr] || []).map(cellText);
    const dated = header.some(h => LISTING_DATE_HEAD_RE.test(h));
    if (!dated && !isTransactionDetailSheet(n, rows)) return false;
    return rows.slice(hr + 1).some(row => (row || []).some(v => cellText(v) !== ''));
  });
}

/* The uploaded index sheet, if any (detection gives it the summary role; it is not a statement). */
function reportIndexSheet(md){
  return md && md.roles.summary && state.sheets[md.roles.summary] ? md.roles.summary : null;
}

/* A transaction list's heading row: the row holding its date heading ("Transaction date"), else the parser's. */
function listingHeaderRow(sm, rows){
  const r = (rows || []).slice(0, 30).findIndex(row => (row || []).some(v => LISTING_DATE_HEAD_RE.test(cellText(v))));
  return r >= 0 ? r : sm.headerRow;
}

/* The index as a PDF page: No. | Particulars, then the note. */
function indexSectionBody(no, title, sheet, fontPx = STATEMENT_FONT_PX){
  const idx = indexSheetEntries(sheet, state.sheets[sheet] || []);
  /* The PDF index lists only sheets that are in the PDF (transaction lists and uncategorized sheets are Excel only). */
  const inPdf = new Set(reportSections().filter(s => s.sheet && !s.index).map(s => s.sheet));
  const entries = idx.entries.filter(e => inPdf.has(e.sheet)), notes = idx.notes;
  const rows = entries.map(e => `<tr><td class="val" style="text-align:center">${escapeHtml(e.no)}</td><td class="lbl">${escapeHtml(e.label)}</td></tr>`).join('');
  return sectionHead(no, title) +
    `<div class="report-table-wrap"><table class="report-table grow" style="--grow-fs:${fontPx}px"><colgroup><col style="width:12%"><col style="width:88%"></colgroup>` +
    `<thead><tr><th style="text-align:center">No.</th><th class="lbl">Particulars</th></tr></thead><tbody>${rows}</tbody></table></div>` +
    notes.map(t => `<div class="report-notes" style="margin-top:14px"><b>NOTE:</b> ${escapeHtml(t)}</div>`).join('');
}

function reportExtraSheets(md){
  if (!md) return [];
  const captured = new Set(Object.values(md.roles).filter(Boolean));
  return Object.keys(state.sheets).filter(n => {
    const sm = md.sheetModels[n], rows = state.sheets[n] || [];
    if (captured.has(n) || !sm || !sm.lines.length || isTransactionDetailSheet(n, rows) || isIndexSheet(n, rows)) return false;
    /* A dated listing (Date column) is transaction detail too, whatever its name. */
    if (sm.cols.some(c => /^(date|txn date|transaction date|posting date)$/i.test(cellText(c.label)))) return false;
    return displayColumns(sm).length > 0 && rows.some(row => (row || []).some(v => parseAmount(v) !== null));
  });
}

/* Position of an uploaded sheet in the workbook (its tab order). */
function workbookIndex(name){
  const i = Object.keys(state.sheets || {}).indexOf(name);
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
}

function reportSections(){
  const md = state.model;
  const sections = [{ id: 'cover', title: 'Cover' }, { id: 'toc', title: 'Table of Contents' }];
  /* The uploaded index sheet ("Summary") opens the report, as it opens the user's workbook (user, 2026-09-30); then the
   * Disclaimer and Dashboard, the other sheets in workbook order, and the Notes last. */
  const idx = md ? reportIndexSheet(md) : null;
  if (idx) sections.push({ id: 'index', title: isGenericTabName(idx) ? 'Summary' : cellText(idx), sheet: idx, index: true });
  if (md){
    sections.push({ id: 'dash', title: 'Analytical Dashboard' });
    /* Statements follow the uploaded workbook's tab order (user, 2026-09-30); Disclaimer and Dashboard first, Notes last. */
    const statements = [];
    for (const [role, title] of [...REPORT_STATEMENT_ORDER, ...REPORT_TRAILING_ORDER]){ const s = _roleSection(md, role, title); if (s) statements.push(s); }
    const titles = reportStatementTitles(md);
    reportExtraSheets(md).forEach((n, i) => statements.push({ id: 'extra' + (i + 1), title: titles['sheet:' + n] || sheetHeading(md.sheetModels[n], n), sheet: n }));
    statements.sort((a, b) => workbookIndex(a.sheet) - workbookIndex(b.sheet));
    sections.push(...statements);
  }
  /* Notes, then the Management Purpose Disclaimer on the last page (user, 2026-10-07). */
  sections.push({ id: 'notes', title: notesHeading(md) });
  sections.push({ id: 'disc', title: 'Management Purpose Disclaimer' });
  return sections;
}

/* The dashboard's graphs only (each chart with its title and legend — no tiles, tables, headers or footers), for the
 * Excel Analytical Summary. Includes the Balance Sheet Composition wherever the PDF places it. */
function dashboardGraphBlocks(){
  const md = state.model;
  if (!md) return [];
  return dashboardBodies(0, 'Analytical Dashboard', { blocksOnly: true })
    .filter(html => /<svg\b/.test(html) || /donut/.test(html));
}

/* The Balance Sheet Composition diagram (both donuts), as one block — shown only on the Analytical Dashboard. */
function bsCompositionHtml(md){
  if (!md || !(md.bsComposition.assets.length || md.bsComposition.liabEquity.length)) return '';
  const m = md.metrics, size = 168;
  return `<div class="bs-composition-block"><div class="report-section-title">Balance Sheet Composition</div><div class="donut-row">` +
    (md.bsComposition.assets.length ? donutChart({ items: md.bsComposition.assets, size, title: 'Assets — ' + money(m.assets) }) : '') +
    (md.bsComposition.liabEquity.length ? donutChart({ items: md.bsComposition.liabEquity, size, title: 'Liabilities & Equity — ' + money(m.totalLE ?? (m.liabilities + m.equity)) }) : '') +
    '</div></div>';
}

function buildPages({ forExport = false } = {}){
  const sections = reportSections();
  const md = state.model;
  const reportFontPx = reportStatementFontPx(sections);   // one table font for the whole report
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
        case 'index': bodies = [{ body: indexSectionBody(no, sec.title, sec.sheet, reportFontPx) }]; break;
        default: {
          if (sec.aging){ bodies = [{ body: sectionHead(no, sec.title, md.bsAsOf || state.period) + `<div style="--aging-fs:${reportFontPx}px">` + agingTableHtml(sec.aging) + '</div>' }]; break; }
          const sm = md && md.sheetModels[sec.sheet];
          bodies = sm ? paginateTableSection(no, sec.title, sm, { forExport, fontPx: reportFontPx })
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
