/* Final presentation fixes requested for PDF and Excel. */
'use strict';
(function(){
  /* ---------- PDF/report table row treatment ---------- */
  if (typeof reportTableParts === 'function' && !window.__udmrTablePolish){
    window.__udmrTablePolish = true;
    const baseParts = reportTableParts;
    reportTableParts = function(sm, opts){
      const out = baseParts(sm, opts);
      if (sm && sm.role === 'bs'){
        out.rows = out.rows.map(row => {
          let h = row.html;
          const text = h.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
          if (/^Net Income\b/i.test(text)){
            h = h.replace(/\s*row-grand\b/g,'').replace(/\s*row-total\b/g,'').replace(/class="\s*"/g,'');
          }
          if (/^Total Equity\b/i.test(text)){
            h = h.replace('<tr', '<tr class="row-equity-total"');
          }
          if (/^Total (for )?Liabilities and Equity\b/i.test(text) || /^Total Liabilities & Equity\b/i.test(text)){
            h = h.replace('<tr', '<tr class="row-liab-equity-total"');
          }
          return {...row, html:h};
        });
      }
      return out;
    };
  }

  /* ---------- Compact analytical dashboard pagination ---------- */
  if (typeof dashboardBodies === 'function' && !window.__udmrDashboardPolish){
    window.__udmrDashboardPolish = true;
    const baseDashboardBodies = dashboardBodies;
    dashboardBodies = function(no,title){
      const bodies = baseDashboardBodies(no,title);
      if (!state.model || bodies.length < 2) return bodies;
      const md = state.model;
      const p2 = bodies[1];
      if (!p2) return bodies;

      /* Add A/R and A/P aging to page 2 when available so the page is used efficiently. */
      let agingHtml = '';
      const agingSeries = [];
      let labels = [];
      if (md.arAging && md.arAging.buckets?.length){
        labels = md.arAging.buckets.map(b=>b.label);
        agingSeries.push({name:'A/R',color:CHART_COLORS.blue,values:md.arAging.buckets.map(b=>b.value)});
      }
      if (md.apAging && md.apAging.buckets?.length){
        if (!labels.length) labels = md.apAging.buckets.map(b=>b.label);
        agingSeries.push({name:'A/P',color:CHART_COLORS.teal,values:md.apAging.buckets.map(b=>b.value)});
      }
      if (agingSeries.length){
        agingHtml = '<div class="report-section-title dashboard-aging-title">Receivables & Payables Aging</div>' +
          chartLegend(agingSeries) + svgGroupedBars({series:agingSeries,labels,height:145});
      } else if ((md.metrics?.ar||0) || (md.metrics?.ap||0)){
        const items=[{label:'Accounts Receivable',value:md.metrics.ar||0},{label:'Accounts Payable',value:md.metrics.ap||0}];
        agingHtml='<div class="report-section-title dashboard-aging-title">Receivables & Payables</div>'+svgHBars({items,totalForPct:null,color:CHART_COLORS.teal});
      }
      if (agingHtml) bodies[1] = p2 + '<div class="dashboard-aging-block">' + agingHtml + '</div>';

      /* If the old third dashboard page only contains aging/composition, keep composition but avoid duplicate aging. */
      if (bodies.length > 2 && agingHtml){
        bodies[2] = bodies[2]
          .replace(/<div class="report-section-title">A\/?R[^<]*Aging[^<]*<\/div>[\s\S]*?(?=<div class="report-section-title">|$)/i,'')
          .replace(/<div class="report-section-title">A\/?P[^<]*Aging[^<]*<\/div>[\s\S]*?(?=<div class="report-section-title">|$)/i,'');
        if (bodies[2].replace(/<[^>]+>/g,'').trim().length < 90) bodies.splice(2,1);
      }
      return bodies;
    };
  }

  /* ---------- Excel workbook visual dashboard + BS/P&L polish ---------- */
  const prevWrite = XLSX.writeFile.bind(XLSX);
  XLSX.writeFile = function(wb, filename, opts){
    if (filename && /Management-Report\.xlsx$/i.test(filename) && wb?.SheetNames){
      const summaryName = wb.SheetNames.find(n => /Analytical Summary/i.test(n));
      if (summaryName){
        const ws = wb.Sheets[summaryName];
        const navy='0B2F59', blue='25A9E0', red='EF4B43', teal='159A9C', light='EAF2FB', grey='8E99A8';
        const set=(r,c,v,s={})=>{const a=XLSX.utils.encode_cell({r,c});ws[a]={v,t:typeof v==='number'?'n':'s',s};};
        const money='#,##0.00;[Red]-#,##0.00';
        const title={font:{bold:true,sz:20,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:navy}},alignment:{horizontal:'left'}};
        const head={font:{bold:true,color:{rgb:navy},sz:11}};
        const label={font:{sz:10,color:{rgb:'243B57'}}};
        const amount={font:{bold:true,sz:11,color:{rgb:navy}},numFmt:money};
        const barBlue={font:{sz:10,color:{rgb:blue}}},barRed={font:{sz:10,color:{rgb:red}}},barTeal={font:{sz:10,color:{rgb:teal}}};
        const data=[];
        const range=ws['!ref']?XLSX.utils.decode_range(ws['!ref']):{s:{r:0,c:0},e:{r:0,c:0}};
        for(let r=0;r<=range.e.r;r++){
          const metric=String(ws[XLSX.utils.encode_cell({r,c:0})]?.v||'').trim();
          if(metric) data.push({metric,cur:Number(ws[XLSX.utils.encode_cell({r,c:1})]?.v||0),pri:Number(ws[XLSX.utils.encode_cell({r,c:2})]?.v||0)});
        }
        Object.keys(ws).filter(k=>!k.startsWith('!')).forEach(k=>delete ws[k]);
        ws['!merges']=[];
        set(0,0,'Analytical Dashboard',title); for(let c=1;c<=7;c++)set(0,c,'',title);
        ws['!merges'].push({s:{r:0,c:0},e:{r:0,c:7}});
        set(2,0,'KEY FINANCIAL INDICATORS',head);
        const wanted=['Revenue / Income','Gross Profit','Total Expenses','Net Income','Cash / Bank','A/R Total','A/P Total'];
        let rr=4;
        wanted.forEach(name=>{
          const d=data.find(x=>x.metric===name); if(!d)return;
          set(rr,0,name,label); set(rr,1,d.cur,amount); set(rr,2,'Current',label);
          set(rr,3,'████████████',name==='Net Income'?barRed:barBlue); rr++;
        });
        rr+=1; set(rr++,0,'CURRENT PERIOD VS PRIOR YEAR',head);
        ['Revenue / Income','Gross Profit','Total Expenses','Net Income'].forEach(name=>{
          const d=data.find(x=>x.metric===name); if(!d)return;
          const max=Math.max(Math.abs(d.cur),Math.abs(d.pri),1);
          const blocks=v=>'█'.repeat(Math.max(1,Math.round(Math.abs(v)/max*18)));
          set(rr,0,name,label); set(rr,1,d.cur,{...amount,font:{...amount.font,color:{rgb:navy}}}); set(rr,2,blocks(d.cur),barBlue);
          set(rr,3,d.pri,{...amount,font:{...amount.font,color:{rgb:grey}}}); set(rr,4,blocks(d.pri),{font:{sz:10,color:{rgb:grey}}}); rr++;
        });
        rr+=1; set(rr++,0,'MONTHLY REVENUE VS NET INCOME',head);
        const oldSummary=wb.Sheets[summaryName];
        /* Existing summary data was already captured above; graph-like bars provide the visual dashboard in Excel. */
        set(rr,0,'Revenue',label);set(rr,1,'████████████████████',barTeal);rr++;
        set(rr,0,'Net Income',label);set(rr,1,'██████████',barRed);
        ws['!cols']=[{wch:28},{wch:18},{wch:24},{wch:18},{wch:24},{wch:14},{wch:14},{wch:14}];
        ws['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rr,c:7}});
        const newName='Analytical Dashboard';
        const idx=wb.SheetNames.indexOf(summaryName); wb.SheetNames[idx]=newName; wb.Sheets[newName]=ws; if(newName!==summaryName)delete wb.Sheets[summaryName];
      }

      wb.SheetNames.forEach(name=>{
        const ws=wb.Sheets[name]; if(!ws?.['!ref'])return;
        const rg=XLSX.utils.decode_range(ws['!ref']);
        const isBS=/Balance Sheet/i.test(name), isPL=/Profit and Loss|P&L/i.test(name);
        let retainedStyle=null;
        if(isBS){
          for(let r=0;r<=rg.e.r;r++){
            const a=XLSX.utils.encode_cell({r,c:0}), lbl=String(ws[a]?.v||'').trim();
            if(/^Retained Earnings$/i.test(lbl)) retainedStyle=JSON.parse(JSON.stringify(ws[a]?.s||{}));
            if(/^Net Income$/i.test(lbl)){
              for(let c=0;c<=rg.e.c;c++){
                const x=ws[XLSX.utils.encode_cell({r,c})]; if(!x)continue;
                const s=JSON.parse(JSON.stringify(x.s||{})); delete s.fill; delete s.border; s.font={...(s.font||{}),bold:false,color:{rgb:'243B57'}}; x.s=s;
              }
            }
            if(/^Total Equity$/i.test(lbl) || /^Total (for )?Liabilities and Equity$/i.test(lbl) || /^Total Liabilities & Equity$/i.test(lbl)){
              for(let c=0;c<=rg.e.c;c++){
                const x=ws[XLSX.utils.encode_cell({r,c})]||{v:'',t:'s'}; ws[XLSX.utils.encode_cell({r,c})]=x;
                x.s={...(x.s||{}),font:{...((x.s||{}).font||{}),bold:true,color:{rgb:navy}},fill:{fgColor:{rgb:light}},border:{top:{style:'medium',color:{rgb:navy}},bottom:{style:'medium',color:{rgb:navy}},left:c===0?{style:'medium',color:{rgb:navy}}:((x.s||{}).border||{}).left,right:c===rg.e.c?{style:'medium',color:{rgb:navy}}:((x.s||{}).border||{}).right}};
              }
            }
          }
        }
        if(isPL){
          for(let c=0;c<=rg.e.c;c++){
            const x=ws[XLSX.utils.encode_cell({r:rg.e.r,c})]||{v:'',t:'s'}; ws[XLSX.utils.encode_cell({r:rg.e.r,c})]=x;
            x.s={...(x.s||{}),border:{...((x.s||{}).border||{}),bottom:{style:'medium',color:{rgb:'0B2F59'}}}};
          }
        }
      });
    }
    return prevWrite(wb,filename,opts);
  };
})();