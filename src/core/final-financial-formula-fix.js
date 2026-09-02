/* Final financial formula layer: workbook-derived BS totals + expense ratios. Loaded last. */
'use strict';
(function(){
 const norm=s=>String(s??'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
 const numeric=v=>typeof v==='number'&&Number.isFinite(v)||/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?%?$/.test(String(v??'').trim());
 const n=v=>{if(typeof num==='function')return num(v);const s=String(v??'').trim(),neg=/^\(.*\)$/.test(s),x=Number(s.replace(/[,$%()\s]/g,''));return Number.isFinite(x)?(neg?-x:x):0};
 const label=r=>norm((r||[]).filter(v=>!numeric(v)&&String(v??'').trim()).slice(0,4).join(' '));
 function val(r,col){if(!r)return null;if(col!=null&&numeric(r[col]))return n(r[col]);for(let i=r.length-1;i>=0;i--)if(numeric(r[i]))return n(r[i]);return null;}
 function sheetScore(name,rows,kind){const text=norm(name+' '+(rows||[]).slice(0,100).flat().join(' '));if(kind==='bs')return (/balance sheet|statement of financial position/.test(text)?20:0)+(/total assets/.test(text)?8:0)+(/liabilit/.test(text)?5:0);return (/profit and loss|income statement|statement of operations/.test(text)?20:0)+(/total expenses|total expense/.test(text)?8:0)+(/income|revenue/.test(text)?3:0);}
 function pick(kind){let b=null,s=0;for(const [name,rows] of Object.entries(state.sheets||{})){const x=sheetScore(name,rows,kind);if(x>s){s=x;b={name,rows,sm:state.model?.sheetModels?.[name]};}}return s>=8?b:null;}
 function colOf(p){const cols=p.sm?.cols||[];return cols.find(c=>c.type==='current')?.idx??cols.find(c=>c.type==='rowTotal')?.idx??cols.filter(c=>c.type!=='label'&&c.type!=='percent').slice(-1)[0]?.idx??null;}
 function find(rows,res,col){let best=null;for(const r of rows){const l=label(r);if(!res.some(x=>x.test(l)))continue;const v=val(r,col);if(v==null)continue;const rank=(/^total\b/.test(l)?10:0)+(Math.abs(v)>0.004?5:0);if(!best||rank>best.rank)best={value:v,label:l,rank};}return best?.value??null;}
 function bs(md){const p=pick('bs');if(!p)return;const c=colOf(p),r=p.rows;
  let totalAssets=find(r,[/^total (for )?assets$/, /^assets total$/, /^total assets and deferred outflows$/],c);
  let currentAssets=find(r,[/^total (for )?current assets$/, /^current assets$/],c);
  let fixedAssets=find(r,[/^total (for )?(fixed assets|property plant and equipment|property and equipment|non current assets)$/, /^fixed assets$/, /^net property plant and equipment$/],c);
  let currentLiab=find(r,[/^total (for )?(current liabilities|short term liabilities|current obligations)$/, /^current liabilities$/, /^short term liabilities$/],c);
  let longLiab=find(r,[/^total (for )?(long term liabilities|longterm liabilities|non current liabilities|long term debt)$/, /^(long term liabilities|longterm liabilities|non current liabilities|long term debt)$/],c);
  let totalLiab=find(r,[/^total (for )?liabilities$/, /^liabilities total$/, /^total liabilities and provisions$/],c);
  let equity=find(r,[/^total (for )?(equity|shareholders equity|stockholders equity|capital)$/, /^equity$/, /^net assets$/],c);
  let totalLE=find(r,[/^total (for )?liabilities (and )?equity$/, /^total liabilities and (shareholders|stockholders) equity$/, /^total liabilities and capital$/, /^total liabilities and net assets$/],c);
  if(totalAssets==null&&totalLE!=null)totalAssets=totalLE;if(totalLE==null&&totalAssets!=null)totalLE=totalAssets;
  if(fixedAssets==null&&totalAssets!=null&&currentAssets!=null)fixedAssets=totalAssets-currentAssets;
  if(currentAssets==null&&totalAssets!=null&&fixedAssets!=null)currentAssets=totalAssets-fixedAssets;
  if(totalLiab==null&&(currentLiab!=null||longLiab!=null))totalLiab=(currentLiab||0)+(longLiab||0);
  if(currentLiab==null&&totalLiab!=null&&longLiab!=null)currentLiab=totalLiab-longLiab;
  if(longLiab==null&&totalLiab!=null&&currentLiab!=null)longLiab=totalLiab-currentLiab;
  if(currentLiab==null&&longLiab==null&&totalLiab!=null)currentLiab=totalLiab;
  if(equity==null&&totalLE!=null&&totalLiab!=null)equity=totalLE-totalLiab;
  const ad=Math.abs(totalAssets||0),ld=Math.abs(totalLE||0);
  md.balanceSheetComposition=[
   {label:'Current Assets',value:currentAssets,pct:ad&&currentAssets!=null?Math.abs(currentAssets)/ad*100:null},
   {label:'Fixed Assets',value:fixedAssets,pct:ad&&fixedAssets!=null?Math.abs(fixedAssets)/ad*100:null},
   {label:'Current Liabilities',value:currentLiab,pct:ld&&currentLiab!=null?Math.abs(currentLiab)/ld*100:null},
   {label:'Long-Term Liabilities',value:longLiab,pct:ld&&longLiab!=null?Math.abs(longLiab)/ld*100:null},
   {label:'Equity',value:equity,pct:ld&&equity!=null?Math.abs(equity)/ld*100:null}
  ];
  md.totalAssets=totalAssets;md.totalLiabilitiesAndEquity=totalLE;
  md.liabilityBifurcation=[{label:'Current Liabilities',value:currentLiab,detected:currentLiab!=null},{label:'Long-Term Liabilities',value:longLiab,detected:longLiab!=null}];md.liabilityBifurcationDenominator=ld;
  md.finalBsAudit={sheet:p.name,column:c,totalAssets,currentAssets,fixedAssets,currentLiabilities:currentLiab,longTermLiabilities:longLiab,totalLiabilities:totalLiab,equity,totalLiabilitiesAndEquity:totalLE};
 }
 function expenses(md){
  const p=pick('pl');if(!p)return;const c=colOf(p),rows=p.rows;
  let total=find(rows,[/^total (for )?expenses$/, /^total expenses$/, /^expenses total$/, /^total operating expenses$/, /^total (for )?operating expenses$/],c);
  if(total==null)total=md.metrics?.expenses;if(total==null)return;
  total=Math.abs(total);if(md.metrics)md.metrics.expenses=total;
  const out=[];let inExp=false;
  for(const r of rows){
   const l=label(r),v=val(r,c);
   if(/^expenses$|^operating expenses$|^expense$/.test(l)){inExp=true;continue}
   if(!inExp)continue;
   if(/^total (for )?expenses$|^total expenses$|^expenses total$|^total (for )?operating expenses$|^net income|^net profit|^other income/.test(l))break;
   if(v==null||Math.abs(v)<0.005||/^total\b|^sub ?total\b/.test(l))continue;
   const raw=(r||[]).find(x=>!numeric(x)&&String(x??'').trim());
   if(!raw)continue;
   const amount=Math.abs(v);
   out.push({label:String(raw).trim(),value:amount,amount,totalExpense:total,pct:total?amount/total*100:0,expenseRatio:total?amount/total*100:0});
  }
  if(out.length){
   const seen=new Set();
   md.expenseGroups=out.filter(x=>{const k=norm(x.label);if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>b.value-a.value);
  } else if(Array.isArray(md.expenseGroups)){
   md.expenseGroups=md.expenseGroups.map(x=>{const amount=Math.abs(Number(x.value??x.amount??0));const ratio=total?amount/total*100:0;return {...x,value:amount,amount,totalExpense:total,pct:ratio,expenseRatio:ratio};}).sort((a,b)=>b.value-a.value);
  }
  md.expenseDenominator=total;
  md.expenseRatioFormula='Expense / Total Expense * 100';
  md.finalExpenseAudit={sheet:p.name,column:c,totalExpenses:total,categories:md.expenseGroups?.length||0,formula:md.expenseRatioFormula};
 }
 function apply(md){if(!md)return md;bs(md);expenses(md);return md;}
 if(typeof renderDashboard==='function'&&!window.__finalFinancialFormulaDashboard){window.__finalFinancialFormulaDashboard=true;const base=renderDashboard;renderDashboard=function(){apply(state?.model);return base.apply(this,arguments)}}
 if(typeof buildPages==='function'&&!window.__finalFinancialFormulaReport){window.__finalFinancialFormulaReport=true;const base=buildPages;buildPages=function(o){apply(state?.model);return base.call(this,o||{})}}
 window.applyFinalFinancialFormulas=apply;
})();
