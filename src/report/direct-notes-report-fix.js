/* Ensure workbook notes are imported and always shown directly in report preview/PDF. */
'use strict';
(function(){
  const clean=v=>String(v==null?'':v).trim();
  const norm=s=>clean(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function looksLikeNotesSheet(name,rows){
    const n=norm(name);
    if(/\bnotes?\b/.test(n)&&(/financial|statement|accounts|fs\b/.test(n)||n==='notes'||n==='note')) return true;
    const sample=norm((rows||[]).slice(0,30).flat().join(' '));
    return /notes? to (the )?financial statements?/.test(sample)||/notes? to accounts/.test(sample);
  }

  function extractNotes(){
    if(!window.state||!state.sheets) return '';
    const manual=clean(state.notes);
    if(manual) return manual;
    const parts=[];
    for(const [name,rows] of Object.entries(state.sheets)){
      if(!looksLikeNotesSheet(name,rows)) continue;
      const lines=[];
      for(const row of rows||[]){
        const cells=(row||[]).map(clean).filter(Boolean);
        if(!cells.length) continue;
        const text=cells.join(' — ');
        if(!lines.length||lines[lines.length-1]!==text) lines.push(text);
      }
      if(lines.length) parts.push(lines.join('\n'));
    }
    const text=parts.join('\n\n').trim();
    if(text) state.notes=text;
    return text;
  }

  function esc(s){return typeof escapeHtml==='function'?escapeHtml(s):clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function notesHtml(text){
    const lines=clean(text).split(/\n+/).map(clean).filter(Boolean);
    if(!lines.length) return '';
    return '<div class="report-direct-notes"><div class="report-section-title">Notes to Financial Statements</div><div class="report-notes">'+lines.map(x=>'<div class="report-note-line">'+esc(x)+'</div>').join('')+'</div></div>';
  }

  function ensureNotesPages(pages){
    const text=extractNotes();
    if(!text||!Array.isArray(pages)) return pages;
    const hasNotes=pages.some(p=>/notes? to financial statements?/i.test(String(p.title||''))||p.sectionId==='notes');
    if(hasNotes) return pages;
    const body=notesHtml(text);
    if(!body) return pages;
    const page={sectionId:'notes',title:'Notes to Financial Statements',sectionNo:null,pageNo:null,html:'<div class="report-page" data-section="notes">'+(typeof reportLogo==='function'?reportLogo():'')+'<h2 class="report-title">Notes to Financial Statements</h2><div class="report-rule"></div>'+body+'<div class="report-footer"><span class="confidential">CONFIDENTIAL — MANAGEMENT PURPOSE ONLY</span><span>'+esc(state.client||'')+'</span><span></span></div></div>'};
    const disclaimer=pages.findIndex(p=>p.sectionId==='disclaimer');
    if(disclaimer>=0) pages.splice(disclaimer,0,page); else pages.push(page);
    return pages;
  }

  if(typeof buildPages==='function'&&!window.__directNotesReportFix){
    window.__directNotesReportFix=true;
    const base=buildPages;
    buildPages=function(opts){
      extractNotes();
      let pages=base.call(this,opts||{});
      pages=ensureNotesPages(pages);
      return pages;
    };
  }

  // Import immediately after a workbook has been processed so Report Preview sees the notes without manual Apply.
  if(typeof renderReport==='function'&&!window.__directNotesRenderFix){
    window.__directNotesRenderFix=true;
    const baseRender=renderReport;
    renderReport=function(){extractNotes();return baseRender.apply(this,arguments);};
  }

  window.importNotesDirectlyToReport=extractNotes;
})();
