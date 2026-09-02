/* Final current-liability precision layer. Prefer explicit Total Current Liabilities, else sum only the current-liability section. */
'use strict';
(function(){
 const norm=s=>String(s??'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
 const isNum=v=>typeof v==='number'&&Number.isFinite(v)||/^\(?-?\$?\s*[\d,]+(?:\.\d+)?\)?%?$/.test(String(v??'').trim());
 const numv=v=>{if(typeof num==='function')return num(v);const s=String(v??'').trim(),neg=/^\(.*\)$/.test(s),x=Number(s.replace(/[,$%()\s]/g,''));return Number.isFinite(x)?(neg?-x:x):0};
 const rowLabel=r=>norm((r||[]).filter(v=>!isNum(v)&&String(v??'').trim()).slice(0,5).join(' '));
 function rowVal(r,col){if(col!=null&&isNum(r?.[col]))return numv(r[col]);for(let i=(r||[]).length-1;i>=0;i--)if(isNum(r[i]))return numv(r[i]);return null;}
 function pickBs(){let best=null,score=0;for(const [name,rows] of Object.entries(state.sheets||{})){const t=norm(name+' '+(rows||[]).slice(0,140).flat().join(' '));const s=(/balance sheet|statement of financial position|statement of financial condition/.test(t)?25:0)+(/current liabilities/.test(t)?8:0)+(/total assets/.test(t)?5:0);if(s>score){score=s;best={name,rows,sm:state.model?.sheetModels?.[name]};}}return score>=8?best:null;}
 function currentCol(p){const cs=p.sm?.cols||[];const direct=cs.find(c=>c.type==='current')?.idx??cs.find(c=>c.type==='rowTotal')?.idx;if(direct!=null)return direct;let best=null;for(const r of (p.rows||[]).slice(0,20)){(r||[]).forEach((v,i)=>{const m=String(v??'').match(/\b(19|20)\d{2}\b/);if(m){const y=+m[0];if(!best||y>best.y)best={y,i};}})}return best?.i??null;}
 function findExplicit(rows,col){for(const r of rows){const l=rowLabel(r);if(/^total (for )?(current liabilities|current liability|short term liabilities|current obligations)$/.test(l)||/^current liabilities total$/.test(l)){const v=rowVal(r,col);if(v!=null)return v;}}return null;}
 function sumSection(rows,col){let start=-1;for(let i=0;i<rows.length;i++){const l=rowLabel(rows[i]);if(/^(current liabilities|current liability|short term liabilities|current obligations)$/.test(l)){start=i;break;}}if(start<0)return null;let sum=0,found=false;for(let i=start+1;i<rows.length;i++){const l=rowLabel(rows[i]);if(/^(long term liabilities|non current liabilities|noncurrent liabilities|equity|shareholders equity|stockholders equity|capital|total liabilities|total liabilities and equity|net assets)$/.test(l))break;const v=rowVal(rows[i],col);if(v==null)continue;if(/^total\b/.test(l)){if(/current liabilit|short term liabilit|current obligation/.test(l))return v;continue;}if(Math.abs(v)>0.004){sum+=v;found=true;}}return found?sum:null;}
 function apply(md){if(!md)return md;const p=pickBs();if(!p)return md;const col=currentCol(p);let current=findExplicit(p.rows,col);if(current==null)current=sumSection(p.rows,col);if(current==null)return md;
  const den=Math.abs(numv(md.totalLiabilitiesAndEquity??md.liabilityBifurcationDenominator??md.metrics?.assets??0));
  md.liabilityBifurcation=Array.isArray(md.liabilityBifurcation)?md.liabilityBifurcation:[];
  const other=md.liabilityBifurcation.find(x=>/long.?term/i.test(String(x.label||'')));
  md.liabilityBifurcation=[{label:'Current Liabilities',value:current,detected:true},other||{label:'Long-Term Liabilities',value:null,detected:false}];
  if(md.bsComposition?.liabEquity){const rest=md.bsComposition.liabEquity.filter(x=>norm(x.label)!=='current liabilities');md.bsComposition.liabEquity=[{label:'Current Liabilities',value:current,pct:den?Math.abs(current)/den*100:null},...rest];}
  if(Array.isArray(md.balanceSheetComposition)){md.balanceSheetComposition=md.balanceSheetComposition.map(x=>norm(x.label)==='current liabilities'?{...x,value:current,pct:den?Math.abs(current)/den*100:null}:x);}
  md.finalCurrentLiabilityAudit={sheet:p.name,column:col,currentLiabilities:current,source:findExplicit(p.rows,col)!=null?'explicit-total':'section-sum'};
  return md;
 }
 if(typeof renderDashboard==='function'&&!window.__currentLiabilityPrecisionDash){window.__currentLiabilityPrecisionDash=true;const base=renderDashboard;renderDashboard=function(){apply(state?.model);return base.apply(this,arguments);};}
 if(typeof buildPages==='function'&&!window.__currentLiabilityPrecisionReport){window.__currentLiabilityPrecisionReport=true;const base=buildPages;buildPages=function(o){apply(state?.model);return base.call(this,o||{});};}
 window.applyCurrentLiabilityPrecision=apply;
})();
