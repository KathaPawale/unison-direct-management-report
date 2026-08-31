/* Unison Direct Management Reporting — Enhanced Data Extraction & Recovery
 * 
 * Fixes zero-value issues for:
 * - Net Income extraction from P&L
 * - A/R Total from Balance Sheet or A/R Aging
 * - A/P Total from Balance Sheet or A/P Aging
 * - Monthly Revenue and Net Income data extraction
 */
'use strict';
(function(){
  if(!window.__udmrDataExtractionFix) {
    window.__udmrDataExtractionFix = true;
    
    /* Helper to get numeric value from cell */
    const n = v => Number.isFinite(Number(v)) ? Number(v) : (typeof num === 'function' ? num(v) : 0);
    const abs = v => Math.abs(n(v));
    
    /* Get row value from sheet safely */
    const getRowVal = (sheets, sm, lineIdx, col) => {
      if(!sm || !sheets || lineIdx === null || col === null || !sm.lines[lineIdx]) return 0;
      const line = sm.lines[lineIdx];
      const row = (sheets[sm.name] || [])[line.r] || [];
      return n(row[col]);
    };
    
    /* Enhanced label finding with fuzzy matching */
    const findLineIndex = (sm, patterns) => {
      if(!sm) return null;
      const patterns_arr = Array.isArray(patterns) ? patterns : [patterns];
      const byLabel = sm.byLabel || {};
      
      // First pass: exact matches (normalized)
      for(const pat of patterns_arr) {
        if(typeof pat === 'string') {
          const normalized = pat.toLowerCase().trim();
          for(const [key, idx] of Object.entries(byLabel)) {
            if(key === normalized) return idx;
          }
        }
      }
      
      // Second pass: substring matches
      for(const pat of patterns_arr) {
        if(typeof pat === 'string') {
          const normalized = pat.toLowerCase();
          for(const [key, idx] of Object.entries(byLabel)) {
            if(key.includes(normalized) || normalized.includes(key)) {
              return idx;
            }
          }
        }
      }
      
      // Third pass: regex patterns
      for(const pat of patterns_arr) {
        if(typeof pat === 'object' && pat.test) {
          for(const [key, idx] of Object.entries(byLabel)) {
            if(pat.test(key)) return idx;
          }
        }
      }
      
      return null;
    };
    
    /* Scan entire sheet for a specific value pattern */
    const scanSheetForValue = (sheets, sm, patterns, colIdx) => {
      if(!sm || !sheets || colIdx === null) return 0;
      
      const idx = findLineIndex(sm, patterns);
      if(idx !== null) {
        const val = getRowVal(sheets, sm, idx, colIdx);
        if(abs(val) > 0.004) return val;
      }
      
      // Fallback: scan all rows looking for matching labels
      const patterns_arr = Array.isArray(patterns) ? patterns : [patterns];
      const rows = sheets[sm.name] || [];
      for(let r = 0; r < rows.length; r++) {
        const row = rows[r] || [];
        const label = String(row[0] || '').toLowerCase();
        
        for(const pat of patterns_arr) {
          let matches = false;
          if(typeof pat === 'string') {
            matches = label.includes(pat.toLowerCase());
          } else if(typeof pat === 'object' && pat.test) {
            matches = pat.test(label);
          }
          
          if(matches && colIdx < row.length) {
            const val = n(row[colIdx]);
            if(abs(val) > 0.004) return val;
          }
        }
      }
      
      return 0;
    };
    
    /* Enhanced metric extraction */
    const extractMetrics = (sheets, model) => {
      if(!model || !sheets) return model;
      
      const getCol = (sm, type) => {
        if(!sm) return null;
        const col = (sm.cols || []).find(c => c.type === type);
        return col ? col.idx : null;
      };
      
      const M = key => model.roles[key] ? model.sheetModels[model.roles[key]] : null;
      const plMain = M('plMonthly') || M('pl') || M('plComparative');
      const plTotals = M('plComparative') || M('plMonthly') || M('pl');
      const bs = M('bs');
      const ar = M('ar');
      const ap = M('ap');
      
      if(!plTotals) return model;
      
      const curCol = getCol(plTotals, 'current') || getCol(plTotals, 'rowTotal') || 1;
      const priorCol = getCol(plTotals, 'prior');
      const bsCur = bs ? (getCol(bs, 'current') || getCol(bs, 'rowTotal') || 1) : null;
      
      const labelSets = {
        income: ['total income', 'total revenue', 'revenue', 'sales', /^total.*(income|revenue|sales)/i],
        gross: ['gross profit', /gross profit/i],
        expenses: ['total expenses', 'total operating expenses', 'operating expenses', /^total.*expenses/i],
        net: ['net income', 'net profit', 'profit for the period', /^net (income|profit)/i]
      };
      
      // Extract P&L metrics with fallbacks
      if(curCol !== null) {
        let income = scanSheetForValue(sheets, plTotals, labelSets.income, curCol);
        
        // If income is still zero, try to sum individual income accounts
        if(abs(income) < 0.005) {
          const incIdx = findLineIndex(plTotals, ['income', 'revenue', 'sales']);
          if(incIdx !== null) {
            const opener = plTotals.lines[incIdx];
            if(opener && opener.totalIdx !== null) {
              const total = getRowVal(sheets, plTotals, opener.totalIdx, curCol);
              if(abs(total) > 0.004) income = total;
            }
          }
        }
        
        const gross = scanSheetForValue(sheets, plTotals, labelSets.gross, curCol) || income;
        const expenses = scanSheetForValue(sheets, plTotals, labelSets.expenses, curCol);
        const net = scanSheetForValue(sheets, plTotals, labelSets.net, curCol);
        
        model.metrics.income = income;
        model.metrics.gross = gross;
        model.metrics.expenses = expenses;
        model.metrics.net = net;
      }
      
      // Extract Balance Sheet metrics with fallbacks
      if(bsCur !== null && bs) {
        const bankVal = scanSheetForValue(sheets, bs, [/^total.*(bank accounts?|cash)/i], bsCur);
        if(abs(bankVal) > 0.004) model.metrics.bank = bankVal;
        
        let ar_val = scanSheetForValue(sheets, bs, [/^total.*(accounts? receivable|a\/r|ar)/i], bsCur);
        if(abs(ar_val) < 0.005 && model.arAging) ar_val = model.arAging.total;
        if(abs(ar_val) > 0.004) model.metrics.ar = ar_val;
        
        let ap_val = scanSheetForValue(sheets, bs, [/^total.*(accounts? payable|a\/p|ap)/i], bsCur);
        if(abs(ap_val) < 0.005 && model.apAging) ap_val = model.apAging.total;
        if(abs(ap_val) > 0.004) model.metrics.ap = ap_val;
        
        const assetsVal = scanSheetForValue(sheets, bs, [/^total.*(assets?|assets and liabilities)/i], bsCur);
        if(abs(assetsVal) > 0.004) model.metrics.assets = assetsVal;
        
        const liabVal = scanSheetForValue(sheets, bs, [/^total.*(liabilities?)/i], bsCur);
        if(abs(liabVal) > 0.004) model.metrics.liabilities = liabVal;
        
        const eqVal = scanSheetForValue(sheets, bs, [/^total.*(equity|shareholders)/i], bsCur);
        if(abs(eqVal) > 0.004) model.metrics.equity = eqVal;
      }
      
      // Prior period metrics
      if(priorCol !== null && priorCol !== curCol) {
        const priorIncome = scanSheetForValue(sheets, plTotals, labelSets.income, priorCol);
        const priorGross = scanSheetForValue(sheets, plTotals, labelSets.gross, priorCol) || priorIncome;
        const priorExpenses = scanSheetForValue(sheets, plTotals, labelSets.expenses, priorCol);
        const priorNet = scanSheetForValue(sheets, plTotals, labelSets.net, priorCol);
        
        model.prior.income = priorIncome || null;
        model.prior.gross = priorGross || null;
        model.prior.expenses = priorExpenses || null;
        model.prior.net = priorNet || null;
      }
      
      return model;
    };
    
    /* Extract monthly data with enhanced logic */
    const extractMonthlyData = (sheets, model) => {
      if(!model) return model;
      
      const plM = model.roles.plMonthly ? model.sheetModels[model.roles.plMonthly] : null;
      if(!plM || !model.months || !model.months.length) {
        model.monthlyRevenue = model.monthlyRevenue || [];
        model.monthlyNet = model.monthlyNet || [];
        model.monthlyExpenses = model.monthlyExpenses || [];
        return model;
      }
      
      const labelSets = {
        income: ['total income', 'total revenue', 'revenue', 'sales', /^total.*(income|revenue|sales)/i],
        net: ['net income', 'net profit', 'profit for the period', /^net (income|profit)/i],
        expenses: ['total expenses', 'total operating expenses', 'operating expenses', /^total.*expenses/i]
      };
      
      const getSeriesFor = labels => {
        const idx = findLineIndex(plM, labels);
        if(idx === null) return model.months.map(() => 0);
        
        return model.months.map(m => {
          if(!m.col) return 0;
          const row = (sheets[plM.name] || [])[plM.lines[idx].r] || [];
          return n(row[m.col]);
        });
      };
      
      model.monthlyRevenue = getSeriesFor(labelSets.income);
      model.monthlyNet = getSeriesFor(labelSets.net);
      model.monthlyExpenses = getSeriesFor(labelSets.expenses);
      
      return model;
    };
    
    /* Override parseWorkbook to enhance data extraction */
    if(typeof parseWorkbook === 'function' && !window.__udmrDataExtractionOverride) {
      window.__udmrDataExtractionOverride = true;
      const baseParser = parseWorkbook;
      
      parseWorkbook = function(sheets) {
        let model = baseParser(sheets);
        
        // Apply enhanced extraction
        model = extractMetrics(sheets, model);
        model = extractMonthlyData(sheets, model);
        
        return model;
      };
    }
    
    /* Render dashboard with better error handling */
    if(typeof renderDashboard === 'function' && !window.__udmrDashboardRobustFix) {
      window.__udmrDashboardRobustFix = true;
      const baseRender = renderDashboard;
      
      renderDashboard = function() {
        // Re-extract data if we detect zeros
        const md = state.model;
        if(md && state.sheets) {
          const hasZeroMetrics = (md.metrics.income || 0) === 0 && 
                                 (md.metrics.net || 0) === 0 &&
                                 (md.metrics.ar || 0) === 0;
          
          if(hasZeroMetrics && Object.keys(state.sheets).length > 0) {
            // Try re-parsing
            state.model = parseWorkbook(state.sheets);
          }
        }
        
        return baseRender.call(this);
      };
    }
  }
})();
