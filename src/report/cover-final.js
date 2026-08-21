/* Final cover behaviour: only Basis is editable. */
'use strict';
(function(){
  window.coverBody = function(){
    const today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
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
          <div class="cover-basis"><span>Basis</span><label class="basis-edit"><input id="coverBasisInput" value="${escapeHtml(state.basis || 'Amounts in US Dollars ($)')}" aria-label="Report basis"><i>✎</i></label></div>
        </div>
        <div class="cover-confidential">CONFIDENTIAL — Prepared for management use only</div>
      </div>`;
  };

  document.addEventListener('change',function(e){
    if(e.target && e.target.id==='coverBasisInput'){
      state.basis=(e.target.value||'').trim()||'Amounts in US Dollars ($)';
      persist();
      renderReport();
    }
  });
})();