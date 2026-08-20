/* Unison Direct Management Reporting — application shell
 * Navigation, upload flow, live dashboard, statement views, editor with the
 * impact-analysis modal, settings, boot. */
'use strict';

/* ---------- navigation ---------- */

window.goPage = function(id){
  $$('.page').forEach(p => p.classList.toggle('active', p.id === id));
  $$('.nav button').forEach(b => b.classList.toggle('active', b.dataset.page === id));
  const btn = $(`.nav button[data-page="${id}"]`);
  if (btn) $('#pageTitle').textContent = btn.textContent.trim();
  if (id === 'report') renderReport();
  if (window.innerWidth <= 800) $('#sidebar').classList.remove('open');
};

/* ---------- analysis + render fan-out ---------- */

function analyze(){
  state.model = hasData() ? parseWorkbook(state.sheets) : null;
  if (state.model){
    if (state.client === 'Client') state.client = state.model.client;
    if (state.period === 'For the period ended') state.period = state.model.period;
  }
  render();
  persist();
}

function render(){
  renderTopbar();
  renderDashboard();
  renderStatements();
  renderEditor();
  renderReport();
}

function renderTopbar(){
  $('#clientLine').textContent = hasData()
    ? `${state.client} · ${state.period}`
    : 'Upload a client workbook to begin';
  $('#loadedStatus').textContent = hasData()
    ? `${Object.keys(state.sheets).length} sheets processed`
    : 'No workbook processed';
  $('#loadedStatus').classList.toggle('ok', hasData());
}

/* ---------- dashboard ---------- */

function renderDashboard(){
  const md = state.model;
  const kg = $('#kpiGrid');
  if (!md){
    kg.innerHTML = ['Revenue / Income', 'Gross Profit', 'Net Income', 'Cash / Bank', 'A/R Total', 'A/P Total']
      .map(l => `<div class="kpi"><small>${l}</small><b>$0.00</b><span class="help">—</span></div>`).join('');
    $('#chartMonthly').innerHTML = '<div class="empty">Upload a workbook to see monthly performance.</div>';
    $('#chartCyPy').innerHTML = '';
    $('#chartExpenses').innerHTML = '';
    $('#chartAging').innerHTML = '';
    $('#chartBs').innerHTML = '';
    $('#comparisonTable').innerHTML = '';
    $('#attention').innerHTML = '<div class="empty">No major alerts detected</div>';
    return;
  }
  const m = md.metrics, p = md.prior;
  const grossMargin = m.income ? m.gross / m.income * 100 : 0;
  const netMargin = m.income ? m.net / m.income * 100 : 0;
  const chip = (cur, pri) => {
    if (pri === null || pri === undefined || pri === 0) return '—';
    const d = (cur - pri) / Math.abs(pri) * 100;
    return `<span class="${d >= 0 ? 'good' : 'bad'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}% vs PY (${money(pri)})</span>`;
  };
  const kpis = [
    ['Revenue / Income', m.income, chip(m.income, p.income)],
    ['Gross Profit', m.gross, pct(grossMargin) + ' gross margin'],
    ['Net Income', m.net, (m.net < 0 ? 'Net loss · ' : '') + chip(m.net, p.net)],
    ['Cash / Bank', m.bank, chip(m.bank, p.bank)],
    ['A/R Total', m.ar, chip(m.ar, p.ar)],
    ['A/P Total', m.ap, chip(m.ap, p.ap)]
  ];
  kg.innerHTML = kpis.map(([l, v, sub]) =>
    `<div class="kpi"><small>${l}</small><b class="${v < 0 ? 'neg' : ''}">${money(v)}</b><span class="help">${sub}</span></div>`).join('');

  const labels = md.months.length ? md.months.map(x => x.short)
    : MONTHS_FALLBACK.slice(0, Math.max(md.monthlyRevenue.length, 6));
  const revNet = [
    { name: 'Revenue / Income', color: CHART_COLORS.blue, values: md.monthlyRevenue },
    { name: 'Net Income', color: CHART_COLORS.red, values: md.monthlyNet }
  ];
  const margins = md.monthlyRevenue.map((r, i) => r ? (md.monthlyNet[i] || 0) / Math.abs(r) * 100 : null);
  const marginsOk = margins.filter(v => v !== null).length >= labels.length / 2 &&
    margins.every(v => v === null || Math.abs(v) <= 300);
  $('#chartMonthly').innerHTML = chartLegend(revNet) +
    svgGroupedBars({ series: revNet, labels, height: 230 }) +
    (marginsOk
      ? '<div class="chart-sub">Net margin trend</div>' +
        svgLineTrend({ values: margins.map(v => v ?? 0), labels, height: 130 })
      : '');

  if (p.income !== null){
    const cyPy = [
      { name: 'Current period', color: CHART_COLORS.navy, values: [m.income, m.gross, m.expenses, m.net] },
      { name: 'Prior year', color: CHART_COLORS.grey, values: [p.income ?? 0, p.gross ?? 0, p.expenses ?? 0, p.net ?? 0] }
    ];
    $('#chartCyPy').innerHTML = '<h3>Current Period vs Prior Year</h3>' + chartLegend(cyPy) +
      svgGroupedBars({ series: cyPy, labels: ['Income', 'Gross', 'Expenses', 'Net'], height: 210 });
  } else $('#chartCyPy').innerHTML = '';

  $('#chartExpenses').innerHTML = md.expenseGroups.length
    ? '<h3>Expense Breakdown — Top ' + Math.min(md.expenseGroups.length, 8) + '</h3>' +
      svgHBars({ items: md.expenseGroups.slice(0, 8), totalForPct: m.expenses || null, color: CHART_COLORS.teal, width: 720 })
    : '';

  if (md.arAging || md.apAging){
    const buckets = (md.arAging || md.apAging).buckets.map(b => b.label);
    const series = [];
    if (md.arAging) series.push({ name: 'A/R', color: CHART_COLORS.blue, values: md.arAging.buckets.map(b => b.value) });
    if (md.apAging) series.push({ name: 'A/P', color: CHART_COLORS.amber, values: md.apAging.buckets.map(b => b.value) });
    $('#chartAging').innerHTML = '<h3>Receivables & Payables Aging</h3>' + chartLegend(series) +
      svgGroupedBars({ series, labels: buckets, height: 200 });
  } else $('#chartAging').innerHTML = '';

  $('#chartBs').innerHTML = md.bsComposition.assets.length
    ? '<h3>Balance Sheet Composition</h3><div class="donut-row">' +
      donutChart({ items: md.bsComposition.assets, title: 'Assets', size: 140 }) +
      donutChart({ items: md.bsComposition.liabEquity, title: 'Liabilities & Equity', size: 140 }) + '</div>'
    : '';

  const compRows = [['Revenue', md.monthlyRevenue], ['Net Income', md.monthlyNet]];
  $('#comparisonTable').innerHTML =
    '<table><tr><th>Comparison</th>' + labels.map(l => `<th>${l}</th>`).join('') + '<th>YTD</th></tr>' +
    compRows.map(([name, series]) =>
      `<tr><td>${name}</td>` + labels.map((_, i) =>
        `<td class="${(series[i] || 0) < 0 ? 'neg' : ''}">${money(series[i] || 0)}</td>`).join('') +
      `<td class="${series.reduce((a, b) => a + (b || 0), 0) < 0 ? 'neg' : ''}"><b>${money(series.reduce((a, b) => a + (b || 0), 0))}</b></td></tr>`).join('') +
    '</table>';

  const alerts = [];
  if (m.net < 0) alerts.push(['High', `Net loss of ${money(Math.abs(m.net))} for the period. Review the expense breakdown and monthly trend.`]);
  const bal = m.assets - (m.liabilities + m.equity);
  if (md.roles.bs && Math.abs(bal) >= 0.01) alerts.push(['High', `Balance Sheet difference of ${money(bal)} between Assets and Liabilities + Equity.`]);
  if (md.arAging){
    const over90 = md.arAging.buckets.find(b => /91/.test(b.label));
    if (over90 && over90.value > 0 && md.arAging.total) alerts.push(['Review', `${pct(over90.value / md.arAging.total * 100)} of A/R (${money(over90.value)}) is aged over 90 days.`]);
  }
  if (md.apAging && md.apAging.total > 0) alerts.push(['Review', `Outstanding payables of ${money(md.apAging.total)} — verify payment schedule.`]);
  if (p.income !== null && p.income !== 0){
    const d = (m.income - p.income) / Math.abs(p.income) * 100;
    if (d < -20) alerts.push(['High', `Revenue is down ${Math.abs(d).toFixed(1)}% vs the prior-year period.`]);
  }
  if (state.edited.size || state.adjusted.size) alerts.push(['Info', `${state.edited.size} manual edit(s) and ${state.adjusted.size} automatic adjustment(s) are reflected in this report (highlighted in the preview, not in downloads).`]);
  $('#attention').innerHTML = alerts.length
    ? alerts.map(([sev, msg]) => `<div class="alert"><span class="sev ${sev.toLowerCase()}">${sev}</span><p>${msg}</p></div>`).join('')
    : '<div class="empty">No major alerts detected</div>';
}

/* ---------- statement views (read-only) ---------- */

function statementViewHtml(sm){
  if (!sm) return '<div class="empty">No matching worksheet was included in the uploaded workbook.</div>';
  const { theadHtml, rows } = reportTableParts(sm, { forExport: false });
  return `<div class="table-wrap"><table class="fin-table stmt-table"><thead>${theadHtml}</thead><tbody>` + rows.map(r => r.html).join('') + '</tbody></table></div>';
}

function renderStatements(){
  const md = state.model;
  const get = role => md && md.roles[role] ? md.sheetModels[md.roles[role]] : null;
  $('#plView').innerHTML = statementViewHtml(get('plMonthly') || get('pl') || get('plComparative'));
  $('#plCompView').innerHTML = md && md.roles.plComparative && md.roles.plMonthly
    ? '<h3>Profit and Loss — Comparative <span class="heading-amount">($)</span></h3>' + statementViewHtml(get('plComparative')) : '';
  $('#bsView').innerHTML = statementViewHtml(get('bs'));
  $('#arView').innerHTML = statementViewHtml(get('ar'));
  $('#apView').innerHTML = statementViewHtml(get('ap'));
}

/* ---------- editor ---------- */

function editorAccountingValue(v){
  const n = num(v);
  const abs = Math.abs(round2(n)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return n < 0 ? `(${abs})` : abs;
}

function editorTableHtml(sheetName){
  const rows = state.sheets[sheetName] || [];
  const width = Math.min(Math.max(...rows.map(r => (r || []).length), 1), 16);
  const shown = rows.slice(0, 400);
  let html = '<div class="table-wrap"><table class="fin-table edit-table"><tbody>';
  shown.forEach((row, ri) => {
    const isTotal = /\btotal\b/i.test(String((row || [])[0] ?? ''));
    html += `<tr${isTotal ? ' class="row-total"' : ''}>`;
    for (let ci = 0; ci < width; ci++){
      const v = (row || [])[ci] ?? '';
      const key = `${sheetName}:${ri}:${ci}`;
      const numeric = ci > 0 && isNumericCell(v);
      const cls = [
        state.edited.has(key) ? 'edited' : '',
        state.adjusted.has(key) ? 'adjusted' : '',
        numeric && num(v) < 0 ? 'neg' : ''
      ].filter(Boolean).join(' ');
      const display = numeric ? editorAccountingValue(v) : v;
      html += `<td class="${cls}"><input data-r="${ri}" data-c="${ci}" value="${escapeAttr(display)}"></td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  if (rows.length > 400) html += `<div class="help">Showing first 400 of ${rows.length} rows.</div>`;
  return html;
}

function renderEditor(){
  const tabs = $('#sheetTabs'), tableBox = $('#editorTable');
  const names = Object.keys(state.sheets);
  if (!names.length){
    tabs.innerHTML = '';
    tableBox.innerHTML = '<div class="empty">Upload a workbook to review and edit the imported data.</div>';
    return;
  }
  if (!state.active || !state.sheets[state.active]) state.active = names[0];
  tabs.innerHTML = names.map(n => `<button data-s="${escapeAttr(n)}" class="${n === state.active ? 'active' : ''}">${escapeHtml(n)}</button>`).join('');
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => { state.active = b.dataset.s; renderEditor(); });
  tableBox.innerHTML = editorTableHtml(state.active);
  tableBox.querySelectorAll('input').forEach(inp => {
    inp.dataset.old = inp.value;
    inp.onchange = () => onCellEdit(inp);
  });
  const ne = $('#notesEditor');
  if (ne && document.activeElement !== ne) ne.value = state.notes;
}

/* ---------- impact modal flow ---------- */

let _pendingEdit = null;

function onCellEdit(inp){
  const r = +inp.dataset.r, c = +inp.dataset.c;
  const sheet = state.active;
  const oldVal = inp.dataset.old ?? '';
  const newVal = inp.value;
  if (String(oldVal) === String(newVal)) return;

  if (!isNumericCell(newVal) && !isNumericCell(oldVal)){
    state.sheets[sheet][r][c] = newVal;
    state.edited.add(`${sheet}:${r}:${c}`);
    analyze();
    toast('Cell updated');
    return;
  }

  const impact = computeImpact(sheet, r, c, num(oldVal), num(newVal));
  _pendingEdit = { sheet, r, c, oldVal, newVal, impact };
  openImpactModal(_pendingEdit);
}

function _fmtCell(v){ return money(v); }

function openImpactModal(pe){
  const { sheet, r, c, oldVal, newVal, impact } = pe;
  const md = state.model;
  const sm = md.sheetModels[sheet];
  const line = sm.lines.find(l => l.r === r);
  const label = line ? line.label : String((state.sheets[sheet][r] || [])[0] ?? '').trim() || `Row ${r + 1}`;
  const colLabel = (sm.cols.find(x => x.idx === c) || {}).label || '';

  $('#imTitle').innerHTML = `Edit impact — <b>${escapeHtml(label)}</b>` + `<span class="im-context">${escapeHtml(sheet)}${colLabel ? ' · ' + escapeHtml(colLabel) : ''}</span>`;
  $('#imChange').innerHTML = `<span class="im-old">${_fmtCell(num(oldVal))}</span><span class="im-arrow">→</span>` + `<span class="im-new">${_fmtCell(num(newVal))}</span>`;

  let body = '';
  if (impact.blocked){
    body += `<div class="im-blocked">${escapeHtml(impact.blockReason)}</div>`;
  } else if (impact.steps.length){
    body += `<div class="im-section">Automatic adjustments (${impact.steps.length})</div>` +
      '<div class="im-steps-wrap"><table class="im-steps"><tr><th>Worksheet</th><th>Line</th><th>Column</th><th>Before</th><th>After</th></tr>' +
      impact.steps.map(st => `<tr><td>${escapeHtml(st.sheet)}</td><td>${escapeHtml(st.label)}</td><td>${escapeHtml(st.colLabel || '')}</td><td class="num">${_fmtCell(st.before)}</td><td class="num im-after">${_fmtCell(st.after)}</td></tr>`).join('') + '</table></div>';
  } else {
    body += '<div class="im-section">No dependent totals detected — only this cell will change.</div>';
  }
  if (impact.balance){
    const b = impact.balance;
    body += `<div class="im-balance ${b.balanced ? 'ok' : 'warn'}">Balance check: Assets ${money(b.assets)} vs Liabilities + Equity ${money(b.liabEquity)} — ` + (b.balanced ? 'balanced ✓' : `difference ${money(b.diff)}, review required`) + '</div>';
  }
  if (impact.advisories.length) body += '<div class="im-advisories">' + impact.advisories.map(a => `<div>• ${escapeHtml(a)}</div>`).join('') + '</div>';
  $('#imBody').innerHTML = body;

  $('#imConfirm').style.display = impact.blocked ? 'none' : '';
  $('#imConfirm').textContent = impact.steps.length ? `Confirm & adjust ${impact.steps.length} value(s)` : 'Confirm edit';
  $('#imEditOnly').textContent = impact.blocked ? 'Apply as manual override' : 'Apply edit only';

  const ai = $('#imAI');
  if (!state.settings.aiEnabled){
    ai.innerHTML = '';
  } else if (!state.settings.groqKey){
    ai.innerHTML = '<div class="im-ai-off">AI analysis unavailable — deterministic impact shown above. Add a Groq API key in Settings to enable plain-English explanations.</div>';
  } else if (impact.blocked){
    ai.innerHTML = '';
  } else {
    ai.innerHTML = '<div class="im-ai-loading">⏳ Asking AI for a plain-English impact summary…</div>';
    explainImpact({ sheetName: sheet, label, colLabel, oldVal: num(oldVal), newVal: num(newVal), steps: impact.steps, advisories: impact.advisories, balance: impact.balance })
      .then(res => {
        if (_pendingEdit !== pe) return;
        ai.innerHTML = '<div class="im-ai"><div class="im-ai-title">AI impact analysis</div>' + `<p>${escapeHtml(res.explanation)}</p>` + (res.cautions.length ? '<ul>' + res.cautions.map(x => `<li>${escapeHtml(x)}</li>`).join('') + '</ul>' : '') + '</div>';
      })
      .catch(err => {
        if (_pendingEdit !== pe) return;
        const msg = err.message === 'NO_KEY' ? 'no API key configured' : err.name === 'AbortError' ? 'request timed out' : err.message;
        ai.innerHTML = `<div class="im-ai-off">AI analysis unavailable (${escapeHtml(msg)}) — deterministic impact shown above.</div>`;
      });
  }

  $('#impactModal').classList.remove('hidden');
}

function closeImpactModal(revert){
  $('#impactModal').classList.add('hidden');
  if (revert && _pendingEdit){
    const inp = $(`#editorTable input[data-r="${_pendingEdit.r}"][data-c="${_pendingEdit.c}"]`);
    if (inp) inp.value = _pendingEdit.oldVal;
  }
  _pendingEdit = null;
}

function confirmImpact(withCascade){
  if (!_pendingEdit) return;
  const { sheet, r, c, newVal, impact } = _pendingEdit;
  const rows = state.sheets[sheet];
  while (rows.length <= r) rows.push([]);
  rows[r][c] = isNumericCell(newVal) ? round2(num(newVal)) : newVal;
  state.edited.add(`${sheet}:${r}:${c}`);
  if (withCascade && !impact.blocked) applyImpact(impact.steps);
  _pendingEdit = null;
  $('#impactModal').classList.add('hidden');
  analyze();
  toast(withCascade && impact.steps.length ? `Edit applied with ${impact.steps.length} automatic adjustment(s)` : 'Edit applied');
}

/* ---------- settings ---------- */

function renderSettings(){
  $('#groqKeyInput').value = state.settings.groqKey;
  $('#groqModelSelect').value = state.settings.groqModel;
  $('#aiEnabledToggle').checked = !!state.settings.aiEnabled;
}

function wireSettings(){
  $('#groqKeySave').onclick = () => {
    state.settings.groqKey = $('#groqKeyInput').value.trim();
    state.settings.groqModel = $('#groqModelSelect').value;
    state.settings.aiEnabled = $('#aiEnabledToggle').checked;
    saveSettings();
    toast('Settings saved');
  };
  $('#groqKeyShow').onclick = () => {
    const i = $('#groqKeyInput');
    i.type = i.type === 'password' ? 'text' : 'password';
    $('#groqKeyShow').textContent = i.type === 'password' ? 'Show' : 'Hide';
  };
  $('#groqTest').onclick = async () => {
    const status = $('#groqTestStatus');
    state.settings.groqKey = $('#groqKeyInput').value.trim();
    state.settings.groqModel = $('#groqModelSelect').value;
    saveSettings();
    status.textContent = 'Testing…'; status.className = 'test-status';
    try {
      await testGroqConnection();
      status.textContent = '✓ Connected — model responded'; status.className = 'test-status ok';
    } catch (e) {
      status.textContent = '✗ ' + (e.message === 'NO_KEY' ? 'Enter an API key first' : e.message);
      status.className = 'test-status err';
    }
  };
  $('#clearSessionBtn').onclick = () => {
    resetState();
    analyze();
    $('#fileName').textContent = 'No new file selected';
    $$('.step').forEach(s => s.classList.remove('done'));
    toast('Saved session cleared');
  };
}

/* ---------- upload / reset ---------- */

function wireUpload(){
  $('#fileInput').onchange = () => {
    const f = $('#fileInput').files[0];
    $('#fileName').textContent = f ? f.name : 'No new file selected';
  };
  $('#processBtn').onclick = async () => {
    const f = $('#fileInput').files[0];
    if (!f){ toast('Choose an XLSX or CSV file first.'); return; }
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      resetState();
      state.fileName = f.name;
      wb.SheetNames.forEach(n => {
        state.sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' });
      });
      ['s1', 's2', 's3'].forEach(id => $('#' + id).classList.add('done'));
      analyze();
      goPage('dashboard');
      toast(`Processed ${wb.SheetNames.length} worksheet(s) from ${f.name}`);
    } catch (e) {
      console.error(e);
      toast('Could not read the workbook: ' + (e.message || e));
    }
  };
  $('#resetData').onclick = () => {
    resetState();
    $('#fileName').textContent = 'No new file selected';
    $$('.step').forEach(s => s.classList.remove('done'));
    analyze();
    toast('Data cleared');
  };
  $('#addRow').onclick = () => {
    if (!state.active) return;
    const rows = state.sheets[state.active];
    const width = Math.max(...rows.map(r => (r || []).length), 1);
    rows.push(Array(width).fill(''));
    renderEditor();
    const inputs = $('#editorTable').querySelectorAll('tr:last-child input');
    if (inputs.length) inputs[0].focus();
  };
}

/* ---------- signatory ---------- */

function wireSignatory(){
  const apply = () => {
    state.signatory = {
      name: $('#sigName').value.trim(),
      title: $('#sigTitle').value.trim(),
      date: $('#sigDate').value.trim()
    };
    persist();
    renderReport();
    toast('Signatory updated');
  };
  $('#sigApply').onclick = apply;
}

function renderSignatoryForm(){
  $('#sigName').value = state.signatory.name;
  $('#sigTitle').value = state.signatory.title;
  $('#sigDate').value = state.signatory.date;
}

/* ---------- boot ---------- */

function wireGlobal(){
  $$('.nav button').forEach(b => b.onclick = () => goPage(b.dataset.page));
  $('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');

  $('#downloadPdfTop').onclick = () => savePdf(false);
  $('#downloadPdf').onclick = () => savePdf(false);
  $('#openPdf').onclick = () => savePdf(true);
  $('#downloadExcelTop').onclick = downloadReportExcel;
  $('#downloadExcelReport').onclick = downloadReportExcel;
  $('#downloadDataExcel').onclick = downloadDataExcel;
  $('#downloadCsv').onclick = downloadCurrentSheetCsv;

  $('#applyNotes').onclick = () => {
    state.notes = $('#notesEditor').value;
    persist();
    renderReport();
    toast('Notes updated');
  };

  $('#imConfirm').onclick = () => confirmImpact(true);
  $('#imEditOnly').onclick = () => confirmImpact(false);
  $('#imCancel').onclick = () => closeImpactModal(true);
  $('#impactModal').addEventListener('click', e => {
    if (e.target === $('#impactModal')) closeImpactModal(true);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#impactModal').classList.contains('hidden')) closeImpactModal(true);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  wireGlobal();
  wireUpload();
  wireSettings();
  wireSignatory();
  renderSettings();
  const restored = restoreSession();
  if (restored){
    ['s1', 's2', 's3'].forEach(id => $('#' + id).classList.add('done'));
    toast('Previous session restored');
  }
  analyze();
  renderSignatoryForm();
});
