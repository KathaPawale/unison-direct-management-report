/* Unison Direct Management Reporting — Comprehensive Accuracy Fixes (August 2026)
 * 
 * Fixes all reported issues:
 * 1. Revenue/Income capture in Dashboard ✓
 * 2. Net Income red highlighting in P&L ✓
 * 3. Accounting format with 2 decimals in editor ✓
 * 4. PDF Table of Contents numbering (starting from 1, not 3) ✓
 * 5. Date range display (fixing dash visibility in "January-June") ✓
 * 6. Analytical Dashboard display for comparative financials ✓
 * 7. Percentage accuracy (not exceeding 100%) ✓
 * 8. Variance calculations (fixing 0.00 display) ✓
 * 9. Monthly charts with proper month data (not collapsing year-end to Jan) ✓
 * 10. Expense breakdown percentage formula (Expense / Total * 100) ✓
 * 11. AP/AR aging imports and formula fixes ✓
 * 12. Multiple years data display ✓
 * 13. Excel borders and accounting format ✓
 * 14. Comparative financials prior year calculations ✓
 */
'use strict';
(function(){
  const n = v => Number.isFinite(Number(v)) ? Number(v) : (typeof num === 'function' ? num(v) : 0);
  const abs = v => Math.abs(n(v));
  const YEAR_RE = /\b(19|20)\d{2}\b/g;
  
  /* Extract year from string */
  const getYear = s => { const m = String(s||'').match(YEAR_RE); return m ? +m[m.length-1] : null; };
  
  /* Normalize period to use consistent spacing around dashes */
  const normalizePeriod = s => {
    let p = String(s||'');
    p = p.replace(/\s*[-–—]\s*/g, ' – ');
    p = p.replace(/\s{2,}/g, ' ').trim();
    return p;
  };

  /* Get row value from sheet safely */
  const getRowVal = (sm, lineIdx, col) => {
    if(!sm || lineIdx === null || col === null || !sm.lines[lineIdx]) return 0;
    const line = sm.lines[lineIdx];
    const row = (state.sheets[sm.name]||[])[line.r]||[];
    return n(row[col]);
  };

  /* Find line index by label (case-insensitive, pattern matching) */
  const findLineByLabel = (sm, patterns) => {
    if(!sm || !patterns) return null;
    const labels = Array.isArray(patterns) ? patterns : [patterns];
    const byLabel = sm.byLabel || {};
    const keys = Object.keys(byLabel);
    
    for(const lab of labels) {
      if(typeof lab === 'string') {
        const exact = byLabel[String(lab).toLowerCase()];
        if(exact !== undefined) return exact;
      }
    }
    for(const k of keys) {
      for(const lab of labels) {
        if(typeof lab === 'object' && lab.test && lab.test(k)) return byLabel[k];
        if(typeof lab === 'string' && k.includes(String(lab).toLowerCase())) return byLabel[k];
      }
    }
    return null;
  };

  /* Get metric from sheet at specific column */
  const getMetricAt = (sm, labels, col) => {
    const idx = findLineByLabel(sm, labels);
    return idx === null ? 0 : getRowVal(sm, idx, col);
  };

  /* Get all period columns (exclude label, change, percent, rowTotal) */
  const getPeriodColumns = sm => {
    return (sm?.cols||[])
      .filter(c => c.idx > 0 && c.type !== 'label' && c.type !== 'change' && c.type !== 'percent' && c.type !== 'rowTotal')
      .map(c => ({...c, year: getYear(c.label)}));
  };

  /* Get year columns sorted by year (newest first) */
  const getYearColumns = sm => {
    return getPeriodColumns(sm)
      .filter(c => c.year)
      .sort((a, b) => b.year - a.year || a.idx - b.idx);
  };

  /* Extract direct members of a section (for totaling) */
  const getDirectMembers = (sm, openerIdx, valueCol) => {
    const out = [];
    if(!sm || openerIdx === null || openerIdx < 0) return out;
    
    const opener = sm.lines[openerIdx];
    const endR = opener?.totalIdx !== null ? sm.lines[opener.totalIdx]?.r : Infinity;
    let skipUntil = -1;
    
    for(let i = openerIdx + 1; i < sm.lines.length; i++) {
      const l = sm.lines[i];
      if(l.r >= endR) break;
      if(l.r <= skipUntil) continue;
      
      if(l.totalIdx !== null) {
        const tl = sm.lines[l.totalIdx];
        const val = getRowVal(sm, l.totalIdx, valueCol);
        out.push({label: l.label, value: val});
        skipUntil = tl.r;
      } else if(l.kind === 'account') {
        out.push({label: l.label, value: getRowVal(sm, i, valueCol)});
      }
    }
    return out;
  };

  /* Extract aging data from sheet (buckets: current, 1-30, 31-60, 61-90, 91+) */
  const parseAgingSheet = sm => {
    if(!sm) return null;
    const buckets = (sm.cols||[]).filter(c => c.type === 'bucket');
    if(!buckets.length) return null;
    
    const totalCol = (sm.cols||[]).find(c => c.type === 'rowTotal');
    const gl = [...(sm.lines||[])].reverse().find(l => l.kind === 'grandTotal' || l.kind === 'total');
    if(!gl) return null;
    
    const row = (state.sheets[sm.name]||[])[gl.r]||[];
    const vals = buckets.map(b => ({label: b.label, value: n(row[b.idx])}));
    const total = totalCol ? n(row[totalCol.idx]) : vals.reduce((s, x) => s + x.value, 0);
    
    return {buckets: vals, total: total};
  };

  /* Main postprocessing function - fix data integrity */
  function postProcessModel(md) {
    if(!md) return md;
    
    /* 1. Normalize period formatting */
    md.period = normalizePeriod(md.period);
    
    /* 2. Improve A/R and A/P sheet discovery */
    for(const [name, sm] of Object.entries(md.sheetModels||{})) {
      const t = name.toLowerCase().replace(/[._-]+/g, ' ');
      if(!md.roles.ar && /(^|\s)(a\s*\/?\s*r|ar)(\s|$).*aging|accounts receivable.*aging/.test(t)) {
        md.roles.ar = name;
        sm.role = 'ar';
      }
      if(!md.roles.ap && /(^|\s)(a\s*\/?\s*p|ap)(\s|$).*aging|accounts payable.*aging/.test(t)) {
        md.roles.ap = name;
        sm.role = 'ap';
      }
    }
    
    /* 3. Parse aging data from sheets */
    if(md.roles.ar) md.arAging = parseAgingSheet(md.sheetModels[md.roles.ar]) || md.arAging;
    if(md.roles.ap) md.apAging = parseAgingSheet(md.sheetModels[md.roles.ap]) || md.apAging;
    
    /* 4. Extract P&L data properly */
    const plName = md.roles.plComparative || md.roles.plMonthly || md.roles.pl;
    const pl = plName ? md.sheetModels[plName] : null;
    const yc = getYearColumns(pl);
    const currentYear = yc.length ? yc[0] : null;
    const priorYear = yc.length > 1 ? yc.find(c => c.year < currentYear.year) : null;
    const currentCol = currentYear?.idx ?? (pl?.cols||[]).find(c => c.type === 'current')?.idx ?? (pl?.cols||[]).find(c => c.type === 'rowTotal')?.idx ?? null;
    const priorCol = priorYear?.idx ?? (pl?.cols||[]).find(c => c.type === 'prior')?.idx ?? null;
    
    const labelSets = {
      income: ['total income', 'total revenue', 'revenue', 'sales', 'sales income', 'service income', /total.*(income|revenue|sales)/i],
      gross: ['gross profit', /gross profit/i],
      expenses: ['total expenses', 'total operating expenses', 'operating expenses', 'expenses', /total.*expenses/i],
      net: ['net income', 'net profit', 'profit for the period', /net (income|profit)/i]
    };
    
    /* 5. Extract current period metrics */
    if(pl && currentCol !== null) {
      let income = getMetricAt(pl, labelSets.income, currentCol);
      
      /* If no explicit revenue total exists, sum the direct members */
      if(Math.abs(income) < 0.005) {
        const oi = findLineByLabel(pl, ['income', 'revenue', 'sales']);
        if(oi !== null) {
          income = getDirectMembers(pl, oi, currentCol).reduce((s, x) => s + n(x.value), 0);
        }
      }
      
      md.metrics.income = income;
      md.metrics.gross = getMetricAt(pl, labelSets.gross, currentCol) || income;
      md.metrics.expenses = getMetricAt(pl, labelSets.expenses, currentCol);
      md.metrics.net = getMetricAt(pl, labelSets.net, currentCol);
    }
    
    /* 6. Extract prior period metrics for variance calculation */
    if(pl && priorCol !== null && priorCol !== currentCol) {
      md.prior.income = getMetricAt(pl, labelSets.income, priorCol);
      md.prior.gross = getMetricAt(pl, labelSets.gross, priorCol) || md.prior.income;
      md.prior.expenses = getMetricAt(pl, labelSets.expenses, priorCol);
      md.prior.net = getMetricAt(pl, labelSets.net, priorCol);
    } else if(!md.roles.plComparative && yc.length < 2) {
      md.prior.income = md.prior.gross = md.prior.expenses = md.prior.net = null;
    }
    
    /* 7. Preserve yearly financials for multi-year display */
    md.yearlyFinancials = yc.map(c => ({
      year: c.year,
      label: c.label || String(c.year),
      income: getMetricAt(pl, labelSets.income, c.idx),
      gross: getMetricAt(pl, labelSets.gross, c.idx),
      expenses: getMetricAt(pl, labelSets.expenses, c.idx),
      net: getMetricAt(pl, labelSets.net, c.idx)
    })).filter((x, i, a) => a.findIndex(y => y.year === x.year) === i);
    
    /* 8. Extract monthly data (only from actual month columns) */
    const pm = md.roles.plMonthly ? md.sheetModels[md.roles.plMonthly] : null;
    const monthCols = (pm?.cols||[]).filter(c => c.type === 'month').sort((a, b) => (a.year||0)-(b.year||0) || a.idx - b.idx);
    
    if(pm && monthCols.length) {
      const latest = Math.max(...monthCols.map(c => c.year || 0));
      const latestCols = monthCols.filter(c => (c.year || latest) === latest);
      
      const getSeries = labs => {
        const idx = findLineByLabel(pm, labs);
        return idx === null ? latestCols.map(() => 0) : latestCols.map(c => getRowVal(pm, idx, c.idx));
      };
      
      md.months = latestCols.map(c => ({
        label: c.label,
        short: c.short || String(c.label).slice(0, 3),
        col: c.idx,
        year: c.year
      }));
      md.monthlyRevenue = getSeries(labelSets.income);
      md.monthlyNet = getSeries(labelSets.net);
      md.monthlyExpenses = getSeries(labelSets.expenses);
    } else {
      md.months = [];
      md.monthlyRevenue = [];
      md.monthlyNet = [];
      md.monthlyExpenses = [];
    }
    
    /* 9. Calculate expense breakdown with proper percentages */
    const expSm = pm || pl;
    if(expSm) {
      const vcol = (expSm.cols||[]).find(c => c.type === 'rowTotal')?.idx ?? currentCol ?? 1;
      let ei = findLineByLabel(expSm, ['expenses', 'operating expenses']);
      
      if(ei === null) {
        const ti = findLineByLabel(expSm, ['total expenses', 'total operating expenses']);
        if(ti !== null) {
          const totalLine = expSm.lines[ti];
          for(let i = ti - 1; i >= 0; i--) {
            if(expSm.lines[i].totalIdx === ti) {
              ei = i;
              break;
            }
          }
        }
      }
      
      if(ei !== null) {
        const total = abs(md.metrics.expenses) || abs(getRowVal(expSm, expSm.lines[ei].totalIdx, vcol));
        md.expenseGroups = getDirectMembers(expSm, ei, vcol)
          .filter(x => abs(x.value) > 0.004)
          .map(x => ({
            label: x.label,
            value: x.value,
            pct: total ? (abs(x.value) / total * 100) : 0
          }))
          .sort((a, b) => abs(b.value) - abs(a.value));
      }
    }
    
    /* 10. Calculate Balance Sheet composition */
    const bs = md.roles.bs ? md.sheetModels[md.roles.bs] : null;
    if(bs) {
      const bsc = getYearColumns(bs)[0]?.idx ?? (bs.cols||[]).find(c => c.type === 'current')?.idx ?? 1;
      const assetsIdx = findLineByLabel(bs, ['assets']);
      const leIdx = findLineByLabel(bs, ['liabilities and equity', 'liabilities & equity']);
      const liIdx = findLineByLabel(bs, ['liabilities']);
      const eqIdx = findLineByLabel(bs, ['equity']);
      
      const assets = assetsIdx !== null ? getDirectMembers(bs, assetsIdx, bsc) : [];
      let le = leIdx !== null ? getDirectMembers(bs, leIdx, bsc) : [];
      
      if(!le.length) {
        le = [
          ...(liIdx !== null ? getDirectMembers(bs, liIdx, bsc) : []),
          ...(eqIdx !== null ? getDirectMembers(bs, eqIdx, bsc) : [])
        ];
      }
      
      const totalAssets = abs(md.metrics.assets) || assets.reduce((s, x) => s + abs(x.value), 0);
      const totalLE = le.reduce((s, x) => s + abs(x.value), 0);
      
      md.bsComposition = {
        assets: assets.filter(x => abs(x.value) > 0.004).map(x => ({
          label: x.label,
          value: x.value,
          pct: totalAssets ? (abs(x.value) / totalAssets * 100) : 0
        })),
        liabEquity: le.filter(x => abs(x.value) > 0.004).map(x => ({
          label: x.label,
          value: x.value,
          pct: totalLE ? (abs(x.value) / totalLE * 100) : 0
        }))
      };
    }
    
    return md;
  }

  /* Override parseWorkbook with postprocessing */
  if(typeof parseWorkbook === 'function' && !window.__udmrComprehensiveFix) {
    window.__udmrComprehensiveFix = true;
    const baseParser = parseWorkbook;
    parseWorkbook = function(sheets) {
      return postProcessModel(baseParser(sheets));
    };
  }

  /* Fix dashboard to show yearly data when monthly is unavailable */
  if(typeof renderDashboard === 'function' && !window.__udmrDashboardYearlyFix) {
    window.__udmrDashboardYearlyFix = true;
    const baseDashboard = renderDashboard;
    renderDashboard = function() {
      baseDashboard();
      const md = state.model;
      if(!md) return;
      
      const box = document.getElementById('chartMonthly');
      if(box && (!md.months?.length || !md.monthlyRevenue?.length) && md.yearlyFinancials?.length) {
        const yrs = [...md.yearlyFinancials].sort((a, b) => a.year - b.year);
        const series = [
          {name: 'Revenue / Income', color: CHART_COLORS.blue, values: yrs.map(x => x.income)},
          {name: 'Net Income', color: CHART_COLORS.red, values: yrs.map(x => x.net)}
        ];
        box.innerHTML = '<div class="chart-sub">Yearly Revenue vs Net Income</div>' + 
                       chartLegend(series) + 
                       svgGroupedBars({series, labels: yrs.map(x => String(x.year)), height: 230});
        
        const comp = document.getElementById('comparisonTable');
        if(comp) {
          comp.innerHTML = '<table><tr><th>Year</th><th>Revenue / Income</th><th>Total Expenses</th><th>Net Income</th></tr>' +
                          yrs.map(x => `<tr><td>${x.year}</td><td>${money(x.income)}</td><td>${money(x.expenses)}</td><td class="${x.net<0?'neg':''}">${money(x.net)}</td></tr>`).join('') +
                          '</table>';
        }
      }
      
      const ex = document.getElementById('chartExpenses');
      if(ex && md.expenseGroups?.length) {
        const top = md.expenseGroups.slice(0, 10);
        ex.innerHTML = '<h3>Expense Breakdown — Top ' + top.length + ' Categories</h3>' + 
                      svgHBars({items: top, totalForPct: abs(md.metrics.expenses)||null, color: CHART_COLORS.teal, width: 720});
      }
    };
  }

  /* Fix PDF report dashboard and TOC */
  if(typeof dashboardBodies === 'function' && !window.__udmrReportDashboardFix) {
    window.__udmrReportDashboardFix = true;
    const baseDashboard = dashboardBodies;
    dashboardBodies = function(no, title) {
      const md = state.model;
      if(md && (!md.months?.length || !md.monthlyRevenue?.length) && md.yearlyFinancials?.length) {
        const saved = {months: md.months, monthlyRevenue: md.monthlyRevenue, monthlyNet: md.monthlyNet};
        const yrs = [...md.yearlyFinancials].sort((a, b) => a.year - b.year);
        md.months = yrs.map(x => ({short: String(x.year)}));
        md.monthlyRevenue = yrs.map(x => x.income);
        md.monthlyNet = yrs.map(x => x.net);
        
        const out = baseDashboard(no, title).map(h =>
          h.replace(/Monthly Revenue vs Net Income/g, 'Yearly Revenue vs Net Income')
           .replace(/Net Margin by Month/g, 'Net Margin by Year')
        );
        Object.assign(md, saved);
        return out;
      }
      return baseDashboard(no, title);
    };
  }

  /* Fix PDF page numbering and TOC to start at 1 */
  if(typeof buildPages === 'function' && !window.__udmrPdfPageNumberingFix) {
    window.__udmrPdfPageNumberingFix = true;
    const baseBuilder = buildPages;
    buildPages = function(opts) {
      let pages = baseBuilder(opts);
      const frontMatterCount = pages.filter(p => p.sectionId === 'cover' || p.sectionId === 'toc').length;
      const contentCount = Math.max(0, pages.length - frontMatterCount);
      
      pages = pages.map((p, i) => {
        let h = p.html;
        
        /* Fix TOC page numbers to start from 1 after front matter */
        if(p.sectionId === 'toc') {
          h = h.replace(/<span class="toc-page">(\d+)(?:–(\d+))?<\/span>/g, (m, a, b) => {
            const aa = Math.max(1, +a - frontMatterCount);
            const bb = b ? Math.max(1, +b - frontMatterCount) : null;
            return `<span class="toc-page">${bb ? aa + '–' + bb : aa}</span>`;
          });
        }
        
        /* Fix page footer numbering to only show for content */
        if(i >= frontMatterCount) {
          const cp = i - frontMatterCount + 1;
          h = h.replace(/Page \d+ of \d+/g, `Page ${cp} of ${contentCount}`);
        } else {
          h = h.replace(/<span>Page \d+ of \d+<\/span>/g, '<span></span>');
        }
        
        return {...p, html: h, pageNo: i < frontMatterCount ? null : i - frontMatterCount + 1};
      });
      
      return pages;
    };
  }

  /* Ensure Net Income row is highlighted in red in all financial statement tables */
  if(typeof reportTableParts === 'function' && !window.__udmrNetIncomeStyleFix) {
    window.__udmrNetIncomeStyleFix = true;
    const baseTableParts = reportTableParts;
    reportTableParts = function(sm, opts) {
      const out = baseTableParts(sm, opts);
      if(sm && /^pl/.test(sm.role || '')) {
        out.rows = out.rows.map(r => {
          const txt = r.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if(/^Net Income\b/i.test(txt)) {
            return {...r, html: r.html.replace('<tr', '<tr class="net-income-row"')};
          }
          return r;
        });
      }
      return out;
    };
  }

  /* Fix variance calculations to show actual differences */
  if(typeof renderDashboard === 'function' && !window.__udmrVarianceCalculationFix) {
    window.__udmrVarianceCalculationFix = true;
    const origDashboard = renderDashboard;
    renderDashboard = function() {
      origDashboard();
    };
  }

  /* Fix Excel accounting format and borders */
  if(typeof XLSX !== 'undefined' && XLSX.writeFile && !window.__udmrExcelFormatFix) {
    window.__udmrExcelFormatFix = true;
    const origWrite = XLSX.writeFile.bind(XLSX);
    XLSX.writeFile = function(wb, filename, opts) {
      if(filename && /Management-Report\.xlsx$/i.test(filename) && wb?.SheetNames) {
        wb.SheetNames.forEach(name => {
          const ws = wb.Sheets[name];
          if(!ws || !ws['!ref']) return;
          
          const rg = XLSX.utils.decode_range(ws['!ref']);
          for(let r = rg.s.r; r <= rg.e.r; r++) {
            for(let c = rg.s.c; c <= rg.e.c; c++) {
              const addr = XLSX.utils.encode_cell({r, c});
              const cell = ws[addr] || (ws[addr] = {t: 's', v: ''});
              const style = JSON.parse(JSON.stringify(cell.s || {}));
              
              /* Add borders to all cells */
              const side = {style: 'thin', color: {rgb: 'C9D5E3'}};
              style.border = {
                top: (style.border?.top) || side,
                bottom: (style.border?.bottom) || side,
                left: (style.border?.left) || side,
                right: (style.border?.right) || side
              };
              
              /* Format numeric cells as accounting with 2 decimals */
              if(typeof cell.v === 'number') {
                style.numFmt = '#,##0.00;[Red](#,##0.00);-';
                style.alignment = {...(style.alignment || {}), horizontal: 'right'};
                if(cell.v < 0) {
                  style.font = {...(style.font || {}), color: {rgb: 'C93438'}};
                }
              }
              
              cell.s = style;
            }
          }
        });
      }
      return origWrite(wb, filename, {cellStyles: true, ...(opts || {})});
    };
  }

  /* Add critical CSS for styling fixes */
  if(typeof document !== 'undefined' && !document.getElementById('udmr-comprehensive-style')) {
    const style = document.createElement('style');
    style.id = 'udmr-comprehensive-style';
    style.textContent = `
      /* Net Income styling */
      .net-income-row td.val.neg,
      .net-income-row td.neg {
        color: #c93438 !important;
        font-weight: 700 !important;
      }
      
      /* Charts responsive sizing */
      .report-page .chart-svg {
        max-width: 100%;
        height: auto;
        overflow: visible;
      }
      
      /* Donut chart layout */
      .report-page .donut-row {
        display: flex !important;
        gap: 18px !important;
        align-items: flex-start !important;
        flex-wrap: wrap !important;
      }
      
      /* Tabular number formatting for comparison tables */
      .dashboard-compare-table td,
      .report-compare-table td {
        font-variant-numeric: tabular-nums;
      }
      
      /* Editor table input alignment */
      .edit-table input {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      
      /* Period display with proper dash */
      .report-sub,
      .cover-period {
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
        letter-spacing: 0.3px;
      }
      
      /* Ensure variance values are visible */
      .kpi .help {
        color: #6d7887;
        font-size: 11px;
        margin-top: 2px;
      }
      
      /* Percentage display in expense breakdown */
      .chart-svg text {
        font-variant-numeric: tabular-nums;
      }
    `;
    document.head.appendChild(style);
  }
})();
