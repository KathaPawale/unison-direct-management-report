/* Generic liability extraction fallback — independent of workbook naming/layout. */
'use strict';
(function(){
  const norm=s=>String(s??'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
  const toNum=v=>{
    if(typeof num==='function') return num(v);
    if(typeof v==='number'&&Number.isFinite(v)) return v;
    const s=String(v??'').trim(); if(!s) return 0;
    const neg=/^\(.*\)$/.test(s); const z=Number(s.replace(/[,$%()\s]/g,''));
    return Number.isFinite(z)?(neg?-z:z):0;
  };
  const isNum=v=>typeof v==='number'&&Number.isFinite(v)||(/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?%?$/.test(String(v??'').trim()));
  const currentRes=[/current liabilities/,/short term liabilities/,/short term obligations/,/current obligations/,/current payables/,/creditors.*due within.*one year/,/creditors.*falling due within.*one year/,/amounts due within.*one year/];
  const longRes=[/non current liabilities/,/noncurrent liabilities/,/long term liabilities/,/longterm liabilities/,/long term debt/,/non current obligations/,/creditors.*due after.*one year/,/creditors.*falling due after.*one year/,/amounts due after.*one year/];
  const totalLiabRes=[/^total liabilities$/,/^liabilities total$/,/^total for liabilities$/,/^total liabilities and provisions$/];
  const totalLERes=[/total liabilities and equity/,/total liabilities and shareholders equity/,/total liabilities and stockholders equity/,/total liabilities and capital/,/total liabilities and net assets/];
  const totalAssetsRes=[/^total assets$/,/^assets total$/,/^total for assets$/];
  const equityRes=[/^total equity$/,/^equity$/,/^total shareholders equity$/,/^total stockholders equity$/,/^total capital$/,/^net assets$/];
  function labelOf(row){return norm((row||[]).filter(v=>!isNum(v)&&String(v??'').trim()).slice(0,4).join(' '));}
  function numCells(row){const out=[];(row||[]).forEach((v,i)=>{if(isNum(v))out.push({i,v:toNum(v)});});return out;}
  function rowValue(row,preferredCol){const a=numCells(row);if(!a.length)return 0;if(preferredCol!=null){const hit=a.find(x=>x.i===preferredCol);if(hit)return hit.v;}return a[a.length-1].v;}
  function scoreSheet(name,rows){const t=norm(name), sample=norm((rows||[]).slice(0,120).flat().join(' '));let s=0;if(/balance sheet|statement of financial position/.test(t+' '+sample))s+=20;if(/assets/.test(sample))s+=4;if(/liabilit/.test(sample))s+=6;if(/equity|capital|net assets/.test(sample))s+=4;return s;}
  function chooseSheet(md){let best=null,bestScore=0;for(const [name,rows] of Object.entries(state.sheets||{})){const s=scoreSheet(name,rows);if(s>bestScore){bestScore=s;best={name,rows,sm:md?.sheetModels?.[name]||null};}}return bestScore>=10?best:null;}
  function preferredCol(sm,rows){let c=(sm?.cols||[]).find(x=>x.type==='current')?.idx ?? (sm?.cols||[]).find(x=>x.type==='rowTotal')?.idx ?? null;if(c!=null)return c;const hdr=(rows||[]).slice(0,15);let best=null;for(const r of hdr){(r||[]).forEach((v,i)=>{const s=String(v??'');const y=(s.match(/\b(19|20)\d{2}\b/)||[])[0];if(y){const yy=+y;if(!best||yy>best.y)best={y:yy,i};}});}return best?.i??null;}
  function directTotal(rows,res,preferred){let best=null;for(let i=0;i<rows.length;i++){const lab=labelOf(rows[i]);if(!res.some(re=>re.test(lab)))continue;const v=rowValue(rows[i],preferred);const rank=(/^total\b/.test(lab)?5:0)+(Math.abs(v)>0.004?5:0);if(!best||rank>best.rank)best={v,rank,row:i,label:lab};}return best;}
  function sectionValue(rows,startRes,stopRes,preferred){let start=-1;for(let i=0;i<rows.length;i++){const lab=labelOf(rows[i]);if(startRes.some(re=>re.test(lab))){start=i;break;}}if(start<0)return null;let sum=0,found=false,lastTotal=null;for(let i=start;i<rows.length;i++){const lab=labelOf(rows[i]);if(i>start&&stopRes.some(re=>re.test(lab)))break;const v=rowValue(rows[i],preferred);if(i>start&&/^total\b/.test(lab)&&Math.abs(v)>0.004)lastTotal=v;else if(i>start&&!/^sub ?total\b/.test(lab)&&Math.abs(v)>0.004){sum+=v;found=true;}}return lastTotal!=null?lastTotal:(found?sum:null);}
  function accountFallback(rows,preferred){let current=0,long=0,cf=false,lf=false;const curAccounts=/accounts payable|trade payable|accrued|tax payable|taxes payable|payroll liabilit|credit card|deferred revenue|unearned revenue|current portion|short term loan|short term debt|due within one year/;const longAccounts=/mortgage|long term loan|long term debt|non current|note payable.*long|lease liabilit.*long|due after one year/;for(const r of rows){const lab=labelOf(r),v=rowValue(r,preferred);if(Math.abs(v)<0.004||/^total\b/.test(lab))continue;if(curAccounts.test(lab)){current+=v;cf=true;}else if(longAccounts.test(lab)){long+=v;lf=true;}}return {current:cf?current:null,longTerm:lf?long:null};}
  function compute(md){const pick=chooseSheet(md);if(!pick)return md;const {name,rows,sm}=pick,pc=preferredCol(sm,rows);let current=directTotal(rows,currentRes,pc)?.v??null;let longTerm=directTotal(rows,longRes,pc)?.v??null;let totalLiabilities=directTotal(rows,totalLiabRes,pc)?.v??null;let totalLE=directTotal(rows,totalLERes,pc)?.v??null;const totalAssets=directTotal(rows,totalAssetsRes,pc)?.v??null;
    if(current==null||Math.abs(current)<0.005)current=sectionValue(rows,currentRes,[...longRes,/^equity$/, /^capital$/, /^total liabilities/],pc);
    if(longTerm==null||Math.abs(longTerm)<0.005)longTerm=sectionValue(rows,longRes,[/^equity$/, /^capital$/, /^total liabilities/,/^net assets$/],pc);
    if((current==null||Math.abs(current)<0.005)&&(longTerm==null||Math.abs(longTerm)<0.005)){const f=accountFallback(rows,pc);if(f.current!=null)current=f.current;if(f.longTerm!=null)longTerm=f.longTerm;}
    if(totalLiabilities==null||Math.abs(totalLiabilities)<0.005){if(current!=null||longTerm!=null)totalLiabilities=(current||0)+(longTerm||0);}
    if((current==null||Math.abs(current)<0.005)&&totalLiabilities!=null&&Math.abs(totalLiabilities)>0.005&&longTerm!=null&&Math.abs(longTerm)>0.005)current=totalLiabilities-longTerm;
    if((longTerm==null||Math.abs(longTerm)<0.005)&&totalLiabilities!=null&&Math.abs(totalLiabilities)>0.005&&current!=null&&Math.abs(current)>0.005)longTerm=totalLiabilities-current;
    if(totalLE==null||Math.abs(totalLE)<0.005)totalLE=totalAssets;
    if(totalLE==null||Math.abs(totalLE)<0.005){const eq=directTotal(rows,equityRes,pc)?.v??0;if(totalLiabilities!=null)totalLE=totalLiabilities+eq;}
    const detectedCurrent=current!=null,detectedLong=longTerm!=null;
    md.liabilityBifurcation=[{label:'Current Liabilities',value:detectedCurrent?current:null,detected:detectedCurrent},{label:'Long-Term Liabilities',value:detectedLong?longTerm:null,detected:detectedLong}];
    md.liabilityBifurcationDenominator=Math.abs(totalLE||0)||Math.abs(totalLiabilities||0)||Math.abs(current||0)+Math.abs(longTerm||0);
    md.liabilityAudit={sheet:name,column:pc,current,longTerm,totalLiabilities,totalLiabilitiesAndEquity:totalLE,generic:true};return md;
  }
  function html(md,report){const items=md?.liabilityBifurcation;if(!Array.isArray(items))return '';const den=Math.abs(toNum(md.liabilityBifurcationDenominator));const body=items.map(x=>{if(x.value==null||x.detected===false)return `<tr><td>${escapeHtml(x.label)}</td><td>—</td><td>Not separately identified</td></tr>`;const pc=den?Math.abs(toNum(x.value))/den*100:0;return `<tr><td>${escapeHtml(x.label)}</td><td>${money(toNum(x.value))}</td><td>${pct(pc)}</td></tr>`;}).join('');return `${report?'<div class="report-section-title">':'<h3>'}Liabilities Bifurcation${report?'</div>':'</h3>'}<table class="${report?'report-mini-table':'comparison'}"><thead><tr><th>Liability Type</th><th>Amount</th><th>% of Liabilities & Equity</th></tr></thead><tbody>${body}</tbody></table>`;}
  function replaceDashboard(md){const box=document.getElementById('chartBs');if(!box)return;[...box.querySelectorAll('h3')].filter(h=>/liabilities bifurcation/i.test(h.textContent||'')).forEach(h=>{const t=h.nextElementSibling;h.remove();if(t&&t.tagName==='TABLE')t.remove();});box.insertAdjacentHTML('beforeend',html(md,false));}
  if(typeof renderDashboard==='function'&&!window.__genericLiabilityDashboard){window.__genericLiabilityDashboard=true;const base=renderDashboard;renderDashboard=function(){if(state?.model)compute(state.model);const out=base.apply(this,arguments);if(state?.model){compute(state.model);replaceDashboard(state.model);}return out;};}
  if(typeof buildPages==='function'&&!window.__genericLiabilityReport){window.__genericLiabilityReport=true;const base=buildPages;buildPages=function(o){if(state?.model)compute(state.model);let pages=base.call(this,o||{});if(state?.model){compute(state.model);pages=pages.map(p=>{if(p.sectionId!=='dash')return p;let h=p.html.replace(/<div class="report-section-title">Liabilities Bifurcation<\/div><table[\s\S]*?<\/table>/gi,'');h=h.replace('<div class="report-footer">',html(state.model,true)+'<div class="report-footer">');return {...p,html:h};});}return pages;};}
  window.applyGenericLiabilityFix=compute;
})();
