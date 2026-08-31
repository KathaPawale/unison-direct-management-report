/* YTD KPI fix — safe dashboard-only patch. Does not wrap workbook parsing. */
'use strict';
(function(){
  const asNum = v => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (v == null || v === '') return 0;
    let s = String(v).trim().replace(/[$,\s]/g,'');
    const neg = /^-/.test(s) || /^\(.*\)$/.test(s);
    s = s.replace(/[()]/g,'');
    const x = Number(s);
    return Number.isFinite(x) ? (neg ? -Math.abs(x) : x) : 0;
  };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const monthRe = /^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i;

  function findLine(sm, patterns){
    const lines = (sm && sm.lines) || [];
    for (let i=0;i<lines.length;i++) {
      const label = norm(lines[i].label);
      if (patterns.some(p => typeof p === 'string' ? label === norm(p) : p.test(label))) return lines[i];
    }
    return null;
  }
  function rowValue(sm, line, col){
    if (!sm || !line || col == null || !state || !state.sheets) return 0;
    const row = (state.sheets[sm.name] || [])[line.r] || [];
    return asNum(row[col]);
  }
  function monthCols(sm){
    return ((sm && sm.cols) || []).filter(c => c && c.idx > 0 && (c.type === 'month' || monthRe.test(String(c.label || '').trim())));
  }
  function totalCol(sm){
    const cols = (sm && sm.cols) || [];
    let c = cols.find(x => x && x.type === 'rowTotal');
    if (!c) c = cols.find(x => x && /(^|\s)(total|ytd|year to date|period total)(\s|$)/i.test(String(x.label || '')));
    return c ? c.idx : null;
  }
  function valueFor(sm, patterns, months){
    const line = findLine(sm, patterns);
    if (!line) return null;
    const tc = totalCol(sm);
    if (tc != null) {
      const v = rowValue(sm, line, tc);
      if (Number.isFinite(v)) return v;
    }
    if (months.length) return months.reduce((s,c)=>s + rowValue(sm,line,c.idx),0);
    return null;
  }

  function apply(md){
    if (!md || !md.roles || !md.sheetModels) return;
    const plName = md.roles.plMonthly || md.roles.pl || md.roles.plComparative;
    const sm = plName ? md.sheetModels[plName] : null;
    if (!sm) return;
    const months = monthCols(sm);
    if (!months.length) return;

    md.metrics = md.metrics || {};
    const income = valueFor(sm,['total for income','total income','total revenue',/total.*(income|revenue|sales)/i],months);
    const gross = valueFor(sm,['gross profit',/gross profit/i],months);
    const expenses = valueFor(sm,['total for expenses','total expenses','total operating expenses',/total.*expenses/i],months);
    const net = valueFor(sm,['net income','net profit',/net (income|profit)/i],months);
    if (income !== null) md.metrics.income = income;
    if (gross !== null) md.metrics.gross = gross;
    if (expenses !== null) md.metrics.expenses = expenses;
    if (net !== null) md.metrics.net = net;

    const revenueLine = findLine(sm,['total for income','total income','total revenue',/total.*(income|revenue|sales)/i]);
    const netLine = findLine(sm,['net income','net profit',/net (income|profit)/i]);
    const expenseLine = findLine(sm,['total for expenses','total expenses','total operating expenses',/total.*expenses/i]);
    md.months = months.map(c => ({label:c.label, short:c.short || String(c.label || '').slice(0,3), col:c.idx, year:c.year}));
    if (revenueLine) md.monthlyRevenue = months.map(c => rowValue(sm,revenueLine,c.idx));
    if (netLine) md.monthlyNet = months.map(c => rowValue(sm,netLine,c.idx));
    if (expenseLine) md.monthlyExpenses = months.map(c => rowValue(sm,expenseLine,c.idx));
  }

  if (typeof renderDashboard === 'function' && !window.__udmrSafeYtdDashboardFix) {
    window.__udmrSafeYtdDashboardFix = true;
    const baseRenderDashboard = renderDashboard;
    renderDashboard = function(){
      try { if (state && state.model) apply(state.model); } catch (e) { console.warn('YTD KPI patch skipped:', e); }
      return baseRenderDashboard.apply(this, arguments);
    };
  }
})();
