/* Unison Direct Management Reporting — PDF and Excel exports */
'use strict';

/* ---------- PDF ---------- */

async function _ensureCoverImage(){
  try {
    const img = new Image();
    img.src = './assets/cover-bg.jpg';
    await img.decode();
    return true;
  } catch (e) { return false; }
}

function _reportFileBase(){
  return (state.client || 'Client').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Client';
}

async function savePdf(open = false){
  if (!hasData()){ toast('Upload a workbook first.'); return; }
  if (!window.jspdf || !window.jspdf.jsPDF){
    toast('PDF library did not load. Refresh the page and try again.');
    return;
  }
  if (typeof window.html2canvas !== 'function'){
    toast('PDF renderer did not load. Refresh the page and try again.');
    return;
  }
  await _ensureCoverImage();
  const pages = buildPages({ forExport: true });
  if (!pages.length){ toast('Nothing to export yet.'); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(9,25,45,.72);z-index:9999;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:600';
  overlay.textContent = 'Generating PDF\u2026';
  document.body.appendChild(overlay);
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;top:' + window.scrollY + 'px;left:0;width:1056px;z-index:9998;background:#fff';
  document.body.appendChild(host);
  const failedPages = [];
  const sectionFirstPdfPage = new Map();
  let tocEntries = null;
  let tocPdfPage = -1;
  const PAGE_PT_W = 612, PAGE_PT_H = 792;
  try {
    const { jsPDF } = window.jspdf;
    let pdf = null;
    for (let i = 0; i < pages.length; i++){
      const land = pages[i].orientation === 'landscape';
      overlay.textContent = 'Generating PDF \u2014 page ' + (i + 1) + ' of ' + pages.length;
      try {
        host.style.width = (land ? PAGE_H : PAGE_W) + 'px';
        host.innerHTML = pages[i].html;
        const el = host.firstElementChild;
        if (!el){ failedPages.push(i + 1); continue; }
        el.style.margin = '0';
        el.style.boxShadow = 'none';
        const sid = pages[i].sectionId;
        if (sid === 'toc' && !tocEntries){
          const pageRect = el.getBoundingClientRect();
          const domW = pageRect.width || PAGE_W;
          const domH = pageRect.height || (land ? PAGE_W : PAGE_H);
          const scaleX = (land ? PAGE_PT_H : PAGE_PT_W) / domW;
          const scaleY = (land ? PAGE_PT_W : PAGE_PT_H) / domH;
          tocEntries = [...el.querySelectorAll('a.toc-item[href^="#report-section-"]')].map(a => {
            const r = a.getBoundingClientRect();
            return {
              sectionId: a.getAttribute('href').replace('#report-section-', ''),
              x: (r.left - pageRect.left) * scaleX,
              y: (r.top - pageRect.top) * scaleY,
              w: r.width * scaleX,
              h: r.height * scaleY
            };
          });
        }
        let canvas;
        try {
          canvas = await html2canvas(el, { scale: 1.6, useCORS: true, logging: false, backgroundColor: '#ffffff', width: land ? PAGE_H : PAGE_W, height: land ? PAGE_W : PAGE_H, windowWidth: land ? PAGE_H : PAGE_W });
        } catch (e1){
          canvas = await html2canvas(el, { scale: 1.0, useCORS: true, logging: false, backgroundColor: '#ffffff', width: land ? PAGE_H : PAGE_W, height: land ? PAGE_W : PAGE_H, windowWidth: land ? PAGE_H : PAGE_W });
        }
        const orientation = land ? 'landscape' : 'portrait';
        if (!pdf) pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation });
        else pdf.addPage('letter', orientation);
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, land ? 792 : 612, land ? 612 : 792);
        const pdfPageIndex = pdf.internal.getNumberOfPages() - 1;
        if (sid && !sectionFirstPdfPage.has(sid)) sectionFirstPdfPage.set(sid, pdfPageIndex);
        if (sid === 'toc') tocPdfPage = pdfPageIndex;
      } catch (pageErr){
        console.error('PDF page ' + (i + 1) + ' skipped:', pageErr);
        failedPages.push(i + 1);
      }
    }
    if (!pdf){ toast('PDF could not be generated: no pages rendered.'); return; }
    if (tocEntries && tocEntries.length && tocPdfPage >= 0){
      try {
        pdf.setPage(tocPdfPage + 1);
        for (const t of tocEntries){
          const target = sectionFirstPdfPage.get(t.sectionId);
          if (target === undefined) continue;
          pdf.link(t.x, t.y, t.w, t.h, { pageNumber: target + 1 });
        }
      } catch (linkErr){ console.warn('TOC hyperlinks could not be added:', linkErr); }
    }
    const base = _reportFileBase().slice(0, 80);
    const filename = base + '-Management-Report.pdf';
    if (open){
      window.open(URL.createObjectURL(pdf.output('blob')), '_blank');
    } else {
      try { pdf.save(filename); }
      catch (saveErr){
        const url = URL.createObjectURL(pdf.output('blob'));
        const a = document.createElement('a'); a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    }
    const donePages = pages.length - failedPages.length;
    toast(failedPages.length ? ('PDF ready \u2014 ' + donePages + ' of ' + pages.length + ' pages (skipped: ' + failedPages.join(', ') + ')') : ('PDF ready \u2014 ' + pages.length + ' pages'));
    return pdf;
  } catch (e) {
    console.error('PDF generation failed:', e);
    toast('PDF generation failed: ' + (e && (e.message || e.toString()) || 'unknown error'));
  } finally {
    host.remove();
    overlay.remove();
  }
}

/* ---------- styled Excel report ---------- */

const XL = {
  navy: '0B2F59', blue: '2597D4', light: 'EAF2FB', line: 'D5DDE7',
  /* Strict accounting-format rules enforced for every Excel export: values use the accounting
   * pattern, negatives are red, zero prints as a dash, and percent cells preserve red negatives. */
  moneyFmt: '_-* #,##0.00_-;[Red]_-* (#,##0.00)_-;_-* "-"_-;_-@_-',
  totalFmt: '_-* #,##0.00_-;[Red]_-* (#,##0.00)_-;_-* 0.00_-;_-@_-',
  pctFmt: '0.00%;[Red](0.00%)'
};
const XL_STYLES = {
  title:   { font: { bold: true, sz: 20, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: XL.navy } }, alignment: { vertical: 'center', horizontal: 'left' } },
  subtitle:{ font: { sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: XL.navy } }, alignment: { vertical: 'center' } },
  head:    { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: XL.navy } }, alignment: { horizontal: 'right' }, border: { bottom: { style: 'thin', color: { rgb: XL.line } } } },
  headL:   { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: XL.navy } }, alignment: { horizontal: 'left' } },
  section: { font: { bold: true, sz: 10, color: { rgb: XL.navy } } },
  money:   { numFmt: XL.moneyFmt, alignment: { horizontal: 'right' }, font: { sz: 10 } },
  pctCell: { numFmt: '0.00%;[Red](0.00%)', alignment: { horizontal: 'right' }, font: { sz: 10 } },
  totalLbl:{ font: { bold: true, sz: 10 }, border: { top: { style: 'thin', color: { rgb: XL.navy } } } },
  totalVal:{ numFmt: XL.totalFmt, alignment: { horizontal: 'right' }, font: { bold: true, sz: 10 },
             border: { top: { style: 'thin', color: { rgb: XL.navy } } }, fill: { fgColor: { rgb: XL.light } } },
  grandLbl:{ font: { bold: true, sz: 10.5, color: { rgb: XL.navy } }, border: { top: { style: 'double', color: { rgb: XL.navy } } } },
  grandVal:{ numFmt: XL.totalFmt, alignment: { horizontal: 'right' }, font: { bold: true, sz: 10.5, color: { rgb: XL.navy } },
             border: { top: { style: 'double', color: { rgb: XL.navy } }, bottom: { style: 'thin', color: { rgb: XL.navy } } }, fill: { fgColor: { rgb: XL.light } } },
  plain:   { font: { sz: 10 } },
  wrap:    { font: { sz: 10 }, alignment: { wrapText: true, vertical: 'top' } }
};

const XL_THIN = { style: 'thin', color: { rgb: 'C9D5E3' } };
const XL_BORDER_ALL = { top: XL_THIN, bottom: XL_THIN, left: XL_THIN, right: XL_THIN };

/* Every cell written through here gets a visible thin border (the explicit total / grand-total
 * borders in the style win) and a consistent font. */
function _wsSetCell(ws, r, c, v, s, t, { border = true } = {}){
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = { v };
  cell.t = t || (typeof v === 'number' ? 'n' : 's');
  const style = { ...(s || {}) };
  if (border) style.border = { ...XL_BORDER_ALL, ...(style.border || {}) };
  style.font = { name: 'Arial', sz: 10, ...(style.font || {}) };
  cell.s = style;
  if (style.numFmt) cell.z = style.numFmt;
  ws[addr] = cell;
  const ref = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r, c }, e: { r, c } };
  ref.s.r = Math.min(ref.s.r, r); ref.s.c = Math.min(ref.s.c, c);
  ref.e.r = Math.max(ref.e.r, r); ref.e.c = Math.max(ref.e.c, c);
  ws['!ref'] = XLSX.utils.encode_range(ref);
}

function _sheetNameSafe(wb, name){
  let base = name.replace(/[\\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let n = base, i = 2;
  while (wb.SheetNames.includes(n)) n = (base.slice(0, 28) + ' ' + i++).slice(0, 31);
  return n;
}

function _decorateSheet(ws, sheetKind, freezeRow = 5, freezeCol = 1){
  const tabColors = {
    cover: '0B2F59', summary: '1D6FB8', bs: '0FA5A5', bsComparative: '0FA5A5', tb: '7A5FAA',
    plMonthly: 'B54B8E', plComparative: 'B54B8E', pl: 'B54B8E', plPercent: 'B54B8E',
    ar: 'E28C1B', ap: 'C93438', notes: '6D7887', disc: '2F4A6B'
  };
  ws['!tabColor'] = { rgb: tabColors[sheetKind] || '0B2F59' };
  if (freezeRow || freezeCol){
    ws['!views'] = [{ xSplit: freezeCol, ySplit: freezeRow,
      topLeftCell: XLSX.utils.encode_cell({ r: freezeRow, c: freezeCol }),
      activePane: 'bottomRight', state: 'frozen' }];
    ws['!freeze'] = { xSplit: freezeCol, ySplit: freezeRow };
  }
}

function _modelSheetToWs(sm, title){
  const ws = {};
  const rows = state.sheets[sm.name] || [];
  const cols = displayColumns(sm);
  const last = Math.max(cols.length, 1);
  const center = { horizontal: 'center', vertical: 'center', wrapText: true };
  const sub = (sm.role === 'bs' || sm.role === 'bsComparative') && state.model.bsAsOf ? state.model.bsAsOf : state.period;

  /* Centered heading block: company, statement, period */
  _wsSetCell(ws, 0, 0, state.client, { ...XL_STYLES.title, font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, alignment: center }, null, { border: false });
  _wsSetCell(ws, 1, 0, title || ROLE_LABELS[sm.role] || sm.name, { ...XL_STYLES.subtitle, font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, alignment: center }, null, { border: false });
  _wsSetCell(ws, 2, 0, tableSectionSub(sm), { ...XL_STYLES.subtitle, alignment: center }, null, { border: false });
  for (let c = 1; c <= last; c++){
    _wsSetCell(ws, 0, c, '', XL_STYLES.title, null, { border: false });
    _wsSetCell(ws, 1, c, '', XL_STYLES.subtitle, null, { border: false });
    _wsSetCell(ws, 2, c, '', XL_STYLES.subtitle, null, { border: false });
  }
  const HEAD_R = 4;
  _wsSetCell(ws, HEAD_R, 0, 'Particulars', { ...XL_STYLES.headL, alignment: { horizontal: 'left', vertical: 'center' } });
  cols.forEach((c, i) => _wsSetCell(ws, HEAD_R, i + 1, _headLabel(c), { ...XL_STYLES.head, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }));

  /* Percent columns stored as fractions (every value within ±1) keep that scale for the total row too. */
  const fractionCols = new Set(cols.filter(c => c.type === 'percent' && sm.lines.every(line => {
    const v = (rows[line.r] || [])[c.idx];
    const n = isPercentText(v) ? null : parseAmount(v);
    return n === null || Math.abs(n) <= 1;
  })).map(c => c.idx));

  let out = HEAD_R + 1;
  for (const line of sm.lines){
    const row = rows[line.r] || [];
    const kind = line.kind;
    const key = line.mkey || labelKey(line.label);
    const isGrand = kind === 'grandTotal' ||
      /^total (for )?(assets|liabilities and (stockholders |shareholders |owners |members |partners )?(equity|capital)|income|revenues?|expenses?)$/.test(key) ||
      (sm.role !== 'bs' && /^net (income|profit|loss|income loss)$/.test(key));
    const isTotal = kind === 'total' || kind === 'computed' || isGrand;
    const lblStyle = isGrand ? XL_STYLES.grandLbl : isTotal ? XL_STYLES.totalLbl :
                     kind === 'section' ? XL_STYLES.section : XL_STYLES.plain;
    _wsSetCell(ws, out, 0, line.label, { ...lblStyle, alignment: { horizontal: 'left', vertical: 'center', indent: Math.min(line.indent, 10) } });
    cols.forEach((c, i) => {
      const v = row[c.idx];
      const n = parseAmount(v);
      const base = isGrand ? XL_STYLES.grandVal : isTotal ? XL_STYLES.totalVal : c.type === 'percent' ? XL_STYLES.pctCell : XL_STYLES.money;
      const style = { ...base, alignment: { horizontal: 'right', vertical: 'center' } };
      if (c.type === 'percent' && (n !== null || isPercentText(v))){
        const pv = isPercentText(v) ? parsePercentText(v) / 100 : (fractionCols.has(c.idx) || Math.abs(n) < 1 ? n : n / 100);
        _wsSetCell(ws, out, i + 1, pv, { ...style, numFmt: '0.00%;[Red](0.00%)' });
      } else if (n !== null) _wsSetCell(ws, out, i + 1, n, { ...style, font: { ...(style.font || {}), ...(n < 0 ? { color: { rgb: 'C93438' } } : {}) } });
      else if (cellText(v) !== '') _wsSetCell(ws, out, i + 1, cellText(v), { ...XL_STYLES.plain, alignment: { horizontal: 'right' } });
      else _wsSetCell(ws, out, i + 1, '', style);
    });
    out++;
  }
  const widest = Math.max(30, ...sm.lines.map(l => l.label.length + Math.min(l.indent, 10) * 2));
  ws['!cols'] = [{ wch: 34 }, ...cols.map(c => ({ wch: c.type === 'percent' ? 12 : 14 }))];
  ws['!rows'] = [{ hpt: 26 }, { hpt: 20 }, { hpt: 18 }, { hpt: 6 }, { hpt: 30 }];
  ws['!merges'] = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: last } }));
  _decorateSheet(ws, sm.role, HEAD_R + 1, 1);
  return ws;
}

function _rawSheetToWs(rows){
  const ws = {};
  const data = rows || [];
  const width = Math.max(1, ...data.map(row => (row || []).length));
  const headerRow = data.findIndex(row => (row || []).filter(v => cellText(v) !== '').length >= 2);
  const freezeRow = headerRow >= 0 ? headerRow + 1 : 1;
  data.forEach((row, r) => {
    for (let c = 0; c < width; c++){
      const value = (row || [])[c] ?? '';
      const text = cellText(value);
      const isHeader = r === headerRow;
      const n = parseAmount(value);
      const style = isHeader ? (c === 0 ? XL_STYLES.headL : XL_STYLES.head) :
        n !== null ? XL_STYLES.money : XL_STYLES.wrap;
      if (n !== null && !isHeader) _wsSetCell(ws, r, c, n, style);
      else _wsSetCell(ws, r, c, text, style);
    }
  });
  ws['!cols'] = Array.from({ length: width }, (_, c) => ({
    wch: Math.min(48, Math.max(14, ...data.map(row => String((row || [])[c] ?? '').length + 2)))
  }));
  _decorateSheet(ws, 'uploaded', freezeRow, width > 1 ? 1 : 0);
  return ws;
}

function downloadReportExcel(){
  if (!hasData()){ toast('Upload a workbook first.'); return; }
  const md = state.model;
  const wb = XLSX.utils.book_new();

  /* Cover */
  const cover = {};
  _wsSetCell(cover, 1, 0, 'MANAGEMENT REPORT', { ...XL_STYLES.title, font: { ...XL_STYLES.title.font, sz: 26 } });
  _wsSetCell(cover, 2, 0, state.client, { ...XL_STYLES.subtitle, font: { sz: 16, bold: true, color: { rgb: 'FFFFFF' } } });
  _wsSetCell(cover, 3, 0, state.period, XL_STYLES.subtitle);
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 7; c++) _wsSetCell(cover, r, c, '', r === 1 ? XL_STYLES.title : XL_STYLES.subtitle);
  _wsSetCell(cover, 5, 0, 'Prepared by Unison Direct GCC INC', XL_STYLES.section);
  _wsSetCell(cover, 6, 0, 'CONFIDENTIAL — Prepared for management use only', { font: { bold: true, sz: 10, color: { rgb: 'C93438' } } });
  _wsSetCell(cover, 7, 0, 'Basis: ' + reportBasis(), XL_STYLES.plain);
  _wsSetCell(cover, 8, 0, 'Currency: US Dollars ($)', XL_STYLES.plain);
  cover['!cols'] = [{ wch: 52 }, ...Array(7).fill({ wch: 12 })];
  cover['!merges'] = [1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: 7 } }));
  _decorateSheet(cover, 'cover', 0, 0);
  XLSX.utils.book_append_sheet(wb, cover, 'Cover');

  /* Analytical Summary */
  const s = {};
  const m = md.metrics, p = md.prior;
  _wsSetCell(s, 0, 0, state.client + ' — Analytical Summary', XL_STYLES.title);
  for (let c = 1; c <= 3; c++) _wsSetCell(s, 0, c, '', XL_STYLES.title);
  s['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  _wsSetCell(s, 1, 0, state.period + ' · ' + reportBasis() + ' · Amounts in US Dollars ($)', { font: { italic: true, sz: 9, color: { rgb: '5B6B7F' } } }, null, { border: false });
  const showPrior = !!md.hasPrior || Object.values(p || {}).some(v => v !== null && v !== undefined);
  (showPrior ? ['Metric', String(md.currentLabel || 'Current Period'), String(md.priorLabel || 'Prior Period'), 'Variance'] : ['Metric', String(md.currentLabel || 'Current Period')])
    .forEach((h, i) => _wsSetCell(s, 2, i, h, i === 0 ? XL_STYLES.headL : XL_STYLES.head, 's'));
  const rowsKpi = [
    ['Revenue / Income', m.income, p.income], ['Gross Profit', m.gross, p.gross],
    ['Total Expenses', m.expenses, p.expenses], ['Net Income', m.net, p.net],
    ['Cash / Bank', m.bank, p.bank], ['A/R Total', m.ar, p.ar], ['A/P Total', m.ap, p.ap],
    ['Total Assets', m.assets, p.assets], ['Total Liabilities', m.liabilities, null], ['Total Equity', m.equity, null]
  ];
  rowsKpi.forEach((row, i) => {
    _wsSetCell(s, 3 + i, 0, row[0], XL_STYLES.plain);
    if (row[1] === null || row[1] === undefined) _wsSetCell(s, 3 + i, 1, 'Not applicable', { ...XL_STYLES.plain, alignment: { horizontal: 'right' } });
    else _wsSetCell(s, 3 + i, 1, row[1], XL_STYLES.money);
    if (showPrior && row[2] !== null && row[2] !== undefined){
      _wsSetCell(s, 3 + i, 2, row[2], XL_STYLES.money);
      _wsSetCell(s, 3 + i, 3, (row[1] ?? 0) - row[2], XL_STYLES.money);
    }
  });
  let nextRow = 3 + rowsKpi.length + 2;
  /* Monthly series table */
  if (md.months.length){
    const base = nextRow + 1;
    _wsSetCell(s, base - 1, 0, 'Monthly Performance', XL_STYLES.section, null, { border: false });
    _wsSetCell(s, base, 0, 'Month', XL_STYLES.headL);
    md.months.forEach((mo, i) => _wsSetCell(s, base, i + 1, mo.label, XL_STYLES.head));
    _wsSetCell(s, base + 1, 0, 'Revenue / Income', XL_STYLES.plain);
    _wsSetCell(s, base + 2, 0, 'Net Income', XL_STYLES.plain);
    md.monthlyRevenue.forEach((v, i) => _wsSetCell(s, base + 1, i + 1, v, XL_STYLES.money));
    md.monthlyNet.forEach((v, i) => _wsSetCell(s, base + 2, i + 1, v, XL_STYLES.money));
    nextRow = base + 4;
  }
  const table = (titleText, head, data) => {
    _wsSetCell(s, nextRow, 0, titleText, XL_STYLES.section, null, { border: false });
    head.forEach((h, i) => _wsSetCell(s, nextRow + 1, i, h, i === 0 ? XL_STYLES.headL : XL_STYLES.head));
    data.forEach((row, ri) => row.forEach((v, ci) => {
      const isPct = ci === 2;
      const isTot = /^total\b/i.test(String(row[0] || ''));
      const valStyle = isTot ? (isPct ? { ...XL_STYLES.totalVal, numFmt: '0.00%;[Red](0.00%)' } : XL_STYLES.totalVal) : (isPct ? XL_STYLES.pctCell : XL_STYLES.money);
      if (v === null || v === undefined) _wsSetCell(s, nextRow + 2 + ri, ci, '', isTot ? XL_STYLES.totalLbl : XL_STYLES.plain);
      else if (typeof v === 'number') _wsSetCell(s, nextRow + 2 + ri, ci, isPct ? v / 100 : v, valStyle);
      else _wsSetCell(s, nextRow + 2 + ri, ci, v, isTot ? XL_STYLES.totalLbl : XL_STYLES.plain);
    }));
    nextRow += data.length + 4;
  };
  if (md.expenseGroups.length)
    table('Expense Breakdown (Expense ÷ Total Expenses × 100)', ['Expense Category', 'Amount', '% of Total Expenses'],
      md.expenseGroups.map(x => [x.label, x.value, x.pct]).concat([['Total Expenses', md.expenseTotal, 100]]));
  if (md.bsComposition.assets.length)
    table('Balance Sheet Composition — Assets', ['Asset Type', 'Amount', '% of Total Assets'],
      md.bsComposition.assets.map(x => [x.label, x.value, x.pct]).concat([['Total Assets', m.assets, 100]]));
  if (md.liabilityBifurcation.length)
    table('Liabilities Bifurcation', ['Liabilities & Equity', 'Amount', '% of Total Liabilities & Equity'],
      md.liabilityBifurcation.map(x => [x.label, x.value, x.pct]).concat(m.totalLE !== null ? [['Total Liabilities & Equity', m.totalLE, 100]] : []));
  s['!cols'] = [{ wch: 34 }, ...Array(Math.max(md.months.length, 3)).fill({ wch: 16 })];
  _decorateSheet(s, 'summary', 5, 1);
  XLSX.utils.book_append_sheet(wb, s, 'Analytical Summary');

  /* Financial statement sheets */
  const order = [['bs', 'Balance Sheet'], ['bsComparative', 'Balance Sheet — Comparative'], ['tb', 'Trial Balance'], ['plMonthly', 'Profit and Loss — Monthly'], ['plComparative', 'Profit and Loss — Comparative'],
                 ['pl', 'Profit and Loss'], ['plPercent', 'Profit and Loss (% of Income)'], ['ar', 'A/R Aging Summary'], ['ap', 'A/P Aging Summary']];
  for (const [role, title] of order){
    const name = md.roles[role];
    if (!name || (role === 'pl' && (md.roles.plMonthly || md.roles.plComparative))) continue;
    if ((role === 'ar' && md.suppressAR) || (role === 'ap' && md.suppressAP)) continue;
    const ag = role === 'ar' ? md.arAging : role === 'ap' ? md.apAging : null;
    if (ag && ag.fromDetail){
      const ws = {};
      [state.client, title, md.bsAsOf || state.period].forEach((t, r) => {
        _wsSetCell(ws, r, 0, t, { font: { bold: true, sz: r === 1 ? 13 : 11, color: { rgb: XL.navy } }, alignment: { horizontal: 'center' } }, null, { border: false });
      });
      ws['!merges'] = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: 2 } }));
      ['Aging Bucket', 'Open Balance', '% of Total'].forEach((h, i) => _wsSetCell(ws, 4, i, h, i ? XL_STYLES.head : XL_STYLES.headL));
      ag.buckets.forEach((b, i) => {
        _wsSetCell(ws, 5 + i, 0, b.label, XL_STYLES.plain);
        _wsSetCell(ws, 5 + i, 1, b.value, XL_STYLES.money);
        _wsSetCell(ws, 5 + i, 2, ag.total ? b.value / Math.abs(ag.total) : 0, XL_STYLES.pctCell);
      });
      const tr = 5 + ag.buckets.length;
      _wsSetCell(ws, tr, 0, 'Total', XL_STYLES.totalLbl);
      _wsSetCell(ws, tr, 1, ag.total, XL_STYLES.totalVal);
      _wsSetCell(ws, tr, 2, 1, { ...XL_STYLES.totalVal, numFmt: XL.pctFmt });
      ws['!cols'] = [{ wch: 34 }, { wch: 14 }, { wch: 12 }];
      _decorateSheet(ws, role, 5, 1);
      XLSX.utils.book_append_sheet(wb, ws, _sheetNameSafe(wb, ROLE_LABELS[role] || name));
      continue;
    }
    const modelWs = _modelSheetToWs(md.sheetModels[name], title);
    if (role === 'tb'){
      const tbWs = modelWs;
      _decorateSheet(tbWs, 'tb', 5, 1);
      XLSX.utils.book_append_sheet(wb, tbWs, _sheetNameSafe(wb, ROLE_LABELS[role] || name));
    } else {
      XLSX.utils.book_append_sheet(wb, modelWs, _sheetNameSafe(wb, ROLE_LABELS[role] || name));
    }
  }

  /* Notes + disclaimer */
  const notes = {};
  _wsSetCell(notes, 0, 0, (state.client || 'Client') + ' — Notes to Financial Statements',
    { ...XL_STYLES.title, font: { ...XL_STYLES.title.font, sz: 14 } });
  _wsSetCell(notes, 0, 1, '', XL_STYLES.title);
  _wsSetCell(notes, 1, 0, (state.period || '') + '  ·  ' + reportBasis(),
    { font: { italic: true, sz: 10, color: { rgb: '5B6B7F' } }, alignment: { horizontal: 'left' } });
  _wsSetCell(notes, 1, 1, '', {});
  _wsSetCell(notes, 3, 0, 'Line Item / Category', XL_STYLES.headL);
  _wsSetCell(notes, 3, 1, 'Note', XL_STYLES.head);
  const noteLines = (state.notes || '').split('\n').map(line => line.trim()).filter(Boolean);
  const isHeading = line => !/ — /.test(line) && line.length < 70 &&
    /(comments|^notes? to|^(assets|liabilities|equity|income|expenses|receivables|payables|bank accounts|current assets|fixed assets|current liabilities|long.?term liabilities))/i.test(line);
  let rr = 4;
  if (noteLines.length === 0){
    _wsSetCell(notes, rr, 0, 'No notes were found in the workbook.', XL_STYLES.wrap);
    _wsSetCell(notes, rr, 1, '', XL_STYLES.wrap);
  } else {
    for (const line of noteLines){
      if (isHeading(line)){
        _wsSetCell(notes, rr, 0, line, XL_STYLES.headL);
        _wsSetCell(notes, rr, 1, '', XL_STYLES.head);
      } else if (line.includes(' — ')){
        const [label, ...rest] = line.split(' — ');
        _wsSetCell(notes, rr, 0, label.trim(), XL_STYLES.wrap);
        _wsSetCell(notes, rr, 1, rest.join(' — ').trim(), XL_STYLES.wrap);
      } else {
        _wsSetCell(notes, rr, 0, '', XL_STYLES.wrap);
        _wsSetCell(notes, rr, 1, line, XL_STYLES.wrap);
      }
      rr++;
    }
  }
  notes['!cols'] = [{ wch: 34 }, { wch: 78 }];
  notes['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  _decorateSheet(notes, 'notes', 5, 1);
  XLSX.utils.book_append_sheet(wb, notes, 'Notes');

  const disc = {};
  _wsSetCell(disc, 0, 0, 'Management Purpose Disclaimer', XL_STYLES.title);
  _wsSetCell(disc, 2, 0, REPORT_DISCLAIMER, XL_STYLES.wrap);
  _wsSetCell(disc, 4, 0, 'Authorised Signatory', XL_STYLES.section);
  _wsSetCell(disc, 5, 0, 'Name: '  + (state.signatory.name  || '________________________'), XL_STYLES.plain);
  _wsSetCell(disc, 6, 0, 'Title: ' + (state.signatory.title || '________________________'), XL_STYLES.plain);
  _wsSetCell(disc, 7, 0, 'Date: '  + (state.signatory.date  || '________________________'), XL_STYLES.plain);
  disc['!cols'] = [{ wch: 110 }];
  _decorateSheet(disc, 'disc', 0, 0);
  XLSX.utils.book_append_sheet(wb, disc, 'Disclaimer');

  XLSX.writeFile(wb, _reportFileBase() + '-Management-Report.xlsx');
  toast('Excel report downloaded');
}

/* ---------- raw data workbook (as-uploaded + edits) ---------- */

function downloadDataExcel(){
  if (!hasData()){ toast('Upload a workbook first.'); return; }
  const wb = XLSX.utils.book_new();
  Object.entries(state.sheets).forEach(([n, r]) =>
    XLSX.utils.book_append_sheet(wb, _rawSheetToWs(r), _sheetNameSafe(wb, n)));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(
    [['Notes to Financial Statements'], [state.notes || '']]), _sheetNameSafe(wb, 'Management Notes'));
  XLSX.writeFile(wb, _reportFileBase() + '-Management-Data.xlsx');
  toast('Data workbook downloaded');
}

function downloadCurrentSheetCsv(){
  if (!state.active || !state.sheets[state.active]){ toast('No sheet selected.'); return; }
  const rows = state.sheets[state.active].map(row => [...(row || [])]);
  const sm = state.model && state.model.sheetModels[state.active];
  if (sm){
    const cols = displayColumns(sm);
    rows.forEach((row, ri) => {
      if (ri === sm.headerRow) return;
      cols.forEach(c => {
        if (c.type === 'percent' && isPercentText(row[c.idx])){ row[c.idx] = percentText(parsePercentText(row[c.idx])); return; }
        const n = parseAmount(row[c.idx]);
        if (n === null) return;
        if (c.type === 'percent'){
          row[c.idx] = percentText(Math.abs(n) < 1 ? n * 100 : n);
        } else row[c.idx] = accounting(n);
      });
    });
  }
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows));
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = state.active.replace(/[^a-z0-9]+/gi, '-') + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
