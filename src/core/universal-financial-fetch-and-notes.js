/* Universal workbook-driven financial extraction + automatic report notes.
 * No company-specific amounts. Loaded last so it can normalize the final dataset for every upload. */
'use strict';
(function(){
 const text=v=>String(v??'').trim();
 const norm=v=>text(v).toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const isPct=v=>/%\s*$/.test(text(v));
 const amount=v=>{if(v==null||v===''||isPct(v))return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const s=text(v),neg=/^\(.*\)$/.test(s);if(!/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?$/.test(s))return null;const n=Number(s.replace(/[,$()\s]/g,''));return Number.isFinite(n)?(neg?-n:n):null;};
 const rowLabel=r=>norm((r||[]).find(v=>amount(v)==null&&!isPct(v)&&text(v))||'');
 const totalPatterns={assets:/^total (for )?assets$|^assets total$|^total asset$/,currentAssets:/^total (for )?current assets?$|^current assets? total$/,fixed:/^total (for )?(fixed assets?|property plant and equipment|property and equipment|property plant equipment|ppe|p p e)$|^net (property plant and equipment|fixed assets?)$/,nonCurrent:/^total (for )?(non current assets?|noncurrent assets?|long term assets?|other assets?)$|^(non current assets?|noncurrent assets?) total$/,currentLiab:/^total (for )?current liabilities?$|^current liabilities? total$/,longLiab:/^total (for )?(long term liabilities?|longterm liabilities?|non current liabilities?|noncurrent liabilities?|long term debt)$/,liab:/^total (for )?liabilities$|^liabilities total$|^total liability$/,equity:/^total (for )?(equity|shareholders equity|stockholders equity|members equity|capital)$|^total equity$/,le:/^total (for )?liabilities (and )?equity$|^total liabilities and (shareholders|stockholders|members) equity$|^total liabilities and capital$|^total liabilities equity$/};
 function appState(){try{return typeof state!=='undefined'?state:(window.state||null);}catch(e){return window.state||null;}}
 function bsSheet(){const st=appState();let best=null,score=-1;for(const [name,rows] of Object.entries(st?.sheets||{})){const s=norm(name+' '+(rows||[]).slice(0,180).flat().join(' '));const x=(/balance sheet|statement of financial position|statement of financial condition/.test(s)?50:0)+(/total (for )?assets/.test(s)?20:0)+(/liabilit/.test(s)?10:0)+(/equity/.test(s)?10:0);if(x>score){score=x;best={name,rows,sm:st?.model?.sheetModels?.[name]};}}return score>=30?best:null;}
 function amountColumn(p){if(!p)return null;const cols=p.sm?.cols||[],blocked=new Set(cols.filter(c=>c?.type==='percent'||c?.type==='change'||/percent|ratio|variance|change|%/i.test(text(c?.label||c?.name))).map(c=>c.idx));const ta=(p.rows||[]).find(r=>totalPatterns.assets.test(rowLabel(r)));if(!ta)return cols.find(c=>c?.type==='current'&&!blocked.has(c.idx))?.idx??null;const candidates=[];(ta||[]).forEach((v,i)=>{const n=amount(v);if(n!=null&&!blocked.has(i))candidates.push({i,n,abs:Math.abs(n)});});const cur=cols.find(c=>c?.type==='current'&&!blocked.has(c.idx));if(cur&&candidates.some(x=>x.i===cur.idx))return cur.idx;let latest=null;for(const r of (p.rows||[]).slice(0,30))(r||[]).forEach((v,i)=>{if(blocked.has(i)||!candidates.some(x=>x.i===i))return;const m=text(v).match(/\b(19|20)\d{2}\b/);if(m&&(!latest||+m[0]>latest.y))latest={y:+m[0],i};});if(latest)return latest.i;candidates.sort((a,b)=>b.abs-a.abs);return candidates[0]?.i??null;}
 function exact(rows,c,re){let found=null;for(const r of rows||[]){if(!re.test(rowLabel(r)))continue;const v=amount(r?.[c]);if(v!=null)found=v;}return found;}
 function normalizeFinancials(){const st=appState(),md=st?.model,p=bsSheet();if(!md||!p)return;const c=amountColumn(p);if(c==null)return;const rows=p.rows;
  let totalAssets=exact(rows,c,totalPatterns.assets),ca=exact(rows,c,totalPatterns.currentAssets),fixedSubtotal=exact(rows,c,totalPatterns.fixed),nonCurrentTotal=exact(rows,c,totalPatterns.nonCurrent),cl=exact(rows,c,totalPatterns.currentLiab),ll=exact(rows,c,totalPatterns.longLiab),tl=exact(rows,c,totalPatterns.liab),eq=exact(rows,c,totalPatterns.equity),le=exact(rows,c,totalPatterns.le);
  /* Asset rules: use actual workbook totals. Never default all assets to Fixed Assets merely because Current Assets was not detected. */
  let fixed=nonCurrentTotal!=null?nonCurrentTotal:fixedSubtotal;
  if(totalAssets==null&&ca!=null&&fixed!=null)totalAssets=ca+fixed;
  if(totalAssets==null&&le!=null&&ca!=null)totalAssets=le;
  if(le==null&&totalAssets!=null)le=totalAssets;
  /* Only use residual when Total Assets AND Total Current Assets are both reliable. This captures other non-current assets without creating a fake 100% fixed-assets result. */
  if(totalAssets!=null&&ca!=null){const residual=totalAssets-ca;if(Math.abs(residual)<.005)fixed=0;else if(fixed==null||Math.abs((fixed||0)-residual)>.01)fixed=residual;}
  if(ca==null&&totalAssets!=null&&fixed!=null)ca=totalAssets-fixed;
  if(tl==null&&(cl!=null||ll!=null))tl=(cl||0)+(ll||0);if(ll==null&&tl!=null&&cl!=null)ll=tl-cl;if(eq==null&&le!=null&&tl!=null)eq=le-tl;
  const ap=Math.abs(totalAssets||0),lp=Math.abs(le||0),pct=(v,d)=>v!=null&&d?Number(v)/Math.abs(d)*100:null;
  const assets=[];
  if(ca!=null)assets.push({label:'Current Assets',value:ca,denominator:totalAssets,pct:pct(ca,totalAssets)});
  if(fixed!=null)assets.push({label:'Fixed / Non-Current Assets',value:fixed,denominator:totalAssets,pct:pct(fixed,totalAssets)});
  /* Do not publish a misleading composition if Total Assets is unavailable. */
  const validAssets=totalAssets!=null&&ap>0?assets:[];
  const litems=[{label:'Current Liabilities',value:cl,denominator:le,pct:pct(cl,le)},{label:'Long-Term Liabilities',value:ll,denominator:le,pct:pct(ll,le)},{label:'Equity',value:eq,denominator:le,pct:pct(eq,le)}].filter(x=>x.value!=null&&le!=null);
  md.validatedFinancials=Object.assign(md.validatedFinancials||{},{totalAssets,currentAssets:ca,fixedAssets:fixed,fixedAssetSubtotal:fixedSubtotal,nonCurrentAssetsTotal:nonCurrentTotal,currentLiabilities:cl,longTermLiabilities:ll,totalLiabilities:tl,equity:eq,totalLiabilitiesAndEquity:le,assets:validAssets,liabilitiesEquity:litems,source:Object.assign(md.validatedFinancials?.source||{},{balanceSheet:p.name,balanceColumn:c,assetFormula:'Fixed / Non-Current Assets % = Total Fixed / Non-Current Assets / Total Assets * 100'})});
  md.totalAssets=totalAssets;md.totalLiabilitiesAndEquity=le;md.bsComposition={assets:validAssets,liabEquity:litems};md.balanceSheetComposition=[...validAssets,...litems];md.metrics=md.metrics||{};if(totalAssets!=null)md.metrics.assets=totalAssets;if(tl!=null)md.metrics.liabilities=tl;if(eq!=null)md.metrics.equity=eq;
 }
 function noteSheet(name,rows){const n=norm(name),sample=norm((rows||[]).slice(0,50).flat().join(' '));return /(^| )notes?( |$)/.test(n)||/notes? to (the )?financial statements?|notes? to accounts|financial statement notes/.test(sample);}
 function importNotes(){const st=appState();if(!st?.sheets)return '';const chunks=[];for(const [name,rows] of Object.entries(st.sheets)){if(!noteSheet(name,rows))continue;const lines=[];for(const r of rows||[]){const cells=(r||[]).map(text).filter(Boolean);if(!cells.length)continue;const line=cells.join(' — ');if(!lines.length||lines.at(-1)!==line)lines.push(line);}if(lines.length)chunks.push(lines.join('\n'));}const found=chunks.join('\n\n').trim();if(found){st.notes=found;const ed=document.getElementById('notesEditor');if(ed)ed.value=found;}return found;}
 function apply(){normalizeFinancials();importNotes();}
 if(typeof window.renderDashboard==='function'&&!window.__universalFinancialDash){const base=window.renderDashboard;window.__universalFinancialDash=true;window.renderDashboard=function(){apply();return base.apply(this,arguments);};}
 if(typeof window.renderReport==='function'&&!window.__universalNotesReport){const base=window.renderReport;window.__universalNotesReport=true;window.renderReport=function(){apply();return base.apply(this,arguments);};}
 if(typeof window.buildPages==='function'&&!window.__universalFinancialPages){const base=window.buildPages;window.__universalFinancialPages=true;window.buildPages=function(o){apply();return base.call(this,o||{});};}
 window.applyUniversalFinancialFetch=apply;
})();
