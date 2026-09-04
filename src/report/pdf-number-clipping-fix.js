/* Preserve the existing report design while making every report page adapt to workbook data. */
'use strict';
(function(){
  const MIN_CELL_PX = 4.75;
  const MIN_KPI_PX = 9;

  function px(el, fallback){
    const n = parseFloat(getComputedStyle(el).fontSize);
    return Number.isFinite(n) ? n : fallback;
  }

  function fitCell(el, minPx = MIN_CELL_PX){
    if(!el) return;
    el.style.fontVariantNumeric = 'tabular-nums';
    el.style.maxWidth = '100%';
    el.style.textOverflow = 'clip';
    el.style.overflow = 'visible';
    el.style.wordBreak = 'normal';
    el.style.overflowWrap = 'normal';
    el.style.paddingLeft = '2px';
    el.style.paddingRight = '2px';

    let size = px(el, 8);
    let guard = 30;
    while(el.scrollWidth > el.clientWidth + 1 && size > minPx && guard--){
      size = Math.max(minPx, size - 0.25);
      el.style.fontSize = size + 'px';
    }

    /* If an unusually narrow column still cannot contain the complete value,
       allow the browser to wrap instead of ever clipping/truncating it. */
    if(el.scrollWidth > el.clientWidth + 1){
      el.style.whiteSpace = 'normal';
      el.style.overflowWrap = 'anywhere';
      el.style.wordBreak = 'break-word';
    }
  }

  function fitTable(table){
    if(!table) return;
    const rows = [...table.querySelectorAll('tr')];
    const cols = Math.max(1, ...rows.map(r => r.children.length));
    table.classList.toggle('report-table-wide', cols >= 7);
    table.classList.toggle('report-table-very-wide', cols >= 10);
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.style.tableLayout = 'fixed';
    table.style.boxSizing = 'border-box';

    const labels = table.querySelectorAll('td.lbl');
    const values = table.querySelectorAll('td.val');
    const headers = table.querySelectorAll('thead th:not(.lbl)');
    const density = cols >= 14 ? 4.75 : cols >= 11 ? 5.0 : cols >= 8 ? 5.35 : 5.75;

    labels.forEach(el => {
      el.style.boxSizing = 'border-box';
      el.style.overflow = 'visible';
      el.style.textOverflow = 'clip';
      el.style.whiteSpace = 'normal';
      el.style.wordBreak = 'normal';
      el.style.overflowWrap = 'break-word';
      fitCell(el, Math.max(6.2, density));
    });
    values.forEach(el => fitCell(el, density));
    headers.forEach(el => {
      el.style.boxSizing = 'border-box';
      el.style.whiteSpace = 'normal';
      el.style.overflow = 'visible';
      el.style.textOverflow = 'clip';
      el.style.wordBreak = 'normal';
      el.style.overflowWrap = 'break-word';
      fitCell(el, Math.max(5.5, density));
    });
  }

  function applyNumberSafety(root){
    if(!root) return;
    root.querySelectorAll('.report-table').forEach(fitTable);
    root.querySelectorAll('.report-mini-table td,.comparison td').forEach(el => fitCell(el, 5.25));
    root.querySelectorAll('.rkpi-value').forEach(el => fitCell(el, MIN_KPI_PX));
  }

  const style = document.createElement('style');
  style.id = 'pdf-number-clipping-fix-style';
  style.textContent = `
    /* Adaptive report sizing: never hide financial text. */
    .report-page{box-sizing:border-box!important;overflow:visible!important}
    .report-page .report-table-wrap{box-sizing:border-box!important;width:100%!important;max-width:100%!important;overflow:visible!important}
    .report-page .report-table{width:100%!important;max-width:100%!important;table-layout:fixed!important;box-sizing:border-box!important;border-collapse:collapse!important}
    .report-page .report-table td,.report-page .report-table th{box-sizing:border-box!important}
    .report-page .report-table td.val{font-variant-numeric:tabular-nums!important;white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important}
    .report-page .report-table thead th:not(.lbl){white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
    .report-page .report-table-wide td.val{font-size:7px!important}
    .report-page .report-table-very-wide td.val{font-size:6.2px!important}
    .report-page .report-table-wide thead th:not(.lbl){font-size:7px!important}
    .report-page .report-table-very-wide thead th:not(.lbl){font-size:6.2px!important}
    .report-page .report-table-wide td.lbl{width:24%!important}
    .report-page .report-table-very-wide td.lbl{width:21%!important}
    .report-page .rkpi{min-width:0!important;box-sizing:border-box!important;overflow:visible!important}
    .report-page .rkpi-value{white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;font-variant-numeric:tabular-nums!important;max-width:100%!important}
    .pdf-export .report-page,.pdf-export .report-page .report-table-wrap{overflow:visible!important}
    .pdf-export .report-page .report-table td.val{overflow:visible!important;text-overflow:clip!important}
    .report-page tr{break-inside:avoid!important;page-break-inside:avoid!important}
    .report-page thead{display:table-header-group!important}
  `;
  if(!document.getElementById(style.id)) document.head.appendChild(style);

  function fitSoon(root){
    requestAnimationFrame(() => requestAnimationFrame(() => applyNumberSafety(root)));
  }

  if(typeof window.renderReport === 'function' && !window.__pdfNumberPreviewFix){
    window.__pdfNumberPreviewFix = true;
    const base = window.renderReport;
    window.renderReport = function(){
      const out = base.apply(this, arguments);
      fitSoon(document.getElementById('reportStage'));
      return out;
    };
  }

  if(typeof window.buildPages === 'function' && !window.__pdfNumberPageFix){
    window.__pdfNumberPageFix = true;
    const base = window.buildPages;
    window.buildPages = function(opts){
      const pages = base.call(this, opts || {});
      if(!Array.isArray(pages)) return pages;
      return pages.map(p => {
        const box = document.createElement('div');
        box.innerHTML = p.html;
        box.querySelectorAll('.report-table').forEach(fitTable);
        return {...p, html: box.innerHTML};
      });
    };
  }

  /* html2canvas captures the mounted export page. Refit immediately before
     capture so the exact same layout rules are used for downloaded PDF pages. */
  if(typeof window.html2canvas === 'function' && !window.__pdfCanvasFitGuard){
    window.__pdfCanvasFitGuard = true;
    const baseCanvas = window.html2canvas;
    window.html2canvas = async function(el, opts){
      applyNumberSafety(el);
      await new Promise(r => requestAnimationFrame(r));
      applyNumberSafety(el);
      const nextOpts = Object.assign({}, opts || {});
      const previousClone = nextOpts.onclone;
      nextOpts.onclone = function(doc){
        const clonedRoot = doc.querySelector('.pdf-export') || doc.body;
        applyNumberSafety(clonedRoot);
        if(typeof previousClone === 'function') previousClone(doc);
      };
      return baseCanvas.call(this, el, nextOpts);
    };
  }

  window.applyPdfNumberSafety = applyNumberSafety;
})();