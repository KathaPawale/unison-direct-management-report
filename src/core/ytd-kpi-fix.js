/* YTD KPI fix — use Total/YTD column for dashboard metrics, months for charts. */
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

  const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function findLine(sm, patterns){
    if (!sm) return null;
    const lines = sm.lines || [];
    for (let i=0;i<lines.length;i++) {
      const label = norm(lines[i].label);
      if (patterns.some(p => typeof p === 'string' ? label === norm(p) : p.test(label))) return lines[i];
    }
    return null;
  }

  function totalColumn(sm){
    if (!sm) return null;
    const cols = sm.cols || [];
    let c = cols.find(x => x.type === 'rowTotal');
    if (c) return c.idx;
    c = cols.find(x => /(^|\s)(total|ytd|year to date|period total)(\s|$)/i.test(String(x.label||'')));
    if (c) return c.idx;
    return null;
  }

  function monthColumns(sm){
    if (!sm) return [];
    return (sm.cols || []).filter(c => c.type === 'month' || /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)(uary|ruary|ch|il|e|y|ust|ember|ober|ember|ember)?\b/i.test(String(c.label||'').trim()));
  }

  function rowCell(sm, line, col){
    if (!sm || !line || col == null) return 0;
    const row = (state.sheets?.[sm.name] || [])[line.r] || [];
    return asNum(row[col]);
  }

  function metricFromTotalOrMonths(sm, patterns){
    const line = findLine(sm, patterns);
    if (!line) return 0;
    const tc = totalColumn(sm);
    if (tc != null) {
      const v = rowCell(sm, line, tc);
      if (Math.abs(v) > 0.000001) return v;
    }
    const months = monthColumns(sm);
    if (months.length) return months.reduce((sum,c)=>sum+rowCell(sm,line,c.idx),0);
    return 0;
  }

  function applyYtd(md){
    if (!md) return md;
    const plName = md.roles?.plMonthly || md.roles?.plComparative || md.roles?.pl;
    const sm = plName ? md.sheetModels?.[plName] : null;
    if (!sm) return md;

    const months = monthColumns(sm);
    if (!months.length) return md;

    const metrics = md.metrics || (md.metrics = {});
    metrics.income = metricFromTotalOrMonths(sm,[
      'total for income','total income','total revenue',/total.*(income|revenue|sales)/i
    ]);
    metrics.gross = metricFromTotalOrMonths(sm,['gross profit',/gross profit/i]);
    metrics.expenses = metricFromTotalOrMonths(sm,[
      'total for expenses','total expenses','total operating expenses',/total.*expenses/i
    ]);
    metrics.net = metricFromTotalOrMonths(sm,['net income','net profit',/net (income|profit)/i]);

    // Keep monthly charts monthly. Never replace dashboard KPI totals with January.
    md.months = months.map(c=>({label:c.label,short:c.short || String(c.label||'').slice(0,3),col:c.idx,year:c.year}));
    const revenueLine = findLine(sm,['total for income','total income','total revenue',/total.*(income|revenue|sales)/i]);
    const netLine = findLine(sm,['net income','net profit',/net (income|profit)/i]);
    const expenseLine = findLine(sm,['total for expenses','total expenses','total operating expenses',/total.*expenses/i]);
    md.monthlyRevenue = months.map(c=>rowCell(sm,revenueLine,c.idx));
    md.monthlyNet = months.map(c=>rowCell(sm,netLine,c.idx));
    md.monthlyExpenses = months.map(c=>rowCell(sm,expenseLine,c.idx));

    return md;
  }

  if (typeof parseWorkbook === 'function' && !window.__udmrYtdKpiFix) {
    window.__udmrYtdKpiFix = true;
    const base = parseWorkbook;
    parseWorkbook = function(sheets){ return applyYtd(base(sheets)); };
  }

  if (typeof recomputeModel === 'function' && !window.__udmrYtdKpiRecomputeFix) {
    window.__udmrYtdKpiRecomputeFix = true;
    const baseRecompute = recomputeModel;
    recomputeModel = function(){
      const out = baseRecompute.apply(this, arguments);
      if (state?.model) applyYtd(state.model);
      return out;
    };
  }
})();
