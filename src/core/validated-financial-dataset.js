/* One validated calculation dataset shared by dashboard, charts and PDF. No hard-coded financial amounts. */
'use strict';
(function(){
 const norm=s=>String(s??'').toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const isNum=v=>typeof v==='number'&&Number.isFinite(v)||/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?%?$/.test(String(v??'').trim());
 const nv=v=>{if(typeof num==='function')return num(v);const s=String(v??'').trim(),neg=/^\(.*\)$/.test(s),x=Number(s.replace(/[,$%()\s]/g,''));return Number.isFinite(x)?(neg?-x:x):0};
 const label=r=>norm((r||[]).filter(v=>!isNum(v)&&String(v??'').trim()).slice(0,5).join(' '));
 const value=(r,c)=>{if(c!=null&&isNum(r?.[c]))return nv(r[c]);for(let i=(r||[]).length-1;i>=0;i--)if(isNum(r[i]))return nv(r[i]);return null};
 const eq=(a,b,t=.01)=>a!=null&&b!=null&&Math.abs(a-b)<=Math.max(t,Math.abs(a)*1e-8,Math.abs(b)*1e-8);
 function score(name,rows,kind){const t=norm(name+' '+(rows||[]).slice(0,180).flat().join(' '));return kind==='bs'?((/balance sheet|statement of financial position|statement of financial condition/.test(t)?30:0)+(/total assets/.test(t)?8:0)+(/liabilit/.test(t)?5:0)+(/equity/.test(t)?3:0)):((/profit and loss|income statement|statement of operations|statement of earnings/.test(t)?30:0)+(/total expenses|operating expenses/.test(t)?8:0)+(/income|revenue|sales/.test(t)?4:0));}
 function pick(kind){let b=null,s=0;for(const [name,rows] of Object.entries(state.sheets||{})){const x=score(name,rows,kind);if(x>s){s=x;b={name,rows,sm:state.model?.sheetModels?.[name]};}}return s>=8?b:null;}
 function col(p){const cs=p.sm?.cols||[];const d=cs.find(x=>x.type==='current')?.idx??cs.find(x=>x.type==='rowTotal')?.idx;if(d!=null)return d;let best=null;for(const r of (p.rows||[]).slice(0,25))(r||[]).forEach((v,i)=>{const m=String(v??'').match(/\b(19|20)\d{2}\b/);if(m&&(!best||+m[0]>best.y))best={y:+m[0],i};});return best?.i??cs.filter(x=>x.type!=='label'&&x.type!=='percent').slice(-1)[0]?.idx??null;}
 function exact(rows,c,res){let best=null;for(const r of rows){const l=label(r);if(!res.some(re=>re.test(l)))continue;const v=value(r,c);if(v==null)continue;const rank=(/^total\b|^total for\b/.test(l)?20:0)+(Math.abs(v)>.004?3:0);if(!best||rank>best.rank)best={v,rank,l};}return best?.v??null;}
 function section(rows,c,startRes,endRes,totalRes){let start=-1;for(let i=0;i<rows.length;i++)if(startRes.some(re=>re.test(label(rows[i])))){start=i;break;}if(start<0)return {total:null,source:'missing',details:[]};let sum=0,details=[];for(let i=start+1;i<rows.length;i++){const l=label(rows[i]);if(endRes.some(re=>re.test(l)))break;const v=value(rows[i],c);if(v==null)continue;if(totalRes.some(re=>re.test(l)))return {total:v,source:'explicit-subtotal',details};if(/^total\b|^subtotal\b/.test(l))continue;if(Math.abs(v)>.004){sum+=v;details.push({label:l,value:v});}}return {total:details.length?sum:null,source:details.length?'detail-sum':'missing',details};}
 function build(){const md=state.model;if(!md)return null;const bs=pick('bs'),pl=pick('pl');if(!bs)return null;const c=col(bs),r=bs.rows;
  let totalAssets=exact(r,c,[/^total (for )?assets$/, /^assets total$/, /^total asset$/]);
  const ca=section(r,c,[/^current assets?$/],[/^fixed assets?$|^property plant|^non current assets?$|^noncurrent assets?$|^liabilit/],[/^total (for )?current assets?$/, /^current assets? total$/]);
  let currentAssets=exact(r,c,[/^total (for )?current assets?$/, /^current assets? total$/]); if(currentAssets==null)currentAssets=ca.total;
  const fa=section(r,c,[/^fixed assets?$|^property plant and equipment$|^property and equipment$|^non current assets?$|^noncurrent assets?$/],[/^liabilit|^current liabilities?$|^accounts payable$/],[/^total (for )?(fixed assets?|property plant and equipment|property and equipment|non current assets?|noncurrent assets?)$/]);
  let fixedAssets=exact(r,c,[/^total (for )?(fixed assets?|property plant and equipment|property and equipment|non current assets?|noncurrent assets?)$/, /^net property plant and equipment$/]); if(fixedAssets==null)fixedAssets=fa.total;
  if(totalAssets==null&&currentAssets!=null&&fixedAssets!=null)totalAssets=currentAssets+fixedAssets;
  if(fixedAssets==null&&totalAssets!=null&&currentAssets!=null)fixedAssets=totalAssets-currentAssets;
  if(currentAssets==null&&totalAssets!=null&&fixedAssets!=null)currentAssets=totalAssets-fixedAssets;

  const cl=section(r,c,[/^current liabilities?$|^short term liabilities?$|^current obligations$/],[/^long term liabilities?$|^non current liabilities?$|^noncurrent liabilities?$|^equity$|^shareholders equity$|^stockholders equity$|^members equity$|^total liabilities$/],[/^total (for )?current liabilities?$/, /^current liabilities? total$/]);
  let currentLiab=exact(r,c,[/^total (for )?current liabilities?$/, /^current liabilities? total$/]); if(currentLiab==null)currentLiab=cl.total;
  const ll=section(r,c,[/^long term liabilities?$|^non current liabilities?$|^noncurrent liabilities?$/],[/^equity$|^shareholders equity$|^stockholders equity$|^members equity$|^capital$|^total liabilities and/],[/^total (for )?(long term liabilities?|non current liabilities?|noncurrent liabilities?)$/]);
  let longLiab=exact(r,c,[/^total (for )?(long term liabilities?|non current liabilities?|noncurrent liabilities?)$/]); if(longLiab==null)longLiab=ll.total;
  let totalLiab=exact(r,c,[/^total (for )?liabilities$/, /^liabilities total$/]);
  let equity=exact(r,c,[/^total (for )?(equity|shareholders equity|stockholders equity|members equity|capital)$/, /^total equity$/]);
  let totalLE=exact(r,c,[/^total (for )?liabilities (and )?equity$/, /^total liabilities and (shareholders|stockholders|members) equity$/, /^total liabilities and capital$/, /^total liabilities equity$/]);
  if(totalLE==null&&totalAssets!=null)totalLE=totalAssets;
  if(totalAssets==null&&totalLE!=null)totalAssets=totalLE;
  if(totalLiab==null&&(currentLiab!=null||longLiab!=null))totalLiab=(currentLiab||0)+(longLiab||0);
  if(equity==null&&totalLE!=null&&totalLiab!=null)equity=totalLE-totalLiab;
  if(longLiab==null&&totalLiab!=null&&currentLiab!=null)longLiab=totalLiab-currentLiab;

  let expenses=[];let totalExpenses=null,expenseSource=null;
  if(pl){const pc=col(pl),pr=pl.rows;const exp=section(pr,pc,[/^expenses?$|^operating expenses?$|^operating costs?$/],[/^net income|^net profit|^profit before|^other income/],[/^total (for )?expenses?$/, /^total (for )?operating expenses?$/, /^expenses? total$/]);totalExpenses=exact(pr,pc,[/^total (for )?expenses?$/, /^total (for )?operating expenses?$/, /^expenses? total$/]);expenseSource=totalExpenses!=null?'explicit-total':exp.source;if(totalExpenses==null)totalExpenses=exp.total;expenses=exp.details.map(x=>({label:x.label,amount:Math.abs(x.value)}));
   /* Prefer a clean detail/category sum for the breakdown so its percentages reconcile to 100%. */
   const detailTotal=expenses.reduce((s,x)=>s+x.amount,0);if(detailTotal>.004)totalExpenses=detailTotal;
   expenses=expenses.map(x=>({...x,value:x.amount,totalExpense:Math.abs(totalExpenses||0),pct:totalExpenses?x.amount/Math.abs(totalExpenses)*100:0,expenseRatio:totalExpenses?x.amount/Math.abs(totalExpenses)*100:0}));
  }
  const ad=Math.abs(totalAssets||0),ld=Math.abs(totalLE||0);
  const assets=[{label:'Current Assets',value:currentAssets,pct:ad&&currentAssets!=null?Math.abs(currentAssets)/ad*100:null},{label:'Fixed Assets',value:fixedAssets,pct:ad&&fixedAssets!=null?Math.abs(fixedAssets)/ad*100:null}].filter(x=>x.value!=null);
  const le=[{label:'Current Liabilities',value:currentLiab,pct:ld&&currentLiab!=null?Math.abs(currentLiab)/ld*100:null},{label:'Long-Term Liabilities',value:longLiab,pct:ld&&longLiab!=null?Math.abs(longLiab)/ld*100:null},{label:'Equity',value:equity,pct:ld&&equity!=null?Math.abs(equity)/ld*100:null}].filter(x=>x.value!=null);
  const validation={assetsVsLE:eq(totalAssets,totalLE),assetsComposition:currentAssets!=null&&fixedAssets!=null?eq(totalAssets,currentAssets+fixedAssets):null,liabilityEquityComposition:currentLiab!=null&&longLiab!=null&&equity!=null?eq(totalLE,currentLiab+longLiab+equity):null,expensePctTotal:expenses.length?expenses.reduce((s,x)=>s+x.pct,0):null,expensePctOk:expenses.length?Math.abs(expenses.reduce((s,x)=>s+x.pct,0)-100)<=.01:null};
  const data={source:{balanceSheet:bs.name,balanceColumn:c,profitLoss:pl?.name||null},totalAssets,currentAssets,fixedAssets,currentLiabilities:currentLiab,longTermLiabilities:longLiab,totalLiabilities:totalLiab,equity,totalLiabilitiesAndEquity:totalLE,assets,liabilitiesEquity:le,totalExpenses:totalExpenses!=null?Math.abs(totalExpenses):null,expenses,validation,classification:{currentLiabilities:cl.source,longTermLiabilities:ll.source,currentAssets:ca.source,fixedAssets:fa.source,expenses:expenseSource}};
  md.validatedFinancials=data;md.totalAssets=totalAssets;md.totalLiabilitiesAndEquity=totalLE;md.assetDenominator=ad;md.liabilityBifurcationDenominator=ld;md.bsComposition={assets,liabEquity:le};md.balanceSheetComposition=[...assets,...le];md.liabilityBifurcation=le.filter(x=>/liabilit/i.test(x.label)).map(x=>({label:x.label,value:x.value,detected:true,pct:x.pct}));md.metrics=md.metrics||{};if(totalAssets!=null)md.metrics.assets=totalAssets;if(totalLiab!=null)md.metrics.liabilities=totalLiab;if(equity!=null)md.metrics.equity=equity;if(totalExpenses!=null)md.metrics.expenses=Math.abs(totalExpenses);if(expenses.length)md.expenseGroups=expenses;md.expenseDenominator=totalExpenses;md.expenseRatioFormula='Expense Category Amount / Total Expenses * 100';return data;
 }
 function apply(){return build();}
 if(typeof renderDashboard==='function'&&!window.__validatedFinancialDatasetDash){window.__validatedFinancialDatasetDash=true;const base=renderDashboard;renderDashboard=function(){apply();return base.apply(this,arguments);};}
 if(typeof buildPages==='function'&&!window.__validatedFinancialDatasetReport){window.__validatedFinancialDatasetReport=true;const base=buildPages;buildPages=function(o){apply();return base.call(this,o||{});};}
 window.buildValidatedFinancialDataset=apply;
})();
