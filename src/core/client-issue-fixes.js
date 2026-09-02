/* Client issue fixes — robust workbook/report post-processing. */
'use strict';
(function(){
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const n=v=>typeof num==='function'?num(v):(Number(v)||0);
  const monthRe=/^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i;
  function detectExtraRoles(md){
    if(!md||!md.roles||!md.sheetModels) return md;
    for(const [name,sm] of Object.entries(md.sheetModels)){
      const t=norm(name), rows=(state.sheets&&state.sheets[name])||[], head=norm(rows.slice(0,25).flat().join(' ')), all=t+' '+head;
      if(!md.roles.ar && (/\b(ar|a r)\b.*(aging|ageing)/.test(all)||/accounts receivable.*(aging|ageing)/.test(all))){md.roles.ar=name;sm.role='ar';}
      if(!md.roles.ap && (/\b(ap|a p)\b.*(aging|ageing)/.test(all)||/accounts payable.*(aging|ageing)/.test(all))){md.roles.ap=name;sm.role='ap';}
      if(!md.roles.bs && (/balance sheet|statement of financial position/.test(all)||(/\bassets\b/.test(head)&&/liabilit/.test(head)&&/equity|capital|net assets/.test(head)))){md.roles.bs=name;sm.role='bs';}
      if(!md.roles.plMonthly){const mc=(sm.cols||[]).filter(c=>c.type==='month'||monthRe.test(String(c.label||''))).length;if(mc>=2&&(/profit/.test(all)||/income/.test(all)||/revenue/.test(all))){md.roles.plMonthly=name;sm.role='plMonthly';}}
    }
    return md;
  }
  function aging(md,role){
    const name=md.roles[role],sm=name&&md.sheetModels[name];if(!sm)return null;const rows=state.sheets[name]||[];
    const buckets=(sm.cols||[]).filter(c=>c.type==='bucket'||/(current|1\s*[-–]\s*30|31\s*[-–]\s*60|61\s*[-–]\s*90|91.*over|90\+)/i.test(c.label||''));if(!buckets.length)return null;
    let totalLine=[...(sm.lines||[])].reverse().find(l=>/^(total|grand total|total ar|total ap|total accounts)/i.test(l.label||''));
    const vals=buckets.map(b=>({label:b.label,value:totalLine?n((rows[totalLine.r]||[])[b.idx]):0}));
    if(!totalLine){for(const b of vals)b.value=(sm.lines||[]).reduce((s,l)=>s+n((rows[l.r]||[])[buckets.find(x=>x.label===b.label).idx]),0);}
    const tc=(sm.cols||[]).find(c=>c.type==='rowTotal'||/^total$/i.test(c.label||''));const total=totalLine&&tc?n((rows[totalLine.r]||[])[tc.idx]):vals.reduce((s,x)=>s+x.value,0);return {buckets:vals,total};
  }
  function line(sm,re){return (sm.lines||[]).find(l=>re.test(norm(l.label)));}
  function currentCol(sm){return (sm.cols||[]).find(c=>c.type==='rowTotal')?.idx ?? (sm.cols||[]).find(c=>c.type==='current')?.idx ?? (sm.cols||[]).filter(c=>c.idx>0&&c.type!=='change'&&c.type!=='percent').slice(-1)[0]?.idx;}
  function valueAt(sm,rows,l,c){return l&&c!=null?n((rows[l.r]||[])[c]):0;}
  function findAny(sm,res){return (sm.lines||[]).find(l=>res.some(re=>re.test(norm(l.label))));}
  function sectionSum(sm,rows,c,headerRes,stopRes){
    const lines=sm.lines||[];const start=lines.findIndex(l=>headerRes.some(re=>re.test(norm(l.label))));if(start<0)return 0;
    let sum=0,found=false;
    for(let i=start+1;i<lines.length;i++){
      const l=lines[i],lab=norm(l.label);if(stopRes.some(re=>re.test(lab)))break;
      if(/^total\b/.test(lab)||/^subtotal\b/.test(lab))continue;
      if(l.kind==='account'||(!l.kind&&lab)){const v=valueAt(sm,rows,l,c);if(Math.abs(v)>0.004){sum+=v;found=true;}}
    }
    return found?sum:0;
  }
  function fixBs(md){
    const sm=md.roles.bs&&md.sheetModels[md.roles.bs];if(!sm)return;const rows=state.sheets[sm.name]||[],c=currentCol(sm);if(c==null)return;
    const currentLabels=[/^total (for )?current liabilities$/, /^current liabilities$/, /^total (for )?short term liabilities$/, /^short term liabilities$/, /^total (for )?current obligations$/, /^current obligations$/, /^total (for )?current payables$/, /^current payables$/];
    const longLabels=[/^total (for )?(long term|longterm|non current) liabilities$/, /^(long term|longterm|non current) liabilities$/, /^total (for )?long term debt$/, /^long term debt$/, /^total (for )?non current obligations$/, /^non current obligations$/];
    const totalLabels=[/^total (for )?liabilities$/, /^liabilities total$/, /^total liabilities and provisions$/];
    const leLabels=[/^total (for )?liabilities (and|&) equity$/, /^liabilities (and|&) equity$/, /^total liabilities (and|&) (equity|capital)$/, /^total liabilities and shareholders equity$/, /^total liabilities and stockholders equity$/, /^total liabilities and net assets$/];
    const assetLabels=[/^total (for )?assets$/, /^assets total$/];
    let current=valueAt(sm,rows,findAny(sm,currentLabels),c);
    let longTerm=valueAt(sm,rows,findAny(sm,longLabels),c);
    let totalLiabilities=valueAt(sm,rows,findAny(sm,totalLabels),c);
    let totalLE=valueAt(sm,rows,findAny(sm,leLabels),c);
    const totalAssets=valueAt(sm,rows,findAny(sm,assetLabels),c);
    if(Math.abs(current)<0.005) current=sectionSum(sm,rows,c,[/^current liabilities$/, /^short term liabilities$/, /^current obligations$/, /^current payables$/],[/^(long term|longterm|non current) liabilities$/, /^equity$/, /^capital$/, /^total liabilities/]);
    if(Math.abs(longTerm)<0.005) longTerm=sectionSum(sm,rows,c,[/^(long term|longterm|non current) liabilities$/, /^long term debt$/, /^non current obligations$/],[/^equity$/, /^capital$/, /^total liabilities/, /^total liabilities and/]);
    if(Math.abs(totalLiabilities)<0.005 && (Math.abs(current)>0.005||Math.abs(longTerm)>0.005)) totalLiabilities=current+longTerm;
    if(Math.abs(current)<0.005 && Math.abs(totalLiabilities)>0.005 && Math.abs(longTerm)>0.005) current=totalLiabilities-longTerm;
    if(Math.abs(longTerm)<0.005 && Math.abs(totalLiabilities)>0.005 && Math.abs(current)>0.005) longTerm=totalLiabilities-current;
    if(Math.abs(current)<0.005 && Math.abs(longTerm)<0.005 && Math.abs(totalLiabilities)>0.005) current=totalLiabilities;
    if(Math.abs(totalLE)<0.005) totalLE=totalAssets||Math.abs(n(md.metrics&&md.metrics.assets));
    if(Math.abs(totalLE)<0.005){const eq=valueAt(sm,rows,findAny(sm,[/^total (for )?equity$/, /^equity$/, /^total (for )?(shareholders|stockholders) equity$/, /^total capital$/, /^net assets$/]),c);totalLE=totalLiabilities+eq;}
    md.liabilityBifurcation=[{label:'Current Liabilities',value:current},{label:'Long-Term Liabilities',value:longTerm}];
    md.liabilityBifurcationDenominator=Math.abs(totalLE)||Math.abs(totalLiabilities)||Math.abs(current)+Math.abs(longTerm);
    md.liabilityAudit={sheet:sm.name,column:c,current,longTerm,totalLiabilities,totalLiabilitiesAndEquity:totalLE};
  }
  function liabilityHtml(md,report){
    if(!md||!Array.isArray(md.liabilityBifurcation))return '';
    const items=md.liabilityBifurcation,total=Math.abs(n(md.liabilityBifurcationDenominator))||items.reduce((s,x)=>s+Math.abs(n(x.value)),0);
    const body=items.map(x=>{const pc=total?Math.abs(n(x.value))/total*100:0;return `<tr><td>${escapeHtml(x.label)}</td><td class="${n(x.value)<0?'neg':''}">${money(n(x.value))}</td><td>${pct(pc)}</td></tr>`;}).join('');
    return `${report?'<div class="report-section-title">':'<h3>'}Liabilities Bifurcation${report?'</div>':'</h3>'}<table class="${report?'report-mini-table':'comparison'}"><thead><tr><th>Liability Type</th><th>Amount</th><th>% of Liabilities & Equity</th></tr></thead><tbody>${body}</tbody></table>`;
  }
  function fixExpenses(md){const total=Math.abs(n(md.metrics&&md.metrics.expenses));if(total&&Array.isArray(md.expenseGroups))md.expenseGroups=md.expenseGroups.map(x=>({...x,pct:Math.abs(n(x.value))/total*100})).sort((a,b)=>Math.abs(n(b.value))-Math.abs(n(a.value)));}
  function fixMonths(md){
    const name=md.roles.plMonthly,sm=name&&md.sheetModels[name];if(!sm)return;const months=(sm.cols||[]).filter(c=>c.type==='month'||monthRe.test(String(c.label||''))).sort((a,b)=>(a.year||0)-(b.year||0)||a.idx-b.idx);if(!months.length)return;
    const rows=state.sheets[name]||[];const find=res=>(sm.lines||[]).find(l=>res.some(r=>r.test(norm(l.label))));const rev=find([/^total for income$/, /^total income$/, /^total revenue$/, /^revenue$/]);const net=find([/^net income$/, /^net profit$/]);const exp=find([/^total for expenses$/, /^total expenses$/]);
    md.months=months.map(c=>({label:c.label,short:c.short||String(c.label||'').slice(0,3),col:c.idx,year:c.year}));if(rev)md.monthlyRevenue=months.map(c=>n((rows[rev.r]||[])[c.idx]));if(net)md.monthlyNet=months.map(c=>n((rows[net.r]||[])[c.idx]));if(exp)md.monthlyExpenses=months.map(c=>n((rows[exp.r]||[])[c.idx]));
  }
  function apply(md){try{detectExtraRoles(md);md.arAging=aging(md,'ar')||md.arAging;md.apAging=aging(md,'ap')||md.apAging;if(md.metrics){if(md.arAging)md.metrics.ar=md.arAging.total;if(md.apAging)md.metrics.ap=md.apAging.total;}fixBs(md);fixExpenses(md);fixMonths(md);}catch(e){console.warn('Client issue post-process skipped',e);}return md;}
  if(typeof renderDashboard==='function'&&!window.__clientIssueDashboard){window.__clientIssueDashboard=true;const b=renderDashboard;renderDashboard=function(){if(state&&state.model)apply(state.model);const out=b.apply(this,arguments);try{const md=state&&state.model,box=document.getElementById('chartBs');if(box&&md&&md.liabilityBifurcation)box.insertAdjacentHTML('beforeend',liabilityHtml(md,false));}catch(e){console.warn('Liability dashboard display skipped',e);}return out;};}
  if(typeof buildPages==='function'&&!window.__clientIssueReport){window.__clientIssueReport=true;const b=buildPages;buildPages=function(o){if(state&&state.model)apply(state.model);let pages=b.call(this,o||{});try{const md=state&&state.model;if(md&&md.liabilityBifurcation){const dash=pages.filter(p=>p.sectionId==='dash');if(dash.length){const target=dash[dash.length-1];target.html=target.html.replace('<div class="report-footer">',liabilityHtml(md,true)+'<div class="report-footer">');}}}catch(e){console.warn('Liability report display skipped',e);}return pages;};}
  window.applyClientIssueFixes=apply;
})();
