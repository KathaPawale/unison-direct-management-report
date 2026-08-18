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
  await _ensureCoverImage();
  const pages = buildPages({ forExport: true });   // clean: no red edit highlights

  /* Progress overlay (also hides the capture host) */
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(9,25,45,.72);z-index:9999;' +
    'display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:600';
  overlay.textContent = 'Generating PDF\u2026';
  document.body.appendChild(overlay);

  /* Capture host: in the document flow at the top of the page so html2canvas
     measures real coordinates (off-screen fixed containers render blank). */
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;top:' + window.scrollY + 'px;left:0;width:816px;z-index:9998;background:#fff';
  document.body.appendChild(host);

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
    for (let i = 0; i < pages.length; i++){
      overlay.textContent = 'Generating PDF \u2014 page ' + (i + 1) + ' of ' + pages.length;
      host.innerHTML = pages[i].html;
      const el = host.firstElementChild;
      el.style.margin = '0';
      el.style.boxShadow = 'none';
      const canvas = await html2canvas(el, { scale: 1.6, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 612, 792);
    }
    const filename = _reportFileBase() + '-Management-Report.pdf';
    if (open){
      window.open(URL.createObjectURL(pdf.output('blob')), '_blank');
    } else {
      pdf.save(filename);
    }
    toast('PDF ready \u2014 ' + pages.length + ' pages');
    return pdf;
  } catch (e) {
    console.error(e);
    toast('PDF generation failed: ' + (e.message || e));
  } finally {
    host.remove();
    overlay.remove();
  }
}

/* ---------- styled Excel report ---------- */

const XL = {
  navy: '0B2F59', blue: '2597D4', light: 'EAF2FB', line: 'D5DDE7',
  moneyFmt: '#,##0.00;[Red](#,##0.00)',
  pctFmt: '0.0%'
};
const XL_STYLES = {
  title:   { font: { bold: true, sz: 20, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: XL.navy } }, alignment: { vertical: 'center', horizontal: 'left' } },
  subtitle:{ font: { sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: XL.navy } }, alignment: { vertical: 'center' } },
  head:    { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: XL.navy } }, alignment: { horizontal: 'right' }, border: { bottom: { style: 'thin', color: { rgb: XL.line } } } },
  headL:   { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: XL.navy } }, alignment: { horizontal: 'left' } },
  section: { font: { bold: true, sz: 10, color: { rgb: XL.navy } } },
  money:   { numFmt: '#,##0.00;[Red](#,##0.00)', alignment: { horizontal: 'right' }, font: { sz: 10 } },
  pctCell: { numFmt: '0.0%', alignment: { horizontal: 'right' }, font: { sz: 10 } },
  totalLbl:{ font: { bold: true, sz: 10 }, border: { top: { style: 'thin', color: { rgb: XL.navy } } } },
  totalVal:{ numFmt: '#,##0.00;[Red](#,##0.00)', alignment: { horizontal: 'right' }, font: { bold: true, sz: 10 },
             border: { top: { style: 'thin', color: { rgb: XL.navy } } }, fill: { fgColor: { rgb: XL.light } } },
  grandLbl:{ font: { bold: true, sz: 10.5, color: { rgb: XL.navy } }, border: { top: { style: 'double', color: { rgb: XL.navy } } } },
  grandVal:{ numFmt: '#,##0.00;[Red](#,##0.00)', alignment: { horizontal: 'right' }, font: { bold: true, sz: 10.5, color: { rgb: XL.navy } },
             border: { top: { style: 'double', color: { rgb: XL.navy } } }, fill: { fgColor: { rgb: XL.light } } },
  plain:   { font: { sz: 10 } },
  wrap:    { font: { sz: 10 }, alignment: { wrapText: true, vertical: 'top' } }
};

function _wsSetCell(ws, r, c, v, s, t){
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = { v };
  cell.t = t || (typeof v === 'number' ? 'n' : 's');
  if (s) cell.s = s;
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

function _modelSheetToWs(sm){
  const ws = {};
  const rows = state.sheets[sm.name] || [];
  const cols = sm.cols.filter(c => c.type !== 'label').slice(0, 12);
  const lineByRow = new Map(sm.lines.map(l => [l.r, l]));

  _wsSetCell(ws, 0, 0, state.client, XL_STYLES.title);
  _wsSetCell(ws, 1, 0, ROLE_LABELS[sm.role] || sm.name, XL_STYLES.subtitle);
  _wsSetCell(ws, 2, 0, state.period, XL_STYLES.subtitle);
  for (let c = 1; c <= cols.length; c++){
    _wsSetCell(ws, 0, c, '', XL_STYLES.title);
    _wsSetCell(ws, 1, c, '', XL_STYLES.subtitle);
    _wsSetCell(ws, 2, c, '', XL_STYLES.subtitle);
  }
  const HEAD_R = 4;
  _wsSetCell(ws, HEAD_R, 0, '', XL_STYLES.headL);
  cols.forEach((c, i) => _wsSetCell(ws, HEAD_R, i + 1, c.label || '', XL_STYLES.head));

  let out = HEAD_R + 1;
  const start = sm.headerRow >= 0 ? sm.headerRow + 1 : 0;
  for (let r = start; r < rows.length; r++){
    const row = rows[r] || [];
    const line = lineByRow.get(r);
    if (!line && !row.some(v => String(v ?? '').trim() !== '')) continue;
    const kind = line ? line.kind : 'account';
    const isGrand = kind === 'grandTotal' ||
      (line && /^total (for )?(assets|liabilities and equity)$|^net income$|^total income$|^total expenses$/i.test(line.label));
    const isTotal = kind === 'total' || kind === 'computed' || isGrand;
    const lblStyle = isGrand ? XL_STYLES.grandLbl : isTotal ? XL_STYLES.totalLbl :
                     kind === 'section' ? XL_STYLES.section : XL_STYLES.plain;
    const label = line ? line.label : String(row[0] ?? '').trim();
    const indent = line ? line.indent : 0;
    _wsSetCell(ws, out, 0, label, { ...lblStyle, alignment: { indent: Math.min(indent, 15) } });
    cols.forEach((c, i) => {
      const v = row[c.idx];
      const isNum = isNumericCell(v);
      const style = isGrand ? XL_STYLES.grandVal : isTotal ? XL_STYLES.totalVal :
                    c.type === 'percent' ? XL_STYLES.pctCell : XL_STYLES.money;
      if (isNum) _wsSetCell(ws, out, i + 1, num(v), style);
      else if (String(v ?? '').trim() !== '') _wsSetCell(ws, out, i + 1, String(v).trim(), XL_STYLES.plain);
      else _wsSetCell(ws, out, i + 1, '', style);
    });
    out++;
  }
  ws['!cols'] = [{ wch: 44 }, ...cols.map(() => ({ wch: 15 }))];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(cols.length, 1) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(cols.length, 1) } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: Math.max(cols.length, 1) } }
  ];
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
  _wsSetCell(cover, 7, 0, 'Amounts in US Dollars ($)', XL_STYLES.plain);
  cover['!cols'] = [{ wch: 52 }, ...Array(7).fill({ wch: 12 })];
  cover['!merges'] = [1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: 7 } }));
  XLSX.utils.book_append_sheet(wb, cover, 'Cover');

  /* Analytical Summary */
  const s = {};
  const m = md.metrics, p = md.prior;
  _wsSetCell(s, 0, 0, 'Analytical Summary', XL_STYLES.title);
  for (let c = 1; c <= 3; c++) _wsSetCell(s, 0, c, '', XL_STYLES.title);
  ['Metric', 'Current', 'Prior Year', 'Variance'].forEach((h, i) =>
    _wsSetCell(s, 2, i, h, i === 0 ? XL_STYLES.headL : XL_STYLES.head));
  const rowsKpi = [
    ['Revenue / Income', m.income, p.income], ['Gross Profit', m.gross, p.gross],
    ['Total Expenses', m.expenses, p.expenses], ['Net Income', m.net, p.net],
    ['Cash / Bank', m.bank, p.bank], ['A/R Total', m.ar, p.ar], ['A/P Total', m.ap, p.ap],
    ['Total Assets', m.assets, p.assets]
  ];
  rowsKpi.forEach((row, i) => {
    _wsSetCell(s, 3 + i, 0, row[0], XL_STYLES.plain);
    _wsSetCell(s, 3 + i, 1, row[1] ?? 0, XL_STYLES.money);
    if (row[2] !== null && row[2] !== undefined){
      _wsSetCell(s, 3 + i, 2, row[2], XL_STYLES.money);
      _wsSetCell(s, 3 + i, 3, (row[1] ?? 0) - row[2], XL_STYLES.money);
    }
  });
  /* Monthly series table */
  if (md.months.length){
    const base = 3 + rowsKpi.length + 2;
    _wsSetCell(s, base - 1, 0, 'Monthly Performance', XL_STYLES.section);
    _wsSetCell(s, base, 0, 'Month', XL_STYLES.headL);
    md.months.forEach((mo, i) => _wsSetCell(s, base, i + 1, mo.label, XL_STYLES.head));
    _wsSetCell(s, base + 1, 0, 'Revenue / Income', XL_STYLES.plain);
    _wsSetCell(s, base + 2, 0, 'Net Income', XL_STYLES.plain);
    md.monthlyRevenue.forEach((v, i) => _wsSetCell(s, base + 1, i + 1, v, XL_STYLES.money));
    md.monthlyNet.forEach((v, i) => _wsSetCell(s, base + 2, i + 1, v, XL_STYLES.money));
  }
  s['!cols'] = [{ wch: 26 }, ...Array(Math.max(md.months.length, 3)).fill({ wch: 14 })];
  XLSX.utils.book_append_sheet(wb, s, 'Analytical Summary');

  /* Financial statement sheets */
  const order = ['plMonthly', 'plComparative', 'plPercent', 'bs', 'ar', 'ap'];
  for (const role of order){
    const name = md.roles[role];
    if (!name) continue;
    XLSX.utils.book_append_sheet(wb, _modelSheetToWs(md.sheetModels[name]),
      _sheetNameSafe(wb, ROLE_LABELS[role] || name));
  }

  /* Notes + disclaimer */
  const notes = {};
  _wsSetCell(notes, 0, 0, 'Notes to Financial Statements', XL_STYLES.title);
  _wsSetCell(notes, 2, 0, state.notes || 'No management notes entered.', XL_STYLES.wrap);
  notes['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, notes, 'Notes');

  const disc = {};
  _wsSetCell(disc, 0, 0, 'Management Purpose Disclaimer', XL_STYLES.title);
  _wsSetCell(disc, 2, 0, REPORT_DISCLAIMER, XL_STYLES.wrap);
  _wsSetCell(disc, 4, 0, 'Authorised Signatory', XL_STYLES.section);
  _wsSetCell(disc, 5, 0, 'Name: '  + (state.signatory.name  || '________________________'), XL_STYLES.plain);
  _wsSetCell(disc, 6, 0, 'Title: ' + (state.signatory.title || '________________________'), XL_STYLES.plain);
  _wsSetCell(disc, 7, 0, 'Date: '  + (state.signatory.date  || '________________________'), XL_STYLES.plain);
  disc['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, disc, 'Disclaimer');

  XLSX.writeFile(wb, _reportFileBase() + '-Management-Report.xlsx');
  toast('Excel report downloaded');
}

/* ---------- raw data workbook (as-uploaded + edits) ---------- */

function downloadDataExcel(){
  if (!hasData()){ toast('Upload a workbook first.'); return; }
  const wb = XLSX.utils.book_new();
  Object.entries(state.sheets).forEach(([n, r]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(r), _sheetNameSafe(wb, n)));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(
    [['Notes to Financial Statements'], [state.notes || '']]), _sheetNameSafe(wb, 'Management Notes'));
  XLSX.writeFile(wb, _reportFileBase() + '-Management-Data.xlsx');
  toast('Data workbook downloaded');
}

function downloadCurrentSheetCsv(){
  if (!state.active || !state.sheets[state.active]){ toast('No sheet selected.'); return; }
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(state.sheets[state.active]));
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = state.active.replace(/[^a-z0-9]+/gi, '-') + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
