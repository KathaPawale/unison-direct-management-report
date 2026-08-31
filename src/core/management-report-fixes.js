/* Unison Direct Management Reporting — consolidated accuracy fixes (Aug 2026)
 * Corrects revenue capture, comparative periods, multi-year handling, monthly charts,
 * expense percentages, BS composition, aging imports, PDF numbering/period typography,
 * negative Net Income styling and Excel accounting/borders.
 */
'use strict';
(function(){
  const YEAR_RE = /\b(19|20)\d{2}\b/g;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const n = v => Number.isFinite(Number(v)) ? Number(v) : (typeof num === 'function' ? num(v) : 0);
  const abs = v => Math.abs(n(v));
  const yr = s => { const m=String(s||'').match(YEAR_RE); return m ? +m[m.length-1] : null; };
  const normPeriod = s => String(s||'').replace(/\s*[-–—]\s*/g,' – ').replace(/\s{2,}/g,' ').trim();
  const rowValue = (sm, idx, c) => {
    if(!sm || idx==null || c==null || !sm.lines[idx]) return 0;
    const row=(state.sheets[sm.name]||[])[sm.lines[idx].r]||[];
    return n(row[c]);
  };
  const lineIdx = (sm, labels) => {
    if(!sm) return null;
    const keys=Object.keys(sm.byLabel||{});
    for(const lab of labels){
      const exact=sm.byLabel[String(lab).toLowerCase()];
      if(exact!==undefined) return exact;
    }
    for(const k of keys){
      if(labels.some(l => typeof l==='object' && l.test(k))) return sm.byLabel[k];
    }
    return null;
  };
  const metricAt = (sm, labels, c) => {
    const i=lineIdx(sm,labels); return i==null ? 0 : rowValue(sm,i,c);
  };
  const periodCols = sm => (sm?.cols||[]).filter(c=>c.idx>0 && c.type!=='label' && c.type!=='change' && c.type!=='percent' && c.type!=='rowTotal')
    .map(c=>({...c,year:yr(c.label)}));
  const yearCols = sm => periodCols(sm).filter(c=>c.year).sort((a,b)=>b.year-a.year || a.idx-b.idx);

  function directMembers(sm, openerIdx, valueCol){
    const out=[];
    if(!sm || openerIdx==null || openerIdx<0) return out;
    const opener=sm.lines[openerIdx];
    const endR=opener?.totalIdx!=null ? sm.lines[opener.totalIdx]?.r : Infinity;
    let skipUntil=-1;
    for(let i=openerIdx+1;i<sm.lines.length;i++){
      const l=sm.lines[i];
      if(l.r>=endR) break;
      if(l.r<=skipUntil) continue;
      if(l.totalIdx!=null){
        const tl=sm.lines[l.totalIdx];
        out.push({label:l.label,value:rowValue(sm,l.totalIdx,valueCol)});
        skipUntil=tl.r;
      }else if(l.kind==='account') out.push({label:l.label,value:rowValue(sm,i,valueCol)});
    }
    return out;
  }

  function agingFromSheet(sm){
    if(!sm) return null;
    const buckets=(sm.cols||[]).filter(c=>c.type==='bucket');
    if(!buckets.length) return null;
    const totalCol=(sm.cols||[]).find(c=>c.type==='rowTotal');
    const gl=[...(sm.lines||[])].reverse().find(l=>l.kind==='grandTotal'||l.kind==='total');
    if(!gl) return null;
    const row=(state.sheets[sm.name]||[])[gl.r]||[];
    const vals=buckets.map(b=>({label:b.label,value:n(row[b.idx])}));
    return {buckets:vals,total:totalCol?n(row[totalCol.idx]):vals.reduce((s,x)=>s+x.value,0)};
  }

  function postProcess(md){
    if(!md) return md;
    md.period=normPeriod(md.period);

    /* More tolerant A/R and A/P sheet discovery, including A P / A R / AP / AR names. */
    for(const [name,sm] of Object.entries(md.sheetModels||{})){
      const t=name.toLowerCase().replace(/[._-]+/g,' ');
      if(!md.roles.ar && /(^|\s)(a\s*\/?\s*r|ar)(\s|$).*aging|accounts receivable.*aging/.test(t)){md.roles.ar=name;sm.role='ar';}
      if(!md.roles.ap && /(^|\s)(a\s*\/?\s*p|ap)(\s|$).*aging|accounts payable.*aging/.test(t)){md.roles.ap=name;sm.role='ap';}
    }
    if(md.roles.ar) md.arAging=agingFromSheet(md.sheetModels[md.roles.ar])||md.arAging;
    if(md.roles.ap) md.apAging=agingFromSheet(md.sheetModels[md.roles.ap])||md.apAging;

    const plName=md.roles.plComparative||md.roles.plMonthly||md.roles.pl;
    const pl=plName?md.sheetModels[plName]:null;
    const yc=yearCols(pl);
    const currentYear = yc.length ? yc[0] : null;
    const priorYear = yc.length>1 ? yc.find(c=>c.year<currentYear.year) : null;
    const currentCol = currentYear?.idx ?? (pl?.cols||[]).find(c=>c.type==='current')?.idx ?? (pl?.cols||[]).find(c=>c.type==='rowTotal')?.idx ?? null;
    const priorCol = priorYear?.idx ?? (pl?.cols||[]).find(c=>c.type==='prior')?.idx ?? null;
    const labels={
      income:['total income','total revenue','revenue','sales','sales income','service income',/total.*(income|revenue|sales)/i],
      gross:['gross profit',/gross profit/i],
      expenses:['total expenses','total operating expenses','operating expenses','expenses',/total.*expenses/i],
      net:['net income','net profit','profit for the period',/net (income|profit)/i]
    };
    if(pl && currentCol!=null){
      let income=metricAt(pl,labels.income,currentCol);
      /* If no explicit revenue total exists, sum the direct members of the Income/Revenue section. */
      if(Math.abs(income)<0.005){
        const oi=lineIdx(pl,['income','revenue','sales']);
        if(oi!=null) income=directMembers(pl,oi,currentCol).reduce((s,x)=>s+n(x.value),0);
      }
      md.metrics.income=income;
      md.metrics.gross=metricAt(pl,labels.gross,currentCol)||income;
      md.metrics.expenses=metricAt(pl,labels.expenses,currentCol);
      md.metrics.net=metricAt(pl,labels.net,currentCol);
    }
    if(pl && priorCol!=null && priorCol!==currentCol){
      md.prior.income=metricAt(pl,labels.income,priorCol);
      md.prior.gross=metricAt(pl,labels.gross,priorCol)||md.prior.income;
      md.prior.expenses=metricAt(pl,labels.expenses,priorCol);
      md.prior.net=metricAt(pl,labels.net,priorCol);
    }else if(!md.roles.plComparative && yc.length<2){
      md.prior.income=md.prior.gross=md.prior.expenses=md.prior.net=null;
    }

    /* Preserve every year instead of collapsing all non-current columns into one prior year. */
    md.yearlyFinancials = yc.map(c=>({
      year:c.year,label:c.label||String(c.year),
      income:metricAt(pl,labels.income,c.idx),gross:metricAt(pl,labels.gross,c.idx),
      expenses:metricAt(pl,labels.expenses,c.idx),net:metricAt(pl,labels.net,c.idx)
    })).filter((x,i,a)=>a.findIndex(y=>y.year===x.year)===i);

    /* Never place annual figures into January. Monthly charts are populated only from real month columns. */
    const pm=md.roles.plMonthly?md.sheetModels[md.roles.plMonthly]:null;
    const monthCols=(pm?.cols||[]).filter(c=>c.type==='month').sort((a,b)=>(a.year||0)-(b.year||0)||a.idx-b.idx);
    if(pm && monthCols.length){
      const latest=Math.max(...monthCols.map(c=>c.year||0));
      const latestCols=monthCols.filter(c=>(c.year||latest)===latest);
      const getSeries = labs => { const i=lineIdx(pm,labs); return i==null?latestCols.map(()=>0):latestCols.map(c=>rowValue(pm,i,c.idx)); };
      md.months=latestCols.map(c=>({label:c.label,short:c.short||String(c.label).slice(0,3),col:c.idx,year:c.year}));
      md.monthlyRevenue=getSeries(labels.income); md.monthlyNet=getSeries(labels.net); md.monthlyExpenses=getSeries(labels.expenses);
    }else{
      md.months=[]; md.monthlyRevenue=[]; md.monthlyNet=[]; md.monthlyExpenses=[];
    }

    /* Expense breakdown: direct expense members only; exact requested formula = Expense / Total Expense × 100. */
    const expSm=pm||pl;
    if(expSm){
      const vcol=(expSm.cols||[]).find(c=>c.type==='rowTotal')?.idx ?? currentCol ?? 1;
      let ei=lineIdx(expSm,['expenses','operating expenses']);
      if(ei==null){
        const ti=lineIdx(expSm,['total expenses','total operating expenses']);
        if(ti!=null){
          const totalLine=expSm.lines[ti];
          for(let i=ti-1;i>=0;i--){if(expSm.lines[i].totalIdx===ti){ei=i;break;}}
        }
      }
      if(ei!=null){
        const total=abs(md.metrics.expenses)||abs(rowValue(expSm,expSm.lines[ei].totalIdx,vcol));
        md.expenseGroups=directMembers(expSm,ei,vcol).filter(x=>abs(x.value)>0.004)
          .map(x=>({...x,pct:total?abs(x.value)/total*100:0})).sort((a,b)=>abs(b.value)-abs(a.value));
      }
    }

    /* BS composition: direct groups only; percentages use Total Assets / Total L&E denominators. */
    const bs=md.roles.bs?md.sheetModels[md.roles.bs]:null;
    if(bs){
      const bsc=yearCols(bs)[0]?.idx ?? (bs.cols||[]).find(c=>c.type==='current')?.idx ?? 1;
      const assetsIdx=lineIdx(bs,['assets']);
      const leIdx=lineIdx(bs,['liabilities and equity','liabilities & equity']);
      const liIdx=lineIdx(bs,['liabilities']); const eqIdx=lineIdx(bs,['equity']);
      const assets=assetsIdx!=null?directMembers(bs,assetsIdx,bsc):[];
      let le=leIdx!=null?directMembers(bs,leIdx,bsc):[];
      if(!le.length) le=[...(liIdx!=null?directMembers(bs,liIdx,bsc):[]),...(eqIdx!=null?directMembers(bs,eqIdx,bsc):[])];
      const totalAssets=abs(md.metrics.assets)||assets.reduce((s,x)=>s+abs(x.value),0);
      const totalLE=le.reduce((s,x)=>s+abs(x.value),0);
      md.bsComposition={
        assets:assets.filter(x=>abs(x.value)>0.004).map(x=>({...x,pct:totalAssets?abs(x.value)/totalAssets*100:0})),
        liabEquity:le.filter(x=>abs(x.value)>0.004).map(x=>({...x,pct:totalLE?abs(x.value)/totalLE*100:0}))
      };
    }
    return md;
  }

  if(typeof parseWorkbook==='function'&&!window.__udmrAccuracyParser){
    window.__udmrAccuracyParser=true; const base=parseWorkbook;
    parseWorkbook=function(sheets){return postProcess(base(sheets));};
  }

  /* Dashboard: when only annual data exists, show all years instead of a fake January. */
  if(typeof renderDashboard==='function'&&!window.__udmrAccuracyDashboard){
    window.__udmrAccuracyDashboard=true; const base=renderDashboard;
    renderDashboard=function(){
      base(); const md=state.model; if(!md) return;
      const box=document.getElementById('chartMonthly');
      if(box && (!md.months?.length || !md.monthlyRevenue?.length) && md.yearlyFinancials?.length){
        const yrs=[...md.yearlyFinancials].sort((a,b)=>a.year-b.year);
        const series=[{name:'Revenue / Income',color:CHART_COLORS.blue,values:yrs.map(x=>x.income)},{name:'Net Income',color:CHART_COLORS.red,values:yrs.map(x=>x.net)}];
        box.innerHTML='<div class="chart-sub">Yearly Revenue vs Net Income</div>'+chartLegend(series)+svgGroupedBars({series,labels:yrs.map(x=>String(x.year)),height:230});
        const comp=document.getElementById('comparisonTable');
        if(comp) comp.innerHTML='<table><tr><th>Year</th><th>Revenue / Income</th><th>Total Expenses</th><th>Net Income</th></tr>'+yrs.map(x=>`<tr><td>${x.year}</td><td>${money(x.income)}</td><td>${money(x.expenses)}</td><td class="${x.net<0?'neg':''}">${money(x.net)}</td></tr>`).join('')+'</table>';
      }
      const ex=document.getElementById('chartExpenses');
      if(ex && md.expenseGroups?.length){
        const top=md.expenseGroups.slice(0,10);
        ex.innerHTML='<h3>Expense Breakdown — Top '+top.length+' Categories</h3>'+svgHBars({items:top,totalForPct:abs(md.metrics.expenses)||null,color:CHART_COLORS.teal,width:720});
      }
    };
  }

  /* PDF/dashboard report yearly fallback and correct TOC/page numbering. */
  if(typeof dashboardBodies==='function'&&!window.__udmrAccuracyReportDashboard){
    window.__udmrAccuracyReportDashboard=true; const base=dashboardBodies;
    dashboardBodies=function(no,title){
      const md=state.model;
      if(md && (!md.months?.length || !md.monthlyRevenue?.length) && md.yearlyFinancials?.length){
        const saved={months:md.months,monthlyRevenue:md.monthlyRevenue,monthlyNet:md.monthlyNet};
        const yrs=[...md.yearlyFinancials].sort((a,b)=>a.year-b.year);
        md.months=yrs.map(x=>({short:String(x.year)})); md.monthlyRevenue=yrs.map(x=>x.income); md.monthlyNet=yrs.map(x=>x.net);
        const out=base(no,title).map(h=>h.replace(/Monthly Revenue vs Net Income/g,'Yearly Revenue vs Net Income').replace(/Net Margin by Month/g,'Net Margin by Year'));
        Object.assign(md,saved); return out;
      }
      return base(no,title);
    };
  }

  if(typeof buildPages==='function'&&!window.__udmrPdfNumberingFix){
    window.__udmrPdfNumberingFix=true; const base=buildPages;
    buildPages=function(opts){
      let pages=base(opts); const front=pages.filter(p=>p.sectionId==='cover'||p.sectionId==='toc').length;
      const contentCount=Math.max(0,pages.length-front);
      pages=pages.map((p,i)=>{
        let h=p.html;
        if(p.sectionId==='toc') h=h.replace(/<span class="toc-page">(\d+)(?:–(\d+))?<\/span>/g,(m,a,b)=>{
          const aa=Math.max(1,+a-front),bb=b?Math.max(1,+b-front):null;
          return `<span class="toc-page">${bb?aa+'–'+bb:aa}</span>`;
        });
        if(i>=front){
          const cp=i-front+1;
          h=h.replace(/Page \d+ of \d+/g,`Page ${cp} of ${contentCount}`);
        }else h=h.replace(/<span>Page \d+ of \d+<\/span>/g,'<span></span>');
        return {...p,html:h,pageNo:i<front?null:i-front+1};
      });
      return pages;
    };
  }

  /* Ensure negative Net Income is visibly red in statements and PDF. */
  if(typeof reportTableParts==='function'&&!window.__udmrNetIncomeRed){
    window.__udmrNetIncomeRed=true; const base=reportTableParts;
    reportTableParts=function(sm,opts){
      const out=base(sm,opts);
      if(sm && /^pl/.test(sm.role||'')) out.rows=out.rows.map(r=>{
        const txt=r.html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        return /^Net Income\b/i.test(txt)?{...r,html:r.html.replace('<tr','<tr class="net-income-row"')}:r;
      });
      return out;
    };
  }

  /* Excel: full used-range borders + accounting 2 decimals on every numeric report cell. */
  if(typeof XLSX!=='undefined'&&XLSX.writeFile&&!window.__udmrExcelAccuracyFix){
    window.__udmrExcelAccuracyFix=true; const write=XLSX.writeFile.bind(XLSX);
    XLSX.writeFile=function(wb,filename,opts){
      if(filename&&/Management-Report\.xlsx$/i.test(filename)&&wb?.SheetNames){
        wb.SheetNames.forEach(name=>{
          const ws=wb.Sheets[name]; if(!ws?.['!ref']) return;
          const rg=XLSX.utils.decode_range(ws['!ref']);
          for(let r=rg.s.r;r<=rg.e.r;r++) for(let c=rg.s.c;c<=rg.e.c;c++){
            const a=XLSX.utils.encode_cell({r,c}); const x=ws[a]||(ws[a]={t:'s',v:''});
            const s=JSON.parse(JSON.stringify(x.s||{}));
            const side={style:'thin',color:{rgb:'C9D5E3'}};
            s.border={...(s.border||{}),top:(s.border||{}).top||side,bottom:(s.border||{}).bottom||side,left:(s.border||{}).left||side,right:(s.border||{}).right||side};
            if(typeof x.v==='number'){
              s.numFmt='#,##0.00;[Red](#,##0.00);-';
              s.alignment={...(s.alignment||{}),horizontal:'right'};
              if(x.v<0)s.font={...(s.font||{}),color:{rgb:'C93438'}};
            }
            x.s=s;
          }
        });
      }
      return write(wb,filename,{cellStyles:true,...(opts||{})});
    };
  }

  if(typeof document!=='undefined'&&!document.getElementById('udmr-accuracy-style')){
    const st=document.createElement('style'); st.id='udmr-accuracy-style'; st.textContent=`
      .net-income-row td.val.neg,.net-income-row td.neg{color:#c93438!important;font-weight:700!important}
      .report-page .chart-svg{max-width:100%;height:auto;overflow:visible}
      .report-page .donut-row{display:flex!important;gap:18px!important;align-items:flex-start!important;flex-wrap:wrap!important}
      .dashboard-compare-table td,.report-compare-table td{font-variant-numeric:tabular-nums}
      .edit-table input{text-align:right;font-variant-numeric:tabular-nums}
    `; document.head.appendChild(st);
  }
})();