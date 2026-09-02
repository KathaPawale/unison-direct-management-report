/* Final client formula audit fixes — screenshots + issues 1–21. */
'use strict';
(function(){
  const n=v=>Number.isFinite(Number(v))?Number(v):(typeof num==='function'?num(v):0);
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const findLine=(sm,res)=>(sm?.lines||[]).find(l=>res.some(r=>r.test(norm(l.label))));
  const value=(sm,l,c)=>l&&c!=null?n(((state.sheets||{})[sm.name]||[])[l.r]?.[c]):0;
  const col=sm=>(sm?.cols||[]).find(c=>c.type==='current')?.idx ?? (sm?.cols||[]).find(c=>c.type==='rowTotal')?.idx ?? (sm?.cols||[]).filter(c=>c.idx>0&&c.type!=='change'&&c.type!=='percent').slice(-1)[0]?.idx;
  const year=s=>{const m=String(s||'').match(/\b(19|20)\d{2}\b/);return m?+m[0]:null;};
  const cleanPct=v=>Number.isFinite(v)?Math.max(0,Math.min(100,v)):0;

  function apply(md){
    if(!md)return md;

    /* #10 + highlighted comparative screenshot: never manufacture a Prior Year.
       A valid prior requires either two distinct year columns, or distinct current/prior
       columns whose labels genuinely identify different periods. */
    const pn=md.roles?.plComparative||md.roles?.plMonthly||md.roles?.pl, pl=pn&&md.sheetModels?.[pn];
    if(pl){
      const periodCols=(pl.cols||[]).filter(c=>c.idx>0&&c.type!=='label'&&c.type!=='change'&&c.type!=='percent'&&c.type!=='rowTotal');
      const years=periodCols.map(c=>year(c.label)).filter(Boolean);
      const uniq=[...new Set(years)];
      const current=(pl.cols||[]).find(c=>c.type==='current');
      const prior=(pl.cols||[]).find(c=>c.type==='prior');
      const cy=year(current?.label), py=year(prior?.label);
      const distinctTypedPeriods=!!(current&&prior&&current.idx!==prior.idx&&((cy&&py&&cy!==py)||(/prior|previous|last year/i.test(String(prior.label||''))&&!/^current$/i.test(String(prior.label||'')))));
      if(uniq.length<2&&!distinctTypedPeriods){md.prior={income:null,gross:null,expenses:null,net:null};}
    }

    /* #12/#19 + highlighted percentages: Expense / Total Expense * 100 exactly.
       Top-10 is a subset, so its sum may be below 100 but must never exceed 100 from formula error. */
    if(Array.isArray(md.expenseGroups)){
      const total=Math.abs(n(md.metrics?.expenses));
      md.expenseGroups=md.expenseGroups.map(x=>({...x,pct:cleanPct(total?Math.abs(n(x.value))/total*100:0)})).sort((a,b)=>Math.abs(n(b.value))-Math.abs(n(a.value)));
    }

    /* #9/#14 + highlighted BS screenshot.
       Show only Current Assets and Fixed Assets on asset side — never accumulated depreciation as a separate slice.
       Requested formulas:
       Current Assets / Total Assets * 100
       Fixed Assets / Total Assets * 100
       Current Liabilities / Total Liabilities & Equity * 100
       Long-Term Liabilities / Total Liabilities & Equity * 100
       Equity / Total Liabilities & Equity * 100 */
    const bn=md.roles?.bs, bs=bn&&md.sheetModels?.[bn];
    if(bs){
      const c=col(bs);
      const currentAssets=findLine(bs,[/^total current assets$/, /^current assets$/]);
      const fixedAssets=findLine(bs,[/^total fixed assets$/, /^fixed assets$/, /^net fixed assets$/, /^net property plant equipment$/, /^property plant equipment net$/, /^property plant equipment$/, /^total property plant equipment$/]);
      const currentLiab=findLine(bs,[/^total current liabilities$/, /^current liabilities$/]);
      const longLiab=findLine(bs,[/^total (long term|longterm|non current) liabilities$/, /^(long term|longterm|non current) liabilities$/]);
      const equity=findLine(bs,[/^total equity$/, /^equity$/]);
      const totalAssets=findLine(bs,[/^total assets$/]);
      const totalLE=findLine(bs,[/^total liabilities (and|&) equity$/, /^total liabilities and equity$/]);
      const ta=Math.abs(value(bs,totalAssets,c))||Math.abs(n(md.metrics?.assets));
      const tle=Math.abs(value(bs,totalLE,c))||ta;
      const ca=value(bs,currentAssets,c);
      /* If the workbook has no explicit net/fixed-asset total, use the balance-sheet identity as a safe residual.
         This prevents accumulated depreciation being displayed as its own positive category. */
      let fa=value(bs,fixedAssets,c);
      if(Math.abs(fa)<0.005&&ta)fa=ta-ca;
      const cl=value(bs,currentLiab,c), ll=value(bs,longLiab,c), eq=value(bs,equity,c);
      md.bsComposition={
        assets:[
          {label:'Current Assets',value:ca,pct:cleanPct(ta?Math.abs(ca)/ta*100:0)},
          {label:'Fixed Assets',value:fa,pct:cleanPct(ta?Math.abs(fa)/ta*100:0)}
        ],
        liabEquity:[
          {label:'Current Liabilities',value:cl,pct:cleanPct(tle?Math.abs(cl)/tle*100:0)},
          {label:'Long-Term Liabilities',value:ll,pct:cleanPct(tle?Math.abs(ll)/tle*100:0)},
          {label:'Equity',value:eq,pct:cleanPct(tle?Math.abs(eq)/tle*100:0)}
        ]
      };
      md.liabilityBifurcation=[{label:'Current Liabilities',value:cl},{label:'Long-Term Liabilities',value:ll}];
    }

    /* #11/#17/#18: annual/YTD values must never be copied into January.
       Keep only real month columns and preserve the actual available range (e.g. Jan–Jun). */
    if(Array.isArray(md.months)){
      const real=md.months.map((m,i)=>({m,i})).filter(x=>/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(String(x.m?.short||x.m?.label||'')));
      if(real.length&&real.length!==md.months.length){
        md.months=real.map(x=>x.m);
        if(Array.isArray(md.monthlyRevenue))md.monthlyRevenue=real.map(x=>n(md.monthlyRevenue[x.i]));
        if(Array.isArray(md.monthlyNet))md.monthlyNet=real.map(x=>n(md.monthlyNet[x.i]));
        if(Array.isArray(md.monthlyExpenses))md.monthlyExpenses=real.map(x=>n(md.monthlyExpenses[x.i]));
      }
    }
    return md;
  }

  /* Final source of truth after all older compatibility patches. */
  if(typeof renderDashboard==='function'&&!window.__clientFormulaAuditDashboard){window.__clientFormulaAuditDashboard=true;const base=renderDashboard;renderDashboard=function(){if(state?.model)apply(state.model);return base.apply(this,arguments);};}
  if(typeof buildPages==='function'&&!window.__clientFormulaAuditReport){window.__clientFormulaAuditReport=true;const base=buildPages;buildPages=function(opts){if(state?.model)apply(state.model);return base.call(this,opts||{});};}
  window.applyClientFormulaAuditFixes=apply;
})();
