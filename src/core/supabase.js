/* Supabase persistence + quality fixes for Unison Direct Management Reporting */
'use strict';

const dbState = { config:null, reportId:null, ready:false, checked:false, saving:false, accessToken:null };
function browserAccessToken(){
  if (dbState.accessToken) return dbState.accessToken;
  const key='udmr.db.token';
  try { dbState.accessToken=localStorage.getItem(key); } catch(e){}
  if (!dbState.accessToken){
    dbState.accessToken=(crypto.randomUUID ? crypto.randomUUID() : Date.now()+'-'+Math.random().toString(36).slice(2));
    try { localStorage.setItem(key,dbState.accessToken); } catch(e){}
  }
  return dbState.accessToken;
}
async function initSupabase(){
  /* Probe once per page load. When /api/config is absent (local preview, or a Vercel
     deployment without the Supabase env vars) the app stays browser-only and silent. */
  if (dbState.checked) return dbState.ready;
  dbState.checked = true;
  try { const r=await fetch('/api/config',{cache:'no-store'}); const c=await r.json(); if(!r.ok||!c.ok) throw new Error(c.error||'Supabase configuration unavailable'); dbState.config=c; dbState.ready=true; browserAccessToken(); return true; }
  catch(e){ console.info('Supabase not configured — running in browser-only mode.'); dbState.ready=false; return false; }
}
async function sbRequest(table,{method='GET',body=null,query='',prefer=''}={}){
  if(!dbState.ready) await initSupabase(); if(!dbState.ready) throw new Error('Supabase is not configured');
  const url=dbState.config.url.replace(/\/$/,'')+'/rest/v1/'+table+(query?'?'+query:'');
  const headers={apikey:dbState.config.publishableKey,Authorization:'Bearer '+dbState.config.publishableKey,'Content-Type':'application/json','x-unison-token':browserAccessToken()};
  if(prefer) headers.Prefer=prefer;
  const r=await fetch(url,{method,headers,body:body==null?undefined:JSON.stringify(body)}); if(!r.ok) throw new Error(`${table}: ${await r.text()}`); const text=await r.text(); return text?JSON.parse(text):null;
}
function metricRows(reportId){ const m=state.model?.metrics||{}; return [
 ['revenue','Revenue / Income',m.income],['gross_profit','Gross Profit',m.gross],['net_income','Net Income',m.net],['cash_bank','Cash / Bank',m.bank],['accounts_receivable','A/R Total',m.ar],['accounts_payable','A/P Total',m.ap],['expenses','Total Expenses',m.expenses],['assets','Total Assets',m.assets],['liabilities','Total Liabilities',m.liabilities],['equity','Total Equity',m.equity]
].filter(x=>x[2]!==undefined&&x[2]!==null).map(x=>({report_id:reportId,metric_key:x[0],metric_label:x[1],period_key:state.period||'Current',amount:Number(x[2])||0})); }
async function saveReportToSupabase(){
 if(!hasData()||dbState.saving) return dbState.reportId; dbState.saving=true;
 try { if(!dbState.ready) await initSupabase(); if(!dbState.ready) throw new Error('Supabase connection is unavailable');
  const created=await sbRequest('reports',{method:'POST',body:{client_name:state.client||'Client',source_filename:state.fileName||'',period_label:state.period||'',status:'processed',notes:state.notes||'',access_token:browserAccessToken()},prefer:'return=representation'});
  if(!created?.[0]?.id) throw new Error('Report was not created'); dbState.reportId=created[0].id;
  const worksheets=Object.entries(state.sheets).map(([name,rows],i)=>({report_id:dbState.reportId,sheet_name:name,sheet_order:i,data:rows})); if(worksheets.length) await sbRequest('worksheets',{method:'POST',body:worksheets});
  const metrics=metricRows(dbState.reportId); if(metrics.length) await sbRequest('financial_metrics',{method:'POST',body:metrics}); return dbState.reportId;
 } finally { dbState.saving=false; }
}
async function updateReportNotes(){ if(!dbState.reportId||!dbState.ready)return; await sbRequest('reports',{method:'PATCH',query:'id=eq.'+encodeURIComponent(dbState.reportId),body:{notes:state.notes||''}}); }
async function logManualEdit(sheetName,rowIndex,columnIndex,oldValue,newValue){ if(!dbState.reportId||!dbState.ready)return; try{await sbRequest('manual_edits',{method:'POST',body:{report_id:dbState.reportId,sheet_name:sheetName,row_index:rowIndex,column_index:columnIndex,original_value:String(oldValue??''),edited_value:String(newValue??'')}});}catch(e){console.warn('Could not log manual edit:',e);} }
async function logReportExport(exportType,fileName){ if(!dbState.reportId||!dbState.ready)return; try{await sbRequest('report_exports',{method:'POST',body:{report_id:dbState.reportId,export_type:exportType,file_name:fileName||''}});}catch(e){console.warn('Could not log report export:',e);} }

/* ---------- requested quality fixes ---------- */
function installQualityFixes(){
  /* 1 + 8: make current/prior comparative parsing robust and recover Revenue/Net from monthly totals. */
  if (typeof parseWorkbook === 'function' && !window.__udmrParserFix){
    window.__udmrParserFix=true;
    const baseParse=parseWorkbook;
    parseWorkbook=function(sheets){
      const md=baseParse(sheets);
      const sum=a=>(a||[]).reduce((s,v)=>s+(Number(v)||0),0);
      const hasUseful=a=>(a||[]).some(v=>Math.abs(Number(v)||0)>0.004);
      if (md && md.metrics){
        if (Math.abs(Number(md.metrics.income)||0)<0.005 && hasUseful(md.monthlyRevenue)) md.metrics.income=sum(md.monthlyRevenue);
        if (Math.abs(Number(md.metrics.expenses)||0)<0.005 && hasUseful(md.monthlyExpenses)) md.metrics.expenses=sum(md.monthlyExpenses);
        if (Math.abs(Number(md.metrics.net)||0)<0.005 && hasUseful(md.monthlyNet)) md.metrics.net=sum(md.monthlyNet);
        if (Math.abs(Number(md.metrics.gross)||0)<0.005 && Math.abs(Number(md.metrics.income)||0)>0.004) md.metrics.gross=md.metrics.income;
      }
      const compName=md?.roles?.plComparative;
      if (compName && md.sheetModels?.[compName]){
        const sm=md.sheetModels[compName], rows=sheets[compName]||[];
        const usable=sm.cols.filter(c=>c.type!=='label'&&c.type!=='change'&&c.type!=='percent');
        const current=sm.cols.find(c=>c.type==='current') || usable[0] || null;
        const prior=sm.cols.find(c=>c.type==='prior') || usable.find(c=>!current||c.idx!==current.idx) || null;
        const labelSets={
          income:['total income','total revenue','revenue','sales','income'],
          gross:['gross profit'], expenses:['total expenses','total operating expenses','operating expenses','expenses'],
          net:['net income','net profit','profit for the period']
        };
        const read=(labels,col)=>{
          if(!col) return null;
          for(const lab of labels){
            const li=sm.byLabel[lab]; if(li===undefined) continue;
            const line=sm.lines[li], raw=(rows[line.r]||[])[col.idx];
            if(String(raw??'').trim()!=='' && isNumericCell(raw)) return num(raw);
          }
          return null;
        };
        const ci=read(labelSets.income,current), cg=read(labelSets.gross,current), ce=read(labelSets.expenses,current), cn=read(labelSets.net,current);
        if(ci!==null) md.metrics.income=ci; if(cg!==null) md.metrics.gross=cg; else if(ci!==null) md.metrics.gross=ci;
        if(ce!==null) md.metrics.expenses=ce; if(cn!==null) md.metrics.net=cn;
        const pi=read(labelSets.income,prior), pg=read(labelSets.gross,prior), pe=read(labelSets.expenses,prior), pn=read(labelSets.net,prior);
        if(pi!==null) md.prior.income=pi; if(pg!==null) md.prior.gross=pg; else if(pi!==null) md.prior.gross=pi;
        if(pe!==null) md.prior.expenses=pe; if(pn!==null) md.prior.net=pn;
        /* Comparative-only uploads should show a period comparison, not fake Jan-Jun bars. */
        if(!md.roles.plMonthly){
          md.months=[{label:'Current Period',short:'Current',col:current?.idx??1}];
          md.monthlyRevenue=[Number(md.metrics.income)||0];
          md.monthlyNet=[Number(md.metrics.net)||0];
          md.monthlyExpenses=[Number(md.metrics.expenses)||0];
        }
      }
      return md;
    };
  }

  /* 3: Review & Edit numbers use US accounting format with exactly two decimals. */
  if (typeof editorTableHtml === 'function' && !window.__udmrEditorFix){
    window.__udmrEditorFix=true;
    editorTableHtml=function(sheetName){
      const rows=state.sheets[sheetName]||[];
      const width=Math.min(Math.max(...rows.map(r=>(r||[]).length),1),16);
      const shown=rows.slice(0,400);
      const accounting=v=>{ const n=num(v), a=Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); return n<0?'($'+a+')':'$'+a; };
      let html='<div class="table-wrap"><table class="fin-table edit-table"><tbody>';
      shown.forEach((row,ri)=>{
        const isTotal=/\btotal\b/i.test(String((row||[])[0]??'')); html+=`<tr${isTotal?' class="row-total"':''}>`;
        for(let ci=0;ci<width;ci++){
          const v=(row||[])[ci]??'', key=`${sheetName}:${ri}:${ci}`;
          const cls=[state.edited.has(key)?'edited':'',state.adjusted.has(key)?'adjusted':'',ci>0&&isNumericCell(v)&&num(v)<0?'neg':''].filter(Boolean).join(' ');
          const display=ci>0&&isNumericCell(v)?accounting(v):v;
          html+=`<td class="${cls}"><input data-r="${ri}" data-c="${ci}" value="${escapeAttr(display)}"></td>`;
        }
        html+='</tr>';
      });
      html+='</tbody></table></div>';
      if(rows.length>400) html+=`<div class="help">Showing first 400 of ${rows.length} rows.</div>`;
      return html;
    };
  }

  /* 2, 4, 5, 6: stronger red negatives, TOC starts at 1, clear month dash, cleaner analytical pages. */
  if (typeof buildPages === 'function' && !window.__udmrReportFix){
    window.__udmrReportFix=true;
    const baseBuildPages=buildPages;
    const monthNames='January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
    const monthDashRe=new RegExp('\\b('+monthNames+')\\s*[-–—]\\s*('+monthNames+')\\b','g');
    buildPages=function(opts={}){
      const pages=baseBuildPages(opts);
      /* Section numbering is owned by buildPages() in report.js: cover and TOC are
         unnumbered front matter and content sections count from 1. Nothing to renumber here. */
      pages.forEach(p=>{
        let html=p.html.replace(monthDashRe,'$1 – $2').replace(/\bP&L\b/g,'P &amp; L').replace(/\bL&D\b/g,'L &amp; D');
        html=html.replace(/class="val neg([^"]*)"/g,'class="val neg$1" style="color:#c93438!important"');
        if(p.sectionId==='dash') html=html.replace('class="report-page"','class="report-page report-analytics-page"');
        if(state.model?.roles?.plComparative && !state.model?.roles?.plMonthly && p.sectionId==='dash'){
          html=html.replace(/Monthly Revenue vs Net Income/g,'Current Period Revenue vs Net Income').replace(/Net Margin by Month/g,'Current Period Net Margin');
        }
        p.html=html;
      });
      return pages;
    };
  }

  if (typeof renderDashboard === 'function' && !window.__udmrDashHeadingFix){
    window.__udmrDashHeadingFix=true;
    const baseRenderDashboard=renderDashboard;
    renderDashboard=function(){
      baseRenderDashboard();
      if(state.model?.roles?.plComparative && !state.model?.roles?.plMonthly){
        const h=document.querySelector('#dashboard .card h3'); if(h) h.textContent='Current Period Revenue vs Net Income';
      }
    };
  }

  /* 7: every styled Excel cell gets a visible border while preserving total/double borders. */
  if (typeof _wsSetCell === 'function' && !window.__udmrExcelBorderFix){
    window.__udmrExcelBorderFix=true;
    const baseWsSetCell=_wsSetCell;
    _wsSetCell=function(ws,r,c,v,s,t){
      const thin={style:'thin',color:{rgb:'D5DDE7'}};
      const style={...(s||{}),border:{left:thin,right:thin,top:thin,bottom:thin,...((s&&s.border)||{})}};
      return baseWsSetCell(ws,r,c,v,style,t);
    };
  }

  const style=document.createElement('style');
  style.textContent=`
    .report-table td.neg,.stmt-table td.neg,.report-table .row-grand td.neg{color:#c93438!important}
    .report-analytics-page .report-section-title{margin-top:14px;margin-bottom:8px}
    .report-analytics-page .report-kpis{gap:8px}
    .report-analytics-page .rkpi{padding:9px 11px}
    .edit-table input{font-variant-numeric:tabular-nums}
  `;
  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded',()=>{
 installQualityFixes();
 initSupabase(); const processBtn=document.getElementById('processBtn');
 if(processBtn) processBtn.addEventListener('click',()=>{const expected=document.getElementById('fileInput')?.files?.[0]?.name;if(!expected)return;dbState.reportId=null;let tries=0;const wait=setInterval(async()=>{tries++;if(state.fileName===expected&&state.model&&hasData()){clearInterval(wait);if(!dbState.ready) await initSupabase();if(!dbState.ready) return;/* browser-only mode: nothing to save, nothing to report */try{await saveReportToSupabase();toast('Processed and saved to Supabase');}catch(e){console.error(e);toast('Workbook processed, but database save failed: '+(e.message||e));}}else if(tries>100)clearInterval(wait);},100);});
 const editor=document.getElementById('editorTable'); if(editor) editor.addEventListener('change',e=>{const inp=e.target.closest('input[data-r][data-c]');if(!inp)return;logManualEdit(state.active,Number(inp.dataset.r),Number(inp.dataset.c),inp.dataset.old??'',inp.value);});
 document.getElementById('applyNotes')?.addEventListener('click',()=>setTimeout(()=>updateReportNotes().catch(console.warn),0));
 ['downloadPdfTop','downloadPdf','openPdf'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>logReportExport('pdf',(state.client||'Client')+'-Management-Report.pdf')));
 ['downloadExcelTop','downloadExcelReport'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>logReportExport('excel',(state.client||'Client')+'-Management-Report.xlsx')));
});