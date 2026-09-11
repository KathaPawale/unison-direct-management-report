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
  let model = null;
  if (hasData()){
    try { model = parseWorkbook(state.sheets); }
    catch (e){
      console.error('Workbook analysis failed:', e);
      toast('Some figures could not be read from this workbook: ' + (e.message || e));
    }
  }
  state.model = model;
  if (model){
    if (state.client === 'Client') state.client = model.client;
    if (state.period === 'For the period ended') state.period = model.period;
    if (!state.notesManual) state.notes = model.importedNotes || '';
  }
  render();
  persist();
}

function render(){
  for (const fn of [renderTopbar, renderDashboard, renderStatements, renderEditor, renderReport]){
    try { fn(); } catch (e){ console.error(fn.name + ' failed:', e); }
  }
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
  const clear = ids => ids.forEach(id => { const el = $('#' + id); if (el) el.innerHTML = ''; });
  if (!md){
    kg.innerHTML = ['Revenue / Income', 'Gross Profit', 'Net Income', 'Cash / Bank', 'A/R Total', 'A/P Total']
      .map(l => `<div class="kpi"><small>${l}</small><b>$0.00</b><span class="help">—</span></div>`).join('');
    $('#chartMonthly').innerHTML = '<div class="empty">Upload a workbook to see monthly performance.</div>';
    clear(['chartCyPy', 'chartExpenses', 'chartAging', 'chartBs', 'chartLiab', 'comparisonTable']);
    $('#monthlyTitle').textContent = 'Monthly Revenue vs Net Income';
    $('#attention').innerHTML = '<div class="empty">No major alerts detected</div>';
    return;
  }
  const m = md.metrics, p = md.prior;

  kg.innerHTML = kpiTiles().map(t =>
    `<div class="kpi"><small>${escapeHtml(t.label)}</small><b class="${t.value !== null && t.value < 0 ? 'neg' : ''}">${t.na || t.value === null ? '—' : money(t.value)}</b>` +
    `<span class="help">${t.sub || '—'}</span></div>`).join('');

  let compHtml = '';
  if (md.months.length){
    $('#monthlyTitle').textContent = 'Monthly Revenue vs Net Income';
    const labels = md.months.map(x => x.short);
    const revNet = [
      { name: 'Revenue / Income', color: CHART_COLORS.blue, values: md.monthlyRevenue },
      { name: 'Net Income', color: CHART_COLORS.red, values: md.monthlyNet }
    ];
    const margins = md.monthlyRevenue.map((r, i) => r ? (md.monthlyNet[i] || 0) / Math.abs(r) * 100 : null);
    const marginsOk = margins.filter(v => v !== null).length >= labels.length / 2 && margins.every(v => v === null || Math.abs(v) <= 300);
    $('#chartMonthly').innerHTML = chartLegend(revNet) + svgGroupedBars({ series: revNet, labels, height: 230 }) +
      (marginsOk ? '<div class="chart-sub">Net margin trend</div>' + svgLineTrend({ values: margins.map(v => v ?? 0), labels, height: 130 }) : '');
    const sum = a => a.reduce((x, y) => x + (y || 0), 0);
    compHtml += '<table><tr><th>Comparison</th>' + labels.map(l => `<th>${escapeHtml(l)}</th>`).join('') + '<th>Total</th></tr>' +
      [['Revenue', md.monthlyRevenue], ['Net Income', md.monthlyNet]].map(([name, series]) =>
        `<tr><td>${name}</td>` + series.map(v => `<td class="${(v || 0) < 0 ? 'neg' : ''}">${money(v || 0)}</td>`).join('') +
        `<td class="${sum(series) < 0 ? 'neg' : ''}"><b>${money(sum(series))}</b></td></tr>`).join('') + '</table>';
  } else if (md.periodSeries.length){
    const ps = md.periodSeries;
    $('#monthlyTitle').textContent = ps.length > 1 ? 'Revenue vs Net Income by Period' : 'Period Revenue vs Net Income';
    const series = [
      { name: 'Revenue / Income', color: CHART_COLORS.blue, values: ps.map(x => x.income) },
      { name: 'Total Expenses', color: CHART_COLORS.grey, values: ps.map(x => x.expenses) },
      { name: 'Net Income', color: CHART_COLORS.red, values: ps.map(x => x.net) }
    ];
    $('#chartMonthly').innerHTML = chartLegend(series) + svgGroupedBars({ series, labels: ps.map(x => x.label), height: 230 }) +
      '<div class="help">The uploaded Profit and Loss has no month columns, so figures are shown per period rather than per month.</div>';
  } else {
    $('#monthlyTitle').textContent = 'Monthly Revenue vs Net Income';
    $('#chartMonthly').innerHTML = '<div class="empty">No Profit and Loss period columns were found in the workbook.</div>';
  }
  $('#comparisonTable').innerHTML = (md.hasPrior ? '<div class="chart-sub compare-heading">Current Period vs Prior Year — Comparative Financials</div>' + comparisonTableHtml('dashboard-compare-table') : '') +
    (compHtml ? '<div class="chart-sub">Monthly detail</div>' + compHtml : '');

  if (md.hasPrior){
    const cyPy = [
      { name: md.currentLabel || 'Current period', color: CHART_COLORS.navy, values: [m.income, m.gross, m.expenses, m.net] },
      { name: md.priorLabel || 'Prior year', color: CHART_COLORS.grey, values: [p.income ?? 0, p.gross ?? 0, p.expenses ?? 0, p.net ?? 0] }
    ];
    $('#chartCyPy').innerHTML = '<h3>Current Period vs Prior Year</h3>' + chartLegend(cyPy) +
      svgGroupedBars({ series: cyPy, labels: ['Income', 'Gross', 'Expenses', 'Net'], height: 210 });
  } else $('#chartCyPy').innerHTML = '';

  const top = md.expenseGroups.slice(0, 10);
  $('#chartExpenses').innerHTML = top.length
    ? `<h3>Expense Breakdown — Top ${top.length} Categories</h3><div class="help">Expense ÷ Total Expenses (${money(md.expenseTotal)}) × 100</div>` +
      svgHBars({ items: top, color: CHART_COLORS.teal, width: 760 })
    : '';

  if (md.arAging || md.apAging){
    const buckets = (md.arAging || md.apAging).buckets.map(b => b.label);
    const series = [];
    if (md.arAging) series.push({ name: 'A/R', color: CHART_COLORS.blue, values: md.arAging.buckets.map(b => b.value) });
    if (md.apAging) series.push({ name: 'A/P', color: CHART_COLORS.amber, values: md.apAging.buckets.map(b => b.value) });
    $('#chartAging').innerHTML = '<h3>Receivables &amp; Payables Aging</h3>' + chartLegend(series) +
      svgGroupedBars({ series, labels: buckets, height: 200 });
  } else $('#chartAging').innerHTML = '';

  $('#chartBs').innerHTML = (md.bsComposition.assets.length || md.bsComposition.liabEquity.length)
    ? '<h3>Balance Sheet Composition</h3><div class="donut-row">' +
      (md.bsComposition.assets.length ? donutChart({ items: md.bsComposition.assets, title: 'Assets — ' + money(m.assets), size: 140 }) : '') +
      (md.bsComposition.liabEquity.length ? donutChart({ items: md.bsComposition.liabEquity, title: 'Liabilities & Equity — ' + money(m.totalLE ?? 0), size: 140 }) : '') + '</div>'
    : '';
  const lt = liabilitiesTableHtml('dashboard-compare-table');
  $('#chartLiab').innerHTML = lt ? '<h3>Liabilities Bifurcation</h3>' + lt : '';

  const alerts = [];
  if (m.net < 0) alerts.push(['High', `Net loss of ${money(Math.abs(m.net))} for the period. Review the expense breakdown and monthly trend.`]);
  if (md.roles.bs && m.totalLE !== null){
    const bal = m.assets - m.totalLE;
    if (Math.abs(bal) >= 0.01) alerts.push(['High', `Balance Sheet difference of ${money(bal)} between Assets and Liabilities + Equity.`]);
  }
  if (m.equity < 0) alerts.push(['Review', `Equity is negative: ${money(m.equity)}, which is ${pctText(m.totalLE ? m.equity / Math.abs(m.totalLE) * 100 : null)} of total liabilities & equity.`]);
  if (md.arAging){
    const over90 = md.arAging.buckets.find(b => /91|over|>|\+/.test(b.label));
    if (over90 && over90.value > 0 && md.arAging.total) alerts.push(['Review', `${pct(over90.value / md.arAging.total * 100)} of A/R (${money(over90.value)}) is aged over 90 days.`]);
  }
  if (md.apAging && md.apAging.total > 0) alerts.push(['Review', `Outstanding payables of ${money(md.apAging.total)} — verify payment schedule.`]);
  if (p.income !== null && p.income !== 0){
    const d = (m.income - p.income) / Math.abs(p.income) * 100;
    if (d < -20) alerts.push(['High', `Revenue is down ${Math.abs(d).toFixed(1)}% vs the prior-year period.`]);
  }
  if (!md.roles.bs) alerts.push(['Info', 'No Balance Sheet worksheet was detected in this workbook.']);
  if (!md.roles.plMonthly && !md.roles.plComparative && !md.roles.pl) alerts.push(['Info', 'No Profit and Loss worksheet was detected in this workbook.']);
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
  const head = (title, sm) => `<div class="stmt-heading"><div class="stmt-company">${escapeHtml(state.client)}</div>` +
    `<div class="stmt-title">${escapeHtml(title)}</div><div class="stmt-period">${escapeHtml(statementPeriodText(sm))} · Amounts in US Dollars ($)</div></div>`;
  const pl = get('plMonthly') || get('pl') || get('plComparative');
  $('#bsView').innerHTML = (get('bs') ? head('Balance Sheet', get('bs')) : '') + statementViewHtml(get('bs'));
  $('#plView').innerHTML = (pl ? head(pl.role === 'plMonthly' ? 'Profit and Loss — Monthly' : 'Profit and Loss', pl) : '') + statementViewHtml(pl);
  $('#plCompView').innerHTML = md && md.roles.plComparative && md.roles.plMonthly
    ? head('Profit and Loss — Comparative', get('plComparative')) + statementViewHtml(get('plComparative')) : '';
  const agingView = (role, ag, suppressed) => {
    if (suppressed) return '<div class="empty">Not applicable — cash-basis client with no balance in the Balance Sheet.</div>';
    if (ag && ag.fromDetail) return head(role === 'ar' ? 'A/R Aging Summary' : 'A/P Aging Summary', get(role)) + agingTableHtml(ag);
    return statementViewHtml(get(role));
  };
  $('#arView').innerHTML = agingView('ar', md && md.arAging, md && md.suppressAR);
  $('#apView').innerHTML = agingView('ap', md && md.apAging, md && md.suppressAP);
}

/* ---------- editor ---------- */

/* US accounting format with exactly two decimals: $1,234.50 / ($1,234.50) */
function editorAccountingValue(v){
  const n = parseAmount(v) ?? num(v);
  const abs = Math.abs(round2(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `($${abs})` : `$${abs}`;
}

function editorTableHtml(sheetName){
  const rows = state.sheets[sheetName] || [];
  const width = Math.min(Math.max(...rows.map(r => (r || []).length), 1), 40);
  const shown = rows.slice(0, 600);
  const sm = state.model && state.model.sheetModels[sheetName];
  const headerRow = sm ? sm.headerRow : -1;
  let html = '<div class="table-wrap"><table class="fin-table edit-table"><tbody>';
  shown.forEach((row, ri) => {
    const isTotal = (row || []).slice(0, 6).some(v => /^\s*total\b/i.test(String(v ?? '')));
    html += `<tr${isTotal ? ' class="row-total"' : ri === headerRow ? ' class="row-header"' : ''}>`;
    for (let ci = 0; ci < width; ci++){
      const v = (row || [])[ci] ?? '';
      const key = `${sheetName}:${ri}:${ci}`;
      const numeric = ci > 0 && ri !== headerRow && isNumericCell(v);
      const cls = [
        state.edited.has(key) ? 'edited' : '',
        state.adjusted.has(key) ? 'adjusted' : '',
        numeric && num(v) < 0 ? 'neg' : '',
        numeric ? 'num' : ''
      ].filter(Boolean).join(' ');
      const display = numeric ? editorAccountingValue(v) : v;
      html += `<td class="${cls}"><input data-r="${ri}" data-c="${ci}" value="${escapeAttr(display)}"></td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  if (rows.length > 600) html += `<div class="help">Showing first 600 of ${rows.length} rows.</div>`;
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
  $('#groqModelSelect').value = state.settings.groqModel;
  $('#aiEnabledToggle').checked = !!state.settings.aiEnabled;
  const wm = $('#watermarkSetting'); if (wm) wm.value = state.settings.watermark || '';
}

function wireSettings(){
  $('#groqKeySave').onclick = () => {
    state.settings.groqModel = $('#groqModelSelect').value;
    state.settings.aiEnabled = $('#aiEnabledToggle').checked;
    const wm = $('#watermarkSetting'); if (wm) state.settings.watermark = wm.value.trim();
    saveSettings();
    renderReport();
    toast('Settings saved');
  };
  $('#groqTest').onclick = async () => {
    const status = $('#groqTestStatus');
    state.settings.groqModel = $('#groqModelSelect').value;
    saveSettings();
    status.textContent = 'Testing…'; status.className = 'test-status';
    try {
      await testGroqConnection();
      status.textContent = '✓ Connected — model responded'; status.className = 'test-status ok';
    } catch (e) {
      status.textContent = '✗ ' + (e.message === 'NO_KEY' ? 'Groq key is not configured on the server' : e.message);
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
    state.notesManual = true;
    persist();
    renderReport();
    toast('Notes updated');
  };

  const basisSel = $('#basisSelect');
  if (basisSel) basisSel.onchange = () => { state.basisOverride = basisSel.value; persist(); renderReport(); toast('Report basis updated'); };
  const wmInput = $('#watermarkInput');
  if (wmInput) wmInput.onchange = () => {
    state.settings.watermark = wmInput.value.trim();
    saveSettings(); renderSettings(); renderReport();
    toast(state.settings.watermark ? 'Watermark updated' : 'Watermark removed');
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
