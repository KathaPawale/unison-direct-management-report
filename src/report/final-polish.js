/* Final presentation fixes requested for PDF and Excel. */
'use strict';
(function(){
  /* Balance Sheet totals: highlight with upper separator only. */
  if(typeof document!=='undefined'&&!document.getElementById('udmr-equity-border-fix')){
    const st=document.createElement('style');
    st.id='udmr-equity-border-fix';
    st.textContent='.row-equity-total td,.row-equity-total th,.row-liab-equity-total td,.row-liab-equity-total th{border-top:2px solid #0B2F59!important;border-bottom:0!important;border-left:0!important;border-right:0!important;background:#EAF2FB!important;font-weight:700!important}.row-liab-equity-total+tr td,.row-liab-equity-total+tr th{border-top:0!important}';
    document.head.appendChild(st);
  }

  if(typeof reportTableParts==='function'&&!window.__udmrTablePolish){
    window.__udmrTablePolish=true;
    const baseParts=reportTableParts;
    reportTableParts=function(sm,opts){
      const out=baseParts(sm,opts);
      if(sm&&sm.role==='bs'){
        out.rows=out.rows.map(row=>{
          let h=row.html;
          const text=h.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
          if(/^Net Income\b/i.test(text)) h=h.replace(/\s*row-grand\b/g,'').replace(/\s*row-total\b/g,'').replace(/class="\s*"/g,'');
          if(/^Total (for )?Equity\b/i.test(text)) h=h.replace('<tr','<tr class="row-equity-total"');
          if(/^Total (for )?Liabilities and Equity\b/i.test(text)||/^Total Liabilities & Equity\b/i.test(text)) h=h.replace('<tr','<tr class="row-liab-equity-total"');
          return {...row,html:h};
        });
      }
      return out;
    };
  }

  /* Keep PDF analytical dashboard aging improvements. */
  if(typeof dashboardBodies==='function'&&!window.__udmrDashboardPolish){
    window.__udmrDashboardPolish=true;
    const baseDashboardBodies=dashboardBodies;
    dashboardBodies=function(no,title){
      const bodies=baseDashboardBodies(no,title);
      if(!state.model||bodies.length<2)return bodies;
      const md=state.model,p2=bodies[1];
      if(!p2)return bodies;
      let agingHtml='',agingSeries=[],labels=[];
      if(md.arAging&&md.arAging.buckets?.length){
        labels=md.arAging.buckets.map(b=>b.label);
        agingSeries.push({name:'A/R',color:CHART_COLORS.blue,values:md.arAging.buckets.map(b=>b.value)});
      }
      if(md.apAging&&md.apAging.buckets?.length){
        if(!labels.length)labels=md.apAging.buckets.map(b=>b.label);
        agingSeries.push({name:'A/P',color:CHART_COLORS.teal,values:md.apAging.buckets.map(b=>b.value)});
      }
      if(agingSeries.length){
        agingHtml='<div class="report-section-title dashboard-aging-title">Receivables & Payables Aging</div>'+chartLegend(agingSeries)+svgGroupedBars({series:agingSeries,labels,height:145});
      }else if((md.metrics?.ar||0)||(md.metrics?.ap||0)){
        agingHtml='<div class="report-section-title dashboard-aging-title">Receivables & Payables</div>'+svgHBars({items:[{label:'Accounts Receivable',value:md.metrics.ar||0},{label:'Accounts Payable',value:md.metrics.ap||0}],totalForPct:null,color:CHART_COLORS.teal});
      }
      if(agingHtml)bodies[1]=p2+'<div class="dashboard-aging-block">'+agingHtml+'</div>';
      return bodies;
    };
  }

  /* Excel: keep the original Analytical Summary generated in exports.js.
     Only apply Balance Sheet / P&L formatting fixes. */
  const prevWrite=XLSX.writeFile.bind(XLSX);
  XLSX.writeFile=function(wb,filename,opts){
    if(filename&&/Management-Report\.xlsx$/i.test(filename)&&wb?.SheetNames){
      /* Remove any old replacement dashboard if present and preserve Analytical Summary. */
      const dashboardIndex=wb.SheetNames.indexOf('Analytical Dashboard');
      if(dashboardIndex>=0){
        wb.SheetNames.splice(dashboardIndex,1);
        delete wb.Sheets['Analytical Dashboard'];
      }

      wb.SheetNames.forEach(name=>{
        const ws=wb.Sheets[name];
        if(!ws?.['!ref'])return;
        const rg=XLSX.utils.decode_range(ws['!ref']);
        const isBS=/Balance Sheet/i.test(name),isPL=/Profit and Loss|P&L/i.test(name);
        const navy='0B2F59',light='EAF2FB';

        if(isBS){
          for(let r=0;r<=rg.e.r;r++){
            const lbl=String(ws[XLSX.utils.encode_cell({r,c:0})]?.v||'').trim();
            if(/^Net Income$/i.test(lbl)){
              for(let c=0;c<=rg.e.c;c++){
                const x=ws[XLSX.utils.encode_cell({r,c})];
                if(x){
                  const s=JSON.parse(JSON.stringify(x.s||{}));
                  delete s.fill; delete s.border;
                  s.font={...(s.font||{}),bold:false,color:{rgb:'243B57'}};
                  x.s=s;
                }
              }
            }
            if(/^Total (for )?Equity$/i.test(lbl)||/^Total (for )?Liabilities and Equity$/i.test(lbl)||/^Total Liabilities & Equity$/i.test(lbl)){
              for(let c=0;c<=rg.e.c;c++){
                const a=XLSX.utils.encode_cell({r,c}),x=ws[a]||{v:'',t:'s'};
                ws[a]=x;
                x.s={...(x.s||{}),font:{...((x.s||{}).font||{}),bold:true,color:{rgb:navy}},fill:{fgColor:{rgb:light}},border:{top:{style:'medium',color:{rgb:navy}}}};
              }
            }
          }
        }

        if(isPL){
          for(let c=0;c<=rg.e.c;c++){
            const a=XLSX.utils.encode_cell({r:rg.e.r,c}),x=ws[a]||{v:'',t:'s'};
            ws[a]=x;
            x.s={...(x.s||{}),border:{...((x.s||{}).border||{}),bottom:{style:'medium',color:{rgb:navy}}}};
          }
        }
      });
    }
    return prevWrite(wb,filename,opts);
  };
})();