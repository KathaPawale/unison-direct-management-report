/* Ensure workbook notes are imported and shown directly in the existing report preview/PDF format. */
'use strict';
(function(){
  const clean=v=>String(v==null?'':v).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const norm=s=>clean(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const esc=s=>typeof escapeHtml==='function'?escapeHtml(String(s??'')):clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function st(){try{return typeof state!=='undefined'?state:window.state}catch(_){return window.state}}

  function looksLikeNotesSheet(name,rows){
    const n=norm(name);
    if(/\bnotes?\b/.test(n)&&(/financial|statement|accounts|fs\b/.test(n)||n==='notes'||n==='note')) return true;
    const sample=norm((rows||[]).slice(0,35).flat().join(' '));
    return /notes? to (the )?financial statements?/.test(sample)||/notes? to accounts/.test(sample)||/reconciliation notes/.test(sample);
  }
  function notesSheets(){
    const s=st(); if(!s?.sheets)return [];
    return Object.entries(s.sheets).filter(([name,rows])=>looksLikeNotesSheet(name,rows));
  }
  function cells(row){return (row||[]).map(clean);}
  function nonblank(row){return cells(row).filter(Boolean);}
  function isColumnHeader(row){
    const a=nonblank(row).map(norm);
    return a.includes('line item')&&(a.includes('note')||a.includes('notes'));
  }
  function isSectionRow(row){
    const a=nonblank(row); if(a.length!==1)return false;
    return /^(assets?|current assets?|fixed assets?|non[- ]current assets?|liabilit(?:y|ies)|current liabilit(?:y|ies)|long[- ]term liabilit(?:y|ies)|non[- ]current liabilit(?:y|ies)|capital|equity)$/i.test(a[0]);
  }
  function safeLinkText(v){
    const x=clean(v); if(!x)return '';
    if(/^#'?[^!]+?![A-Z]+\d+/i.test(x)||/^#/.test(x))return 'Click here to view';
    if(/^https?:\/\//i.test(x))return 'Click here to view';
    return x;
  }
  function parseSheet(name,rows){
    const out=[]; let header=null;
    for(const row of rows||[]){
      const a=cells(row); const vals=a.filter(Boolean); if(!vals.length)continue;
      if(isColumnHeader(row)){
        header={line:a.findIndex(x=>norm(x)==='line item'),note:a.findIndex(x=>/^notes?$/.test(norm(x))),link:a.findIndex(x=>norm(x)==='link')};
        out.push({type:'header'}); continue;
      }
      if(isSectionRow(row)){out.push({type:'section',text:vals[0]});header=null;continue;}
      if(header){
        const item=clean(a[header.line]); const note=clean(a[header.note]); const link=header.link>=0?safeLinkText(a[header.link]):'';
        if(item||note||link){out.push({type:'row',item,note,link});continue;}
      }
      /* Preserve report title, period, reconciliation subtitle and other workbook note text. */
      out.push({type:'text',text:vals.join(' — ')});
    }
    return {name,items:out};
  }
  function extractStructured(){return notesSheets().map(([name,rows])=>parseSheet(name,rows)).filter(x=>x.items.length);}
  function extractNotes(){
    const s=st(); if(!s)return '';
    const structured=extractStructured();
    /* Always refresh from the current workbook so notes from a previous upload never carry over. */
    s.structuredNotes=structured;
    const text=structured.flatMap(x=>x.items.map(i=>i.type==='row'?[i.item,i.note,i.link].filter(Boolean).join(' — '):i.text|| (i.type==='header'?'Line Item — Note — Link':''))).filter(Boolean).join('\n');
    s.notes=text;
    return text;
  }
  function notesHtml(){
    const s=st(); const groups=s?.structuredNotes?.length?s.structuredNotes:extractStructured();
    if(!groups.length)return '';
    const html=[];
    for(const g of groups){
      let tableOpen=false;
      const close=()=>{if(tableOpen){html.push('</tbody></table>');tableOpen=false;}};
      for(const i of g.items){
        if(i.type==='section'){close();html.push('<div class="report-note-line"><strong>'+esc(i.text)+'</strong></div>');continue;}
        if(i.type==='text'){close();html.push('<div class="report-note-line">'+esc(i.text)+'</div>');continue;}
        if(i.type==='header'){
          close(); tableOpen=true;
          html.push('<table class="report-table"><thead><tr><th>Line Item</th><th>Note</th><th>Link</th></tr></thead><tbody>');continue;
        }
        if(i.type==='row'){
          if(!tableOpen){tableOpen=true;html.push('<table class="report-table"><thead><tr><th>Line Item</th><th>Note</th><th>Link</th></tr></thead><tbody>');}
          html.push('<tr><td>'+esc(i.item)+'</td><td>'+esc(i.note)+'</td><td>'+esc(i.link)+'</td></tr>');
        }
      }
      close();
    }
    return '<div class="report-notes">'+html.join('')+'</div>';
  }
  function ensureNotesPages(pages){
    const text=extractNotes(); if(!text||!Array.isArray(pages))return pages;
    const body=notesHtml(); if(!body)return pages;
    const existing=pages.findIndex(p=>p.sectionId==='notes'||/notes? to financial statements?/i.test(String(p.title||'')));
    const s=st();
    const page={sectionId:'notes',title:'Notes to Financial Statements',sectionNo:6,pageNo:null,html:'<div class="report-page" data-section="notes">'+(typeof reportLogo==='function'?reportLogo():'')+'<h2 class="report-title">6. Notes to Financial Statements</h2><div class="report-rule"></div>'+body+'<div class="report-footer"><span class="confidential">CONFIDENTIAL — MANAGEMENT PURPOSE ONLY</span><span>'+esc(s?.client||'')+'</span><span></span></div></div>'};
    if(existing>=0)pages.splice(existing,1,page); else {const disclaimer=pages.findIndex(p=>p.sectionId==='disclaimer');if(disclaimer>=0)pages.splice(disclaimer,0,page);else pages.push(page);}
    return pages;
  }
  if(typeof buildPages==='function'&&!window.__directNotesReportFix){
    window.__directNotesReportFix=true; const base=buildPages;
    buildPages=function(opts){let pages=base.call(this,opts||{});return ensureNotesPages(pages);};
  }
  if(typeof renderReport==='function'&&!window.__directNotesRenderFix){
    window.__directNotesRenderFix=true; const base=renderReport;
    renderReport=function(){extractNotes();return base.apply(this,arguments);};
  }
  window.importNotesDirectlyToReport=extractNotes;
})();
