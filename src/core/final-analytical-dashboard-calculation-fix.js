/* Final calculation integrity layer for the Analytical Dashboard and report.
 * Keeps the existing UI/design unchanged. All values are derived from the
 * currently uploaded workbook only; no company-specific or hard-coded amounts. */
'use strict';
(function(){
  const clean=v=>String(v==null?'':v).replace(/\u00a0/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const moneyNum=v=>{
    if(v==null||v==='') return null;
    if(typeof v==='number') return Number.isFinite(v)?v:null;
    const raw=clean(v);
    if(!raw||/%/.test(raw)||/^[-–—]$/.test(raw)) return null;
    const neg=/^\(.*\)$/.test(raw);
    const s=raw.replace(/[$,()\s]/g,'');
    if(!/^-?\d+(?:\.\d+)?$/.test(s)) return null;
    const n=Number(s);
    return Number.isFinite(n)?(neg?-Math.abs(n):n):null;
  };
  const rowLabel=r=>norm((r||[])[0]||'');
  const rawLabel=r=>clean((r||[])[0]||'');
  const close=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<=Math.max(.01,Math.abs(a)*1e-8,Math.abs(b)*1e-8);
  const pctSigned=(n,d)=>n!=null&&d!=null&&Math.abs(d)>.000001?Number(n)/Math.abs(Number(d))*100:null;

  function scoreSheet(name,rows,kind){
    const text=norm(name+' '+(rows||[]).slice(0,180).flat().join(' '));
    if(kind==='bs') return (/balance sheet|statement of financial position|statement of financial condition/.test(text)?40:0)+(/total assets/.test(text)?12:0)+(/liabilit/.test(text)?8:0)+(/equity|capital/.test(text)?5:0);
    return (/profit and loss|income statement|statement of operations|statement of earnings/.test(text)?40:0)+(/gross profit/.test(text)?10:0)+(/net income|net profit/.test(text)?8:0)+(/revenue|sales|income/.test(text)?5:0);
  }
  function pickSheet(kind){
    const s=typeof state!=='undefined'?state:null;
    let best=null,bestScore=-1;
    for(const [name,rows] of Object.entries(s?.sheets||{})){
      const sc=scoreSheet(name,rows,kind);
      if(sc>bestScore){bestScore=sc;best={name,rows,sm:s?.model?.sheetModels?.[name]||null};}
    }
    return bestScore>=10?best:null;
  }
  function blockedCols(sm){
    return new Set((sm?.cols||[]).filter(c=>['percent','change'].includes(c?.type)||/percent|ratio|variance|change|%/i.test(clean(c?.label||c?.name))).map(c=>c.idx));
  }
  function exactHeaderYear(v){
    const x=clean(v).replace(/^[$\s]+|[$\s]+$/g,'');
    return /^(?:19|20)\d{2}$/.test(x)?Number(x):null;
  }
  function hasDataBelow(rows,headerRow,c){
    let n=0;
    for(let r=headerRow+1;r<Math.min(rows.length,headerRow+180);r++){
      if(moneyNum(rows[r]?.[c])!=null) n++;
      if(n>=2) return true;
    }
    return false;
  }
  function yearColumns(sheet){
    if(!sheet) return [];
    const blocked=blockedCols(sheet.sm), found=new Map();
    for(let r=0;r<Math.min(sheet.rows.length,25);r++){
      const row=sheet.rows[r]||[];
      for(let c=1;c<row.length;c++){
        if(blocked.has(c)) continue;
        const y=exactHeaderYear(row[c]);
        if(y!=null&&hasDataBelow(sheet.rows,r,c)) found.set(y,c);
      }
    }
    for(const c of sheet.sm?.cols||[]){
      if(blocked.has(c.idx)) continue;
      const y=exactHeaderYear(c.label||c.name);
      if(y!=null&&hasDataBelow(sheet.rows,Math.max(-1,(sheet.sm?.headerRow??-1)),c.idx)) found.set(y,c.idx);
    }
    return [...found.entries()].map(([year,idx])=>({year,idx})).sort((a,b)=>b.year-a.year);
  }
  function amountColumn(sheet){
    if(!sheet) return {idx:null,year:null,source:'missing'};
    const yc=yearColumns(sheet);
    if(yc.length) return {idx:yc[0].idx,year:yc[0].year,source:'latest actual year column'};
    const blocked=blockedCols(sheet.sm);
    const current=(sheet.sm?.cols||[]).find(c=>c.type==='current'&&!blocked.has(c.idx));
    if(current) return {idx:current.idx,year:null,source:'current amount column'};
    const total=(sheet.sm?.cols||[]).find(c=>c.type==='rowTotal'&&!blocked.has(c.idx));
    if(total) return {idx:total.idx,year:null,source:'row total amount column'};
    /* Generic one-period workbook: choose a non-derived column that contains
       a reliable statement total, never a percentage/ratio column. */
    const grandPatterns=sheet===pickSheet('bs')?[ /^total (for )?assets$/, /^total assets$/ ]:[ /^gross profit$/, /^net income$/, /^net profit$/, /^total income$/, /^total revenue$/ ];
    for(let c=1;c<Math.max(...sheet.rows.map(r=>(r||[]).length),1);c++){
      if(blocked.has(c)) continue;
      for(const r of sheet.rows){
        if(grandPatterns.some(re=>re.test(rowLabel(r)))&&moneyNum(r?.[c])!=null) return {idx:c,year:null,source:'detected amount column'};
      }
    }
    return {idx:null,year:null,source:'missing'};
  }
  function exact(rows,c,patterns){
    if(c==null) return null;
    let best=null;
    for(const r of rows||[]){
      const l=rowLabel(r);
      if(!patterns.some(re=>re.test(l))) continue;
      const v=moneyNum(r?.[c]);
      if(v==null) continue;
      const rank=(/^total\b/.test(l)?50:0)+(Math.abs(v)>.004?5:0);
      if(!best||rank>best.rank) best={v,rank};
    }
    return best?.v??null;
  }
  function locate(rows,patterns,from=0){
    for(let i=from;i<(rows||[]).length;i++) if(patterns.some(re=>re.test(rowLabel(rows[i])))) return i;
    return -1;
  }
  function sectionTotal(rows,c,startPatterns,stopPatterns,totalPatterns){
    const start=locate(rows,startPatterns);
    if(start<0||c==null) return null;
    let sum=0,count=0;
    for(let i=start+1;i<rows.length;i++){
      const l=rowLabel(rows[i]);
      if(stopPatterns.some(re=>re.test(l))) break;
      const v=moneyNum(rows[i]?.[c]);
      if(v==null) continue;
      if(totalPatterns.some(re=>re.test(l))) return v;
      if(/^total\b|^subtotal\b/.test(l)) continue;
      sum+=v; count++;
    }
    return count?sum:null;
  }

  function currentGross(pl,colInfo){
    if(!pl||colInfo.idx==null) return {current:null,prior:null};
    const grossP=[/^gross profit$/, /^gross income$/];
    let current=exact(pl.rows,colInfo.idx,grossP);
    if(current==null){
      const income=exact(pl.rows,colInfo.idx,[/^total (for )?(income|revenue|sales)$/, /^total income$/, /^total revenue$/, /^contract sales$/, /^sales$/]);
      const cogs=exact(pl.rows,colInfo.idx,[/^total (for )?(cost of goods sold|cost of sales|cogs)$/, /^total direct job expenses$/, /^cost of goods sold$/, /^cost of sales$/]);
      if(income!=null&&cogs!=null) current=income-cogs;
    }
    const yc=yearColumns(pl); let prior=null;
    if(yc.length>1){
      prior=exact(pl.rows,yc[1].idx,grossP);
      if(prior==null){
        const income=exact(pl.rows,yc[1].idx,[/^total (for )?(income|revenue|sales)$/, /^total income$/, /^total revenue$/, /^contract sales$/, /^sales$/]);
        const cogs=exact(pl.rows,yc[1].idx,[/^total (for )?(cost of goods sold|cost of sales|cogs)$/, /^total direct job expenses$/, /^cost of goods sold$/, /^cost of sales$/]);
        if(income!=null&&cogs!=null) prior=income-cogs;
      }
    }
    return {current,prior};
  }

  function balanceData(bs,colInfo){
    if(!bs||colInfo.idx==null) return null;
    const r=bs.rows,c=colInfo.idx;
    let totalAssets=exact(r,c,[/^total (for )?assets$/, /^assets total$/, /^total asset$/]);
    let currentAssets=exact(r,c,[/^total (for )?current assets?$/, /^current assets? total$/]);
    if(currentAssets==null) currentAssets=sectionTotal(r,c,[/^current assets?$/],[/^fixed assets?$|^property plant|^non current assets?$|^noncurrent assets?$|^other assets?$|^liabilit/],[/^total (for )?current assets?$/, /^current assets? total$/]);

    const explicitNonCurrent=exact(r,c,[/^total (for )?(non current assets?|noncurrent assets?)$/, /^non current assets? total$/]);
    const fixedSubtotal=exact(r,c,[/^total (for )?(fixed assets?|property plant and equipment|property and equipment)$/, /^net property plant and equipment$/, /^fixed assets? total$/]);
    const otherTotals=[];
    for(const p of [
      [/^total (for )?other assets?$/],
      [/^total (for )?intangible assets?$/],
      [/^total (for )?investments?$/],
      [/^total (for )?long term assets?$/]
    ]){const v=exact(r,c,p);if(v!=null)otherTotals.push(v);}
    let fixedAssets=explicitNonCurrent;
    if(fixedAssets==null&&fixedSubtotal!=null) fixedAssets=fixedSubtotal+otherTotals.reduce((a,b)=>a+b,0);
    if(fixedAssets==null){
      const sec=sectionTotal(r,c,[/^fixed assets?$|^property plant and equipment$|^property and equipment$|^non current assets?$|^noncurrent assets$/],[/^liabilit/],[/^total (for )?(fixed assets?|property plant and equipment|property and equipment|non current assets?|noncurrent assets?)$/]);
      if(sec!=null) fixedAssets=sec;
    }
    /* Total Assets and Total Current Assets are the authoritative asset-side
       reconciliation when both are present. This automatically includes all
       fixed, other and non-current asset sections exactly once. */
    if(totalAssets!=null&&currentAssets!=null){
      const residual=totalAssets-currentAssets;
      if(fixedAssets==null||!close(currentAssets+fixedAssets,totalAssets)) fixedAssets=residual;
    }
    if(totalAssets==null&&currentAssets!=null&&fixedAssets!=null) totalAssets=currentAssets+fixedAssets;
    if(currentAssets==null&&totalAssets!=null&&fixedAssets!=null) currentAssets=totalAssets-fixedAssets;

    let currentLiabilities=exact(r,c,[/^total (for )?current liabilities?$/, /^current liabilities? total$/, /^total short term liabilities?$/]);
    if(currentLiabilities==null) currentLiabilities=sectionTotal(r,c,[/^current liabilities?$|^short term liabilities?$|^current obligations$/],[/^long term liabilities?$|^non current liabilities?$|^noncurrent liabilities?$|^equity$|^capital$|^total liabilities$/],[/^total (for )?current liabilities?$/, /^current liabilities? total$/]);
    let longTermLiabilities=exact(r,c,[/^total (for )?(long term liabilities?|longterm liabilities?|non current liabilities?|noncurrent liabilities?|long term debt)$/, /^long term liabilities? total$/]);
    if(longTermLiabilities==null) longTermLiabilities=sectionTotal(r,c,[/^long term liabilities?$|^longterm liabilities?$|^non current liabilities?$|^noncurrent liabilities?$|^long term debt$/],[/^equity$|^capital$|^shareholders equity$|^stockholders equity$|^members equity$|^total liabilities and/],[/^total (for )?(long term liabilities?|longterm liabilities?|non current liabilities?|noncurrent liabilities?|long term debt)$/]);
    let totalLiabilities=exact(r,c,[/^total (for )?liabilities$/, /^liabilities total$/, /^total liability$/]);
    let equity=exact(r,c,[/^total (for )?(equity|shareholders equity|stockholders equity|members equity|capital)$/, /^total equity$/, /^equity total$/]);
    let totalLE=exact(r,c,[/^total (for )?liabilities (and )?equity$/, /^total liabilities and (shareholders|stockholders|members) equity$/, /^total liabilities and capital$/, /^total liabilities equity$/]);

    if(totalLiabilities==null&&(currentLiabilities!=null||longTermLiabilities!=null)) totalLiabilities=(currentLiabilities||0)+(longTermLiabilities||0);
    if(longTermLiabilities==null&&totalLiabilities!=null&&currentLiabilities!=null) longTermLiabilities=totalLiabilities-currentLiabilities;
    if(currentLiabilities==null&&totalLiabilities!=null&&longTermLiabilities!=null) currentLiabilities=totalLiabilities-longTermLiabilities;
    if(equity==null&&totalLE!=null&&totalLiabilities!=null) equity=totalLE-totalLiabilities;
    if(totalLE==null&&totalLiabilities!=null&&equity!=null) totalLE=totalLiabilities+equity;

    const assets=totalAssets!=null?[
      {label:'Current Assets',value:currentAssets,pct:pctSigned(currentAssets,totalAssets),denominator:totalAssets},
      {label:'Fixed / Non-Current Assets',value:fixedAssets,pct:pctSigned(fixedAssets,totalAssets),denominator:totalAssets}
    ].filter(x=>x.value!=null):[];
    const le=totalLE!=null?[
      {label:'Current Liabilities',value:currentLiabilities,pct:pctSigned(currentLiabilities,totalLE),denominator:totalLE},
      {label:'Long-Term Liabilities',value:longTermLiabilities,pct:pctSigned(longTermLiabilities,totalLE),denominator:totalLE},
      {label:'Equity',value:equity,pct:pctSigned(equity,totalLE),denominator:totalLE}
    ].filter(x=>x.value!=null):[];

    return {
      totalAssets,currentAssets,fixedAssets,currentLiabilities,longTermLiabilities,totalLiabilities,equity,totalLE,assets,le,
      validation:{
        assetsComposition:totalAssets!=null&&currentAssets!=null&&fixedAssets!=null?close(totalAssets,currentAssets+fixedAssets):null,
        liabilityEquityComposition:totalLE!=null&&currentLiabilities!=null&&longTermLiabilities!=null&&equity!=null?close(totalLE,currentLiabilities+longTermLiabilities+equity):null
      }
    };
  }

  function apTotal(bs,colInfo,md){
    if(bs&&colInfo.idx!=null){
      const v=exact(bs.rows,colInfo.idx,[/^total (for )?accounts payable$/, /^total accounts payable$/, /^accounts payable total$/, /^total a p$/, /^a p total$/, /^accounts payable$/]);
      if(v!=null) return v;
    }
    const aging=Number(md?.apAging?.total);
    return Number.isFinite(aging)?aging:null;
  }

  function apply(){
    const s=typeof state!=='undefined'?state:null, md=s?.model;
    if(!md) return null;
    const bs=pickSheet('bs'), pl=pickSheet('pl');
    const bcol=amountColumn(bs), pcol=amountColumn(pl);
    md.metrics=md.metrics||{}; md.prior=md.prior||{};

    const gp=currentGross(pl,pcol);
    if(gp.current!=null) md.metrics.gross=gp.current;
    if(gp.prior!=null) md.prior.gross=gp.prior;

    const b=balanceData(bs,bcol);
    if(b){
      if(b.totalAssets!=null) md.metrics.assets=b.totalAssets;
      if(b.totalLiabilities!=null) md.metrics.liabilities=b.totalLiabilities;
      if(b.equity!=null) md.metrics.equity=b.equity;
      md.totalAssets=b.totalAssets;
      md.totalLiabilitiesAndEquity=b.totalLE;
      md.assetDenominator=b.totalAssets!=null?Math.abs(b.totalAssets):null;
      md.liabilityBifurcationDenominator=b.totalLE!=null?Math.abs(b.totalLE):null;
      md.bsComposition={assets:b.assets,liabEquity:b.le};
      md.balanceSheetComposition=[...b.assets,...b.le];
      md.liabilityBifurcation=b.le.filter(x=>/liabilit/i.test(x.label)).map(x=>({label:x.label,value:x.value,pct:x.pct,denominator:b.totalLE,detected:true}));
      md.validatedFinancials={...(md.validatedFinancials||{}),
        totalAssets:b.totalAssets,currentAssets:b.currentAssets,fixedAssets:b.fixedAssets,
        currentLiabilities:b.currentLiabilities,longTermLiabilities:b.longTermLiabilities,totalLiabilities:b.totalLiabilities,
        equity:b.equity,totalLiabilitiesAndEquity:b.totalLE,assets:b.assets,liabilitiesEquity:b.le,
        validation:{...(md.validatedFinancials?.validation||{}),...b.validation},
        source:{...(md.validatedFinancials?.source||{}),balanceSheet:bs?.name||null,balanceColumn:bcol.idx,balanceYear:bcol.year,balanceColumnSource:bcol.source}
      };
    }

    const ap=apTotal(bs,bcol,md);
    if(ap!=null) md.metrics.ap=ap;
    const by=yearColumns(bs);
    if(bs&&by.length>1){
      const priorAp=exact(bs.rows,by[1].idx,[/^total (for )?accounts payable$/, /^total accounts payable$/, /^accounts payable total$/, /^total a p$/, /^a p total$/, /^accounts payable$/]);
      if(priorAp!=null) md.prior.ap=priorAp;
    }
    md.calculationSource={...(md.calculationSource||{}),currentPLColumn:pcol,currentBSColumn:bcol,apRule:ap!=null&&(bs&&exact(bs.rows,bcol.idx,[/^total (for )?accounts payable$/, /^total accounts payable$/, /^accounts payable total$/, /^total a p$/, /^a p total$/, /^accounts payable$/])!=null)?'Balance Sheet — current/latest A/P total':'A/P Aging — grand total'};
    return md;
  }

  /* Preserve the existing donut design but display the workbook-calculated
     percentage supplied by the analytical dataset. Arc geometry still uses
     absolute magnitudes so negative equity can be drawn, while its legend and
     tooltip retain the correct signed percentage of Total L&E. */
  if(typeof window.donutChart==='function'&&!window.__finalSignedDonutCalc){
    window.__finalSignedDonutCalc=true;
    window.donutChart=function({items,size=168,title=''}){
      const cleanItems=(items||[]).filter(i=>Math.abs(Number(i.value)||0)>0.004);
      const magTotal=cleanItems.reduce((s,i)=>s+Math.abs(Number(i.value)||0),0)||1;
      const cx=size/2,cy=size/2,R=size/2-4,r=R*.62;let a0=-Math.PI/2,svg=`<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img">`,legend=[];
      cleanItems.forEach((it,i)=>{
        const frac=Math.abs(Number(it.value)||0)/magTotal,a1=a0+frac*Math.PI*2,color=DONUT_PALETTE[i%DONUT_PALETTE.length],large=frac>.5?1:0;
        const shownPct=Number.isFinite(Number(it.pct))?Number(it.pct):frac*100;
        if(frac>=.999) svg+=`<circle cx="${cx}" cy="${cy}" r="${(R+r)/2}" fill="none" stroke="${color}" stroke-width="${R-r}"/>`;
        else {const p=a=>[cx+Math.cos(a)*R,cy+Math.sin(a)*R],q=a=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r],[x0,y0]=p(a0),[x1,y1]=p(a1),[x2,y2]=q(a1),[x3,y3]=q(a0);svg+=`<path d="M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${r},${r} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z" fill="${color}"><title>${escapeHtml(it.label+': '+money(it.value)+' ('+pct(shownPct)+')')}</title></path>`;}
        legend.push(`<div class="donut-legend-item"><i style="background:${color}"></i><span>${escapeHtml(it.label)}</span><b>${escapeHtml(pct(shownPct))}</b></div>`);a0=a1;
      });
      svg+='</svg>';
      return `<div class="donut-block">${title?`<div class="donut-title">${escapeHtml(title)}</div>`:''}<div class="donut-flex">${svg}<div class="donut-legend">${legend.join('')}</div></div></div>`;
    };
  }

  if(typeof window.renderDashboard==='function'&&!window.__finalAnalyticalDashboardCalc){
    const base=window.renderDashboard;window.__finalAnalyticalDashboardCalc=true;
    window.renderDashboard=function(){apply();return base.apply(this,arguments);};
  }
  if(typeof window.buildPages==='function'&&!window.__finalAnalyticalReportCalc){
    const base=window.buildPages;window.__finalAnalyticalReportCalc=true;
    window.buildPages=function(opts){apply();return base.call(this,opts||{});};
  }
  window.applyFinalAnalyticalDashboardCalculations=apply;
})();