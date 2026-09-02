/* Final client formula audit fixes — screenshots + issues 1–21. */
'use strict';
(function(){
  const n=v=>Number.isFinite(Number(v))?Number(v):(typeof num==='function'?num(v):0);
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const findLine=(sm,res)=>(sm?.lines||[]).find(l=>res.some(r=>r.test(norm(l.label))));
  const value=(sm,l,c)=>l&&c!=null?n(((state.sheets||{})[sm.name]||[])[l.r]?.[c]):0;
  const year=s=>{const m=String(s||'').match(/\b(19|20)\d{2}\b/);return m?+m[0]:null;};
  const monthNo=s=>{const m=String(s||'').toLowerCase().match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);if(!m)return null;return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].findIndex(x=>m[1].slice(0,3)===x)+1;};
  const cleanPct=v=>Number.isFinite(v)?Math.max(0,Math.min(100,v)):0;
  const col=sm=>(sm?.cols||[]).find(c=>c.type==='current')?.idx ?? (sm?.cols||[]).find(c=>c.type==='rowTotal')?.idx ?? (sm?.cols||[]).filter(c=>c.idx>0&&c.type!=='change'&&c.type!=='percent').slice(-1)[0]?.idx;
  const metricLines=sm=>({income:findLine(sm,[/^total for income$/, /^total income$/, /^total revenue$/, /^revenue$/, /^sales$/, /total.*(income|revenue|sales)/]),gross:findLine(sm,[/^gross profit$/]),expenses:findLine(sm,[/^total for expenses$/, /^total expenses$/, /^total operating expenses$/, /total.*expenses/]),net:findLine(sm,[/^net income$/, /^net profit$/, /^profit for the period$/])});
  const readMetricSet=(sm,cols)=>{const L=metricLines(sm),sum=l=>l?cols.reduce((s,c)=>s+value(sm,l,c.idx),0):0;const income=sum(L.income),gross=sum(L.gross);return {income,gross:gross||income,expenses:sum(L.expenses),net:sum(L.net)};};
  const periodCols=sm=>(sm?.cols||[]).filter(c=>c.idx>0&&c.type!=='label'&&c.type!=='change'&&c.type!=='percent'&&c.type!=='rowTotal');
  function deriveComparative(md){const candidates=[md.roles?.plComparative,md.roles?.plMonthly,md.roles?.pl].filter(Boolean).map(name=>md.sheetModels?.[name]).filter(Boolean);let chosen=null,currentCols=[],priorCols=[];for(const sm of candidates){const pcs=periodCols(sm),months=pcs.map(c=>({c,y:year(c.label),m:monthNo(c.label)})).filter(x=>x.y&&x.m),ys=[...new Set(months.map(x=>x.y))].sort((a,b)=>b-a);if(ys.length>=2){const cm=months.filter(x=>x.y===ys[0]),avail=new Set(cm.map(x=>x.m)),pm=months.filter(x=>x.y===ys[1]&&avail.has(x.m));if(cm.length&&pm.length){chosen=sm;currentCols=cm.map(x=>x.c);priorCols=pm.map(x=>x.c);break;}}const annual=pcs.map(c=>({c,y:year(c.label)})).filter(x=>x.y&&!monthNo(x.c.label)),ay=[...new Set(annual.map(x=>x.y))].sort((a,b)=>b-a);if(ay.length>=2){chosen=sm;currentCols=annual.filter(x=>x.y===ay[0]).map(x=>x.c).slice(0,1);priorCols=annual.filter(x=>x.y===ay[1]).map(x=>x.c).slice(0,1);break;}const cur=(sm.cols||[]).find(c=>c.type==='current'),pri=(sm.cols||[]).find(c=>c.type==='prior'),cy=year(cur?.label),py=year(pri?.label);if(cur&&pri&&cur.idx!==pri.idx&&((cy&&py&&cy!==py)||/prior|previous|last year/i.test(String(pri.label||'')))){chosen=sm;currentCols=[cur];priorCols=[pri];break;}}if(chosen&&currentCols.length&&priorCols.length){const cur=readMetricSet(chosen,currentCols),pri=readMetricSet(chosen,priorCols);md.metrics={...(md.metrics||{}),...cur};md.prior={...(md.prior||{}),...pri};return {sm:chosen,currentCols,priorCols};}md.prior={income:null,gross:null,expenses:null,net:null};return null;}
  function directExpenseRows(sm){const lines=sm?.lines||[],opener=lines.findIndex(l=>/^(expenses|operating expenses)$/.test(norm(l.label))),totalIdx=lines.findIndex(l=>/^total (for )?(operating )?expenses$/.test(norm(l.label)));if(opener<0)return [];const end=totalIdx>opener?totalIdx:lines.length,out=[];let skipTo=-1;for(let i=opener+1;i<end;i++){const l=lines[i];if(l.r<=skipTo)continue;if(l.totalIdx!=null&&l.totalIdx>i&&l.totalIdx<end){const tl=lines[l.totalIdx];out.push({label:l.label,line:tl});skipTo=tl.r;}else if(l.kind==='account')out.push({label:l.label,line:l});}return out;}
  function fixExpenses(md,ctx){const sm=ctx?.sm||(md.roles?.plMonthly&&md.sheetModels?.[md.roles.plMonthly])||(md.roles?.plComparative&&md.sheetModels?.[md.roles.plComparative])||(md.roles?.pl&&md.sheetModels?.[md.roles.pl]);if(!sm)return;let cols=ctx?.currentCols||[];if(!cols.length){const c=col(sm);if(c!=null)cols=[{idx:c,label:'current'}];}const L=metricLines(sm),total=L.expenses?Math.abs(cols.reduce((s,c)=>s+value(sm,L.expenses,c.idx),0)):Math.abs(n(md.metrics?.expenses)),rows=directExpenseRows(sm);if(rows.length&&total)md.expenseGroups=rows.map(r=>{const v=cols.reduce((s,c)=>s+value(sm,r.line,c.idx),0);return {label:r.label,value:v,pct:cleanPct(Math.abs(v)/total*100)};}).filter(x=>Math.abs(x.value)>0.004).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));else if(Array.isArray(md.expenseGroups))md.expenseGroups=md.expenseGroups.map(x=>({...x,pct:cleanPct(total?Math.abs(n(x.value))/total*100:0)})).sort((a,b)=>Math.abs(n(b.value))-Math.abs(n(a.value)));}
  function apply(md){if(!md)return md;const comparative=deriveComparative(md);fixExpenses(md,comparative);const bn=md.roles?.bs,bs=bn&&md.sheetModels?.[bn];if(bs){const c=col(bs);
      /* QuickBooks commonly exports subtotal labels as "Total for ...". Support both forms. */
      const currentAssets=findLine(bs,[/^total (for )?current assets$/, /^current assets$/]);
      const fixedAssets=findLine(bs,[/^total (for )?fixed assets$/, /^fixed assets$/, /^net fixed assets$/, /^net property plant equipment$/, /^property plant equipment net$/, /^property plant equipment$/, /^total (for )?property plant equipment$/]);
      const currentLiab=findLine(bs,[/^total (for )?current liabilities$/, /^current liabilities$/]);
      const longLiab=findLine(bs,[/^total (for )?(long term|longterm|non current) liabilities$/, /^(long term|longterm|non current) liabilities$/]);
      const equity=findLine(bs,[/^total (for )?equity$/, /^equity$/]);
      const totalAssets=findLine(bs,[/^total (for )?assets$/]);
      const totalLiabilities=findLine(bs,[/^total (for )?liabilities$/]);
      const totalLE=findLine(bs,[/^total (for )?liabilities (and|&) equity$/, /^total liabilities and equity$/]);
      const ta=Math.abs(value(bs,totalAssets,c))||Math.abs(n(md.metrics?.assets));
      const tle=Math.abs(value(bs,totalLE,c))||ta;
      const ca=value(bs,currentAssets,c);let fa=value(bs,fixedAssets,c);if(Math.abs(fa)<0.005&&ta)fa=ta-ca;
      let cl=value(bs,currentLiab,c),ll=value(bs,longLiab,c),eq=value(bs,equity,c);
      const liabilitiesTotal=value(bs,totalLiabilities,c);
      /* If only a total-liabilities subtotal exists, preserve explicit current liabilities and derive long-term as residual. */
      if(Math.abs(cl)<0.005&&Math.abs(liabilitiesTotal)>0.005&&Math.abs(ll)<0.005)cl=liabilitiesTotal;
      if(Math.abs(ll)<0.005&&Math.abs(liabilitiesTotal)>0.005&&Math.abs(cl)>0.005)ll=liabilitiesTotal-cl;
      if(Math.abs(eq)<0.005&&tle)eq=tle-(cl+ll);
      md.bsComposition={assets:[{label:'Current Assets',value:ca,pct:cleanPct(ta?Math.abs(ca)/ta*100:0)},{label:'Fixed Assets',value:fa,pct:cleanPct(ta?Math.abs(fa)/ta*100:0)}],liabEquity:[{label:'Current Liabilities',value:cl,pct:cleanPct(tle?Math.abs(cl)/tle*100:0)},{label:'Long-Term Liabilities',value:ll,pct:cleanPct(tle?Math.abs(ll)/tle*100:0)},{label:'Equity',value:eq,pct:cleanPct(tle?Math.abs(eq)/tle*100:0)}]};
      md.liabilityBifurcation=[{label:'Current Liabilities',value:cl},{label:'Long-Term Liabilities',value:ll}];
      md.balanceSheetAudit={totalAssets:ta,totalLiabilitiesEquity:tle,currentAssets:ca,fixedAssets:fa,currentLiabilities:cl,longTermLiabilities:ll,equity:eq};}
    if(Array.isArray(md.months)){const real=md.months.map((m,i)=>({m,i})).filter(x=>monthNo(x.m?.short||x.m?.label));if(real.length&&real.length!==md.months.length){md.months=real.map(x=>x.m);if(Array.isArray(md.monthlyRevenue))md.monthlyRevenue=real.map(x=>n(md.monthlyRevenue[x.i]));if(Array.isArray(md.monthlyNet))md.monthlyNet=real.map(x=>n(md.monthlyNet[x.i]));if(Array.isArray(md.monthlyExpenses))md.monthlyExpenses=real.map(x=>n(md.monthlyExpenses[x.i]));}}return md;}
  if(typeof renderDashboard==='function'&&!window.__clientFormulaAuditDashboard){window.__clientFormulaAuditDashboard=true;const base=renderDashboard;renderDashboard=function(){if(state?.model)apply(state.model);return base.apply(this,arguments);};}
  if(typeof buildPages==='function'&&!window.__clientFormulaAuditReport){window.__clientFormulaAuditReport=true;const base=buildPages;buildPages=function(opts){if(state?.model)apply(state.model);return base.call(this,opts||{});};}
  window.applyClientFormulaAuditFixes=apply;
})();
