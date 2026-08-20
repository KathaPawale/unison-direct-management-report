/* Unison Direct Management Reporting — report builder
 * buildPages({forExport}) → [{sectionNo, sectionId, title, html}]
 * One source of truth for the preview, the PDF and the TOC.
 * Long tables are paginated by real DOM measurement in #pdfMeasure. */
'use strict';

const PAGE_W = 816, PAGE_H = 1056;
const PAGE_PAD_TOP = 50, PAGE_PAD_BOTTOM = 46, FOOTER_RESERVE = 46;
const REPORT_DISCLAIMER =
  'The report we are submitting is for management purpose only. ' +
  'The numbers are based on data submitted and instructed by client.';

function reportLogo(){
  return '<img class="report-logo" src="./assets/unison-logo.svg" alt="Unison Direct">';
}

function sectionHead(no, title, sub, continued = false){
  return reportLogo() +
    `<h2 class="report-title">${no ? no + '. ' : ''}${escapeHtml(title)}` +
    (continued ? ' <span class="report-cont">(continued)</span>' : '') + '</h2>' +
    `<div class="report-sub">${escapeHtml(sub || state.period)}</div>` +
    '<div class="report-rule"></div>';
}

function tableSectionSub(){
  return state.period + '  ·  Amounts in US Dollars ($)';
}

function pageFooter(pageNo, pageCount){
  return `<div class="report-footer"><span class="confidential">CONFIDENTIAL — MANAGEMENT PURPOSE ONLY</span>` +
         `<span>${escapeHtml(state.client)}</span>` +
         `<span>Page ${pageNo} of ${pageCount}</span></div>`;
}

/* ---------- report tables ---------- */

function formatReportCell(v, colType){
  const s = String(v ?? '').trim();
  if (s === '') return '';
  if (colType === 'percent'){
    const n = num(s);
    return isNumericCell(s) ? (n * 100).toFixed(1) + '%' : escapeHtml(s);
  }
  if (isNumericCell(s)) return money(num(s));
  return escapeHtml(s);
}

/* Build thead + row HTML strings for a parsed sheet.
 * Returns {theadHtml, rows:[{html, orphanGuard}]} */
function reportTableParts(sm, { forExport = false } = {}){
  const rows = state.sheets[sm.name] || [];
  const cols = sm.cols.filter(c => c.type !== 'label');
  const showCols = cols.slice(0, 12);
  let thead = '<tr><th class="lbl"></th>' + showCols.map(c =>
    `<th>${escapeHtml(c.label || '')}</th>`).join('') + '</tr>';

  const lineByRow = new Map(sm.lines.map(l => [l.r, l]));
  const out = [];
  const start = sm.headerRow >= 0 ? sm.headerRow + 1 : 0;
  for (let r = start; r < rows.length; r++){
    const row = rows[r] || [];
    const line = lineByRow.get(r);
    if (!line){
      const any = row.some(v => String(v ?? '').trim() !== '');
      if (!any) continue;
    }
    const kind = line ? line.kind : 'account';
    const indent = line ? line.indent : 0;
    const isTotal = kind === 'total' || kind === 'grandTotal' || kind === 'computed';
    const trCls = [
      isTotal ? 'row-total' : '',
      kind === 'grandTotal' || (line && /^total (for )?(assets|liabilities and equity|income|expenses)$|^net income$/i.test(line.label)) ? 'row-grand' : '',
      kind === 'section' ? 'row-section' : ''
    ].filter(Boolean).join(' ');
    let tds = `<td class="lbl" style="padding-left:${8 + indent * 14}px">${escapeHtml(line ? line.label : String(row[0] ?? '').trim())}</td>`;
    for (const c of showCols){
      const v = row[c.idx];
      const n = isNumericCell(v) ? num(v) : null;
      const edited = !forExport &&
        (state.edited.has(sm.name + ':' + r + ':' + c.idx) ||
         state.adjusted.has(sm.name + ':' + r + ':' + c.idx));
      const cls = [(n !== null && n < 0) ? 'neg' : '', edited ? 'cell-edited' : ''].filter(Boolean).join(' ');
      tds += `<td class="val${cls ? ' ' + cls : ''}">${formatReportCell(v, c.type)}</td>`;
    }
    out.push({
      html: `<tr${trCls ? ` class="${trCls}"` : ''}>${tds}</tr>`,
      orphanGuard: kind === 'section'   // don't leave a section header stranded at page bottom
    });
  }
  return { theadHtml: thead, rows: out, colCount: showCols.length + 1 };
}

/* ---------- measurement + pagination ---------- */

function _measureContainer(){
  const el = $('#pdfMeasure');
  el.innerHTML = '';
  return el;
}

/* Split a table section into page bodies that fit the page. */
function paginateTableSection(no, title, sm, opts){
  const { theadHtml, rows, colCount } = reportTableParts(sm, opts);
  if (!rows.length){
    return [sectionHead(no, title) +
      '<div class="report-empty">No matching worksheet was included in the uploaded workbook.</div>'];
  }
  const meas = _measureContainer();
  const shell = document.createElement('div');
  shell.className = 'report-page';
  shell.innerHTML =
    `<div class="mh1">${sectionHead(no, title, tableSectionSub())}</div>` +
    `<div class="mh2">${sectionHead(no, title, tableSectionSub(), true)}</div>` +
    `<table class="report-table"><thead>${theadHtml}</thead><tbody>` +
    rows.map(r => r.html).join('') + '</tbody></table>';
  meas.appendChild(shell);

  const h1 = shell.querySelector('.mh1').offsetHeight;
  const h2 = shell.querySelector('.mh2').offsetHeight;
  const theadH = shell.querySelector('thead').offsetHeight;
  const trs = shell.querySelectorAll('tbody tr');
  const avail = PAGE_H - PAGE_PAD_TOP - PAGE_PAD_BOTTOM - FOOTER_RESERVE;
  const budgetFirst = avail - h1 - theadH - 8;
  const budgetCont  = avail - h2 - theadH - 8;

  const chunks = [];
  let cur = [], used = 0, budget = budgetFirst;
  for (let i = 0; i < rows.length; i++){
    const h = trs[i].offsetHeight || 22;
    if (used + h > budget && cur.length){
      /* orphan rule: pull trailing section headers over to the next page */
      let carry = [];
      while (cur.length && rows[i - 1 - carry.length] && rows[i - 1 - carry.length].orphanGuard)
        carry.unshift(cur.pop());
      if (!cur.length){ cur = carry; carry = []; }   // pathological: keep as is
      chunks.push(cur);
      cur = carry;
      used = carry.reduce((s, r) => s + 22, 0);
      budget = budgetCont;
    }
    cur.push(rows[i]);
    used += h;
  }
  if (cur.length) chunks.push(cur);
  meas.innerHTML = '';

  return chunks.map((chunk, ci) =>
    sectionHead(no, title, tableSectionSub(), ci > 0) +
    `<div class="report-table-wrap"><table class="report-table"><thead>${theadHtml}</thead><tbody>` +
    chunk.map(r => r.html).join('') + '</tbody></table></div>');
}

/* Paragraph-level pagination for the notes page. */
function paginateNotesSection(no, title){
  const text = state.notes || '';
  const paras = text ? text.split(/\n/) : [];
  const inner = paras.length
    ? paras.map(p => `<div class="report-note-line">${p.trim() ? escapeHtml(p) : '&nbsp;'}</div>`).join('')
    : '<div class="report-empty">No management notes entered.</div>';
  const meas = _measureContainer();
  const shell = document.createElement('div');
  shell.className = 'report-page';
  shell.innerHTML = `<div class="mh1">${sectionHead(no, title)}</div><div class="report-notes">${inner}</div>`;
  meas.appendChild(shell);
  const h1 = shell.querySelector('.mh1').offsetHeight;
  const lines = [...shell.querySelectorAll('.report-note-line')];
  const avail = PAGE_H - PAGE_PAD_TOP - PAGE_PAD_BOTTOM - FOOTER_RESERVE - h1;
  if (!lines.length || shell.querySelector('.report-notes').offsetHeight <= avail){
    meas.innerHTML = '';
    return [sectionHead(no, title) + `<div class="report-notes">${inner}</div>`];
  }
  const chunks = []; let cur = [], used = 0;
  lines.forEach((el, i) => {
    const h = el.offsetHeight || 20;
    if (used + h > avail && cur.length){ chunks.push(cur); cur = []; used = 0; }
    cur.push(paras[i]); used += h;
  });
  if (cur.length) chunks.push(cur);
  meas.innerHTML = '';
  return chunks.map((chunk, ci) =>
    sectionHead(no, title, null, ci > 0) +
    `<div class="report-notes">${chunk.map(p =>
      `<div class="report-note-line">${p.trim() ? escapeHtml(p) : '&nbsp;'}</div>`).join('')}</div>`);
}

/* ---------- section bodies ---------- */

function coverBody(){
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
    <div class="cover-hero"></div>
    <div class="cover-band">
      <div class="cover-kicker">Management Report</div>
      <h1>${escapeHtml(state.client)}</h1>
      <div class="cover-period">${escapeHtml(state.period)}</div>
    </div>
    <div class="cover-body">
      <div class="cover-meta">
        <div><span>Prepared by</span><b>Unison Direct GCC INC</b></div>
        <div><span>Report date</span><b>${escapeHtml(today)}</b></div>
        <div><span>Basis</span><b>Amounts in US Dollars ($)</b></div>
      </div>
      <div class="cover-confidential">CONFIDENTIAL — Prepared for management use only</div>
    </div>`;
}

function kpiTilesHtml(){
  const m = state.model.metrics, p = state.model.prior;
  const grossMargin = m.income ? (m.gross / m.income * 100) : 0;
  const netMargin = m.income ? (m.net / m.income * 100) : 0;
  const chip = (cur, pri) => {
    if (pri === null || pri === undefined || pri === 0) return '';
    const d = (cur - pri) / Math.abs(pri) * 100;
    const up = d >= 0;
    return `<span class="kchip ${up ? 'good' : 'bad'}">${up ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}% vs PY</span>`;
  };
  const tiles = [
    ['Revenue / Income', money(m.income), chip(m.income, p.income)],
    ['Gross Profit', money(m.gross), pct(grossMargin) + ' gross margin'],
    ['Net Income', money(m.net), (m.net < 0 ? 'Net loss · ' : '') + pct(netMargin) + ' net margin'],
    ['Cash / Bank', money(m.bank), chip(m.bank, p.bank)],
    ['A/R Total', money(m.ar), chip(m.ar, p.ar)],
    ['A/P Total', money(m.ap), chip(m.ap, p.ap)]
  ];
  return '<div class="report-kpis">' + tiles.map(([label, value, sub]) =>
    `<div class="rkpi"><div class="rkpi-label">${escapeHtml(label)}</div>` +
    `<div class="rkpi-value${String(value).includes('-') ? ' neg' : ''}">${escapeHtml(value)}</div>` +
    `<div class="rkpi-sub">${sub || '&nbsp;'}</div></div>`).join('') + '</div>';
}

function dashboardBodies(no, title){
  const md = state.model;
  const labels = md.months.length ? md.months.map(x => x.short) :
    MONTHS_FALLBACK.slice(0, Math.max(md.monthlyRevenue.length, 6));
  const revNet = [
    { name: 'Revenue / Income', color: CHART_COLORS.blue, values: md.monthlyRevenue },
    { name: 'Net Income', color: CHART_COLORS.red, values: md.monthlyNet }
  ];
  const margins = md.monthlyRevenue.map((r, i) =>
    r ? (md.monthlyNet[i] || 0) / Math.abs(r) * 100 : null);
  const marginsOk = margins.filter(v => v !== null).length >= labels.length / 2 &&
    margins.every(v => v === null || Math.abs(v) <= 300);

  const pageA =
    sectionHead(no, title) +
    '<div class="report-section-title">Key Financial Indicators — Amounts in US Dollars ($)</div>' +
    kpiTilesHtml() +
    '<div class="report-section-title">Monthly Revenue vs Net Income</div>' +
    chartLegend(revNet) +
    svgGroupedBars({ series: revNet, labels, height: 240 }) +
    (marginsOk
      ? '<div class="report-section-title">Net Margin by Month</div>' +
        svgLineTrend({ values: margins.map(v => v ?? 0), labels, height: 165 })
      : '<div class="report-section-title">Monthly Net Income</div>' +
        svgGroupedBars({ series: [{ name: 'Net Income', color: CHART_COLORS.red, values: md.monthlyNet }], labels, height: 165 }));

  const bodies = [pageA];

  /* Page B — CY vs PY + expense breakdown */
  const p = md.prior, m = md.metrics;
  let pageB = sectionHead(no, title, null, true);
  if (p.income !== null){
    const cyPy = [
      { name: 'Current period', color: CHART_COLORS.navy,
        values: [m.income, m.gross, m.expenses, m.net] },
      { name: 'Prior year', color: CHART_COLORS.grey,
        values: [p.income ?? 0, p.gross ?? 0, p.expenses ?? 0, p.net ?? 0] }
    ];
    pageB += '<div class="report-section-title">Current Period vs Prior Year</div>' +
      chartLegend(cyPy) +
      svgGroupedBars({ series: cyPy, labels: ['Total Income', 'Gross Profit', 'Total Expenses', 'Net Income'], height: 235 });
  }
  if (md.expenseGroups.length){
    const top = md.expenseGroups.slice(0, 10);
    pageB += '<div class="report-section-title">Expense Breakdown — Top ' + top.length + ' Categories</div>' +
      svgHBars({ items: top, totalForPct: m.expenses || null, color: CHART_COLORS.teal });
  }
  if (pageB.length > 900) bodies.push(pageB);   // only if it has real content

  /* Page C — aging buckets + balance sheet composition */
  let pageC = sectionHead(no, title, null, true);
  let hasC = false;
  if (md.arAging || md.apAging){
    const buckets = (md.arAging || md.apAging).buckets.map(b => b.label);
    const series = [];
    if (md.arAging) series.push({ name: 'A/R ' + moneyShort(md.arAging.total), color: CHART_COLORS.blue, values: md.arAging.buckets.map(b => b.value) });
    if (md.apAging) series.push({ name: 'A/P ' + moneyShort(md.apAging.total), color: CHART_COLORS.amber, values: md.apAging.buckets.map(b => b.value) });
    pageC += '<div class="report-section-title">Receivables & Payables Aging</div>' +
      chartLegend(series) +
      svgGroupedBars({ series, labels: buckets, height: 235 });
    hasC = true;
  }
  if (md.bsComposition.assets.length){
    pageC += '<div class="report-section-title">Balance Sheet Composition</div><div class="donut-row">' +
      donutChart({ items: md.bsComposition.assets, title: 'Assets — ' + money(md.metrics.assets) }) +
      donutChart({ items: md.bsComposition.liabEquity, title: 'Liabilities & Equity — ' + money(md.metrics.liabilities + md.metrics.equity) }) +
      '</div>';
    hasC = true;
  }
  if (hasC) bodies.push(pageC);
  return bodies;
}

function disclaimerBody(no, title){
  const sig = state.signatory;
  const field = (label, v) =>
    `<div class="sig-field"><span>${label}:</span>${v ? `<b>${escapeHtml(v)}</b>` : '<i class="sig-blank"></i>'}</div>`;
  return sectionHead(no, title) +
    `<div class="disclaimer-text">“${escapeHtml(REPORT_DISCLAIMER)}”</div>` +
    '<div class="disclaimer-note">This report is confidential and intended solely for management use.</div>' +
    `<div class="signatory">
       <div class="signatory-title">Authorised Signatory</div>
       <div class="sig-line"></div>
       ${field('Name', sig.name)}${field('Title', sig.title)}${field('Date', sig.date)}
     </div>`;
}

/* ---------- assembly ---------- */

function reportSections(){
  const md = state.model;
  const sections = [{ id: 'cover', title: 'Cover' }, { id: 'toc', title: 'Table of Contents' }];
  if (md){
    sections.push({ id: 'dash', title: 'Analytical Dashboard' });
    if (md.roles.plMonthly)     sections.push({ id: 'plMonthly', title: 'Profit and Loss — Monthly', sheet: md.roles.plMonthly });
    if (md.roles.plComparative) sections.push({ id: 'plComparative', title: 'Profit and Loss — Comparative', sheet: md.roles.plComparative });
    if (!md.roles.plMonthly && !md.roles.plComparative && md.roles.pl)
      sections.push({ id: 'pl', title: 'Profit and Loss', sheet: md.roles.pl });
    if (md.roles.bs) sections.push({ id: 'bs', title: 'Balance Sheet', sheet: md.roles.bs });
    if (md.roles.ar) sections.push({ id: 'ar', title: 'A/R Aging Summary', sheet: md.roles.ar });
    if (md.roles.ap) sections.push({ id: 'ap', title: 'A/P Aging Summary', sheet: md.roles.ap });
  }
  sections.push({ id: 'notes', title: 'Notes to Financial Statements' });
  sections.push({ id: 'disc', title: 'Management Purpose Disclaimer' });
  return sections;
}

function buildPages({ forExport = false } = {}){
  const sections = reportSections();
  const md = state.model;
  const pages = [];   // {sectionNo, sectionId, title, body}

  /* Cover and Table of Contents are front matter and carry no section number;
     the numbered sequence starts at 1 on the first content section. */
  let contentNo = 0;
  sections.forEach(sec => {
    const no = (sec.id === 'cover' || sec.id === 'toc') ? null : ++contentNo;
    let bodies = [];
    switch (sec.id){
      case 'cover': bodies = [coverBody()]; break;
      case 'toc':   bodies = ['__TOC__']; break;
      case 'dash':
        bodies = md ? dashboardBodies(no, sec.title)
                    : [sectionHead(no, sec.title) + '<div class="report-empty">Upload a workbook to populate the analytical dashboard.</div>'];
        break;
      case 'notes': bodies = paginateNotesSection(no, sec.title); break;
      case 'disc':  bodies = [disclaimerBody(no, sec.title)]; break;
      default: {
        const sm = md && md.sheetModels[sec.sheet];
        bodies = sm ? paginateTableSection(no, sec.title, sm, { forExport })
                    : [sectionHead(no, sec.title) + '<div class="report-empty">No matching worksheet found.</div>'];
      }
    }
    bodies.forEach(body => pages.push({ sectionNo: no, sectionId: sec.id, title: sec.title, body }));
  });

  /* TOC with real page numbers */
  const tocIdx = pages.findIndex(p => p.body === '__TOC__');
  const ranges = new Map();
  pages.forEach((p, i) => {
    if (!ranges.has(p.sectionId)) ranges.set(p.sectionId, { first: i + 1, last: i + 1, no: p.sectionNo, title: p.title });
    else ranges.get(p.sectionId).last = i + 1;
  });
  const tocRows = [...ranges.values()]
    .filter(x => x.title !== 'Cover' && x.title !== 'Table of Contents')
    .map(x => `<div class="toc-item"><span>${x.no}. ${escapeHtml(x.title)}</span>` +
              `<span class="toc-page">${x.first === x.last ? x.first : x.first + '–' + x.last}</span></div>`)
    .join('');
  pages[tocIdx].body = sectionHead(null, 'Table of Contents', state.client) +
    `<div class="toc-list">${tocRows}</div>`;

  const count = pages.length;
  return pages.map((p, i) => ({
    sectionNo: p.sectionNo, sectionId: p.sectionId, title: p.title, pageNo: i + 1,
    html: `<div class="report-page${p.sectionId === 'cover' ? ' cover-page' : ''}" data-section="${p.sectionId}">` +
          p.body + pageFooter(i + 1, count) + '</div>'
  }));
}

/* ---------- preview ---------- */

function renderReport(){
  const nav = $('#reportNav'), stage = $('#reportStage');
  if (!nav || !stage) return;
  const pages = buildPages({ forExport: false });
  window.__reportPages = pages;
  if (state.reportPage >= pages.length) state.reportPage = 0;
  const current = pages[state.reportPage];

  /* nav: one button per section with its page range */
  const bySection = new Map();
  pages.forEach((p, i) => {
    if (!bySection.has(p.sectionId))
      bySection.set(p.sectionId, { first: i, last: i, no: p.sectionNo, title: p.title });
    else bySection.get(p.sectionId).last = i;
  });
  nav.innerHTML = [...bySection.values()].map(s =>
    `<button data-i="${s.first}" class="${current.sectionId !== 'x' && s.first <= state.reportPage && state.reportPage <= s.last ? 'active' : ''}">` +
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

  $('#pgPrev').onclick = () => { if (state.reportPage > 0){ state.reportPage--; renderReport(); } };
  $('#pgNext').onclick = () => { if (state.reportPage < pages.length - 1){ state.reportPage++; renderReport(); } };
  const editBtn = $('#notesEditBtn');
  if (editBtn) editBtn.onclick = () => openNotesEditor();
}

/* In-preview notes editor (writes state.notes, persists, stays on the page). */
function openNotesEditor(){
  const stage = $('#reportStage');
  const page = stage.querySelector('.report-page');
  if (!page) return;
  const overlay = document.createElement('div');
  overlay.className = 'notes-overlay';
  overlay.innerHTML =
    `<div class="notes-overlay-card">
       <h3>Notes to Financial Statements</h3>
       <p class="help">These notes appear as section ${page.dataset.section === 'notes' ? window.__reportPages.find(p => p.sectionId === 'notes').sectionNo : ''} of the report.</p>
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
    const ne = $('#notesEditor'); if (ne) ne.value = state.notes;
    persist();
    overlay.remove();
    renderReport();
    toast('Notes updated');
  };
}
