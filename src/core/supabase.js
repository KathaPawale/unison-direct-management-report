/* Supabase persistence for Unison Direct Management Reporting */
'use strict';

const dbState = { config: null, reportId: null, ready: false };

async function initSupabase(){
  try {
    const r = await fetch('/api/config', { cache: 'no-store' });
    const c = await r.json();
    if (!r.ok || !c.ok) throw new Error(c.error || 'Supabase configuration unavailable');
    dbState.config = c;
    dbState.ready = true;
    return true;
  } catch (e) {
    console.warn('Supabase disabled:', e);
    dbState.ready = false;
    return false;
  }
}

async function sbRequest(table, { method = 'GET', body = null, query = '', prefer = '' } = {}){
  if (!dbState.ready) await initSupabase();
  if (!dbState.ready) throw new Error('Supabase is not configured');
  const url = dbState.config.url.replace(/\/$/, '') + '/rest/v1/' + table + (query ? '?' + query : '');
  const headers = {
    apikey: dbState.config.publishableKey,
    Authorization: 'Bearer ' + dbState.config.publishableKey,
    'Content-Type': 'application/json'
  };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(url, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error(`${table}: ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

function metricRows(reportId){
  const md = state.model;
  if (!md) return [];
  const m = md.metrics || {};
  const rows = [
    ['revenue','Revenue / Income',m.income],
    ['gross_profit','Gross Profit',m.gross],
    ['net_income','Net Income',m.net],
    ['cash_bank','Cash / Bank',m.bank],
    ['accounts_receivable','A/R Total',m.ar],
    ['accounts_payable','A/P Total',m.ap],
    ['expenses','Total Expenses',m.expenses],
    ['assets','Total Assets',m.assets],
    ['liabilities','Total Liabilities',m.liabilities],
    ['equity','Total Equity',m.equity]
  ];
  return rows.filter(x => x[2] !== undefined && x[2] !== null).map(x => ({
    report_id: reportId, metric_key: x[0], metric_label: x[1], period_key: state.period || 'Current', amount: Number(x[2]) || 0
  }));
}

async function saveReportToSupabase(){
  if (!hasData()) return null;
  if (!dbState.ready) await initSupabase();
  if (!dbState.ready) throw new Error('Supabase connection is unavailable');

  const created = await sbRequest('reports', {
    method: 'POST',
    body: { client_name: state.client || 'Client', source_filename: state.fileName || '', period_label: state.period || '', status: 'processed', notes: state.notes || '' },
    prefer: 'return=representation'
  });
  if (!created || !created[0] || !created[0].id) throw new Error('Report was not created');
  dbState.reportId = created[0].id;

  const worksheetRows = Object.entries(state.sheets).map(([name, rows]) => ({
    report_id: dbState.reportId, sheet_name: name, row_count: rows.length, data: rows
  }));
  if (worksheetRows.length) await sbRequest('worksheets', { method: 'POST', body: worksheetRows });

  const metrics = metricRows(dbState.reportId);
  if (metrics.length) await sbRequest('financial_metrics', { method: 'POST', body: metrics });
  return dbState.reportId;
}

async function updateReportNotes(){
  if (!dbState.reportId || !dbState.ready) return;
  await sbRequest('reports', { method: 'PATCH', query: 'id=eq.' + encodeURIComponent(dbState.reportId), body: { notes: state.notes || '' } });
}

async function logManualEdit(sheetName, rowIndex, columnIndex, oldValue, newValue){
  if (!dbState.reportId || !dbState.ready) return;
  try {
    await sbRequest('manual_edits', { method: 'POST', body: {
      report_id: dbState.reportId, sheet_name: sheetName, row_index: rowIndex, column_index: columnIndex,
      old_value: String(oldValue ?? ''), new_value: String(newValue ?? '')
    }});
  } catch (e) { console.warn('Could not log manual edit:', e); }
}

async function logReportExport(exportType, fileName){
  if (!dbState.reportId || !dbState.ready) return;
  try {
    await sbRequest('report_exports', { method: 'POST', body: { report_id: dbState.reportId, export_type: exportType, file_name: fileName || '' } });
  } catch (e) { console.warn('Could not log report export:', e); }
}
