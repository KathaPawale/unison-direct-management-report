/* Strict Balance Sheet Composition — authoritative final calculation layer.
 * Percentages NEVER use the sum of visible chart slices as denominator.
 * Assets denominator = exact Total Assets.
 * Liabilities/Equity denominator = exact Total Liabilities & Equity.
 */
'use strict';
(function(){
 const text=v=>String(v??'').replace(/\u00a0/g,' ').trim();
 const norm=v=>text(v).toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const num=v=>{if(v==null||v==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const s0=text(v);if(!s0||/%/.test(s0)||/^[-–—]$/.test(s0))return null;const neg=/^\(.*\)$/.test(s0);const s=s0.replace(/[$,()\s]/g,'');if(!/^-?\d+(?:\.\d+)?$/.test(s))return null;const x=Number(s);return Number.isFinite(x)?(neg?-Math.abs(x):x):null;};
 const pct=(v,d)=>v!=null&&d!=null&&Math.abs(d)>1e-9?v/Math.abs(d)*100:null;
 const year=v=>/^(?:19|20)\d{2}$/.test(text(v))?Number(text(v)):null;
 function pickBS(){let best=null,score=-1;for(const [name,rows] of Object.entries(state.sheets||{})){const t=norm(name+' '+(rows||[]).slice(0,220).flat().join(' '));const s=(/balance sheet|statement of financial position|statement of financial condition/.test(t)?60:0)+(/total assets/.test(t)?20:0)+(/total liabilities/.test(t)?10:0)+(/equity/.test(t)?8:0);if(s>score){score=s;best={name,rows,sm:state.model?.sheetModels?.[name]};}}return score>=30?best:null;}
 function blocked(sm,c){const m=(sm?.cols||[]).find(x=>x.idx===c);return !!(m&&(m.type==='percent'||m.type==='change'||/percent|ratio|variance|change|%/i.test(text(m.label||m.name))));}
 function amountColumn(s){const ys=[];for(let r=0;r<Math.min(s.rows.length,30);r++){for(let c=1;c<(s.rows[r]||[]).length;c++){if(blocked(s.sm,c))continue;const y=year(s.rows[r][c]);if(y==null)continue;let hits=0;for(let rr=r+1;rr<Math.min(s.rows.length,r+220);rr++)if(num(s.rows[rr]?.[c])!=null&&++hits>=3)break;if(hits>=3)ys.push({year:y,idx:c});}}if(ys.length){ys.sort((a,b)=>b.year-a.year);return ys[0];}const cur=(s.sm?.cols||[]).find(x=>x.type==='current'&&!blocked(s.sm,x.idx));if(cur)return {year:null,idx:cur.idx};const rt=(s.sm?.cols||[]).find(x=>x.type==='rowTotal'&&!blocked(s.sm,x.idx));if(rt)return {year:null,idx:rt.idx};return {year:null,idx:null};}
 function label(row){for(let c=0;c<Math.min((row||[]).length,6);c++){const v=text(row[c]);if(v&&num(row[c])==null&&year(row[c])==null)return norm(v);}return '';}
 function exact(rows,c,res){let out=null;for(const r of rows||[]){const l=label(r);if(!res.some(re=>re.test(l)))continue;const v=num(r[c]);if(v!=null)out=v;}return out;}
 const R={
  ta:[/^total (for )?assets$/, /^assets total$/, /^total asset$/],
  ca:[/^total (for )?current assets?$/, /^current assets? total$/],
  cl:[/^total (for )?current liabilities?$/, /^current liabilities? total$/, /^total short term liabilities?$/],
  ltl:[/^total (for )?(long term liabilities?|longterm liabilities?|non current liabilities?|noncurrent liabilities?)$/, /^long term liabilities? total$/],
  tl:[/^total (for )?liabilities$/, /^liabilities total$/, /^total liability$/],
  eq:[/^total (for )?(equity|shareholders equity|stockholders equity|members equity|capital)$/, /^total equity$/, /^equity total$/],
  tle:[/^total (for )?liabilities (and )?equity$/, /^total liabilities and (shareholders|stockholders|members) equity$/, /^total liabilities and capital$/, /^total liabilities equity$/]
 };
 function calculate(){const md=state.model,s=pickBS();if(!md||!s)return null;const col=amountColumn(s);if(col.idx==null)return null;const r=s.rows,c=col.idx;let totalAssets=exact(r,c,R.ta),currentAssets=exact(r,c,R.ca);let nonCurrent=totalAssets!=null&&currentAssets!=null?totalAssets-currentAssets:null;let currentLiabilities=exact(r,c,R.cl),longTerm=exact(r,c,R.ltl),totalLiabilities=exact(r,c,R.tl),equity=exact(r,c,R.eq),totalLE=exact(r,c,R.tle);
  if(totalLiabilities==null&&currentLiabilities!=null&&longTerm!=null)totalLiabilities=currentLiabilities+longTerm;
  if(longTerm==null&&totalLiabilities!=null&&currentLiabilities!=null)longTerm=totalLiabilities-currentLiabilities;
  if(currentLiabilities==null&&totalLiabilities!=null&&longTerm!=null)currentLiabilities=totalLiabilities-longTerm;
  if(totalLE==null&&totalLiabilities!=null&&equity!=null)totalLE=totalLiabilities+equity;
  if(equity==null&&totalLE!=null&&totalLiabilities!=null)equity=totalLE-totalLiabilities;
  const assets=totalAssets!=null&&Math.abs(totalAssets)>1e-9?[{label:'Current Assets',value:currentAssets,pct:pct(currentAssets,totalAssets),denominator:totalAssets},{label:'Fixed / Non-Current Assets',value:nonCurrent,pct:pct(nonCurrent,totalAssets),denominator:totalAssets}].filter(x=>x.value!=null):[];
  const le=totalLE!=null&&Math.abs(totalLE)>1e-9?[{label:'Current Liabilities',value:currentLiabilities,pct:pct(currentLiabilities,totalLE),denominator:totalLE},{label:'Long-Term Liabilities',value:longTerm,pct:pct(longTerm,totalLE),denominator:totalLE},{label:'Equity',value:equity,pct:pct(equity,totalLE),denominator:totalLE}].filter(x=>x.value!=null):[];
  md.bsComposition={...(md.bsComposition||{}),assets,liabEquity:le};md.balanceSheetComposition=[...assets,...le];md.totalAssets=totalAssets;md.totalLiabilitiesAndEquity=totalLE;md.assetDenominator=totalAssets==null?null:Math.abs(totalAssets);md.liabilityBifurcationDenominator=totalLE==null?null:Math.abs(totalLE);md.metrics=md.metrics||{};if(totalAssets!=null)md.metrics.assets=totalAssets;if(totalLiabilities!=null)md.metrics.liabilities=totalLiabilities;if(equity!=null)md.metrics.equity=equity;
  md.validatedFinancials={...(md.validatedFinancials||{}),totalAssets,currentAssets,fixedAssets:nonCurrent,currentLiabilities,longTermLiabilities:longTerm,totalLiabilities,equity,totalLiabilitiesAndEquity:totalLE,assets,liabEquity:le,strictBalanceSheetFormula:true,balanceSheetYear:col.year,balanceSheetColumn:col.idx};return md.validatedFinancials;}
 /* Execute AFTER older calculation wrappers by calculating again immediately after them. */
 if(typeof window.renderDashboard==='function'&&!window.__strictBSRender){const base=window.renderDashboard;window.__strictBSRender=true;window.renderDashboard=function(){const out=base.apply(this,arguments);calculate();/* refresh only the BS chart with final strict values */const md=state.model,box=document.getElementById('chartBs');if(box&&md?.bsComposition&&typeof donutChart==='function')box.innerHTML=md.bsComposition.assets.length?'<h3>Balance Sheet Composition</h3><div class="donut-row">'+donutChart({items:md.bsComposition.assets,title:'Assets',size:140})+donutChart({items:md.bsComposition.liabEquity,title:'Liabilities & Equity',size:140})+'</div>':'';return out;};}
 if(typeof window.buildPages==='function'&&!window.__strictBSReport){const base=window.buildPages;window.__strictBSReport=true;window.buildPages=function(o){calculate();const pages=base.call(this,o||{});calculate();return pages;};}
 window.applyStrictBalanceSheetComposition=calculate;
})();