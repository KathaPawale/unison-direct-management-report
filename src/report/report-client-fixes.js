/* Client report fixes: #15 TOC order, #16 notes reflection, #21 wide PDF tables */
'use strict';
(function(){
  /* #16 — import Notes to Financial Statements from a workbook sheet when no manual note exists. */
  function importWorkbookNotes(){
    if(!window.state || (state.notes && String(state.notes).trim()) || !state.sheets) return;
    const key=Object.keys(state.sheets).find(k=>/notes?\s*(to)?\s*(the)?\s*financial|financial\s*statement\s*notes?/i.test(k));
    if(!key) return;
    const rows=state.sheets[key]||[];
    const text=rows.map(r=>(r||[]).map(v=>String(v==null?'':v).trim()).filter(Boolean).join(' — ')).filter(Boolean).join('\n');
    if(text) state.notes=text;
  }

  /* #21 — split wide statements into column groups instead of silently cutting after 12 columns. */
  function wideTableBodies(no,title,sm,opts){
    const valueCols=(sm.cols||[]).filter(c=>c.type!=='label');
    if(valueCols.length<=7) return null;
    const original=sm.cols;
    const labelCols=original.filter(c=>c.type==='label');
    const groups=[];
    for(let i=0;i<valueCols.length;i+=7) groups.push(valueCols.slice(i,i+7));
    const out=[];
    try{
      groups.forEach((g,gi)=>{
        sm.cols=labelCols.concat(g);
        const pages=window.__basePaginateTableSection(no,title,sm,opts)||[];
        pages.forEach((html,pi)=>{
          const marker=groups.length>1?`<div class="wide-col-marker">Columns ${gi*7+1}–${gi*7+g.length} of ${valueCols.length}</div>`:'';
          out.push(marker+html);
        });
      });
    } finally { sm.cols=original; }
    return out;
  }

  if(typeof paginateTableSection==='function'&&!window.__widePdfTables){
    window.__widePdfTables=true;
    window.__basePaginateTableSection=paginateTableSection;
    paginateTableSection=function(no,title,sm,opts){
      const wide=wideTableBodies(no,title,sm,opts);
      return wide||window.__basePaginateTableSection(no,title,sm,opts);
    };
  }

  /* #15 — rebuild generated pages so Balance Sheet is before every Profit & Loss section in report + TOC. */
  function reorderPages(pages){
    if(!Array.isArray(pages)) return pages;
    const front=pages.filter(p=>p.sectionId==='cover'||p.sectionId==='toc'||p.sectionId==='dash');
    const bs=pages.filter(p=>p.sectionId==='bs');
    const pl=pages.filter(p=>/^pl/.test(p.sectionId||''));
    const rest=pages.filter(p=>!['cover','toc','dash','bs'].includes(p.sectionId)&&!/^pl/.test(p.sectionId||''));
    const ordered=front.concat(bs,pl,rest);
    /* Re-number visible content sections after reordering. */
    let no=0,last=null;
    ordered.forEach((p,i)=>{
      if(!['cover','toc'].includes(p.sectionId) && p.sectionId!==last) no++;
      if(!['cover','toc'].includes(p.sectionId)) p.sectionNo=no;
      p.pageNo=i+1; last=p.sectionId;
    });
    /* Rebuild TOC from final order and real page ranges. */
    const toc=ordered.find(p=>p.sectionId==='toc');
    if(toc){
      const ranges=[];
      ordered.forEach((p,i)=>{
        if(['cover','toc'].includes(p.sectionId)) return;
        let r=ranges.find(x=>x.id===p.sectionId);
        if(!r){r={id:p.sectionId,no:p.sectionNo,title:p.title,first:i+1,last:i+1};ranges.push(r);}else r.last=i+1;
      });
      const rows=ranges.map(r=>`<div class="toc-item"><span>${r.no}. ${escapeHtml(r.title)}</span><span class="toc-page">${r.first===r.last?r.first:r.first+'–'+r.last}</span></div>`).join('');
      const body=sectionHead(null,'Table of Contents',state.client)+`<div class="toc-list">${rows}</div>`;
      toc.html=`<div class="report-page" data-section="toc">${body}${pageFooter(toc.pageNo||2,ordered.length)}</div>`;
    }
    return ordered;
  }

  if(typeof buildPages==='function'&&!window.__clientReportBuildFix){
    window.__clientReportBuildFix=true;
    const base=buildPages;
    buildPages=function(opts){importWorkbookNotes();return reorderPages(base.call(this,opts||{}));};
  }
})();
