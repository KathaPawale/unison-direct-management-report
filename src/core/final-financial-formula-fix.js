/* Final financial formula layer: workbook-derived BS totals + expense ratios. Loaded last. */
'use strict';
(function(){
 const norm=s=>String(s??'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
 const numeric=v=>typeof v==='number'&&Number.isFinite(v)||/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?%?$/.test(String(v??'').trim());
 const n=v=>{if(typeof num==='function')return num(v);const s=String(v??'').trim(),neg=/^\(.*\)$/.test(s),x=Number(s.replace(/[,$%()\s]/g,''));return Number.isFinite(x)?(neg?-x:x):0};
 const label=r=>norm((r||[]).filter(v=>!numeric(v)&&String(v??'').trim()).slice(0,5).join(' '));
 function val(r,col){if(!r)return null;if(col!=null&&numeric(r[col]))return n(r[col]);for(let i=r.length-1;i>=0;i--)if(numeric(r[i]))return n(r[i]);return null;}
 function sheetScore(name,rows,kind){const text=norm(name+' '+(rows||[]).slice(0,140).flat().join(' '));if(kind==='bs')return (/balance sheet|statement of financial position|statement of financial condition/.test(text)?24:0)+(/total assets/.test(text)?8:0)+(/liabilit/.test(text)?5:0)+(/equity|net assets|capital/.test(text)?3:0);return (/profit and loss|income statement|statement of operations|statement of earnings/.test(text)?24:0)+(/total expenses|total expense|operating expenses/.test(text)?8:0)+(/income|revenue|sales/.test(text)?3:0);}
 function pick(kind){let b=null,s=0;for(const [name,rows] of Object.entries(state.sheets||{})){const x=sheetScore(name,rows,kind);if(x>s){s=x;b={name,rows,sm:state.model?.sheetModels?.[name]};}}return s>=8?b:null;}
 function colOf(p){const cols=p.sm?.cols||[];const direct=cols.find(c=>c.type==='current')?.idx??cols.find(c=>c.type==='rowTotal')?.idx;if(direct!=null)return direct;let best=null;for(const r of (p.rows||[]).slice(0,20)){(r||[]).forEach((v,i)=>{const m=String(v??'').match(/\b(19|20)\d{2}\b/);if(m){const y=+m[0];if(!best||y>best.y)best={y,i};}})}return best?.i??cols.filter(c=>c.type!=='label'&&c.type!=='percent').slice(-1)[0]?.idx??null;}
 function find(rows,res,col){let best=null;for(const r of rows){const l=label(r);if(!res.some(x=>x.test(l)))continue;const v=val(r,col);if(v==null)continue;const rank=(/^total\b/.test(l)?12:0)+(Math.abs(v)>0.004?5:0)+(l.includes('total for')?2:0);if(!best||rank>best.rank)best={value:v,label:l,rank};}return best?.value??null;}
 function priorItem(md,name){const x=(md.liabilityBifurcation||[]).find(i=>norm(i.label)===norm(name));return x&&x.detected!==false&&x.value!=null?n(x.value):null;}
 function priorBsItem(md,name){for(const group of [md.bsComposition?.assets,md.bsComposition?.liabEquity]){const x=(group||[]).find(i=>norm(i.label)===norm(name));if(x&&x.value!=null)return n(x.value);}return null;}
 function bs(md){const p=pick('bs');if(!p)return;const c=colOf(p),r=p.rows;
  let totalAssets=find(r,[/^total (for )?assets$/, /^assets total$/, /^total assets and deferred outflows$/, /^total asset$/],c);
  let currentAssets=find(r,[/^total (for )?current assets$/, /^current assets$/, /^total short term assets$/],c);
  let fixedAssets=find(r,[/^total (for )?(fixed assets|property plant and equipment|property and equipment|non current assets|noncurrent assets)$/, /^fixed assets$/, /^net property plant and equipment$/, /^total fixed assets$/],c);
  let currentLiab=find(r,[/^total (for )?(current liabilities|short term liabilities|current obligations)$/, /^current liabilities$/, /^short term liabilities$/, /^total current liability$/, /^total current liabilities$/],c);
  let longLiab=find(r,[/^total (for )?(long term liabilities|longterm liabilities|non current liabilities|noncurrent liabilities|long term debt)$/, /^(long term liabilities|longterm liabilities|non current liabilities|noncurrent liabilities|long term debt)$/, /^total long term liabilities$/],c);
  let totalLiab=find(r,[/^total (for )?liabilities$/, /^liabilities total$/, /^total liabilities and provisions$/, /^total liability$/],c);
  let equity=find(r,[/^total (for )?(equity|shareholders equity|stockholders equity|capital)$/, /^equity$/, /^net assets$/, /^total equity$/],c);
  let totalLE=find(r,[/^total (for )?liabilities (and )?equity$/, /^total liabilities and (shareholders|stockholders) equity$/, /^total liabilities and capital$/, /^total liabilities and net assets$/, /^total liabilities equity$/],c);

  if(currentLiab==null)currentLiab=priorItem(md,'Current Liabilities');
  if(longLiab==null)longLiab=priorItem(md,'Long-Term Liabilities');
  if(currentAssets==null)currentAssets=priorBsItem(md,'Current Assets');
  if(fixedAssets==null)fixedAssets=priorBsItem(md,'Fixed Assets');

  if(totalAssets==null&&totalLE!=null)totalAssets=totalLE;
  if(totalLE==null&&totalAssets!=null)totalLE=totalAssets;
  if(fixedAssets==null&&totalAssets!=null&&currentAssets!=null)fixedAssets=totalAssets-currentAssets;
  if(currentAssets==null&&totalAssets!=null&&fixedAssets!=null)currentAssets=totalAssets-fixedAssets;
  if(totalLiab==null&&(currentLiab!=null||longLiab!=null))totalLiab=(currentLiab||0)+(longLiab||0);
  if(currentLiab==null&&totalLiab!=null&&longLiab!=null)currentLiab=totalLiab-longLiab;
  if(longLiab==null&&totalLiab!=null&&currentLiab!=null)longLiab=totalLiab-currentLiab;
  /* Never assume all liabilities are current when the workbook does not provide the split. */
  if(equity==null&&totalLE!=null&&totalLiab!=null)equity=totalLE-totalLiab;

  const ad=Math.abs(totalAssets||0),ld=Math.abs(totalLE||0);
  const assets=[
   {label:'Current Assets',value:currentAssets,pct:ad&&currentAssets!=null?Math.abs(currentAssets)/ad*100:null},
   {label:'Fixed Assets',value:fixedAssets,pct:ad&&fixedAssets!=null?Math.abs(fixedAssets)/ad*100:null}
  ].filter(x=>x.value!=null&&Math.abs(x.value)>0.004);
  const le=[
   {label:'Current Liabilities',value:currentLiab,pct:ld&&currentLiab!=null?Math.abs(currentLiab)/ld*100:null},
   {label:'Long-Term Liabilities',value:longLiab,pct:ld&&longLiab!=null?Math.abs(longLiab)/ld*100:null},
   {label:'Equity',value:equity,pct:ld&&equity!=null?Math.abs(equity)/ld*100:null}
  ].filter(x=>x.value!=null&&Math.abs(x.value)>0.004);

  md.balanceSheetComposition=[...assets,...le];
  md.bsComposition={assets,liabEquity:le};
  md.totalAssets=totalAssets;md.totalLiabilitiesAndEquity=totalLE;
  md.metrics=md.metrics||{};
  if(totalAssets!=null)md.metrics.assets=totalAssets;
  if(totalLiab!=null)md.metrics.liabilities=totalLiab;
  if(equity!=null)md.metrics.equity=equity;
  md.liabilityBifurcation=[
   {label:'Current Liabilities',value:currentLiab,detected:currentLiab!=null},
   {label:'Long-Term Liabilities',value:longLiab,detected:longLiab!=null}
  ];
  md.liabilityBifurcationDenominator=ld;
  md.assetDenominator=ad;
  md.finalBsAudit={sheet:p.name,column:c,totalAssets,currentAssets,fixedAssets,currentLiabilities:currentLiab,longTermLiabilities:longLiab,totalLiabilities:totalLiab,equity,totalLiabilitiesAndEquity:totalLE};
 }
 function expenses(md){
  const p=pick('pl');if(!p)return;const c=colOf(p),rows=p.rows;
  let total=find(rows,[/^total (for )?expenses$/, /^total expenses$/, /^expenses total$/, /^total operating expenses$/, /^total (for )?operating expenses$/, /^operating expenses total$/, /^total expense$/],c);
  if(total==null)total=md.metrics?.expenses;if(total==null)return;
  total=Math.abs(total);md.metrics=md.metrics||{};md.metrics.expenses=total;
  const out=[];let inExp=false;
  for(const r of rows){
   const l=label(r),v=val(r,c);
   if(/^expenses$|^operating expenses$|^expense$|^operating costs$/.test(l)){inExp=true;continue}
   if(!inExp)continue;
   if(/^total (for )?expenses$|^total expenses$|^expenses total$|^total (for )?operating expenses$|^net income|^net profit|^profit before|^other income/.test(l))break;
   if(v==null||Math.abs(v)<0.005||/^total\b|^sub ?total\b/.test(l))continue;
   const raw=(r||[]).find(x=>!numeric(x)&&String(x??'').trim());
   if(!raw)continue;
   const amount=Math.abs(v),ratio=total?amount/total*100:0;
   out.push({label:String(raw).trim(),value:amount,amount,totalExpense:total,pct:ratio,expenseRatio:ratio});
  }
  if(out.length){
   const seen=new Set();
   md.expenseGroups=out.filter(x=>{const k=norm(x.label);if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>b.value-a.value);
  } else if(Array.isArray(md.expenseGroups)){
   md.expenseGroups=md.expenseGroups.map(x=>{const amount=Math.abs(n(x.value??x.amount??0));const ratio=total?amount/total*100:0;return {...x,value:amount,amount,totalExpense:total,pct:ratio,expenseRatio:ratio};}).sort((a,b)=>b.value-a.value);
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
