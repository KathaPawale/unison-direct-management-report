/* Generic multi-year comparison for key management metrics.
 * Reads years from comparative statement headers, including title rows such as
 * "For the Years Ended December 31, 2025, 2024 and 2023" and maps them to the
 * actual numeric columns. Latest year is current. */
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
    {key:'revenue',label:'Sales / Revenue',side:'pl',patterns:[/^total (for )?(income|revenue|sales)$/, /^contract sales$/, /^total contract sales$/, /^sales$/, /^revenue$/]},
    {key:'netIncome',label:'Net Income',side:'pl',patterns:[/^net income$/, /^net profit$/, /^net profit loss$/, /^net income loss$/, /^profit for the period$/, /^income from operations$/]},
    {key:'cogs',label:'COGS / Direct Job Expenses',side:'pl',patterns:[/^total (for )?(cost of goods sold|cost of sales|cogs)$/, /^total direct job expenses$/, /^direct job expenses$/, /^cost of goods sold$/, /^cost of sales$/, /^cogs$/]},
    {key:'ar',label:'A/R',side:'bs',patterns:[/^total (for )?accounts receivable$/, /^accounts receivable total$/, /^accounts receivable$/, /^trade receivables$/, /^a r$/]},
    {key:'ap',label:'A/P',side:'bs',patterns:[/^total (for )?accounts payable$/, /^accounts payable total$/, /^accounts payable$/, /^trade payables$/, /^a p$/]}
  ];

  function looksPL(name,rows){const s=norm(name+' '+(rows||[]).slice(0,130).flat().join(' '));return /comparative income statement|income statement|profit and loss|statement of operations|statement of earnings/.test(s)||(/net (income|profit)/.test(s)&&/(revenue|income|sales)/.test(s));}
  function looksBS(name,rows){const s=norm(name+' '+(rows||[]).slice(0,160).flat().join(' '));return /comparative balance sheet|balance sheet|statement of financial position|statement of financial condition/.test(s)||(/assets/.test(s)&&/liabilit/.test(s));}

  function headerYearList(rows){
    const out=[];
    for(const r of (rows||[]).slice(0,20)) for(const v of r||[]) for(const y of yearsIn(v)) if(!out.includes(y)) out.push(y);
    return out.sort((a,b)=>b-a);
  }
  function numericColumns(rows){
    const scores=new Map();
    for(const r of (rows||[]).slice(0,180)) for(let c=1;c<(r||[]).length;c++) if(toNum(r[c])!=null) scores.set(c,(scores.get(c)||0)+1);
    return [...scores.entries()].filter(x=>x[1]>=2).sort((a,b)=>a[0]-b[0]).map(x=>x[0]);
  }
  function discoverYearColumns(rows,sm){
    const blocked=new Set((sm?.cols||[]).filter(c=>c?.type==='percent'||c?.type==='change'||/percent|ratio|variance|change|%/i.test(clean(c?.label||c?.name))).map(c=>c.idx));
    const direct=new Map();
    for(const r of (rows||[]).slice(0,35)) (r||[]).forEach((v,i)=>{const ys=yearsIn(v);if(!blocked.has(i)&&ys.length===1&&!direct.has(ys[0]))direct.set(ys[0],i);});
    for(const c of sm?.cols||[]){const ys=yearsIn(c.label);if(!blocked.has(c.idx)&&ys.length===1&&!direct.has(ys[0]))direct.set(ys[0],c.idx);}
    const titleYears=headerYearList(rows), cols=numericColumns(rows).filter(c=>!blocked.has(c));
    /* Some exported comparative statements declare 2025/2024/2023 in the title but
       expose only the populated year columns below. Map latest declared years to the
       actual amount columns from right-to-left (latest normally rightmost). */
    if(titleYears.length&&cols.length){
      const used=new Set(direct.values()), free=cols.filter(c=>!used.has(c));
      const missing=titleYears.filter(y=>!direct.has(y));
      const chosen=free.slice(-missing.length).reverse();
      missing.forEach((y,i)=>{if(chosen[i]!=null)direct.set(y,chosen[i]);});
    }
    return [...direct.entries()].map(([year,idx])=>({year,idx})).sort((a,b)=>b.year-a.year);
  }
  function exact(rows,col,patterns){
    let best=null;
    for(const r of rows||[]){const l=rowLabel(r);if(!patterns.some(re=>re.test(l)))continue;const v=toNum(r?.[col]);if(v==null)continue;const rank=(/^total\b/.test(l)?40:0)+Math.log10(Math.abs(v)+1);if(!best||rank>best.rank)best={value:v,rank};}
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
    if(!years.length){md.multiYearComparison=null;return null;}
    const pm=new Map(py.map(x=>[x.year,x.idx])),bm=new Map(by.map(x=>[x.year,x.idx]));
    const rows=metrics.map(m=>{const values={};for(const y of years){const src=m.side==='bs'?bs:pl,c=(m.side==='bs'?bm:pm).get(y);values[y]=(src&&c!=null)?exact(src.rows,c,m.patterns):null;}return {...m,values};});
    const latestYear=years[0],previousYears=years.slice(1);
    const comparisons=rows.map(r=>({key:r.key,label:r.label,current:r.values[latestYear],currentYear:latestYear,values:r.values,previous:previousYears.map(y=>{const v=r.values[y],cur=r.values[latestYear],variance=cur!=null&&v!=null?cur-v:null;return {year:y,value:v,variance,variancePct:variance!=null&&v!=null&&Math.abs(v)>.000001?variance/Math.abs(v)*100:null};})}));
    return md.multiYearComparison=md.yearWiseComparison={latestYear,previousYears,years,comparisons,source:{pl:pl?.name||null,bs:bs?.name||null}};
  }
  function table(d){
    if(!d||d.years.length<2)return '';
    const heads=d.years.map((y,i)=>`<th>${y}${i===0?' (Latest)':''}</th>`).join('');
    const body=d.comparisons.map(r=>`<tr><td class="lbl"><b>${esc(r.label)}</b></td>${d.years.map(y=>`<td class="val">${esc(fmt(r.values[y]))}</td>`).join('')}<td class="val year-variance">${r.previous.map(x=>`<div><b>vs ${x.year}:</b> ${esc(fmt(x.variance))} (${esc(fmtPct(x.variancePct))})</div>`).join('')||'—'}</td></tr>`).join('');
    return `<div class="multi-year-key-comparison"><h3>Year-wise Key Financial Comparison</h3><div class="chart-sub">Latest year ${d.latestYear} shown separately and compared with previous years detected in the uploaded workbook.</div><div class="report-table-wrap"><table class="report-table multi-year-table"><thead><tr><th>Metric</th>${heads}<th>Latest vs Previous</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
  }
  function addDashboard(d){const host=document.getElementById('comparisonTable');if(!host)return;host.querySelector('.multi-year-key-comparison')?.remove();if(d?.years?.length>1)host.insertAdjacentHTML('beforeend',table(d));}
  function reportPage(d){if(!d||d.years.length<2)return null;const content=table(d).replace('<h3>Year-wise Key Financial Comparison</h3>',''),head=typeof sectionHead==='function'?sectionHead(null,'Year-wise Key Financial Comparison',`Latest year ${d.latestYear} compared with prior years`):'<h2 class="report-title">Year-wise Key Financial Comparison</h2><div class="report-rule"></div>';return {sectionId:'year-wise-comparison',sectionNo:null,title:'Year-wise Key Financial Comparison',html:`<div class="report-page" data-section="year-wise-comparison">${head}${content}</div>`};}
  function injectStyle(){if(document.getElementById('multi-year-comparison-style'))return;const s=document.createElement('style');s.id='multi-year-comparison-style';s.textContent='.multi-year-key-comparison{margin-top:18px}.multi-year-table{width:100%;table-layout:fixed}.multi-year-table th,.multi-year-table td{white-space:normal;overflow-wrap:anywhere}.multi-year-table .lbl{width:18%}.year-variance{font-size:11px;line-height:1.5}.year-variance div{margin:2px 0}.report-page .multi-year-key-comparison{margin-top:8px}.report-page .multi-year-table{font-size:10px}';document.head.appendChild(s);}
  function apply(){injectStyle();return build();}
  if(typeof window.renderDashboard==='function'&&!window.__multiYearKeyDash){const base=window.renderDashboard;window.__multiYearKeyDash=true;window.renderDashboard=function(){const out=base.apply(this,arguments),d=apply();addDashboard(d);return out;};}
  if(typeof window.buildPages==='function'&&!window.__multiYearKeyPages){const base=window.buildPages;window.__multiYearKeyPages=true;window.buildPages=function(o){const d=apply();let pages=base.call(this,o||{});if(d?.years?.length>1&&Array.isArray(pages)&&!pages.some(p=>p.sectionId==='year-wise-comparison')){const pg=reportPage(d),idx=pages.findIndex(p=>p.sectionId==='notes'||p.sectionId==='disclaimer');if(idx>=0)pages.splice(idx,0,pg);else pages.push(pg);}return pages;};}
  window.buildMultiYearKeyComparison=apply;
})();