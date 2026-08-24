/* Final cover behaviour: Basis looks like normal report text and edits only on click. */
'use strict';
(function(){
  window.coverBody = function(){
    const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    const basis = state.basis || 'Amounts in US Dollars ($)';
    return `
      <div class="cover-top">
        <h1 class="cover-client-top">${escapeHtml(state.client)}</h1>
        ${reportLogo()}
        <div class="cover-brand-rule"></div>
      </div>
      <div class="cover-hero"></div>
      <div class="cover-band">
        <div class="cover-kicker">Management Report</div>
        <h1>${escapeHtml(state.client)}</h1>
        <div class="cover-period">${escapeHtml(state.period)}</div>
      </div>
      <div class="cover-body">
        <div class="cover-meta">
          <div class="cover-meta-static"><span>Prepared by</span><b>Unison Direct GCC INC</b></div>
          <div class="cover-meta-static"><span>Report date</span><b>${escapeHtml(today)}</b></div>
          <div class="cover-basis">
            <span>Basis</span>
            <div class="basis-inline-editor">
              <button type="button" class="basis-display" title="Click to edit Basis">${escapeHtml(basis)}</button>
              <input class="basis-input" value="${escapeHtml(basis)}" aria-label="Report basis" autocomplete="off">
            </div>
          </div>
        </div>
        <div class="cover-confidential">CONFIDENTIAL — Prepared for management use only</div>
      </div>`;
  };

  function finishBasisEdit(input, save){
    const editor=input.closest('.basis-inline-editor');
    if(!editor)return;
    if(save){
      state.basis=(input.value||'').trim()||'Amounts in US Dollars ($)';
      persist();
      renderReport();
    }else{
      editor.classList.remove('editing');
      input.value=state.basis||'Amounts in US Dollars ($)';
    }
  }

  document.addEventListener('click',function(e){
    const display=e.target.closest && e.target.closest('.basis-display');
    if(!display)return;
    const editor=display.closest('.basis-inline-editor');
    if(!editor || display.closest('.pdf-export'))return;
    editor.classList.add('editing');
    const input=editor.querySelector('.basis-input');
    if(input){input.focus();input.select();}
  });

  document.addEventListener('keydown',function(e){
    if(!e.target.classList?.contains('basis-input'))return;
    if(e.key==='Enter'){e.preventDefault();finishBasisEdit(e.target,true);}
    if(e.key==='Escape'){e.preventDefault();finishBasisEdit(e.target,false);e.target.blur();}
  });

  document.addEventListener('blur',function(e){
    if(e.target.classList?.contains('basis-input'))finishBasisEdit(e.target,true);
  },true);
})();