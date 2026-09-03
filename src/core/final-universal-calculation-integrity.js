/* Final universal calculation integrity layer.
 * Runs after the existing parser/enrichment stack and normalizes the model from
 * the uploaded workbook. It never treats percentages/variance cells as amounts,
 * always selects the latest real year column, and reconciles balance-sheet math.
 */
'use strict';
(function(){
  const clean=v=>String(v==null?'':v).replace(/\u00a0/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const moneyNum=v=>{
    if(v==null||v==='') return null;
    if(typeof v==='number') return Number.isFinite(v)?v:null;
    const raw=clean(v); if(!raw||/%/.test(raw)||/^[-–—]$/.test(raw)) return null;
    const neg=/^\(.*\)$/.test(raw); const s=raw.replace(/[$,()\s]/g,'');
    if(!/^-?\d+(?:\.\d+)?$/.test(s)) return null;
    const x=Number(s); return Number.isFinite(x)?(neg?-Math.abs(x):x):null;
  };
  const exactYear=v=>/^(?:19|20)\d{2}$/.test(clean(v))?Number(clean(v)):null;
  const close=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<=Math.max(.01,Math.abs(a)*1e-7,Math.abs(b)*1e-7);
  const pct=(n,d)=>n!=null&&d!=null&&Math.abs(d)>.000001?Number(n)/Math.abs(Number(d))*100:null;

  function score(name,rows,kind){
    const t=norm(name+' '+(rows||[]).slice(0,180).flat().join(' '));
    if(kind==='pl') return (/profit and loss|income statement|statement of operations|statement of earnings/.test(t)?50:0)+(/gross profit/.test(t)?10:0)+(/net income|net profit/.test(t)?10:0)+(/revenue|sales|income/.test(t)?5:0);
    if(kind==='bs') return (/balance sheet|statement of financial position|statement of financial condition/.test(t)?50:0)+(/total assets/.test(t)?15:0)+(/current assets/.test(t)?8:0)+(/liabilit/.test(t)?8:0)+(/equity|capital/.test(t)?5:0);
    return 0;
  }
  function pick(sheets,models,kind){
    let best=null,bestScore=-1;
    for(const [name,rows] of Object.entries(sheets||{})){
      const sc=score(name,rows,kind); if(sc>bestScore){bestScore=sc;best={name,rows,sm:models?.[name]||null};}
    }
    return bestScore>=15?best:null;
  }
  function blocked(sm,c){const m=(sm?.cols||[]).find(x=>x.idx===c);return !!(m&&(m.type==='percent'||m.type==='change'||/percent|ratio|variance|change|%/i.test(clean(m.label||m.name))));}
  function yearCols(sheet){
    if(!sheet) return [];
    const found=new Map();
    for(let r=0;r<Math.min(sheet.rows.length,30);r++){
      const row=sheet.rows[r]||[];
      for(let c=1;c<row.length;c++){
        if(blocked(sheet.sm,c)) continue; const y=exactYear(row[c]); if(y==null) continue;
        let hits=0; for(let rr=r+1;rr<Math.min(sheet.rows.length,r+220);rr++){if(moneyNum(sheet.rows[rr]?.[c])!=null&&++hits>=2)break;}
        if(hits>=2) found.set(y,c);
      }
    }
    for(const c of sheet.sm?.cols||[]){if(blocked(sheet.sm,c.idx))continue;const y=exactYear(c.label||c.name);if(y!=null)found.set(y,c.idx);}
    return [...found.entries()].map(([year,idx])=>({year,idx})).sort((a,b)=>b.year-a.year);
  }
  function amountCol(sheet){
    const ys=yearCols(sheet); if(ys.length) return ys[0];
    const current=(sheet?.sm?.cols||[]).find(c=>c.type==='current'&&!blocked(sheet.sm,c.idx)); if(current)return {year:null,idx:current.idx};
    const total=(sheet?.sm?.cols||[]).find(c=>c.type==='rowTotal'&&!blocked(sheet.sm,c.idx)); if(total)return {year:null,idx:total.idx};
    return {year:null,idx:null};
  }
  function labelCell(row){
    for(let c=0;c<Math.min((row||[]).length,6);c++){
      const s=clean(row[c]); if(s&&moneyNum(row[c])==null&&!exactYear(row[c])) return norm(s);
    }
    return '';
  }
  function exact(rows,c,patterns){
    if(c==null)return null; let best=null;
    for(const r of rows||[]){const l=labelCell(r);if(!patterns.some(re=>re.test(l)))continue;const v=moneyNum(r?.[c]);if(v==null)continue;const rank=(/^total\b/.test(l)?50:0)+(Math.abs(v)>.004?5:0);if(!best||rank>best.rank)best={v,rank};}
    return best?.v??null;
  }
  const P={
    revenue:[/^total (for )?(income|revenue|sales)$/, /^total income$/, /^total revenue$/, /^sales$/, /^revenue$/, /^contract sales$/],
    gross:[/^gross profit$/, /^gross income$/],
    cogs:[/^total (for )?(cost of goods sold|cost of sales|cogs)$/, /^cost of goods sold$/, /^cost of sales$/, /^cogs$/, /^total direct job expenses$/],
    expenses:[/^total (for )?(expenses|operating expenses)$/, /^total expenses$/, /^total operating expenses$/],
    net:[/^net income$/, /^net profit$/, /^net income loss$/, /^profit for the period$/, /^net earnings$/],
    cash:[/^total (for )?(cash|cash and cash equivalents|cash and bank|bank accounts?)$/, /^cash and cash equivalents$/, /^cash and bank$/, /^total bank accounts?$/, /^total cash$/],
    ar:[/^total (for )?accounts receivable$/, /^accounts receivable total$/, /^accounts receivable$/, /^trade receivables$/, /^a r$/],
    ap:[/^total (for )?accounts payable$/, /^accounts payable total$/, /^accounts payable$/, /^trade payables$/, /^a p$/],
    totalAssets:[/^total (for )?assets$/, /^assets total$/, /^total asset$/],
    currentAssets:[/^total (for )?current assets?$/, /^current assets? total$/],
    currentLiab:[/^total (for )?current liabilities?$/, /^current liabilities? total$/, /^total short term liabilities?$/],
    longLiab:[/^total (for )?(long term liabilities?|longterm liabilities?|non current liabilities?|noncurrent liabilities?|long term debt)$/, /^long term liabilities? total$/],
    totalLiab:[/^total (for )?liabilities$/, /^liabilities total$/, /^total liability$/],
    equity:[/^total (for )?(equity|shareholders equity|stockholders equity|members equity|capital)$/, /^total equity$/, /^equity total$/],
    totalLE:[/^total (for )?liabilities (and )?equity$/, /^total liabilities and (shareholders|stockholders|members) equity$/, /^total liabilities and capital$/, /^total liabilities equity$/]
  };

  function derivePL(pl,col){
    if(!pl||col.idx==null)return null;
    const revenue=exact(pl.rows,col.idx,P.revenue),cogs=exact(pl.rows,col.idx,P.cogs),expenses=exact(pl.rows,col.idx,P.expenses);
    let gross=exact(pl.rows,col.idx,P.gross); if(gross==null&&revenue!=null&&cogs!=null)gross=revenue-cogs;
    let net=exact(pl.rows,col.idx,P.net); if(net==null&&revenue!=null&&expenses!=null) net=revenue-(expenses<0?Math.abs(expenses):expenses);
    return {year:col.year,revenue,gross,cogs,expenses,net};
  }
  function deriveBS(bs,col,md){
    if(!bs||col.idx==null)return null;
    const r=bs.rows,c=col.idx;
    let totalAssets=exact(r,c,P.totalAssets),currentAssets=exact(r,c,P.currentAssets);
    let fixedAssets=(totalAssets!=null&&currentAssets!=null)?totalAssets-currentAssets:null;
    let currentLiabilities=exact(r,c,P.currentLiab),longTermLiabilities=exact(r,c,P.longLiab),totalLiabilities=exact(r,c,P.totalLiab),equity=exact(r,c,P.equity),totalLE=exact(r,c,P.totalLE);
    if(totalLiabilities==null&&(currentLiabilities!=null||longTermLiabilities!=null))totalLiabilities=(currentLiabilities||0)+(longTermLiabilities||0);
    if(longTermLiabilities==null&&totalLiabilities!=null&&currentLiabilities!=null)longTermLiabilities=totalLiabilities-currentLiabilities;
    if(currentLiabilities==null&&totalLiabilities!=null&&longTermLiabilities!=null)currentLiabilities=totalLiabilities-longTermLiabilities;
    if(equity==null&&totalLE!=null&&totalLiabilities!=null)equity=totalLE-totalLiabilities;
    if(totalLE==null&&totalLiabilities!=null&&equity!=null)totalLE=totalLiabilities+equity;
    const cash=exact(r,c,P.cash),ar=exact(r,c,P.ar),ap=exact(r,c,P.ap);
    const assets=(totalAssets!=null&&Math.abs(totalAssets)>.000001)?[
      {label:'Current Assets',value:currentAssets,pct:pct(currentAssets,totalAssets),denominator:totalAssets},
      {label:'Fixed / Non-Current Assets',value:fixedAssets,pct:pct(fixedAssets,totalAssets),denominator:totalAssets}
    ].filter(x=>x.value!=null):[];
    const le=(totalLE!=null&&Math.abs(totalLE)>.000001)?[
      {label:'Current Liabilities',value:currentLiabilities,pct:pct(currentLiabilities,totalLE),denominator:totalLE},
      {label:'Long-Term Liabilities',value:longTermLiabilities,pct:pct(longTermLiabilities,totalLE),denominator:totalLE},
      {label:'Equity',value:equity,pct:pct(equity,totalLE),denominator:totalLE}
    ].filter(x=>x.value!=null):[];
    return {year:col.year,totalAssets,currentAssets,fixedAssets,currentLiabilities,longTermLiabilities,totalLiabilities,equity,totalLE,cash,ar,ap,assets,le};
  }

  const MONTHS={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
  const SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function monthInfo(v){
    const s=clean(v).toLowerCase(); if(!s)return null;
    let m=null; for(const [k,x] of Object.entries(MONTHS)){if(new RegExp('(^|[^a-z])'+k+'([^a-z]|$)','i').test(s)){m=x;break;}}
    if(m==null){let q=s.match(/^(?:19|20)\d{2}[-\/.](0?[1-9]|1[0-2])$/);if(q)m=Number(q[1]);}
    if(m==null){let q=s.match(/^(0?[1-9]|1[0-2])[-\/.](?:19|20)\d{2}$/);if(q)m=Number(q[1]);}
    if(m==null)return null;
    const ym=s.match(/(?:19|20)\d{2}/); return {month:m,short:SHORT[m-1],year:ym?Number(ym[0]):null,label:clean(v)};
  }
  function monthly(pl){
    if(!pl)return null; let best=[];
    for(let r=0;r<Math.min(pl.rows.length,30);r++){
      const row=pl.rows[r]||[],cols=[];
      for(let c=1;c<row.length;c++){if(blocked(pl.sm,c))continue;const mi=monthInfo(row[c]);if(mi)cols.push({...mi,idx:c});}
      if(cols.length>best.length)best=cols;
    }
    if(best.length<2)return null;
    const years=best.map(x=>x.year).filter(x=>x!=null),latest=years.length?Math.max(...years):null;
    const cols=latest!=null?best.filter(x=>x.year==null||x.year===latest):best;
    const get=patterns=>{let row=null;for(const r of pl.rows){if(patterns.some(re=>re.test(labelCell(r)))){row=r;break;}}return cols.map(x=>row?moneyNum(row[x.idx])??0:0);};
    const revenue=get(P.revenue),expenses=get(P.expenses);let net=get(P.net);
    const explicitNet=pl.rows.some(r=>P.net.some(re=>re.test(labelCell(r))));
    if(!explicitNet)net=revenue.map((v,i)=>v-(expenses[i]<0?Math.abs(expenses[i]):expenses[i]));
    return {months:cols.map(x=>({label:x.label,short:x.short,col:x.idx,year:x.year||latest})),revenue,expenses,net,year:latest};
  }

  function applyToModel(sheets,md){
    if(!md)return md; md.metrics=md.metrics||{};md.prior=md.prior||{};
    const pl=pick(sheets,md.sheetModels,'pl'),bs=pick(sheets,md.sheetModels,'bs');
    const py=yearCols(pl),by=yearCols(bs),pc=amountCol(pl),bc=amountCol(bs);
    const curPL=derivePL(pl,pc),curBS=deriveBS(bs,bc,md);
    if(curPL){if(curPL.revenue!=null)md.metrics.income=curPL.revenue;if(curPL.gross!=null)md.metrics.gross=curPL.gross;if(curPL.expenses!=null)md.metrics.expenses=curPL.expenses;if(curPL.net!=null)md.metrics.net=curPL.net;}
    if(curBS){
      if(curBS.cash!=null)md.metrics.bank=curBS.cash;
      if(curBS.ar!=null)md.metrics.ar=curBS.ar; else if(Number.isFinite(Number(md.arAging?.total)))md.metrics.ar=Number(md.arAging.total);
      if(curBS.ap!=null)md.metrics.ap=curBS.ap; else if(Number.isFinite(Number(md.apAging?.total)))md.metrics.ap=Number(md.apAging.total);
      if(curBS.totalAssets!=null)md.metrics.assets=curBS.totalAssets;if(curBS.totalLiabilities!=null)md.metrics.liabilities=curBS.totalLiabilities;if(curBS.equity!=null)md.metrics.equity=curBS.equity;
      md.totalAssets=curBS.totalAssets;md.totalLiabilitiesAndEquity=curBS.totalLE;md.assetDenominator=curBS.totalAssets!=null?Math.abs(curBS.totalAssets):null;md.liabilityBifurcationDenominator=curBS.totalLE!=null?Math.abs(curBS.totalLE):null;
      md.bsComposition={assets:curBS.assets,liabEquity:curBS.le};md.balanceSheetComposition=[...curBS.assets,...curBS.le];
      md.validatedFinancials={...(md.validatedFinancials||{}),...curBS,validation:{assetsComposition:curBS.totalAssets!=null&&curBS.currentAssets!=null&&curBS.fixedAssets!=null?close(curBS.totalAssets,curBS.currentAssets+curBS.fixedAssets):null,liabilityEquityComposition:curBS.totalLE!=null&&curBS.currentLiabilities!=null&&curBS.longTermLiabilities!=null&&curBS.equity!=null?close(curBS.totalLE,curBS.currentLiabilities+curBS.longTermLiabilities+curBS.equity):null,balanceSheet:curBS.totalAssets!=null&&curBS.totalLE!=null?close(curBS.totalAssets,curBS.totalLE):null}};
    }
    if(py.length>1){const p=derivePL(pl,py[1]);if(p){if(p.revenue!=null)md.prior.income=p.revenue;if(p.gross!=null)md.prior.gross=p.gross;if(p.expenses!=null)md.prior.expenses=p.expenses;if(p.net!=null)md.prior.net=p.net;}}
    if(by.length>1){const p=deriveBS(bs,by[1],md);if(p){if(p.cash!=null)md.prior.bank=p.cash;if(p.ar!=null)md.prior.ar=p.ar;if(p.ap!=null)md.prior.ap=p.ap;if(p.totalAssets!=null)md.prior.assets=p.totalAssets;}}
    if(py.length){md.yearlyFinancials=py.map(y=>{const p=derivePL(pl,y)||{};return {year:y.year,label:String(y.year),income:p.revenue,gross:p.gross,expenses:p.expenses,net:p.net,cogs:p.cogs};});md.currentYear=py[0].year;md.comparisonYears=py.slice(1).map(x=>x.year);}
    const mon=monthly(pl);if(mon&&mon.months.length){md.months=mon.months;md.monthlyRevenue=mon.revenue;md.monthlyExpenses=mon.expenses;md.monthlyNet=mon.net;}
    md.calculationSource={...(md.calculationSource||{}),finalIntegrity:{pl:pl?.name||null,bs:bs?.name||null,currentPLYear:pc.year,currentBSYear:bc.year,monthlyYear:mon?.year??null}};
    return md;
  }

  if(typeof parseWorkbook==='function'&&!window.__finalUniversalIntegrityParser){const base=parseWorkbook;window.__finalUniversalIntegrityParser=true;parseWorkbook=function(sheets){return applyToModel(sheets,base.call(this,sheets));};}
  function applyState(){if(window.state?.model&&window.state?.sheets)applyToModel(window.state.sheets,window.state.model);return window.state?.model||null;}
  if(typeof window.renderDashboard==='function'&&!window.__finalUniversalIntegrityDashboard){const base=window.renderDashboard;window.__finalUniversalIntegrityDashboard=true;window.renderDashboard=function(){applyState();return base.apply(this,arguments);};}
  if(typeof window.buildPages==='function'&&!window.__finalUniversalIntegrityPages){const base=window.buildPages;window.__finalUniversalIntegrityPages=true;window.buildPages=function(o){applyState();return base.call(this,o||{});};}
  window.applyFinalUniversalFinancialIntegrity=applyState;
})();