/* Generic multi-year comparison for management reporting.
 * Reads actual year columns from comparative statements and makes the latest
 * real amount year the dashboard current year. Never invents missing years.
 */
'use strict';
(function(){
  const clean=v=>String(v??'').replace(/\u00a0/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const isPct=v=>/%\s*$/.test(clean(v));
  const toNum=v=>{
    if(v==null||v===''||isPct(v)) return null;
    if(typeof v==='number') return Number.isFinite(v)?v:null;
    let s=clean(v); if(!s||/^[-–—]$/.test(s)) return 0;
    const neg=/^\(.*\)$/.test(s);
    s=s.replace(/[$,()\s]/g,'');
    if(!/^-?\d+(?:\.\d+)?$/.test(s)) return null;
    const n=Number(s); return Number.isFinite(n)?(neg?-Math.abs(n):n):null;
  };
  const rowLabel=r=>norm((r||[])[0]||'');
  const yearsIn=v=>[...clean(v).matchAll(/\b(?:19|20)\d{2}\b/g)].map(m=>Number(m[0]));
  const esc=s=>typeof escapeHtml==='function'?escapeHtml(String(s??'')):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v==null?'—':(typeof money==='function'?money(v):'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}));
  const fmtPct=v=>v==null?'—':Number(v).toFixed(2)+'%';

  const metrics=[
    {key:'revenue',label:'Sales / Revenue',side:'pl',patterns:[/^total (for )?(income|revenue|sales)$/, /^contract sales$/, /^total contract sales$/, /^sales$/, /^revenue$/, /^total income$/]},
    {key:'netIncome',label:'Net Income',side:'pl',patterns:[/^net income$/, /^net profit$/, /^net profit loss$/, /^net income loss$/, /^profit for the period$/, /^net earnings$/]},
    {key:'cogs',label:'COGS / Direct Job Expenses',side:'pl',patterns:[/^total (for )?(cost of goods sold|cost of sales|cogs)$/, /^total direct job expenses$/, /^direct job expenses$/, /^cost of goods sold$/, /^cost of sales$/, /^cogs$/]},
    {key:'ar',label:'A/R',side:'bs',patterns:[/^total (for )?accounts receivable$/, /^accounts receivable total$/, /^accounts receivable$/, /^trade receivables$/, /^a r$/]},
    {key:'ap',label:'A/P',side:'bs',patterns:[/^total (for )?accounts payable$/, /^accounts payable total$/, /^accounts payable$/, /^trade payables$/, /^a p$/]}
  ];

  function looksPL(name,rows){const s=norm(name+' '+(rows||[]).slice(0,150).flat().join(' '));return /comparative income statement|income statement|profit and loss|statement of operations|statement of earnings/.test(s)||(/net (income|profit)/.test(s)&&/(revenue|income|sales)/.test(s));}
  function looksBS(name,rows){const s=norm(name+' '+(rows||[]).slice(0,180).flat().join(' '));return /comparative balance sheet|balance sheet|statement of financial position|statement of financial condition/.test(s)||(/assets/.test(s)&&/liabilit/.test(s));}

  function blockedCols(sm){return new Set((sm?.cols||[]).filter(c=>c?.type==='percent'||c?.type==='change'||/percent|ratio|variance|change|%/i.test(clean(c?.label||c?.name))).map(c=>c.idx));}
  function metricRows(rows){return (rows||[]).filter(r=>metrics.some(m=>m.patterns.some(re=>re.test(rowLabel(r)))));}

  function discoverYearColumns(rows,sm){
    const blocked=blockedCols(sm), candidates=new Map(), keyRows=metricRows(rows);
    /* A year is valid when printed in a column that also contains financial amounts. */
    for(const r of (rows||[]).slice(0,60)){
      for(let c=1;c<(r||[]).length;c++){
        if(blocked.has(c)) continue;
        const ys=yearsIn(r[c]); if(ys.length!==1) continue;
        const amountCount=keyRows.filter(kr=>toNum(kr?.[c])!=null).length;
        if(amountCount>0&&!candidates.has(ys[0])) candidates.set(ys[0],c);
      }
    }
    for(const c of sm?.cols||[]){
      if(blocked.has(c.idx)) continue;
      const ys=yearsIn(c.label||c.name); if(ys.length!==1) continue;
      const amountCount=keyRows.filter(kr=>toNum(kr?.[c.idx])!=null).length;
      if(amountCount>0&&!candidates.has(ys[0])) candidates.set(ys[0],c.idx);
    }
    /* Do not map years found only in a title row. If title says 2025/2024/2023
       but actual amount headers are 2024 and 2025, 2023 is correctly omitted. */
    return [...candidates.entries()].map(([year,idx])=>({year,idx})).sort((a,b)=>b.year-a.year);
  }

  function exact(rows,col,patterns){
    let best=null;
    for(const r of rows||[]){
      const l=rowLabel(r); if(!patterns.some(re=>re.test(l))) continue;
      const v=toNum(r?.[col]); if(v==null) continue;
      const rank=(/^total\b/.test(l)?60:0)+(/^net (income|profit)/.test(l)?100:0)+(l==='total income'?80:0)+(l==='contract sales'?40:0)+Math.log10(Math.abs(v)+1);
      if(!best||rank>best.rank) best={value:v,rank,label:l};
    }
    return best?.value??null;
  }

  function statementSheets(){
    let pl=null,bs=null,ps=-1,bss=-1;
    for(const [name,rows] of Object.entries(window.state?.sheets||{})){
      const sm=state.model?.sheetModels?.[name], yc=discoverYearColumns(rows,sm).length;
      if(looksPL(name,rows)&&yc>ps){ps=yc;pl={name,rows,sm};}
      if(looksBS(name,rows)&&yc>bss){bss=yc;bs={name,rows,sm};}
    }
    return {pl,bs};
  }

  function build(){
    const md=window.state?.model;if(!md)return null;
    const {pl,bs}=statementSheets(), py=pl?discoverYearColumns(pl.rows,pl.sm):[], by=bs?discoverYearColumns(bs.rows,bs.sm):[];
    const years=[...new Set([...py.map(x=>x.year),...by.map(x=>x.year)])].sort((a,b)=>b-a);
    if(!years.length){md.multiYearComparison=null;md.yearWiseComparison=null;return null;}
    const pm=new Map(py.map(x=>[x.year,x.idx])),bm=new Map(by.map(x=>[x.year,x.idx]));
    const rows=metrics.map(m=>{const values={};for(const y of years){const src=m.side==='bs'?bs:pl,c=(m.side==='bs'?bm:pm).get(y);values[y]=(src&&c!=null)?exact(src.rows,c,m.patterns):null;}return {...m,values};});
    const latestYear=years[0],previousYears=years.slice(1);
    const comparisons=rows.map(r=>({key:r.key,label:r.label,current:r.values[latestYear],currentYear:latestYear,values:r.values,previous:previousYears.map(y=>{const v=r.values[y],cur=r.values[latestYear],variance=cur!=null&&v!=null?cur-v:null;return {year:y,value:v,variance,variancePct:variance!=null&&v!=null&&Math.abs(v)>.000001?variance/Math.abs(v)*100:null};})}));
    const data={latestYear,previousYears,years,comparisons,source:{pl:pl?.name||null,bs:bs?.name||null}};
    md.multiYearComparison=md.yearWiseComparison=data;
    return data;
  }

  function metric(d,key){return d?.comparisons?.find(x=>x.key===key)||null;}
  function syncLatestToDashboard(d){
    const md=window.state?.model;if(!md||!d||d.years.length<2)return;
    const rev=metric(d,'revenue'),net=metric(d,'netIncome'),ar=metric(d,'ar'),ap=metric(d,'ap');
    md.metrics=md.metrics||{}; md.prior=md.prior||{};
    if(rev?.current!=null) md.metrics.income=rev.current;
    if(net?.current!=null) md.metrics.net=net.current;
    if(ar?.current!=null) md.metrics.ar=ar.current;
    if(ap?.current!=null) md.metrics.ap=ap.current;
    const py=d.previousYears[0];
    if(py!=null){
      if(rev?.values?.[py]!=null) md.prior.income=rev.values[py];
      if(net?.values?.[py]!=null) md.prior.net=net.values[py];
      if(ar?.values?.[py]!=null) md.prior.ar=ar.values[py];
      if(ap?.values?.[py]!=null) md.prior.ap=ap.values[py];
    }
    md.currentYear=d.latestYear; md.comparisonYears=d.previousYears.slice();
  }

  function table(d){
    if(!d||d.years.length<2)return '';
    const heads=d.years.map((y,i)=>`<th>${y}${i===0?' (Latest)':''}</th>`).join('');
    const body=d.comparisons.map(r=>`<tr><td class="lbl"><b>${esc(r.label)}</b></td>${d.years.map(y=>`<td class="val">${esc(fmt(r.values[y]))}</td>`).join('')}<td class="val year-variance">${r.previous.map(x=>`<div><b>vs ${x.year}:</b> ${esc(fmt(x.variance))} (${esc(fmtPct(x.variancePct))})</div>`).join('')||'—'}</td></tr>`).join('');
    return `<div class="multi-year-key-comparison"><h3>Year-wise Key Financial Comparison</h3><div class="chart-sub">Current/latest year: <b>${d.latestYear}</b>. Compared with ${d.previousYears.join(', ')}.</div><div class="report-table-wrap"><table class="report-table multi-year-table"><thead><tr><th>Metric</th>${heads}<th>Latest vs Previous</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
  }
  function addDashboard(d){
    let host=document.getElementById('multiYearComparisonHost');
    if(!host){
      const grid=document.getElementById('kpiGrid'); if(!grid)return;
      host=document.createElement('div');host.id='multiYearComparisonHost';host.className='card multi-year-dashboard-card';grid.insertAdjacentElement('afterend',host);
    }
    host.innerHTML=d?.years?.length>1?table(d):'';host.style.display=d?.years?.length>1?'block':'none';
  }
  function reportPage(d){if(!d||d.years.length<2)return null;const content=table(d).replace('<h3>Year-wise Key Financial Comparison</h3>',''),head=typeof sectionHead==='function'?sectionHead(null,'Year-wise Key Financial Comparison',`Latest year ${d.latestYear} compared with prior years`):'<h2 class="report-title">Year-wise Key Financial Comparison</h2><div class="report-rule"></div>';return {sectionId:'year-wise-comparison',sectionNo:null,title:'Year-wise Key Financial Comparison',html:`<div class="report-page" data-section="year-wise-comparison">${head}${content}</div>`};}
  function injectStyle(){if(document.getElementById('multi-year-comparison-style'))return;const s=document.createElement('style');s.id='multi-year-comparison-style';s.textContent='.multi-year-dashboard-card{margin:18px 0}.multi-year-key-comparison{margin-top:8px}.multi-year-table{width:100%;table-layout:fixed}.multi-year-table th,.multi-year-table td{white-space:normal;overflow-wrap:anywhere}.multi-year-table .lbl{width:18%}.year-variance{font-size:11px;line-height:1.5}.year-variance div{margin:2px 0}.report-page .multi-year-table{font-size:10px}';document.head.appendChild(s);}
  function apply(){injectStyle();const d=build();syncLatestToDashboard(d);return d;}

  if(typeof window.renderDashboard==='function'&&!window.__multiYearKeyDash){
    const base=window.renderDashboard;window.__multiYearKeyDash=true;
    window.renderDashboard=function(){const d=apply();const out=base.apply(this,arguments);addDashboard(d);return out;};
  }
  if(typeof window.buildPages==='function'&&!window.__multiYearKeyPages){
    const base=window.buildPages;window.__multiYearKeyPages=true;
    window.buildPages=function(o){const d=apply();let pages=base.call(this,o||{});if(d?.years?.length>1&&Array.isArray(pages)&&!pages.some(p=>p.sectionId==='year-wise-comparison')){const pg=reportPage(d),idx=pages.findIndex(p=>p.sectionId==='notes'||p.sectionId==='disclaimer');if(idx>=0)pages.splice(idx,0,pg);else pages.push(pg);}return pages;};
  }
  window.buildMultiYearKeyComparison=apply;
})();