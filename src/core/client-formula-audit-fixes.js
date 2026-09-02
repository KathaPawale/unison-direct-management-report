/* Final client formula audit fixes — screenshots + issues 1–21. */
'use strict';
(function(){
  const n=v=>Number.isFinite(Number(v))?Number(v):(typeof num==='function'?num(v):0);
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const findLine=(sm,res)=>(sm?.lines||[]).find(l=>res.some(r=>r.test(norm(l.label))));
  const value=(sm,l,c)=>l&&c!=null?n(((state.sheets||{})[sm.name]||[])[l.r]?.[c]):0;
  const col=sm=>(sm?.cols||[]).find(c=>c.type==='current')?.idx ?? (sm?.cols||[]).find(c=>c.type==='rowTotal')?.idx ?? (sm?.cols||[]).filter(c=>c.idx>0&&c.type!=='change'&&c.type!=='percent').slice(-1)[0]?.idx;

  function apply(md){
    if(!md)return md;
    /* Comparative financials: never manufacture a prior year. A prior value is valid only when a distinct prior-year/period column exists. */
    const pn=md.roles?.plComparative||md.roles?.plMonthly||md.roles?.pl, pl=pn&&md.sheetModels?.[pn];
    if(pl){
      const years=(pl.cols||[]).filter(c=>c.idx>0&&/\b(19|20)\d{2}\b/.test(String(c.label||''))).map(c=>({c,y:+String(c.label).match(/\b(19|20)\d{2}\b/)[0]}));
      const uniq=[...new Set(years.map(x=>x.y))];
      const explicitPrior=(pl.cols||[]).find(c=>c.type==='prior');
      if(uniq.length<2&&!explicitPrior){md.prior={income:null,gross:null,expenses:null,net:null};}
    }

    /* Expense ratio is exactly Expense / Total Expense * 100. */
    if(Array.isArray(md.expenseGroups)){
      const total=Math.abs(n(md.metrics?.expenses));
      md.expenseGroups=md.expenseGroups.map(x=>({...x,pct:total?Math.abs(n(x.value))/total*100:0})).sort((a,b)=>Math.abs(n(b.value))-Math.abs(n(a.value)));
    }

    /* Balance-sheet dashboard categories requested by client. Accumulated depreciation is excluded as a standalone slice. */
    const bn=md.roles?.bs, bs=bn&&md.sheetModels?.[bn];
    if(bs){
      const c=col(bs);
      const currentAssets=findLine(bs,[/^total current assets$/, /^current assets$/]);
      const fixedAssets=findLine(bs,[/^total fixed assets$/, /^fixed assets$/, /^property plant equipment$/, /^total property plant equipment$/]);
      const currentLiab=findLine(bs,[/^total current liabilities$/, /^current liabilities$/]);
      const longLiab=findLine(bs,[/^total (long term|longterm|non current) liabilities$/, /^(long term|longterm|non current) liabilities$/]);
      const equity=findLine(bs,[/^total equity$/, /^equity$/]);
      const totalAssets=findLine(bs,[/^total assets$/]);
      const totalLE=findLine(bs,[/^total liabilities (and|&) equity$/, /^total liabilities and equity$/]);
      const ta=Math.abs(value(bs,totalAssets,c))||Math.abs(n(md.metrics?.assets));
      const tle=Math.abs(value(bs,totalLE,c))||ta;
      const ca=value(bs,currentAssets,c), fa=value(bs,fixedAssets,c), cl=value(bs,currentLiab,c), ll=value(bs,longLiab,c), eq=value(bs,equity,c);
      md.bsComposition={
        assets:[{label:'Current Assets',value:ca,pct:ta?Math.abs(ca)/ta*100:0},{label:'Fixed Assets',value:fa,pct:ta?Math.abs(fa)/ta*100:0}],
        liabEquity:[{label:'Current Liabilities',value:cl,pct:tle?Math.abs(cl)/tle*100:0},{label:'Long-Term Liabilities',value:ll,pct:tle?Math.abs(ll)/tle*100:0},{label:'Equity',value:eq,pct:tle?Math.abs(eq)/tle*100:0}]
      };
      md.liabilityBifurcation=[{label:'Current Liabilities',value:cl},{label:'Long-Term Liabilities',value:ll}];
    }
    return md;
  }

  /* Run immediately before every dashboard/report render so this is the final source of truth after older compatibility patches. */
  if(typeof renderDashboard==='function'&&!window.__clientFormulaAuditDashboard){window.__clientFormulaAuditDashboard=true;const base=renderDashboard;renderDashboard=function(){if(state?.model)apply(state.model);return base.apply(this,arguments);};}
  if(typeof buildPages==='function'&&!window.__clientFormulaAuditReport){window.__clientFormulaAuditReport=true;const base=buildPages;buildPages=function(opts){if(state?.model)apply(state.model);return base.call(this,opts||{});};}
  window.applyClientFormulaAuditFixes=apply;
})();
