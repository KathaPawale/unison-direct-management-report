/* Generic multi-year comparison for key management metrics.
 * Builds year-wise Net Income, Sales/Revenue, A/R, A/P and COGS directly from uploaded workbook data.
 * Latest year is treated as current; every earlier detected year is retained for comparison.
 * No company-specific values. */
'use strict';
(function(){
  const clean=v=>String(v??'').trim();
  const norm=v=>clean(v).toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const isPct=v=>/%\s*$/.test(clean(v));
  const toNum=v=>{
    if(v==null||v===''||isPct(v)) return null;
    if(typeof v==='number') return Number.isFinite(v)?v:null;
    const s=clean(v), neg=/^\(.*\)$/.test(s);
    if(!/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?$/.test(s)) return null;
    const n=Number(s.replace(/[,$()\s]/g,''));
    return Number.isFinite(n)?(neg?-n:n):null;
  };
  const rowLabel=r=>norm((r||[]).find(v=>toNum(v)==null&&!isPct(v)&&clean(v))||'');
  const yearOf=v=>{const m=clean(v).match(/\b(19|20)\d{2}\b/);return m?Number(m[0]):null;};
  const esc=s=>typeof escapeHtml==='function'?escapeHtml(String(s??'')):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v==null?'—':(typeof money==='function'?money(v):(v<0?'($'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+')':'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})));
  const fmtPct=v=>v==null?'—':(Number(v).toFixed(2)+'%');

  const metrics=[
    {key:'revenue',label:'Sales / Revenue',patterns:[/^total (for )?(income|revenue|sales)$/, /^total (income|revenue|sales)$/, /^revenue$/, /^sales$/, /^sales revenue$/, /^sales income$/, /^service revenue$/, /^service income$/]},
    {key:'netIncome',label:'Net Income',patterns:[/^net income$/, /^net profit$/, /^profit for the period$/, /^net earnings$/, /^net loss$/]},
    {key:'cogs',label:'COGS',patterns:[/^total (for )?(cost of goods sold|cost of sales|cogs)$/, /^total (cost of goods sold|cost of sales|cogs)$/, /^cost of goods sold$/, /^cost of sales$/, /^cogs$/]},
    {key:'ar',label:'A/R',patterns:[/^total (for )?accounts receivable$/, /^accounts receivable total$/, /^accounts receivable$/, /^accounts receivable a r$/, /^trade receivables$/, /^trade accounts receivable$/]},
    {key:'ap',label:'A/P',patterns:[/^total (for )?accounts payable$/, /^accounts payable total$/, /^accounts payable$/, /^accounts payable a p$/, /^trade payables$/, /^trade accounts payable$/]}
  ];

  function looksPL(name,rows){const s=norm(name+' '+(rows||[]).slice(0,120).flat().join(' '));return /profit and loss|income statement|statement of operations|statement of earnings/.test(s)||(/net income/.test(s)&&/(revenue|income|sales)/.test(s));}
  function looksBS(name,rows){const s=norm(name+' '+(rows||[]).slice(0,150).flat().join(' '));return /balance sheet|statement of financial position|statement of financial condition/.test(s)||(/assets/.test(s)&&/liabilit/.test(s)&&/equity/.test(s));}

  function discoverYearColumns(name,rows,sm){
    const blocked=new Set((sm?.cols||[]).filter(c=>c?.type==='percent'||c?.type==='change'||/percent|ratio|variance|change|%/i.test(clean(c?.label||c?.name))).map(c=>c.idx));
    const candidates=new Map();
    for(const r of (rows||[]).slice(0,35)){
      (r||[]).forEach((v,i)=>{
        if(blocked.has(i)) return;
        const y=yearOf(v); if(!y) return;
        if(!candidates.has(y)) candidates.set(y,i);
      });
    }
    for(const c of sm?.cols||[]){
      if(blocked.has(c.idx)) continue;
      const y=yearOf(c.label); if(y&&!candidates.has(y)) candidates.set(y,c.idx);
    }
    return [...candidates.entries()].map(([year,idx])=>({year,idx})).sort((a,b)=>b.year-a.year);
  }

  function exact(rows,col,patterns){
    let best=null;
    for(const r of rows||[]){
      const l=rowLabel(r); if(!patterns.some(re=>re.test(l))) continue;
      const v=toNum(r?.[col]); if(v==null) continue;
      const rank=(/^total\b/.test(l)?30:0)+(/accounts receivable|accounts payable/.test(l)?10:0)+Math.min(5,Math.log10(Math.abs(v)+1));
      if(!best||rank>best.rank) best={value:v,rank};
    }
    return best?.value??null;
  }

  function statementSheets(){
    let pl=null,bs=null,ps=-1,bsScore=-1;
    for(const [name,rows] of Object.entries(window.state?.sheets||{})){
      const sm=state.model?.sheetModels?.[name];
      const p=looksPL(name,rows)?1:0,b=looksBS(name,rows)?1:0;
      const py=discoverYearColumns(name,rows,sm).length;
      if(p&&(py>ps)){ps=py;pl={name,rows,sm};}
      if(b&&(py>bsScore)){bsScore=py;bs={name,rows,sm};}
    }
    return {pl,bs};
  }

  function build(){
    const md=window.state?.model;if(!md)return null;
    const {pl,bs}=statementSheets();
    const plYears=pl?discoverYearColumns(pl.name,pl.rows,pl.sm):[];
    const bsYears=bs?discoverYearColumns(bs.name,bs.rows,bs.sm):[];
    const years=[...new Set([...plYears.map(x=>x.year),...bsYears.map(x=>x.year)])].sort((a,b)=>b-a);
    if(!years.length){md.multiYearComparison=null;return null;}
    const plMap=new Map(plYears.map(x=>[x.year,x.idx])),bsMap=new Map(bsYears.map(x=>[x.year,x.idx]));
    const rows=metrics.map(m=>{
      const values={};
      for(const y of years){
        const src=(m.key==='ar'||m.key==='ap')?bs:pl;
        const c=(m.key==='ar'||m.key==='ap')?bsMap.get(y):plMap.get(y);
        values[y]=(src&&c!=null)?exact(src.rows,c,m.patterns):null;
      }
      return {...m,values};
    });
    const latestYear=years[0],previousYears=years.slice(1);
    const comparisons=rows.map(r=>({
      key:r.key,label:r.label,current:r.values[latestYear],currentYear:latestYear,
      previous:previousYears.map(y=>{
        const v=r.values[y],cur=r.values[latestYear];
        const variance=(cur!=null&&v!=null)?cur-v:null;
        const variancePct=(cur!=null&&v!=null&&Math.abs(v)>.000001)?variance/Math.abs(v)*100:null;
        return {year:y,value:v,variance,variancePct};
      }),values:r.values
    }));
    const data={latestYear,previousYears,years,comparisons,source:{pl:pl?.name||null,bs:bs?.name||null}};
    md.multiYearComparison=data;
    md.yearWiseComparison=data;
    return data;
  }

  function table(data){
    if(!data||data.years.length<2)return '';
    const heads=data.years.map((y,i)=>`<th>${y}${i===0?' (Latest)':''}</th>`).join('');
    const body=data.comparisons.map(r=>{
      const vals=data.years.map(y=>`<td class="val">${esc(fmt(r.values[y]))}</td>`).join('');
      const comp=r.previous.map(x=>`<div><b>vs ${x.year}:</b> ${esc(fmt(x.variance))} (${esc(fmtPct(x.variancePct))})</div>`).join('');
      return `<tr><td class="lbl"><b>${esc(r.label)}</b></td>${vals}<td class="val year-variance">${comp||'—'}</td></tr>`;
    }).join('');
    return `<div class="multi-year-key-comparison"><h3>Year-wise Key Financial Comparison</h3><div class="chart-sub">Latest year ${data.latestYear} shown separately and compared with all previous years found in the uploaded workbook.</div><div class="report-table-wrap"><table class="report-table multi-year-table"><thead><tr><th>Metric</th>${heads}<th>Latest vs Previous</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
  }

  function addDashboard(data){
    const host=document.getElementById('comparisonTable');if(!host)return;
    host.querySelector('.multi-year-key-comparison')?.remove();
    if(data?.years?.length>1)host.insertAdjacentHTML('beforeend',table(data));
  }

  function reportPage(data){
    if(!data||data.years.length<2)return null;
    const content=table(data).replace('<h3>Year-wise Key Financial Comparison</h3>','');
    const head=(typeof sectionHead==='function')?sectionHead(null,'Year-wise Key Financial Comparison',`Latest year ${data.latestYear} compared with prior years`):'<h2 class="report-title">Year-wise Key Financial Comparison</h2><div class="report-rule"></div>';
    return {sectionId:'year-wise-comparison',sectionNo:null,title:'Year-wise Key Financial Comparison',html:`<div class="report-page" data-section="year-wise-comparison">${head}${content}</div>`};
  }

  function injectStyle(){if(document.getElementById('multi-year-comparison-style'))return;const s=document.createElement('style');s.id='multi-year-comparison-style';s.textContent='.multi-year-key-comparison{margin-top:18px}.multi-year-table{width:100%;table-layout:fixed}.multi-year-table th,.multi-year-table td{white-space:normal;overflow-wrap:anywhere}.multi-year-table .lbl{width:18%}.year-variance{font-size:11px;line-height:1.5}.year-variance div{margin:2px 0}.report-page .multi-year-key-comparison{margin-top:8px}.report-page .multi-year-table{font-size:10px}';document.head.appendChild(s);}

  function apply(){injectStyle();return build();}
  if(typeof window.renderDashboard==='function'&&!window.__multiYearKeyDash){const base=window.renderDashboard;window.__multiYearKeyDash=true;window.renderDashboard=function(){const d=apply();const out=base.apply(this,arguments);addDashboard(d);return out;};}
  if(typeof window.buildPages==='function'&&!window.__multiYearKeyPages){const base=window.buildPages;window.__multiYearKeyPages=true;window.buildPages=function(o){const d=apply();let pages=base.call(this,o||{});if(d?.years?.length>1&&Array.isArray(pages)&&!pages.some(p=>p.sectionId==='year-wise-comparison')){const pg=reportPage(d);const idx=pages.findIndex(p=>p.sectionId==='notes'||p.sectionId==='disclaimer');if(idx>=0)pages.splice(idx,0,pg);else pages.push(pg);}return pages;};}
  window.buildMultiYearKeyComparison=apply;
})();
