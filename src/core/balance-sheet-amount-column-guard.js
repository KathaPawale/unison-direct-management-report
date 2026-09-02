/* Final generic guard for Balance Sheet amount-column detection.
 * Prevents percentage/ratio cells (for example 96.22%) from being interpreted as
 * Current Assets amounts. This is workbook-driven and contains no company-specific values. */
'use strict';
(function(){
  const norm=s=>String(s??'').toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const numeric=v=>typeof v==='number'&&Number.isFinite(v)||/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?$/.test(String(v??'').trim());
  const percentCell=v=>/%\s*$/.test(String(v??'').trim());
  const n=v=>{if(typeof v==='number')return v;const s=String(v??'').trim(),neg=/^\(.*\)$/.test(s),x=Number(s.replace(/[,$()\s]/g,''));return Number.isFinite(x)?(neg?-x:x):null;};
  const label=r=>norm((r||[]).filter(v=>!numeric(v)&&!percentCell(v)&&String(v??'').trim()).slice(0,4).join(' '));

  function isBalanceSheet(name,rows){
    const t=norm(name+' '+(rows||[]).slice(0,160).flat().join(' '));
    return /balance sheet|statement of financial position|statement of financial condition/.test(t)||(/total (for )?assets/.test(t)&&/liabilit/.test(t)&&/equity/.test(t));
  }

  function findTotalAssetsRow(rows){
    return (rows||[]).find(r=>/^total (for )?assets$|^assets total$|^total asset$/.test(label(r)));
  }

  function amountColumnFromTotalAssets(rows,sm){
    const row=findTotalAssetsRow(rows);
    if(!row)return null;
    const cols=sm?.cols||[];
    const percentIdx=new Set(cols.filter(c=>c?.type==='percent'||/percent|%|ratio/i.test(String(c?.label||c?.name||''))).map(c=>c.idx));
    const candidates=[];
    (row||[]).forEach((v,i)=>{
      if(percentIdx.has(i)||percentCell(v)||!numeric(v))return;
      const x=n(v);if(x==null)return;
      candidates.push({i,x,abs:Math.abs(x)});
    });
    if(!candidates.length)return null;

    /* Preserve an already-detected current column when Total Assets contains a real amount there. */
    const current=cols.find(c=>c?.type==='current'&&!percentIdx.has(c.idx));
    if(current&&candidates.some(x=>x.i===current.idx))return current.idx;

    /* Prefer the latest explicit year column when available. */
    let latest=null;
    for(const r of (rows||[]).slice(0,30)){
      (r||[]).forEach((v,i)=>{
        if(percentIdx.has(i))return;
        const m=String(v??'').match(/\b(19|20)\d{2}\b/);
        if(m&&candidates.some(x=>x.i===i)&&(!latest||+m[0]>latest.year))latest={year:+m[0],i};
      });
    }
    if(latest)return latest.i;

    /* On a single-period statement the financial amount is the substantive Total Assets value;
       percentage/ratio columns are excluded above. */
    candidates.sort((a,b)=>b.abs-a.abs);
    return candidates[0].i;
  }

  function guardColumns(){
    const md=window.state?.model;if(!md)return;
    for(const [name,rows] of Object.entries(window.state?.sheets||{})){
      if(!isBalanceSheet(name,rows))continue;
      const sm=md.sheetModels?.[name];if(!sm)continue;
      const idx=amountColumnFromTotalAssets(rows,sm);if(idx==null)continue;
      sm.cols=sm.cols||[];
      for(const c of sm.cols){if(c?.type==='current')c.type='amount';}
      const existing=sm.cols.find(c=>c?.idx===idx);
      if(existing)existing.type='current';
      else sm.cols.push({idx,type:'current',label:'Current amount'});
      sm.__validatedAmountColumn=idx;
    }
  }

  function fixSignedPercentages(){
    const md=window.state?.model,d=md?.validatedFinancials;if(!d)return;
    const den=Math.abs(Number(d.totalLiabilitiesAndEquity)||0);
    if(den){
      for(const x of d.liabilitiesEquity||[]){
        if(x?.value!=null)x.pct=Number(x.value)/den*100;
      }
      if(md.bsComposition?.liabEquity)md.bsComposition.liabEquity=d.liabilitiesEquity;
      if(Array.isArray(md.balanceSheetComposition)){
        md.balanceSheetComposition=[...(d.assets||[]),...(d.liabilitiesEquity||[])];
      }
    }
  }

  /* Loaded after validated-financial-dataset.js so this guard executes before its calculation wrapper. */
  if(typeof window.renderDashboard==='function'&&!window.__bsAmountColumnGuardDashboard){
    window.__bsAmountColumnGuardDashboard=true;
    const base=window.renderDashboard;
    window.renderDashboard=function(){
      guardColumns();
      const out=base.apply(this,arguments);
      fixSignedPercentages();
      /* Refresh the validated detail table after signed percentages are corrected. */
      const box=document.getElementById('chartBs');
      if(box&&typeof window.validatedFinancialAnalysisTable==='function'){
        const old=box.querySelector('.validated-financial-table');
        if(old)old.outerHTML=window.validatedFinancialAnalysisTable();
      }
      return out;
    };
  }

  if(typeof window.buildPages==='function'&&!window.__bsAmountColumnGuardReport){
    window.__bsAmountColumnGuardReport=true;
    const base=window.buildPages;
    window.buildPages=function(o){guardColumns();const out=base.call(this,o||{});fixSignedPercentages();return out;};
  }

  if(typeof window.buildValidatedFinancialDataset==='function'){
    const base=window.buildValidatedFinancialDataset;
    window.buildValidatedFinancialDataset=function(){guardColumns();const out=base.apply(this,arguments);fixSignedPercentages();return out;};
  }

  window.applyBalanceSheetAmountColumnGuard=function(){guardColumns();return window.buildValidatedFinancialDataset?.();};
})();