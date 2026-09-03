/* Preserve the existing report design while preventing financial values from clipping. */
'use strict';
(function(){
  function fitCell(el,minPx=5.8){
    if(!el)return;
    el.style.fontVariantNumeric='tabular-nums';
    el.style.whiteSpace='nowrap';
    el.style.textOverflow='clip';
    el.style.overflow='hidden';
    el.style.maxWidth='100%';
    let size=parseFloat(getComputedStyle(el).fontSize)||8;
    let guard=20;
    while(el.scrollWidth>el.clientWidth+1&&size>minPx&&guard--){size=Math.max(minPx,size-.25);el.style.fontSize=size+'px';}
  }
  function applyNumberSafety(root){
    if(!root)return;
    root.querySelectorAll('.report-table').forEach(table=>{
      const cols=Math.max(1,...[...table.querySelectorAll('tr')].map(r=>r.children.length));
      table.classList.toggle('report-table-wide',cols>=7);
      table.classList.toggle('report-table-very-wide',cols>=10);
    });
    const cells=root.querySelectorAll('.report-table td.val,.report-table th:not(.lbl),.report-mini-table td,.comparison td,.rkpi-value');
    cells.forEach(el=>fitCell(el,el.classList.contains('rkpi-value')?9:5.8));
  }
  const style=document.createElement('style');style.id='pdf-number-clipping-fix-style';
  style.textContent=`
    .report-page{overflow:hidden!important}
    .report-page .report-table-wrap{overflow:hidden!important;max-width:100%!important;width:100%!important}
    .report-page .report-table{width:100%!important;max-width:100%!important;table-layout:fixed!important}
    .report-page .report-table td,.report-page .report-table th{box-sizing:border-box!important}
    .report-page .report-table td.val{white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important;font-variant-numeric:tabular-nums!important;padding-left:2px!important;padding-right:3px!important}
    .report-page .report-table thead th:not(.lbl){white-space:normal!important;overflow:hidden!important;text-overflow:clip!important;padding-left:2px!important;padding-right:3px!important}
    .report-page .report-table-wide{font-size:7.4px!important}
    .report-page .report-table-wide td.val{font-size:7px!important}
    .report-page .report-table-wide thead th{font-size:7px!important}
    .report-page .report-table-very-wide{font-size:6.6px!important}
    .report-page .report-table-very-wide td.val{font-size:6.2px!important}
    .report-page .report-table-very-wide thead th{font-size:6.2px!important}
    .report-page .report-table-wide td.lbl{width:24%!important}
    .report-page .report-table-very-wide td.lbl{width:21%!important}
    .report-page .rkpi{min-width:0!important;overflow:hidden!important}
    .report-page .rkpi-value{white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important;font-size:15px!important;font-variant-numeric:tabular-nums!important;max-width:100%!important}
    .pdf-export .report-page .report-table-wrap{overflow:hidden!important}
    .pdf-export .report-page .report-table td.val{white-space:nowrap!important;overflow:hidden!important}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);

  function fitSoon(root){requestAnimationFrame(()=>requestAnimationFrame(()=>applyNumberSafety(root)));}
  if(typeof window.renderReport==='function'&&!window.__pdfNumberPreviewFix){window.__pdfNumberPreviewFix=true;const base=window.renderReport;window.renderReport=function(){const out=base.apply(this,arguments);fitSoon(document.getElementById('reportStage'));return out;};}
  if(typeof window.buildPages==='function'&&!window.__pdfNumberPageFix){window.__pdfNumberPageFix=true;const base=window.buildPages;window.buildPages=function(opts){const pages=base.call(this,opts||{});if(!Array.isArray(pages))return pages;return pages.map(p=>{const box=document.createElement('div');box.innerHTML=p.html;box.querySelectorAll('.report-table').forEach(t=>{const cols=Math.max(1,...[...t.querySelectorAll('tr')].map(r=>r.children.length));if(cols>=7)t.classList.add('report-table-wide');if(cols>=10)t.classList.add('report-table-very-wide');});return {...p,html:box.innerHTML};});};}

  /* html2canvas captures the actual mounted export page. Apply shrink-to-fit just
     before each capture so long currency/accounting values remain fully visible. */
  if(typeof window.html2canvas==='function'&&!window.__pdfCanvasFitGuard){window.__pdfCanvasFitGuard=true;const baseCanvas=window.html2canvas;window.html2canvas=async function(el,opts){applyNumberSafety(el);await new Promise(r=>requestAnimationFrame(r));applyNumberSafety(el);return baseCanvas.call(this,el,opts);};}
  window.applyPdfNumberSafety=applyNumberSafety;
})();