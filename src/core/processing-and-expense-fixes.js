/* Processing hardening + exact expense ratio rules. */
'use strict';
(function(){
  const absNum=v=>Math.abs(Number.isFinite(Number(v))?Number(v):(typeof num==='function'?num(v):0));

  /* Exact requested formula: Expense Ratio = Expense / Total Expense * 100.
   * The same selected/current period must be used for numerator and denominator.
   */
  function enforceExpenseRatios(md){
    if(!md || !Array.isArray(md.expenseGroups)) return;
    const total=absNum(md.metrics?.expenses);
    md.expenseGroups=md.expenseGroups
      .map(x=>({
        ...x,
        value:Number.isFinite(Number(x.value))?Number(x.value):(typeof num==='function'?num(x.value):0),
        pct:total?absNum(x.value)/total*100:0
      }))
      .filter(x=>absNum(x.value)>0.004)
      .sort((a,b)=>absNum(b.value)-absNum(a.value));
  }

  /* Keep the dashboard at Top 10 and calculate every displayed percentage
   * directly from Total Expenses, not from the Top-10 subtotal.
   */
  if(typeof renderDashboard==='function'&&!window.__udmrExpenseTop10Final){
    window.__udmrExpenseTop10Final=true;
    const base=renderDashboard;
    renderDashboard=function(){
      if(state?.model) enforceExpenseRatios(state.model);
      const out=base.apply(this,arguments);
      const md=state?.model,box=document.getElementById('chartExpenses');
      if(md&&box&&md.expenseGroups?.length){
        const top=md.expenseGroups.slice(0,10);
        const total=absNum(md.metrics?.expenses);
        box.innerHTML='<h3>Expense Breakdown — Top '+top.length+' Categories</h3>'+
          svgHBars({items:top,totalForPct:total||null,color:CHART_COLORS.teal,width:720});
      }
      return out;
    };
  }

  function safeRender(name,fn){
    if(typeof fn!=='function') return;
    try{ fn(); }
    catch(err){ console.error('Render step failed:',name,err); }
  }

  /* A report-preview/chart failure must never make a successfully read workbook
   * appear as an unreadable/failed workbook. Parse first, then render each area
   * independently so one optional view cannot abort financial processing.
   */
  function processModelSafely(){
    state.model=hasData()?parseWorkbook(state.sheets):null;
    if(state.model){
      enforceExpenseRatios(state.model);
      if(state.client==='Client'&&state.model.client) state.client=state.model.client;
      if(state.period==='For the period ended'&&state.model.period) state.period=state.model.period;
    }
    safeRender('topbar',typeof renderTopbar==='function'?renderTopbar:null);
    safeRender('dashboard',typeof renderDashboard==='function'?renderDashboard:null);
    safeRender('statements',typeof renderStatements==='function'?renderStatements:null);
    safeRender('editor',typeof renderEditor==='function'?renderEditor:null);
    safeRender('report preview',typeof renderReport==='function'?renderReport:null);
    try{ if(typeof persist==='function') persist(); }catch(err){ console.error('Persist failed',err); }
    return state.model;
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.getElementById('processBtn');
    const input=document.getElementById('fileInput');
    if(!btn||!input||typeof XLSX==='undefined') return;

    btn.onclick=async()=>{
      const f=input.files&&input.files[0];
      if(!f){ if(typeof toast==='function') toast('Choose an XLSX or CSV file first.'); return; }
      btn.disabled=true;
      const oldText=btn.textContent;
      btn.textContent='Processing…';
      try{
        /* Workbook I/O is isolated from analysis errors so the error message is accurate. */
        const buf=await f.arrayBuffer();
        const wb=XLSX.read(buf,{type:'array',cellDates:false,cellFormula:true});
        if(!wb?.SheetNames?.length) throw new Error('Workbook contains no worksheets');

        resetState();
        state.fileName=f.name;
        for(const name of wb.SheetNames){
          const ws=wb.Sheets[name];
          state.sheets[name]=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:'',blankrows:false});
        }
        state.active=wb.SheetNames[0]||'';
        const s1=document.getElementById('s1'); if(s1) s1.classList.add('done');

        try{
          processModelSafely();
        }catch(parseErr){
          /* Keep the imported workbook available for Review/Edit and direct exports,
           * but surface the real mapping error instead of falsely saying XLSX read failed. */
          console.error('Financial mapping failed',parseErr);
          state.model=null;
          safeRender('topbar',typeof renderTopbar==='function'?renderTopbar:null);
          safeRender('editor',typeof renderEditor==='function'?renderEditor:null);
          throw new Error('Financial mapping failed: '+(parseErr?.message||parseErr));
        }

        const s2=document.getElementById('s2'); if(s2) s2.classList.add('done');
        const s3=document.getElementById('s3'); if(s3) s3.classList.add('done');
        if(typeof goPage==='function') goPage('dashboard');
        if(typeof toast==='function') toast(`Processed ${wb.SheetNames.length} worksheet(s) from ${f.name}`);
      }catch(err){
        console.error(err);
        if(typeof toast==='function') toast(err?.message||String(err));
      }finally{
        btn.disabled=false;
        btn.textContent=oldText;
      }
    };
  });

  window.enforceExpenseRatios=enforceExpenseRatios;
  window.processModelSafely=processModelSafely;
})();
