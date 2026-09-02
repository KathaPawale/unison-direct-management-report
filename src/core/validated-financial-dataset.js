/* One validated calculation dataset shared by dashboard, charts and PDF. No hard-coded financial amounts. */
'use strict';
(function(){
 const norm=s=>String(s??'').toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const isNum=v=>typeof v==='number'&&Number.isFinite(v)||/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?%?$/.test(String(v??'').trim());
 const nv=v=>{if(typeof num==='function')return num(v);const s=String(v??'').trim(),neg=/^\(.*\)$/.test(s),x=Number(s.replace(/[,$%()\s]/g,''));return Number.isFinite(x)?(neg?-x:x):0};
 const rowLabel=r=>norm((r||[]).filter(v=>!isNum(v)&&String(v??'').trim()).slice(0,5).join(' '));
 const rawLabel=r=>String((r||[]).find(v=>!isNum(v)&&String(v??'').trim())??'').trim();
 const value=(r,c)=>{if(c!=null&&isNum(r?.[c]))return nv(r[c]);for(let i=(r||[]).length-1;i>=0;i--)if(isNum(r[i]))return nv(r[i]);return null};
 const tol=(a,b)=>Math.max(.01,Math.abs(Number(a)||0)*1e-8,Math.abs(Number(b)||0)*1e-8);
 const eq=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<=tol(a,b);
 const pct2=(n,d)=>d&&n!=null?Math.abs(n)/Math.abs(d)*100:null;

 function score(name,rows,kind){const t=norm(name+' '+(rows||[]).slice(0,180).flat().join(' '));return kind==='bs'?((/balance sheet|statement of financial position|statement of financial condition/.test(t)?30:0)+(/total assets/.test(t)?8:0)+(/liabilit/.test(t)?5:0)+(/equity/.test(t)?3:0)):((/profit and loss|income statement|statement of operations|statement of earnings/.test(t)?30:0)+(/total expenses|operating expenses/.test(t)?8:0)+(/income|revenue|sales/.test(t)?4:0));}
 function pick(kind){let b=null,s=0;for(const [name,rows] of Object.entries(state.sheets||{})){const x=score(name,rows,kind);if(x>s){s=x;b={name,rows,sm:state.model?.sheetModels?.[name]};}}return s>=8?b:null;}
 function col(p){const cs=p.sm?.cols||[];const d=cs.find(x=>x.type==='current')?.idx??cs.find(x=>x.type==='rowTotal')?.idx;if(d!=null)return d;let best=null;for(const r of (p.rows||[]).slice(0,25))(r||[]).forEach((v,i)=>{const m=String(v??'').match(/\b(19|20)\d{2}\b/);if(m&&(!best||+m[0]>best.y))best={y:+m[0],i};});return best?.i??cs.filter(x=>x.type!=='label'&&x.type!=='percent').slice(-1)[0]?.idx??null;}
 function exact(rows,c,res){let best=null;for(const r of rows){const l=rowLabel(r);if(!res.some(re=>re.test(l)))continue;const v=value(r,c);if(v==null)continue;const rank=(/^total\b|^total for\b/.test(l)?20:0)+(Math.abs(v)>.004?3:0);if(!best||rank>best.rank)best={v,rank,l};}return best?.v??null;}
 function locate(rows,res,from=0){for(let i=from;i<rows.length;i++)if(res.some(re=>re.test(rowLabel(rows[i]))))return i;return -1;}
 function section(rows,c,startRes,endRes,totalRes){const start=locate(rows,startRes);if(start<0)return {total:null,source:'missing',details:[],start:-1,end:-1};let sum=0,details=[],end=rows.length;for(let i=start+1;i<rows.length;i++){const l=rowLabel(rows[i]);if(endRes.some(re=>re.test(l))){end=i;break;}const v=value(rows[i],c);if(v==null)continue;if(totalRes.some(re=>re.test(l)))return {total:v,source:'explicit-subtotal',details,start,end:i};if(/^total\b|^subtotal\b/.test(l))continue;if(Math.abs(v)>.004){sum+=v;details.push({label:rawLabel(rows[i])||l,value:v});}}return {total:details.length?sum:null,source:details.length?'detail-sum':'missing',details,start,end};}

 function expenseDataset(pl){
  if(!pl)return {total:null,groups:[],details:[],source:'missing'};
  const c=col(pl),rows=pl.rows;
  const start=locate(rows,[/^expenses?$|^operating expenses?$|^operating costs?$/]);
  if(start<0)return {total:null,groups:[],details:[],source:'missing'};
  let end=rows.length,total=null,totalRow=-1;
  for(let i=start+1;i<rows.length;i++){
   const l=rowLabel(rows[i]);
   if(/^total (for )?expenses?$|^total (for )?operating expenses?$|^expenses? total$/.test(l)){total=value(rows[i],c);totalRow=i;end=i;break;}
   if(/^net operating income$|^net income$|^net profit$|^profit before|^other income$/.test(l)){end=i;break;}
  }
  const details=[];for(let i=start+1;i<end;i++){const l=rowLabel(rows[i]),v=value(rows[i],c);if(v==null||Math.abs(v)<.005||/^total\b|^subtotal\b/.test(l))continue;details.push({label:rawLabel(rows[i])||l,amount:Math.abs(v)});}

  /* Build top-level expense categories from statement structure. A blank-valued heading followed by
     "Total for <heading>" is treated as one category; its children are not added again. */
  const groups=[];let pending=null,pendingDetails=[];
  const flushPending=()=>{if(!pending)return;if(pendingDetails.length){const a=pendingDetails.reduce((s,x)=>s+x.amount,0);groups.push({label:pending,amount:a,source:'detail-sum'});}pending=null;pendingDetails=[];};
  for(let i=start+1;i<end;i++){
   const l=rowLabel(rows[i]),rl=rawLabel(rows[i]),v=value(rows[i],c);
   if(!l)continue;
   const tm=l.match(/^total (?:for )?(.+)$/);
   if(tm){
    if(pending&&norm(pending)===norm(tm[1])){const a=Math.abs(v??pendingDetails.reduce((s,x)=>s+x.amount,0));groups.push({label:pending,amount:a,source:'explicit-subtotal'});pending=null;pendingDetails=[];}
    continue;
   }
   if(v==null||Math.abs(v)<.005){
    if(pending)flushPending();
    pending=rl||l;pendingDetails=[];continue;
   }
   if(pending)pendingDetails.push({label:rl||l,amount:Math.abs(v)});
   else groups.push({label:rl||l,amount:Math.abs(v),source:'direct'});
  }
  flushPending();

  let chosen=groups.filter(x=>x.amount>.004);
  if(!chosen.length)chosen=details.map(x=>({...x,source:'detail'}));
  let chosenTotal=chosen.reduce((s,x)=>s+x.amount,0);
  const explicit=Math.abs(total||0);
  if(explicit>.004&&Math.abs(chosenTotal-explicit)>tol(chosenTotal,explicit)){
   /* If structural grouping was incomplete, fall back to leaf expense accounts. This prevents
      double counting while still reconciling exactly to the P&L Total Expenses line. */
   const detailTotal=details.reduce((s,x)=>s+x.amount,0);
   if(eq(detailTotal,explicit)){chosen=details.map(x=>({...x,source:'detail'}));chosenTotal=detailTotal;}
  }
  if(!(explicit>.004))total=chosenTotal;
  else total=explicit;
  const den=Math.abs(total||chosenTotal||0);
  chosen=chosen.map(x=>({...x,value:x.amount,totalExpense:den,pct:den?x.amount/den*100:0,expenseRatio:den?x.amount/den*100:0})).sort((a,b)=>b.amount-a.amount);
  return {total:den,groups:chosen,details,source:totalRow>=0?'explicit-total':'calculated'};
 }

 function build(){
  const md=state.model;if(!md)return null;const bs=pick('bs'),pl=pick('pl');if(!bs)return null;const c=col(bs),r=bs.rows;
  let totalAssets=exact(r,c,[/^total (for )?assets$/, /^assets total$/, /^total asset$/]);
  const ca=section(r,c,[/^current assets?$/],[/^fixed assets?$|^property plant|^non current assets?$|^noncurrent assets?$|^other assets?$|^liabilit/],[/^total (for )?current assets?$/, /^current assets? total$/]);
  let currentAssets=exact(r,c,[/^total (for )?current assets?$/, /^current assets? total$/]);if(currentAssets==null)currentAssets=ca.total;

  let fixedSubtotal=exact(r,c,[/^total (for )?(fixed assets?|property plant and equipment|property and equipment)$/, /^net property plant and equipment$/]);
  const otherAssetTotals=[];
  const nonCurrentTotalPatterns=[/^total (for )?(non current assets?|noncurrent assets?)$/, /^non current assets? total$/];
  let explicitNonCurrent=exact(r,c,nonCurrentTotalPatterns);
  for(const re of [/^total (for )?other assets?$/, /^total (for )?intangible assets?$/, /^total (for )?investments?$/, /^total (for )?long term assets?$/]){const x=exact(r,c,[re]);if(x!=null)otherAssetTotals.push(x);}
  let fixedAssets=explicitNonCurrent;
  if(fixedAssets==null&&fixedSubtotal!=null)fixedAssets=fixedSubtotal+otherAssetTotals.reduce((s,x)=>s+x,0);
  /* Reliable Balance Sheet Total Assets governs the analytical denominator and non-current residual.
     This captures valid non-current sections such as Other Assets without misclassifying them as current. */
  if(totalAssets!=null&&currentAssets!=null)fixedAssets=totalAssets-currentAssets;
  if(totalAssets==null&&currentAssets!=null&&fixedAssets!=null)totalAssets=currentAssets+fixedAssets;
  if(currentAssets==null&&totalAssets!=null&&fixedAssets!=null)currentAssets=totalAssets-fixedAssets;

  const cl=section(r,c,[/^current liabilities?$|^short term liabilities?$|^current obligations$/],[/^long term liabilities?$|^non current liabilities?$|^noncurrent liabilities?$|^equity$|^shareholders equity$|^stockholders equity$|^members equity$|^total liabilities$/],[/^total (for )?current liabilities?$/, /^current liabilities? total$/]);
  let currentLiab=exact(r,c,[/^total (for )?current liabilities?$/, /^current liabilities? total$/]);if(currentLiab==null)currentLiab=cl.total;
  const ll=section(r,c,[/^long term liabilities?$|^longterm liabilities?$|^non current liabilities?$|^noncurrent liabilities?$|^long term debt$/],[/^equity$|^shareholders equity$|^stockholders equity$|^members equity$|^capital$|^total liabilities and/],[/^total (for )?(long term liabilities?|longterm liabilities?|non current liabilities?|noncurrent liabilities?|long term debt)$/]);
  let longLiab=exact(r,c,[/^total (for )?(long term liabilities?|longterm liabilities?|non current liabilities?|noncurrent liabilities?|long term debt)$/]);if(longLiab==null)longLiab=ll.total;
  let totalLiab=exact(r,c,[/^total (for )?liabilities$/, /^liabilities total$/, /^total liability$/]);
  let equity=exact(r,c,[/^total (for )?(equity|shareholders equity|stockholders equity|members equity|capital)$/, /^total equity$/]);
  let totalLE=exact(r,c,[/^total (for )?liabilities (and )?equity$/, /^total liabilities and (shareholders|stockholders|members) equity$/, /^total liabilities and capital$/, /^total liabilities equity$/]);
  if(totalLE==null&&totalAssets!=null)totalLE=totalAssets;
  if(totalAssets==null&&totalLE!=null)totalAssets=totalLE;
  if(totalLiab==null&&(currentLiab!=null||longLiab!=null))totalLiab=(currentLiab||0)+(longLiab||0);
  if(longLiab==null&&totalLiab!=null&&currentLiab!=null)longLiab=totalLiab-currentLiab;
  if(currentLiab==null&&totalLiab!=null&&longLiab!=null)currentLiab=totalLiab-longLiab;
  if(equity==null&&totalLE!=null&&totalLiab!=null)equity=totalLE-totalLiab;

  const exp=expenseDataset(pl),totalExpenses=exp.total,expenses=exp.groups;
  const ad=Math.abs(totalAssets||0),ld=Math.abs(totalLE||0);
  const assets=[
   {label:'Current Assets',value:currentAssets,pct:pct2(currentAssets,ad),denominator:totalAssets},
   {label:'Fixed / Non-Current Assets',value:fixedAssets,pct:pct2(fixedAssets,ad),denominator:totalAssets}
  ].filter(x=>x.value!=null);
  const le=[
   {label:'Current Liabilities',value:currentLiab,pct:pct2(currentLiab,ld),denominator:totalLE},
   {label:'Long-Term Liabilities',value:longLiab,pct:pct2(longLiab,ld),denominator:totalLE},
   {label:'Equity',value:equity,pct:pct2(equity,ld),denominator:totalLE}
  ].filter(x=>x.value!=null);
  const expensePctTotal=expenses.reduce((s,x)=>s+(x.pct||0),0);
  const validation={
   assetsVsLE:eq(totalAssets,totalLE),
   assetsComposition:currentAssets!=null&&fixedAssets!=null?eq(totalAssets,currentAssets+fixedAssets):null,
   liabilityEquityComposition:currentLiab!=null&&longLiab!=null&&equity!=null?eq(totalLE,currentLiab+longLiab+equity):null,
   expenseAmountTotal:expenses.length?expenses.reduce((s,x)=>s+x.amount,0):null,
   expenseAmountOk:expenses.length?eq(totalExpenses,expenses.reduce((s,x)=>s+x.amount,0)):null,
   expensePctTotal:expenses.length?expensePctTotal:null,
   expensePctOk:expenses.length?Math.abs(expensePctTotal-100)<=.01:null
  };
  const data={
   source:{balanceSheet:bs.name,balanceColumn:c,profitLoss:pl?.name||null},
   totalAssets,currentAssets,fixedAssets,fixedAssetSubtotal:fixedSubtotal,otherNonCurrentAssets:fixedAssets!=null&&fixedSubtotal!=null?fixedAssets-fixedSubtotal:null,
   currentLiabilities:currentLiab,longTermLiabilities:longLiab,totalLiabilities:totalLiab,equity,totalLiabilitiesAndEquity:totalLE,
   assets,liabilitiesEquity:le,totalExpenses,expenses,expenseDetails:exp.details,validation,
   classification:{currentLiabilities:cl.source,longTermLiabilities:ll.source,currentAssets:ca.source,fixedAssets:totalAssets!=null&&currentAssets!=null?'total-assets residual validated':explicitNonCurrent!=null?'explicit non-current subtotal':'section totals',expenses:exp.source}
  };
  md.validatedFinancials=data;md.totalAssets=totalAssets;md.totalLiabilitiesAndEquity=totalLE;md.assetDenominator=ad;md.liabilityBifurcationDenominator=ld;
  md.bsComposition={assets,liabEquity:le};md.balanceSheetComposition=[...assets,...le];
  md.liabilityBifurcation=le.filter(x=>/liabilit/i.test(x.label)).map(x=>({label:x.label,value:x.value,detected:true,pct:x.pct,denominator:totalLE}));
  md.metrics=md.metrics||{};if(totalAssets!=null)md.metrics.assets=totalAssets;if(totalLiab!=null)md.metrics.liabilities=totalLiab;if(equity!=null)md.metrics.equity=equity;if(totalExpenses!=null)md.metrics.expenses=Math.abs(totalExpenses);
  if(expenses.length)md.expenseGroups=expenses;md.expenseDenominator=totalExpenses;md.expenseRatioFormula='Expense Category Amount / Total Expenses * 100';
  md.calculationValidation=validation;return data;
 }

 const fmtMoney=n=>{const v=Number(n||0),a=Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});return v<0?'($'+a+')':'$'+a;};
 const fmtPct=n=>n==null?'—':Number(n).toFixed(2)+'%';
 function analysisTable(data,report=false){
  if(!data)return '';
  const rows=[
   ['Current Assets',data.currentAssets,data.totalAssets,pct2(data.currentAssets,data.totalAssets)],
   ['Fixed / Non-Current Assets',data.fixedAssets,data.totalAssets,pct2(data.fixedAssets,data.totalAssets)],
   ['Current Liabilities',data.currentLiabilities,data.totalLiabilitiesAndEquity,pct2(data.currentLiabilities,data.totalLiabilitiesAndEquity)],
   ['Long-Term Liabilities',data.longTermLiabilities,data.totalLiabilitiesAndEquity,pct2(data.longTermLiabilities,data.totalLiabilitiesAndEquity)],
   ['Equity',data.equity,data.totalLiabilitiesAndEquity,pct2(data.equity,data.totalLiabilitiesAndEquity)]
  ];
  const cls=report?'report-mini-table validated-financial-table':'validated-financial-table';
  return `<table class="${cls}"><thead><tr><th>Category</th><th>Amount</th><th>Denominator</th><th>Percentage</th></tr></thead><tbody>`+
   rows.map(x=>`<tr><td>${escapeHtml(x[0])}</td><td>${escapeHtml(fmtMoney(x[1]))}</td><td>${escapeHtml(fmtMoney(x[2]))}</td><td>${escapeHtml(fmtPct(x[3]))}</td></tr>`).join('')+
   `<tr class="validated-total"><td>Total Assets</td><td>${escapeHtml(fmtMoney(data.totalAssets))}</td><td colspan="2">Balance Sheet total</td></tr>`+
   `<tr class="validated-total"><td>Total Liabilities &amp; Equity</td><td>${escapeHtml(fmtMoney(data.totalLiabilitiesAndEquity))}</td><td colspan="2">Balance Sheet total</td></tr></tbody></table>`;
 }
 function expenseTable(data,report=false){
  if(!data?.expenses?.length)return '';
  const cls=report?'report-mini-table validated-financial-table expense-validation-table':'validated-financial-table expense-validation-table';
  return `<table class="${cls}"><thead><tr><th>Expense Category</th><th>Actual Amount</th><th>% of Total Expenses</th></tr></thead><tbody>`+
   data.expenses.map(x=>`<tr><td>${escapeHtml(x.label)}</td><td>${escapeHtml(fmtMoney(x.amount))}</td><td>${escapeHtml(fmtPct(x.pct))}</td></tr>`).join('')+
   `<tr class="validated-total"><td>Total Expenses</td><td>${escapeHtml(fmtMoney(data.totalExpenses))}</td><td>${escapeHtml(fmtPct(data.validation.expensePctTotal))}</td></tr></tbody></table>`;
 }
 function injectStyles(){if(document.getElementById('validated-financial-styles'))return;const s=document.createElement('style');s.id='validated-financial-styles';s.textContent=`
  .validated-financial-table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px;font-size:11px}.validated-financial-table th,.validated-financial-table td{border:1px solid #e3e8ef;padding:6px 7px;vertical-align:top;overflow-wrap:anywhere}.validated-financial-table th{background:#0b2f59;color:#fff;font-weight:700}.validated-financial-table th:first-child,.validated-financial-table td:first-child{width:36%;text-align:left}.validated-financial-table th:not(:first-child),.validated-financial-table td:not(:first-child){text-align:right}.validated-financial-table .validated-total td{font-weight:800;background:#f2f6fa;color:#0b2f59}.expense-validation-table th:first-child,.expense-validation-table td:first-child{width:55%}.expense-validation-table th:nth-child(2),.expense-validation-table td:nth-child(2){width:25%}.expense-validation-table th:nth-child(3),.expense-validation-table td:nth-child(3){width:20%}.report-page .validated-financial-table{font-size:9px;margin-top:10px}.report-page .validated-financial-table th,.report-page .validated-financial-table td{padding:5px 6px;white-space:normal}.report-page .validated-financial-table td:not(:first-child){white-space:nowrap}.report-page .validated-financial-table{break-inside:avoid;page-break-inside:avoid}.report-page .chart-svg{max-width:100%!important}.report-page .donut-row{max-width:100%;overflow:hidden}.report-page table{max-width:100%}`;document.head.appendChild(s);}

 function apply(){injectStyles();return build();}
 if(typeof renderDashboard==='function'&&!window.__validatedFinancialDatasetDash){window.__validatedFinancialDatasetDash=true;const base=renderDashboard;renderDashboard=function(){const data=apply();const out=base.apply(this,arguments);if(data){const bsBox=document.getElementById('chartBs');if(bsBox&&!bsBox.querySelector('.validated-financial-table'))bsBox.insertAdjacentHTML('beforeend','<h3>Validated Asset & Liability Calculations</h3>'+analysisTable(data,false));const exBox=document.getElementById('chartExpenses');if(exBox&&data.expenses.length&&!exBox.querySelector('.expense-validation-table'))exBox.insertAdjacentHTML('beforeend',expenseTable(data,false));}return out;};}
 if(typeof dashboardBodies==='function'&&!window.__validatedFinancialDatasetDashboardPages){window.__validatedFinancialDatasetDashboardPages=true;const base=dashboardBodies;dashboardBodies=function(no,title){const data=apply();const bodies=base.call(this,no,title)||[];if(data){let body=sectionHead(no,title,null,true)+'<div class="report-section-title">Validated Asset & Liability Calculations</div>'+analysisTable(data,true);if(data.expenses.length)body+='<div class="report-section-title">Expense Breakdown Detail</div>'+expenseTable(data,true);bodies.push(body);}return bodies;};}
 if(typeof buildPages==='function'&&!window.__validatedFinancialDatasetReport){window.__validatedFinancialDatasetReport=true;const base=buildPages;buildPages=function(o){apply();return base.call(this,o||{});};}
 window.buildValidatedFinancialDataset=apply;
 window.validatedFinancialAnalysisTable=analysisTable;
 window.validatedExpenseTable=expenseTable;
})();
