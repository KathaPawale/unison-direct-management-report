/* Asset percentage integrity fix.
 * Current Assets % = Total Current Assets / Total Assets * 100
 * Fixed/Non-current Assets % = (Total Assets - Total Current Assets) / Total Assets * 100
 * Uses the current/latest financial amount column only and never normalizes a
 * single detected asset category to 100 unless it truly equals Total Assets. */
'use strict';
(function(){
 const clean=v=>String(v==null?'':v).replace(/\u00a0/g,' ').trim();
 const norm=v=>clean(v).toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const n=v=>{if(v==null||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const s0=clean(v);if(!s0||/%/.test(s0)||/^[-–—]$/.test(s0))return null;const neg=/^\(.*\)$/.test(s0),s=s0.replace(/[$,()\s]/g,'');if(!/^-?\d+(?:\.\d+)?$/.test(s))return null;const x=Number(s);return Number.isFinite(x)?(neg?-Math.abs(x):x):null;};
 const year=v=>/^(?:19|20)\d{2}$/.test(clean(v))?Number(clean(v)):null;
 function bs(){let best=null,score=-1;for(const [name,rows] of Object.entries(state.sheets||{})){const t=norm(name+' '+(rows||[]).slice(0,180).flat().join(' '));const s=(/balance sheet|statement of financial position/.test(t)?50:0)+(/total assets/.test(t)?20:0)+(/current assets/.test(t)?10:0)+(/liabilit/.test(t)?5:0);if(s>score){score=s;best={name,rows,sm:state.model?.sheetModels?.[name]};}}return score>=30?best:null;}
 function blocked(sm,c){const m=(sm?.cols||[]).find(x=>x.idx===c);return m&&(m.type==='percent'||m.type==='change'||/percent|ratio|variance|change|%/i.test(clean(m.label||m.name)));}
 function amountCol(s){
  const found=[];
  for(let r=0;r<Math.min(s.rows.length,25);r++)for(let c=1;c<(s.rows[r]||[]).length;c++){const y=year(s.rows[r][c]);if(y!=null&&!blocked(s.sm,c)){let hits=0;for(let i=r+1;i<Math.min(s.rows.length,r+180);i++)if(n(s.rows[i]?.[c])!=null&&++hits>=2)break;if(hits>=2)found.push({y,c});}}
  if(found.length){found.sort((a,b)=>b.y-a.y);return found[0].c;}
  const current=(s.sm?.cols||[]).find(x=>x.type==='current'&&!blocked(s.sm,x.idx));if(current)return current.idx;
  const total=(s.sm?.cols||[]).find(x=>x.type==='rowTotal'&&!blocked(s.sm,x.idx));if(total)return total.idx;
  /* Require both Total Assets and Total Current Assets in the same candidate amount column. */
  const width=Math.max(1,...s.rows.map(r=>(r||[]).length));
  for(let c=1;c<width;c++){if(blocked(s.sm,c))continue;let ta=null,ca=null;for(const r of s.rows){const l=norm(r?.[0]);if(/^total (for )?assets$|^assets total$|^total asset$/.test(l))ta=n(r?.[c]);if(/^total (for )?current assets?$|^current assets? total$/.test(l))ca=n(r?.[c]);}if(ta!=null&&ca!=null)return c;}
  return null;
 }
 function exact(rows,c,re){if(c==null)return null;let out=null;for(const r of rows){if(re.test(norm(r?.[0]))){const v=n(r?.[c]);if(v!=null)out=v;}}return out;}
 function apply(){
  const md=state.model,s=bs();if(!md||!s)return null;const c=amountCol(s);if(c==null)return null;
  const total=exact(s.rows,c,/^total (for )?assets$|^assets total$|^total asset$/);
  const current=exact(s.rows,c,/^total (for )?current assets?$|^current assets? total$/);
  if(total==null||current==null||Math.abs(total)<.000001)return null;
  /* The asset side itself is authoritative. The residual captures all fixed,
     PP&E, other and non-current assets without double-counting nested subtotals. */
  let nonCurrent=total-current;
  if(Math.abs(nonCurrent)<.005)nonCurrent=0;
  const items=[
   {label:'Current Assets',value:current,pct:current/Math.abs(total)*100,denominator:total},
   {label:'Fixed / Non-Current Assets',value:nonCurrent,pct:nonCurrent/Math.abs(total)*100,denominator:total}
  ];
  md.totalAssets=total;md.assetDenominator=Math.abs(total);
  md.metrics=md.metrics||{};md.metrics.assets=total;
  md.bsComposition=md.bsComposition||{};md.bsComposition.assets=items;
  md.balanceSheetComposition=[...items,...(md.bsComposition.liabEquity||[])];
  md.validatedFinancials={...(md.validatedFinancials||{}),totalAssets:total,currentAssets:current,fixedAssets:nonCurrent,assets:items,source:{...(md.validatedFinancials?.source||{}),assetFormula:'Current Assets / Total Assets; Fixed/Non-current = Total Assets - Current Assets',assetColumn:c}};
  return {total,current,nonCurrent,items};
 }
 /* Re-apply immediately before dashboard/report rendering so older layers cannot
    replace the asset denominator with the sum of whichever chart slices survived. */
 if(typeof window.renderDashboard==='function'&&!window.__assetDenominatorDashboardFix){const base=window.renderDashboard;window.__assetDenominatorDashboardFix=true;window.renderDashboard=function(){apply();return base.apply(this,arguments);};}
 if(typeof window.buildPages==='function'&&!window.__assetDenominatorReportFix){const base=window.buildPages;window.__assetDenominatorReportFix=true;window.buildPages=function(o){apply();return base.call(this,o||{});};}
 window.applyAssetPercentageDenominatorFix=apply;
})();