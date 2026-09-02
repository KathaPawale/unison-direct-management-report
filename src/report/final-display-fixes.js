/* Final report display fixes: centered headings + year labels stay as years. Loaded last. */
'use strict';
(function(){
  const esc=s=>typeof escapeHtml==='function'?escapeHtml(s):String(s??'');
  const yearMatch=v=>String(v??'').trim().match(/^\$?\s*((?:19|20)\d{2})(?:\.00)?$/);

  /* Year values are labels, never currency. Applies before PDF/report HTML is built. */
  if(typeof formatReportCell==='function'&&!window.__finalYearDisplayFix){
    window.__finalYearDisplayFix=true;
    const base=formatReportCell;
    formatReportCell=function(v,colType){
      const ym=yearMatch(v);
      if(ym) return esc(ym[1]);
      return base.call(this,v,colType);
    };
  }

  if(typeof sectionHead==='function'&&!window.__finalCenteredReportHeading){
    window.__finalCenteredReportHeading=true;
    sectionHead=function(no,title,sub,continued=false){
      const client=state?.client||'';
      const period=sub||state?.period||'';
      return (typeof reportLogo==='function'?reportLogo():'')+
        '<div class="report-heading-center">'+
          '<div class="report-company-center">'+esc(client)+'</div>'+
          `<h2 class="report-title">${no?no+'. ':''}${esc(title)}${continued?' <span class="report-cont">(continued)</span>':''}</h2>`+
          '<div class="report-sub">'+esc(period)+'</div>'+
        '</div><div class="report-rule"></div>';
    };
  }

  function stripDollarFromYears(root){
    if(!root)return;
    root.querySelectorAll('th,td,span,div').forEach(el=>{
      if(el.children.length) return;
      const ym=yearMatch(el.textContent);
      if(ym) el.textContent=ym[1];
    });
  }

  function normalizeComparativeHeaders(){
    ['plCompView','plView','bsView','reportStage','pdfExport','pdfMeasure'].forEach(id=>stripDollarFromYears(document.getElementById(id)));
  }

  if(typeof renderFinancials==='function'&&!window.__finalComparativeHeaderFix){
    window.__finalComparativeHeaderFix=true;
    const base=renderFinancials;
    renderFinancials=function(){const out=base.apply(this,arguments);normalizeComparativeHeaders();return out;};
  }

  /* buildPages creates the HTML later used by PDF export, so sanitize years after pages are built. */
  if(typeof buildPages==='function'&&!window.__finalPdfYearFix){
    window.__finalPdfYearFix=true;
    const base=buildPages;
    buildPages=function(o){
      const out=base.call(this,o||{});
      setTimeout(normalizeComparativeHeaders,0);
      return out;
    };
  }

  /* Final DOM guard for report preview and hidden PDF export containers. */
  if(typeof MutationObserver!=='undefined'){
    const obs=new MutationObserver(()=>normalizeComparativeHeaders());
    const start=()=>['reportStage','pdfExport','pdfMeasure'].forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el,{childList:true,subtree:true,characterData:true});});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }

  window.normalizeComparativeYearHeaders=normalizeComparativeHeaders;
})();
