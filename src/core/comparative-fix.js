/* Comparative financial dashboard enhancement — Change #8 */
'use strict';

(function(){
  function hasPrior(md){
    if (!md) return false;
    const p = md.prior || {};
    return !!md.roles?.plComparative || [p.income,p.gross,p.expenses,p.net].some(v => v !== null && v !== undefined);
  }
  function variance(cur, pri){
    if (pri === null || pri === undefined) return {amount:null,pct:null};
    const amount=(Number(cur)||0)-(Number(pri)||0);
    return {amount,pct:Number(pri)===0?null:amount/Math.abs(Number(pri))*100};
  }
  function dashboardComparisonHtml(md,reportMode=false){
    if(!hasPrior(md))return '';
    const m=md.metrics||{},p=md.prior||{};
    const rows=[['Revenue / Income',m.income,p.income],['Gross Profit',m.gross,p.gross],['Total Expenses',m.expenses,p.expenses],['Net Income',m.net,p.net]];
    const cls=reportMode?'report-compare-table':'dashboard-compare-table',titleCls=reportMode?'report-section-title':'chart-sub compare-heading';
    return `<div class="${titleCls}">Current Period vs Prior Year — Comparative Financials</div><table class="${cls}"><thead><tr><th>Metric</th><th>Current Period</th><th>Prior Year</th><th>Variance</th><th>Variance %</th></tr></thead><tbody>`+rows.map(([label,cur,pri])=>{const v=variance(cur,pri);return `<tr><td>${escapeHtml(label)}</td><td${Number(cur)<0?' class="neg"':''}>${money(cur||0)}</td><td${Number(pri)<0?' class="neg"':''}>${pri==null?'—':money(pri)}</td><td${v.amount!=null&&v.amount<0?' class="neg"':''}>${v.amount==null?'—':money(v.amount)}</td><td${v.pct!=null&&v.pct<0?' class="neg"':''}>${v.pct==null?'—':`${v.pct>=0?'▲ ':'▼ '}${Math.abs(v.pct).toFixed(1)}%`}</td></tr>`}).join('')+'</tbody></table>';
  }
  if(typeof renderDashboard==='function'&&!window.__udmrComparativeDashboardFix){window.__udmrComparativeDashboardFix=true;const base=renderDashboard;renderDashboard=function(){base();const md=state.model;if(!md||!hasPrior(md))return;const box=document.getElementById('comparisonTable');if(box){const monthly=box.innerHTML;box.innerHTML=dashboardComparisonHtml(md,false)+'<div class="chart-sub monthly-heading">Monthly / YTD Detail</div>'+monthly;}const cy=document.getElementById('chartCyPy');if(cy&&!cy.innerHTML.trim()){const m=md.metrics||{},p=md.prior||{},series=[{name:'Current period',color:CHART_COLORS.navy,values:[m.income||0,m.gross||0,m.expenses||0,m.net||0]},{name:'Prior year',color:CHART_COLORS.grey,values:[p.income||0,p.gross||0,p.expenses||0,p.net||0]}];cy.innerHTML='<h3>Current Period vs Prior Year</h3>'+chartLegend(series)+svgGroupedBars({series,labels:['Income','Gross','Expenses','Net'],height:210});}}}
  if(typeof dashboardBodies==='function'&&!window.__udmrComparativeReportFix){window.__udmrComparativeReportFix=true;const base=dashboardBodies;dashboardBodies=function(no,title){const bodies=base(no,title),md=state.model;if(!md||!hasPrior(md)||!bodies.length)return bodies;const compare=dashboardComparisonHtml(md,true),monthly='<div class="report-section-title">Monthly Revenue vs Net Income</div>',current='<div class="report-section-title">Current Period Revenue vs Net Income</div>';if(bodies[0].includes(monthly))bodies[0]=bodies[0].replace(monthly,compare+monthly);else if(bodies[0].includes(current))bodies[0]=bodies[0].replace(current,compare+current);else bodies[0]+=compare;return bodies;}}
  const style=document.createElement('style');style.textContent=`.dashboard-compare-table,.report-compare-table{width:100%;border-collapse:collapse;margin:10px 0 16px;font-variant-numeric:tabular-nums}.dashboard-compare-table th,.dashboard-compare-table td{padding:8px 9px;border:1px solid #dbe3ec;text-align:right;font-size:12px}.dashboard-compare-table th:first-child,.dashboard-compare-table td:first-child{text-align:left}.dashboard-compare-table th{background:#eef3f8;color:#12345a;font-weight:700}.compare-heading{margin:14px 0 7px;font-weight:700;color:#102f54}.monthly-heading{margin-top:16px}.report-compare-table{margin:8px 0 14px}.report-compare-table th,.report-compare-table td{padding:6px 7px;border:1px solid #ccd7e3;text-align:right;font-size:10px}.report-compare-table th:first-child,.report-compare-table td:first-child{text-align:left}.report-compare-table th{background:#edf3f8;color:#11365d;font-weight:700}.report-compare-table td.neg,.dashboard-compare-table td.neg{color:#c93438;font-weight:700}`;document.head.appendChild(style);

  /* Load the final approved cover: no underlines, only Basis editable, UD cyan/red rule. */
  const css=document.createElement('link');css.rel='stylesheet';css.href='./css/cover-final.css';document.head.appendChild(css);
  const script=document.createElement('script');script.src='./src/report/cover-final.js';script.onload=function(){if(typeof renderReport==='function'&&document.getElementById('report')?.classList.contains('active'))renderReport();};document.body.appendChild(script);
})();