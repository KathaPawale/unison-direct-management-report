/* Final report display fixes: centered headings + year labels stay as years. Loaded last. */
'use strict';
(function(){
  const esc=s=>typeof escapeHtml==='function'?escapeHtml(s):String(s??'');
  const yearOnly=v=>/^\s*(19|20)\d{2}\s*$/.test(String(v??''));

  if(typeof formatReportCell==='function'&&!window.__finalYearDisplayFix){
    window.__finalYearDisplayFix=true;
    const base=formatReportCell;
    formatReportCell=function(v,colType){
      if(yearOnly(v)) return esc(String(v).trim());
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

  function normalizeComparativeHeaders(){
    document.querySelectorAll('#plCompView th,#plCompView td,#plView th,#bsView th').forEach(el=>{
      const t=String(el.textContent||'').trim();
      const m=t.match(/^\$?\s*((?:19|20)\d{2})(?:\.00)?$/);
      if(m) el.textContent=m[1];
    });
  }

  if(typeof renderFinancials==='function'&&!window.__finalComparativeHeaderFix){
    window.__finalComparativeHeaderFix=true;
    const base=renderFinancials;
    renderFinancials=function(){const out=base.apply(this,arguments);normalizeComparativeHeaders();return out;};
  }

  window.normalizeComparativeYearHeaders=normalizeComparativeHeaders;
})();
