/* Preserve the existing report design while preventing financial values from clipping. */
'use strict';
(function(){
  function applyNumberSafety(root){
    if(!root) return;
    root.querySelectorAll('.report-table').forEach(table=>{
      const cols=Math.max(1,...[...table.querySelectorAll('tr')].map(r=>r.children.length));
      table.classList.toggle('report-table-wide',cols>=7);
      table.classList.toggle('report-table-very-wide',cols>=10);
    });
    root.querySelectorAll('.report-table td.val,.report-table th:not(.lbl),.report-mini-table td,.comparison td,.rkpi-value').forEach(el=>{
      el.style.fontVariantNumeric='tabular-nums';
      el.style.textOverflow='clip';
      el.style.overflow='visible';
      el.style.maxWidth='none';
    });
  }
  const style=document.createElement('style');
  style.id='pdf-number-clipping-fix-style';
  style.textContent=`
    /* Keep all content inside the existing Letter report page. */
    .report-page{overflow:hidden!important}
    .report-page .report-table-wrap{overflow:visible!important;max-width:100%!important}
    .report-page .report-table{width:100%!important;max-width:100%!important;table-layout:fixed!important}
    .report-page .report-table td.val{white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;font-variant-numeric:tabular-nums!important;padding-left:2px!important;padding-right:3px!important}
    .report-page .report-table thead th:not(.lbl){overflow:visible!important;text-overflow:clip!important;padding-left:2px!important;padding-right:3px!important}
    .report-page .report-table-wide{font-size:7.6px!important}
    .report-page .report-table-wide td.val{font-size:7.2px!important}
    .report-page .report-table-wide thead th{font-size:7.2px!important}
    .report-page .report-table-very-wide{font-size:6.8px!important}
    .report-page .report-table-very-wide td.val{font-size:6.4px!important}
    .report-page .report-table-very-wide thead th{font-size:6.4px!important}
    .report-page .report-table-wide td.lbl{width:24%!important}
    .report-page .report-table-very-wide td.lbl{width:21%!important}
    .report-page .rkpi{min-width:0!important}
    .report-page .rkpi-value{white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;font-size:15px!important;font-variant-numeric:tabular-nums!important}
    .pdf-export .report-page .report-table-wrap{overflow:visible!important}
    .pdf-export .report-page .report-table td.val{white-space:nowrap!important;overflow:visible!important}
  `;
  if(!document.getElementById(style.id)) document.head.appendChild(style);

  if(typeof window.renderReport==='function'&&!window.__pdfNumberPreviewFix){
    window.__pdfNumberPreviewFix=true;
    const base=window.renderReport;
    window.renderReport=function(){const out=base.apply(this,arguments);requestAnimationFrame(()=>applyNumberSafety(document.getElementById('reportStage')));return out;};
  }
  if(typeof window.buildPages==='function'&&!window.__pdfNumberPageFix){
    window.__pdfNumberPageFix=true;
    const base=window.buildPages;
    window.buildPages=function(opts){
      const pages=base.call(this,opts||{});
      if(!Array.isArray(pages)) return pages;
      return pages.map(p=>{
        const box=document.createElement('div');box.innerHTML=p.html;
        applyNumberSafety(box);
        return {...p,html:box.innerHTML};
      });
    };
  }
  window.applyPdfNumberSafety=applyNumberSafety;
})();