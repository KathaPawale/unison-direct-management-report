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
  pctCell: { numFmt: XL.pctFmt, alignment: { horizontal: 'right' }, font: { sz: 10 } },
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
  /* "A/P Aging" → "AP Aging" (Excel tab names cannot contain /), not "A P Aging". */
  let base = name.replace(/\bA\/([PR])\b/g, 'A$1').replace(/[\\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
  let n = base, i = 2;
  while (wb.SheetNames.includes(n)) n = (base.slice(0, 28) + ' ' + i++).slice(0, 31);
  return n;
}

function _decorateSheet(ws, sheetKind, freezeRow = 5, freezeCol = 1){
  const tabColors = {
    cover: '0B2F59', summary: '1D6FB8', bs: '0FA5A5', bsComparative: '0FA5A5', tb: '7A5FAA',
    plMonthly: 'B54B8E', plComparative: 'B54B8E', pl: 'B54B8E', plPercent: 'B54B8E', plClass: 'B54B8E',
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

/* xlsx-js-style (SheetJS 0.18.5) writes every sheet as a bare <sheetView/> and ignores '!views' / '!freeze' /
 * '!tabColor', so the frozen heading rows and the tab colors never reached the file. Write the workbook, then add
 * each sheet's frozen pane and tab color to its XML before the download. */
function _paneXml(fz){
  const x = fz.xSplit || 0, y = fz.ySplit || 0;
  const pane = x && y ? 'bottomRight' : y ? 'bottomLeft' : 'topRight';
  const top = XLSX.utils.encode_cell({ r: y, c: x });
  return '<pane' + (x ? ` xSplit="${x}"` : '') + (y ? ` ySplit="${y}"` : '') +
    ` topLeftCell="${top}" activePane="${pane}" state="frozen"/>` +
    `<selection pane="${pane}" activeCell="${top}" sqref="${top}"/>`;
}

/* Strict rules for every downloaded Excel file: every sheet has a tab color and prints one page wide (margins set);
 * every sheet except the Cover and Disclaimer has frozen heading rows and first column. A sheet built without them gets
 * the defaults here. Statement sheets also repeat rows 1-5 on every printed page and size their first column to the
 * longest account name — _verifySheetRules checks all of it in the written file. */
const XL_UNFROZEN = new Set(['Cover', 'Disclaimer']);
function _enforceSheetRules(wb){
  for (const name of wb.SheetNames){
    const ws = wb.Sheets[name];
    if (!ws['!tabColor'] || !ws['!tabColor'].rgb) ws['!tabColor'] = { rgb: '0B2F59' };
    if (!ws['!pageSetup']){
      const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { e: { c: 0 } };
      const width = (ws['!cols'] || []).slice(0, range.e.c + 1).reduce((s, c) => s + ((c && c.wch) || 10), 0);
      ws['!pageSetup'] = { landscape: width > 110 };
    }
    if (!ws['!margins']) ws['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
    /* One font everywhere, as in the PDF: Arial on every cell (a sheet built from plain rows would otherwise be Calibri). */
    for (const [addr, cell] of Object.entries(ws)){
      if (addr[0] === '!' || !cell || typeof cell !== 'object') continue;
      cell.s = { ...(cell.s || {}), font: { sz: 10, ...((cell.s || {}).font || {}), name: 'Arial' } };
    }
    const fz = ws['!freeze'];
    if (!XL_UNFROZEN.has(name) && !(fz && (fz.xSplit || fz.ySplit))){
      const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { e: { c: 0 } };
      ws['!freeze'] = { xSplit: range.e.c > 0 ? 1 : 0, ySplit: 1 };
    }
  }
}

/* Reads the written file back and refuses it when a sheet lost its tab color or frozen pane. */
function _verifySheetRules(bytes, wb){
  const zip = XLSX.CFB.read(bytes, { type: 'array' });
  const problems = [];
  const wbXml = new TextDecoder().decode((zip.FileIndex[zip.FullPaths.findIndex(p => p.endsWith('/xl/workbook.xml'))] || { content: new Uint8Array() }).content);
  const titleSheets = new Set([...wbXml.matchAll(/<definedName name="_xlnm\.Print_Titles" localSheetId="(\d+)"/g)].map(m => +m[1]));
  wb.SheetNames.forEach((name, i) => {
    const at = zip.FullPaths.findIndex(p => p.endsWith('/xl/worksheets/sheet' + (i + 1) + '.xml'));
    const xml = at < 0 ? '' : new TextDecoder().decode(zip.FileIndex[at].content);
    if (!/<sheetPr>[^]*?<tabColor rgb="[0-9A-F]{8}"/.test(xml)) problems.push(name + ': no tab color');
    if (!XL_UNFROZEN.has(name) && !/<pane [^>]*state="frozen"/.test(xml)) problems.push(name + ': headings not frozen');
    const ws = wb.Sheets[name], fz = ws['!freeze'];
    if (fz && fz.ySplit === 5 && fz.xSplit === 1 && ws['!particulars'] && !/<pane xSplit="1" ySplit="5" topLeftCell="B6"/.test(xml))
      problems.push(name + ': rows 1-5 and column A not frozen');
    if (!/<pageSetUpPr fitToPage="1"\/>/.test(xml) || !/<pageSetup [^>]*fitToWidth="1" fitToHeight="0"/.test(xml)) problems.push(name + ': not set to print one page wide');
    if (ws['!pageSetup'] && ws['!pageSetup'].titleRows && !titleSheets.has(i)) problems.push(name + ': headings not repeated on printed pages');
    if (ws['!labelWidth']){
      const m = xml.match(/<col min="1" max="1" width="([\d.]+)"/);
      if (!m || +m[1] < ws['!labelWidth']) problems.push(name + ': first column narrower than its longest account name');
    }
  });
  if (problems.length) throw new Error('Excel formatting rules failed — ' + problems.join('; '));
}

function _workbookBytes(wb){
  _enforceSheetRules(wb);
  /* Headings repeated at the top of every printed page (rows 1-5 of a statement sheet). */
  const names = wb.SheetNames.map((name, i) => {
    const ps = wb.Sheets[name]['!pageSetup'];
    return ps && ps.titleRows ? { Name: '_xlnm.Print_Titles', Sheet: i, Ref: `'${name.replace(/'/g, "''")}'!$1:$${ps.titleRows}` } : null;
  }).filter(Boolean);
  if (names.length) wb.Workbook = { ...(wb.Workbook || {}), Names: [...((wb.Workbook || {}).Names || []).filter(n => n.Name !== '_xlnm.Print_Titles'), ...names] };
  const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  const zip = XLSX.CFB.read(bytes, { type: 'array' });
  let changed = 0;
  wb.SheetNames.forEach((name, i) => {
    const fz = wb.Sheets[name]['!freeze'], tab = wb.Sheets[name]['!tabColor'];
    const freeze = fz && (fz.xSplit || fz.ySplit);
    if (!freeze && !(tab && tab.rgb) && !wb.Sheets[name]['!pageSetup']) return;
    const at = zip.FullPaths.findIndex(p => p.endsWith('/xl/worksheets/sheet' + (i + 1) + '.xml'));
    if (at < 0) throw new Error('Worksheet XML not found for ' + name);
    const entry = zip.FileIndex[at];
    let xml = new TextDecoder().decode(entry.content);
    if (freeze){
      const next = xml.replace(/<sheetView\b([^>]*?)\/>/, (m, attrs) => '<sheetView' + attrs + '>' + _paneXml(fz) + '</sheetView>');
      if (next === xml) throw new Error('Could not freeze the heading rows of ' + name);
      xml = next;
    }
    const ps = wb.Sheets[name]['!pageSetup'];
    if (ps){
      /* Fit to one page wide (any height), orientation, centred horizontally. */
      const next = xml.replace(/<pageMargins\b[^>]*\/>/, m => '<printOptions horizontalCentered="1"/>' + m +
        `<pageSetup paperSize="1" orientation="${ps.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>`);
      if (next === xml) throw new Error('Could not set the print layout of ' + name);
      xml = next;
    }
    if (tab && tab.rgb){
      /* <sheetPr> must be the worksheet's first child. */
      const color = '<tabColor rgb="FF' + String(tab.rgb).replace(/^#/, '').slice(-6).toUpperCase() + '"/>';
      const fit = ps ? '<pageSetUpPr fitToPage="1"/>' : '';
      const next = /<sheetPr\b/.test(xml)
        ? xml.replace(/<sheetPr\b([^>]*?)(\/>|>)/, (m, attrs, end) => '<sheetPr' + attrs + '>' + color + (end === '/>' ? fit + '</sheetPr>' : ''))
        : xml.replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr>' + color + fit + '</sheetPr>');
      if (next === xml) throw new Error('Could not color the tab of ' + name);
      xml = next;
    }
    entry.content = new TextEncoder().encode(xml);
    entry.size = entry.content.length;
    changed++;
  });
  const out = changed ? new Uint8Array(XLSX.CFB.write(zip, { type: 'array', fileType: 'zip' })) : bytes;
  _verifySheetRules(out, wb);
  return out;
}

function _saveWorkbook(wb, filename){
  let bytes;
  try { bytes = _workbookBytes(wb); }
  catch (e){
    /* Strict rule: never hand over a file without its tab colors and frozen headings. */
    console.error('Excel formatting rules failed:', e);
    toast('Excel file not downloaded: ' + e.message);
    return false;
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
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
  _wsSetCell(ws, HEAD_R, 0, firstColumnHeading(sm), { ...XL_STYLES.headL, alignment: { horizontal: 'left', vertical: 'center' } });
  cols.forEach((c, i) => _wsSetCell(ws, HEAD_R, i + 1, _headLabel(c), { ...XL_STYLES.head, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } }));

  /* Rows 34 / 52: each percent column keeps one scale (fractions or whole percents) for every row. */
  const fractionCols = new Set(cols.filter(c => c.type === 'percent' && percentColumnIsFraction(sm, rows, c.idx)).map(c => c.idx));

  let out = HEAD_R + 1;
  for (const line of sm.lines){
    if (line.kind === 'meta') continue;
    const row = rows[line.r] || [];
    const kind = line.kind;
    const key = line.mkey || labelKey(line.label);
    const isGrand = kind === 'grandTotal' ||
      /^total (for )?(assets|liabilities and (stockholders |shareholders |owners |members |partners )?(equity|capital)|income|revenues?|expenses?)$/.test(key) ||
      (sm.role !== 'bs' && NET_LINE_RE.test(key));
    const isTotal = kind === 'total' || kind === 'computed' || isGrand;
    const lblStyle = isGrand ? XL_STYLES.grandLbl : isTotal ? XL_STYLES.totalLbl :
                     kind === 'section' ? XL_STYLES.section : XL_STYLES.plain;
    _wsSetCell(ws, out, 0, line.label, { ...lblStyle, alignment: { horizontal: 'left', vertical: 'center', indent: Math.min(line.indent, 10) } });
    const pctRow = isPercentRowLabel(line.label), pctRowFrac = pctRow && percentRowIsFraction(row, cols.map(c => c.idx));
    cols.forEach((c, i) => {
      const v = row[c.idx];
      const n = parseAmount(v);
      if (pctRow && (n !== null || isPercentText(v))){
        const pv = isPercentText(v) ? parsePercentText(v) / 100 : (pctRowFrac ? n : n / 100);
        _wsSetCell(ws, out, i + 1, pv, { ...(isTotal ? XL_STYLES.totalVal : XL_STYLES.pctCell), numFmt: XL.pctFmt, alignment: { horizontal: 'right', vertical: 'center' } });
        return;
      }
      const base = isGrand ? XL_STYLES.grandVal : isTotal ? XL_STYLES.totalVal : c.type === 'percent' ? XL_STYLES.pctCell : XL_STYLES.money;
      const style = { ...base, alignment: { horizontal: 'right', vertical: 'center' } };
      if (c.type === 'percent' && (n !== null || isPercentText(v))){
        const pv = isPercentText(v) ? parseFloat(String(v).replace(/[^\d.\-]/g, '')) / 100 * (/^\(/.test(String(v).trim()) ? -1 : 1) : (fractionCols.has(c.idx) ? n : n / 100);
        _wsSetCell(ws, out, i + 1, pv, { ...style, numFmt: XL.pctFmt });
      } else if (n !== null) _wsSetCell(ws, out, i + 1, n, { ...style, font: { ...(style.font || {}), ...(n < 0 ? { color: { rgb: 'C93438' } } : {}) } });
      else if (cellText(v) !== '') _wsSetCell(ws, out, i + 1, cellText(v), { ...XL_STYLES.plain, alignment: { horizontal: 'right' } });
      else _wsSetCell(ws, out, i + 1, '', style);
    });
    out++;
  }
  if (out === HEAD_R + 1) _wsSetCell(ws, out, 0, emptySheetText(sm), { ...XL_STYLES.plain, font: { italic: true, sz: 10, color: { rgb: '5B6B7F' } } });
  /* Column widths follow the content: the longest account name (with its indent) and the widest formatted amount or
   * heading word, so nothing is cut off and nothing is needlessly wide. */
  const widest = Math.min(60, Math.max(32, ...sm.lines.filter(l => l.kind !== 'meta').map(l => l.label.length + Math.min(l.indent, 10) * 2 + 3)));
  const valWidth = c => {
    const texts = sm.lines.filter(l => l.kind !== 'meta').map(l => { const n = parseAmount((rows[l.r] || [])[c.idx]); return n === null ? '' : acctNumber(n); });
    const headWord = Math.max(0, ...String(_headLabel(c)).split(/\s+/).map(w => w.length));
    return Math.min(22, Math.max(c.type === 'percent' ? 11 : 14, headWord + 2, ...texts.map(t => t.length + 3)));
  };
  ws['!cols'] = [{ wch: widest }, ...cols.map(c => ({ wch: valWidth(c) }))];
  ws['!labelWidth'] = Math.min(60, Math.max(...sm.lines.filter(l => l.kind !== 'meta').map(l => l.label.length + Math.min(l.indent, 10) * 2), 0));
  /* Printing: one page wide (landscape when the statement is wide), centred, headings repeated on every page. */
  const totalWidth = widest + cols.reduce((s, c) => s + valWidth(c), 0);
  ws['!pageSetup'] = { landscape: totalWidth > 95 || cols.length > 6, titleRows: HEAD_R + 1 };
  ws['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
  ws['!rows'] = [{ hpt: 26 }, { hpt: 20 }, { hpt: 18 }, { hpt: 6 }, { hpt: 30 }];
  ws['!merges'] = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: last } }));
  _decorateSheet(ws, sm.role, HEAD_R + 1, 1);
  ws['!particulars'] = true;   // strict rule: rows 1-5 (row 5 = "Particulars") and column A frozen
  return ws;
}

/* The centred heading block shared by the generated sheets: company, heading, period (rows 1-3). */
function _headingBlock(ws, heading, sub, lastCol){
  const center = { horizontal: 'center', vertical: 'center', wrapText: true };
  _wsSetCell(ws, 0, 0, state.client, { ...XL_STYLES.title, font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, alignment: center }, null, { border: false });
  _wsSetCell(ws, 1, 0, heading, { ...XL_STYLES.subtitle, font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, alignment: center }, null, { border: false });
  _wsSetCell(ws, 2, 0, sub || '', { ...XL_STYLES.subtitle, alignment: center }, null, { border: false });
  for (let c = 1; c <= lastCol; c++) for (let r = 0; r < 3; r++) _wsSetCell(ws, r, c, '', r === 0 ? XL_STYLES.title : XL_STYLES.subtitle, null, { border: false });
  ws['!merges'] = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: lastCol } }));
  ws['!rows'] = [{ hpt: 26 }, { hpt: 20 }, { hpt: 18 }, { hpt: 6 }, { hpt: 30 }];
}

const XL_LINK = { font: { name: 'Arial', sz: 10, color: { rgb: '0563C1' }, underline: true }, alignment: { horizontal: 'left', vertical: 'center' } };

/* The uploaded index sheet ("Summary"), rebuilt: No. | Particulars | a "Click here to view!" link to that sheet's tab in this
 * file, then the NOTE lines. tabOf maps an uploaded sheet name to its tab here. */
function _indexSheetToWs(name, heading, tabOf){
  const ws = {};
  const { entries, notes } = indexSheetEntries(name, state.sheets[name] || []);
  _headingBlock(ws, heading, '', 2);
  [['No.', 'center'], ['Particulars', 'left'], ['Link', 'left']].forEach(([h, al], i) =>
    _wsSetCell(ws, 4, i, h, { ...XL_STYLES.headL, alignment: { horizontal: al, vertical: 'center' } }));
  let r = 5;
  for (const e of entries){
    _wsSetCell(ws, r, 0, /^\d+$/.test(String(e.no).replace(/\.$/, '')) ? +String(e.no).replace(/\.$/, '') : e.no, { ...XL_STYLES.plain, alignment: { horizontal: 'center', vertical: 'center' } });
    _wsSetCell(ws, r, 1, e.label, { ...XL_STYLES.plain, alignment: { horizontal: 'left', vertical: 'center' } });
    const tab = tabOf(e.sheet);
    if (tab){
      _wsSetCell(ws, r, 2, 'Click here to view!', XL_LINK);
      ws[XLSX.utils.encode_cell({ r, c: 2 })].l = { Target: `#'${tab.replace(/'/g, "''")}'!A1`, Tooltip: 'Open ' + tab };
    } else _wsSetCell(ws, r, 2, '', XL_STYLES.plain);
    r++;
  }
  r++;
  for (const t of notes){
    _wsSetCell(ws, r, 0, 'NOTE :', { font: { name: 'Arial', bold: true, sz: 10 }, alignment: { horizontal: 'left', vertical: 'top' } }, null, { border: false });
    _wsSetCell(ws, r, 1, t, { font: { name: 'Arial', bold: true, sz: 10 }, alignment: { wrapText: true, vertical: 'top' } }, null, { border: false });
    _wsSetCell(ws, r, 2, '', {}, null, { border: false });
    ws['!merges'].push({ s: { r, c: 1 }, e: { r, c: 2 } });
    (ws['!rows'][r] = { hpt: Math.min(120, 15 * Math.ceil(t.length / 70) + 4) });
    r++;
  }
  ws['!cols'] = [{ wch: 8 }, { wch: Math.min(60, Math.max(34, ...entries.map(e => e.label.length + 3))) }, { wch: 22 }];
  ws['!pageSetup'] = { landscape: false, titleRows: 5 };
  _decorateSheet(ws, 'summary', 5, 1);
  return ws;
}

/* A transaction list ("Uncategorized Expenses", "Invoice required"), rebuilt as a formatted table: every uploaded column
 * and row; dates as dates, amounts in the accounting format, long text wrapped; headings frozen. */
function _listingSheetToWs(name, heading, sm){
  const ws = {};
  const rows = state.sheets[name] || [];
  const hr = listingHeaderRow(sm, rows);
  const header = (rows[hr] || []).map(cellText);
  const body = rows.slice(hr + 1).filter(row => (row || []).some(v => cellText(v) !== ''));
  const width = Math.max(header.length, ...body.map(r => (r || []).length));
  const last = Math.max(width - 1, 1);
  _headingBlock(ws, heading, statementPeriodText(sm), last);
  const isDate = c => LISTING_DATE_HEAD_RE.test(header[c] || '');
  const numeric = c => body.filter(r => parseAmount((r || [])[c]) !== null).length >= Math.max(1, body.filter(r => cellText((r || [])[c]) !== '').length * 0.6);
  for (let c = 0; c < width; c++) _wsSetCell(ws, 4, c, header[c] || '', { ...XL_STYLES.head, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
  body.forEach((row, i) => {
    const r = 5 + i;
    for (let c = 0; c < width; c++){
      const v = (row || [])[c];
      const n = typeof v === 'number' ? v : parseAmount(v);
      if (isDate(c) && typeof v === 'number') _wsSetCell(ws, r, c, v, { ...XL_STYLES.plain, numFmt: 'mm/dd/yyyy', alignment: { horizontal: 'left', vertical: 'top' } });
      else if (!isDate(c) && n !== null && numeric(c)) _wsSetCell(ws, r, c, n, { ...XL_STYLES.money, alignment: { horizontal: 'right', vertical: 'top' }, font: { sz: 10, ...(n < 0 ? { color: { rgb: 'C93438' } } : {}) } });
      else _wsSetCell(ws, r, c, cellText(v), XL_STYLES.wrap);
    }
  });
  const widthOf = c => isDate(c) ? 12 : numeric(c) ? 14 : Math.min(50, Math.max(12, String(header[c] || '').length + 2, ...body.map(r => cellText((r || [])[c]).length + 2)));
  ws['!cols'] = Array.from({ length: width }, (_, c) => ({ wch: widthOf(c) }));
  ws['!pageSetup'] = { landscape: true, titleRows: 5 };
  _decorateSheet(ws, 'other', 5, 1);
  return ws;
}

function _rawSheetToWs(rows, modelHeaderRow = -1, role = null, sm = null){
  const ws = {};
  const data = rows || [];
  /* Values stay exactly as uploaded; fraction-scale percent columns and "Percentage of total" rows get a % format. */
  const pctCols = new Set(sm ? sm.cols.filter(c => c.type === 'percent' && percentColumnIsFraction(sm, data, c.idx)).map(c => c.idx) : []);
  const valueIdx = sm ? displayColumns(sm).map(c => c.idx) : [];
  const pctRows = new Set(sm ? sm.lines.filter(l => isPercentRowLabel(l.label) && percentRowIsFraction(data[l.r] || [], valueIdx)).map(l => l.r) : []);
  const width = Math.max(1, ...data.map(row => (row || []).length));
  /* The parser's column-heading row (a "", "Total" row counts); otherwise the first row with two filled cells. */
  const headerRow = modelHeaderRow >= 0 && modelHeaderRow < data.length ? modelHeaderRow :
    data.findIndex(row => (row || []).filter(v => cellText(v) !== '').length >= 2);
  const freezeRow = headerRow >= 0 ? headerRow + 1 : 1;
  data.forEach((row, r) => {
    for (let c = 0; c < width; c++){
      const value = (row || [])[c] ?? '';
      const text = cellText(value);
      const isHeader = r === headerRow;
      const n = parseAmount(value);
      const asPct = n !== null && (pctCols.has(c) || (pctRows.has(r) && valueIdx.includes(c)));
      const style = isHeader ? (c === 0 ? XL_STYLES.headL : XL_STYLES.head) :
        asPct ? XL_STYLES.pctCell : n !== null ? XL_STYLES.money : XL_STYLES.wrap;
      if (n !== null && !isHeader) _wsSetCell(ws, r, c, n, style);
      else _wsSetCell(ws, r, c, text, style);
    }
  });
  ws['!cols'] = Array.from({ length: width }, (_, c) => ({
    wch: Math.min(48, Math.max(14, ...data.map(row => String((row || [])[c] ?? '').length + 2)))
  }));
  _decorateSheet(ws, role || 'uploaded', freezeRow, width > 1 ? 1 : 0);
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
      const valStyle = isTot ? (isPct ? { ...XL_STYLES.totalVal, numFmt: '0.00%' } : XL_STYLES.totalVal) : (isPct ? XL_STYLES.pctCell : XL_STYLES.money);
      if (v === null || v === undefined) _wsSetCell(s, nextRow + 2 + ri, ci, '', isTot ? XL_STYLES.totalLbl : XL_STYLES.plain);
      else if (typeof v === 'number') _wsSetCell(s, nextRow + 2 + ri, ci, isPct ? v / 100 : v, valStyle);
      else _wsSetCell(s, nextRow + 2 + ri, ci, v, isTot ? XL_STYLES.totalLbl : XL_STYLES.plain);
    }));
    nextRow += data.length + 4;
  };
  if (md.expenseGroups.length)
    table('Expense Breakdown (Expense ÷ Total Expenses × 100)', ['Expense Category', 'Amount', '% of Total Expenses'],
      md.expenseGroups.map(x => [x.label, x.value, x.pct]).concat([['Total Expenses', md.expenseTotal, md.expensePctBase ? md.expenseTotal / md.expensePctBase * 100 : 100]]));
  if (md.bsComposition.assets.length)
    table('Balance Sheet Composition — Assets', ['Asset Type', 'Amount', '% of Total Assets'],
      md.bsComposition.assets.map(x => [x.label, x.value, x.pct]).concat([['Total Assets', m.assets, 100]]));
  if (md.liabilityBifurcation.length)
    table('Liabilities Bifurcation', ['Liability Type', 'Amount', '% of Total Liabilities'],
      md.liabilityBifurcation.map(x => [x.label, x.value, x.pct]).concat([['Total Liabilities', md.liabilityBifurcation.reduce((s, x) => s + x.value, 0), 100]]));
  s['!cols'] = [{ wch: 34 }, ...Array(Math.max(md.months.length, 3)).fill({ wch: 16 })];
  _decorateSheet(s, 'summary', 5, 1);
  XLSX.utils.book_append_sheet(wb, s, 'Analytical Summary');

  /* Financial statement sheets */
  /* Same statements as the PDF (REPORT_STATEMENT_ORDER, REPORT_TRAILING_ORDER); tab order is set by reportTabOrder below. */
  const titles = reportStatementTitles(md);   // each statement keeps its uploaded sheet's heading
  for (const [role, stdTitle] of [...REPORT_STATEMENT_ORDER, ...REPORT_TRAILING_ORDER]){
    const title = titles[role] || stdTitle;
    const name = md.roles[role];
    if (!name || skipReportSection(md, role)) continue;
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
      _wsSetCell(ws, tr, 2, 1, { ...XL_STYLES.totalVal, numFmt: '0.00%' });
      ws['!cols'] = [{ wch: Math.max(34, ...ag.buckets.map(b => String(b.label).length + 3)) }, { wch: 16 }, { wch: 12 }];
      ws['!pageSetup'] = { landscape: false, titleRows: 5 };
      _decorateSheet(ws, role, 5, 1);
      ws['!source'] = name; XLSX.utils.book_append_sheet(wb, ws, _sheetNameSafe(wb, name));
      continue;
    }
    const modelWs = _modelSheetToWs(md.sheetModels[name], title);
    if (role === 'tb'){
      const tbWs = modelWs;
      _decorateSheet(tbWs, 'tb', 5, 1);
      tbWs['!source'] = name; XLSX.utils.book_append_sheet(wb, tbWs, _sheetNameSafe(wb, name));
    } else {
      modelWs['!source'] = name; XLSX.utils.book_append_sheet(wb, modelWs, _sheetNameSafe(wb, name));
    }
  }
  /* Every other worksheet with figures, as in the PDF (reportExtraSheets). */
  for (const n of reportExtraSheets(md)){
    const ws = _modelSheetToWs(md.sheetModels[n], titles['sheet:' + n] || sheetHeading(md.sheetModels[n], n));
    ws['!source'] = n;
    XLSX.utils.book_append_sheet(wb, ws, _sheetNameSafe(wb, n));
  }
  /* Transaction lists ("Uncategorized Expenses", "Invoice required"): Excel only. */
  for (const n of reportListingSheets(md)){
    const ws = _listingSheetToWs(n, sheetHeading(md.sheetModels[n], n), md.sheetModels[n]);
    ws['!source'] = n;
    XLSX.utils.book_append_sheet(wb, ws, _sheetNameSafe(wb, n));
  }
  /* The uploaded index sheet ("Summary"), with a working link to each sheet's tab in this file. */
  const indexSheet = reportIndexSheet(md);
  if (indexSheet){
    const tabOf = src => wb.SheetNames.find(t => wb.Sheets[t]['!source'] === src) || null;
    const ws = _indexSheetToWs(indexSheet, isGenericTabName(indexSheet) ? 'Summary' : cellText(indexSheet), tabOf);
    ws['!source'] = indexSheet;
    XLSX.utils.book_append_sheet(wb, ws, _sheetNameSafe(wb, indexSheet));
  }

  /* Notes + disclaimer */
  const notes = {};
  _wsSetCell(notes, 0, 0, (state.client || 'Client') + ' — ' + notesHeading(md),
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
  /* The uploaded notes sheet's tab name (e.g. "Notes to FS"), else "Notes". */
  const notesTab = md.roles.notes && !isGenericTabName(md.roles.notes) ? _sheetNameSafe(wb, md.roles.notes) : _sheetNameSafe(wb, 'Notes');
  XLSX.utils.book_append_sheet(wb, notes, notesTab);

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

  /* Tabs keep the uploaded sheet names, in the uploaded workbook's tab order: Cover, Disclaimer, Analytical Summary, the
   * statements as the workbook orders them, and the notes last (as in the PDF). */
  const own = new Set(['Cover', 'Disclaimer', 'Analytical Summary', notesTab]);
  const statementTabs = wb.SheetNames.filter(n => !own.has(n))
    .sort((a, b) => workbookIndex(wb.Sheets[a]['!source']) - workbookIndex(wb.Sheets[b]['!source']));
  /* The uploaded index sheet ("Summary") comes right after the Cover, as it opens the user's workbook. */
  const indexTab = statementTabs.find(t => indexSheet && wb.Sheets[t]['!source'] === indexSheet);
  wb.SheetNames = ['Cover', ...(indexTab ? [indexTab] : []), 'Disclaimer', 'Analytical Summary', ...statementTabs.filter(t => t !== indexTab), notesTab];
  if (_saveWorkbook(wb, _reportFileBase() + '-Management-Report.xlsx')) toast('Excel report downloaded');
}

/* ---------- raw data workbook (as-uploaded + edits) ---------- */

function downloadDataExcel(){
  if (!hasData()){ toast('Upload a workbook first.'); return; }
  const wb = XLSX.utils.book_new();
  Object.entries(state.sheets).forEach(([n, r]) => {
    const sm = state.model && state.model.sheetModels[n];
    XLSX.utils.book_append_sheet(wb, _rawSheetToWs(r, sm ? sm.headerRow : -1, sm ? sm.role : null, sm), _sheetNameSafe(wb, n));
  });
  const mgmtNotes = XLSX.utils.aoa_to_sheet([['Notes to Financial Statements'], [state.notes || '']]);
  _decorateSheet(mgmtNotes, 'notes', 1, 0);
  XLSX.utils.book_append_sheet(wb, mgmtNotes, _sheetNameSafe(wb, 'Management Notes'));
  if (_saveWorkbook(wb, _reportFileBase() + '-Management-Data.xlsx')) toast('Data workbook downloaded');
}

function downloadCurrentSheetCsv(){
  if (!state.active || !state.sheets[state.active]){ toast('No sheet selected.'); return; }
  const rows = state.sheets[state.active].map(row => [...(row || [])]);
  const sm = state.model && state.model.sheetModels[state.active];
  if (sm){
    const cols = displayColumns(sm);
    const fractionCols = new Set(cols.filter(c => c.type === 'percent' && percentColumnIsFraction(sm, state.sheets[state.active], c.idx)).map(c => c.idx));
    const pctRows = new Map(sm.lines.filter(l => isPercentRowLabel(l.label)).map(l => [l.r, percentRowIsFraction(rows[l.r] || [], cols.map(c => c.idx))]));
    rows.forEach((row, ri) => {
      if (ri === sm.headerRow) return;
      cols.forEach(c => {
        const n = parseAmount(row[c.idx]);
        if (n === null) return;
        if (c.type === 'percent' || pctRows.has(ri)){
          const p = (pctRows.has(ri) ? pctRows.get(ri) : fractionCols.has(c.idx)) ? n * 100 : n;
          row[c.idx] = p < 0 ? `(${Math.abs(p).toFixed(2)}%)` : `${p.toFixed(2)}%`;
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
