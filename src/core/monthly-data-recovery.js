/* Unison Direct Management Reporting — Monthly Data Recovery & Formula Calculation
 * 
 * Enhanced monthly revenue and net income extraction with:
 * - Flexible month detection (any date format)
 * - Robust formula calculation
 * - Fallback to yearly data if monthly unavailable
 */
'use strict';
(function(){
  if(!window.__udmrMonthlyDataRecovery) {
    window.__udmrMonthlyDataRecovery = true;

    const n = v => Number.isFinite(Number(v)) ? Number(v) : (typeof num === 'function' ? num(v) : 0);
    const abs = v => Math.abs(n(v));

    /* Enhanced month detection - matches Jan, January, 1, 01, etc. */
    const MONTH_NAMES = {
      'jan': 1, 'january': 1, '1': 1, '01': 1,
      'feb': 2, 'february': 2, '2': 2, '02': 2,
      'mar': 3, 'march': 3, '3': 3, '03': 3,
      'apr': 4, 'april': 4, '4': 4, '04': 4,
      'may': 5, '5': 5, '05': 5,
      'jun': 6, 'june': 6, '6': 6, '06': 6,
      'jul': 7, 'july': 7, '7': 7, '07': 7,
      'aug': 8, 'august': 8, '8': 8, '08': 8,
      'sep': 9, 'september': 9, '9': 9, '09': 9,
      'oct': 10, 'october': 10, '10': 10,
      'nov': 11, 'november': 11, '11': 11,
      'dec': 12, 'december': 12, '12': 12
    };
    
    const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /* Detect if header looks like a month/date column */
    const isMonthHeader = (text) => {
      const t = String(text || '').toLowerCase().trim();
      if (!t) return false;
      
      // Check for explicit month names
      for (const m of Object.keys(MONTH_NAMES)) {
        if (t.includes(m)) return true;
      }
      
      // Check for patterns like "1-Jan", "2025-01", "01/01", etc.
      if (/\d{1,2}[-\/]?[a-z]{3}|[a-z]{3}[-\/]?\d{1,2}|\d{4}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/.test(t)) {
        return true;
      }
      
      // Check for just numbers 1-12 or 01-12
      const num = parseInt(t);
      if (!isNaN(num) && num >= 1 && num <= 12) return true;
      
      return false;
    };

    /* Extract month label from various formats */
    const extractMonthLabel = (text) => {
      const t = String(text || '').toLowerCase().trim();
      
      // Try to find month name
      for (const [name, num] of Object.entries(MONTH_NAMES)) {
        if (t.includes(name)) {
          return MONTH_SHORT[num - 1];
        }
      }
      
      // Try to extract from patterns
      const patterns = [
        /(\d{1,2})[-\/]([a-z]{3})/,  // 1-Jan
        /([a-z]{3})[-\/]?(\d{1,2})/,  // Jan-1
        /\d{4}[-\/](\d{1,2})/,        // 2025-01
        /(\d{1,2})[-\/]\d{1,2}[-\/](\d{4})/  // 01/01/2025
      ];
      
      for (const p of patterns) {
        const m = t.match(p);
        if (m) {
          let monthNum = null;
          // Check if first capture is month name
          if (m[1] && MONTH_NAMES[m[1]]) monthNum = MONTH_NAMES[m[1]];
          // Check if second capture is month name
          else if (m[2] && MONTH_NAMES[m[2]]) monthNum = MONTH_NAMES[m[2]];
          // Check if first capture is month number
          else if (m[1]) {
            const num = parseInt(m[1]);
            if (num >= 1 && num <= 12) monthNum = num;
          }
          // Check if second capture is month number
          else if (m[2]) {
            const num = parseInt(m[2]);
            if (num >= 1 && num <= 12) monthNum = num;
          }
          
          if (monthNum) return MONTH_SHORT[monthNum - 1];
        }
      }
      
      // Fallback: just use first 3 chars
      return t.slice(0, 3).toUpperCase();
    };

    /* Get row value from sheet safely */
    const getRowVal = (sheets, sm, lineIdx, col) => {
      if (!sm || !sheets || lineIdx === null || col === null || !sm.lines[lineIdx]) return 0;
      const line = sm.lines[lineIdx];
      const row = (sheets[sm.name] || [])[line.r] || [];
      return n(row[col]);
    };

    /* Find line index by label patterns - enhanced for "Total for X" format */
    const findLineByLabel = (sm, patterns) => {
      if (!sm) return null;
      const labels = Array.isArray(patterns) ? patterns : [patterns];
      const byLabel = sm.byLabel || {};
      
      // First: exact normalized matches
      for (const lab of labels) {
        if (typeof lab === 'string') {
          const exact = byLabel[String(lab).toLowerCase()];
          if (exact !== undefined) return exact;
        }
      }
      
      // Second: "Total for X" format handling (matches both "Total Income" and "Total for Income")
      for (const lab of labels) {
        if (typeof lab === 'string') {
          const word = String(lab).toLowerCase();
          // Try both "Total for Income" and "Total Income"
          const altFormat = `total for ${word}`;
          for (const [key, idx] of Object.entries(byLabel)) {
            if (key === altFormat || key === word) return idx;
          }
        }
      }
      
      // Third: substring matches (both directions)
      for (const k of Object.keys(byLabel)) {
        for (const lab of labels) {
          if (typeof lab === 'string' && k.includes(String(lab).toLowerCase())) return byLabel[k];
          if (typeof lab === 'string' && String(lab).toLowerCase().includes(k)) return byLabel[k];
        }
      }
      
      // Fourth: regex patterns
      for (const k of Object.keys(byLabel)) {
        for (const lab of labels) {
          if (typeof lab === 'object' && lab.test && lab.test(k)) return byLabel[k];
        }
      }
      
      return null;
    };

    /* Detect and parse month columns from sheet model */
    const detectMonthColumns = (sheets, sm) => {
      if (!sm || !sm.cols) return [];
      
      const months = [];
      for (const col of sm.cols) {
        if (col.idx > 0 && isMonthHeader(col.label)) {
          months.push({
            idx: col.idx,
            label: col.label,
            short: extractMonthLabel(col.label),
            type: col.type || 'month'
          });
        }
      }
      
      return months.sort((a, b) => a.idx - b.idx);
    };

    /* Enhanced monthly data extraction with formula calculation */
    const extractMonthlyDataEnhanced = (sheets, model) => {
      if (!model) return model;
      
      const pm = model.roles.plMonthly ? model.sheetModels[model.roles.plMonthly] : null;
      if (!pm) {
        model.months = [];
        model.monthlyRevenue = [];
        model.monthlyNet = [];
        model.monthlyExpenses = [];
        return model;
      }
      
      // Detect month columns
      const monthCols = detectMonthColumns(sheets, pm);
      if (monthCols.length === 0) {
        model.months = [];
        model.monthlyRevenue = [];
        model.monthlyNet = [];
        model.monthlyExpenses = [];
        return model;
      }
      
      // Label patterns for extraction (handles both "Total Income" and "Total for Income" formats)
      const labelSets = {
        income: [
          'total for income',
          'total income',
          'total revenue',
          'revenue',
          /^total\s+for\s+income$/i,
          /^total\s+(income|revenue)$/i
        ],
        net: [
          'net income',
          'net profit',
          'profit for the period',
          /^net\s+(income|profit)$/i,
          /^profit\s+for\s+the\s+period$/i
        ],
        expenses: [
          'total for expenses',
          'total for operating expenses',
          'total expenses',
          'total operating expenses',
          /^total\s+for\s+(operating\s+)?expenses$/i,
          /^total\s+(operating\s+)?expenses$/i
        ]
      };
      
      // Extract series for each month
      const getSeries = (labels) => {
        const idx = findLineByLabel(pm, labels);
        if (idx !== null) {
          return monthCols.map(mc => getRowVal(sheets, pm, idx, mc.idx));
        }
        return monthCols.map(() => 0);
      };
      
      model.months = monthCols.map(mc => ({
        label: mc.label,
        short: mc.short,
        col: mc.idx,
        year: null
      }));
      
      // Extract or calculate monthly values
      model.monthlyRevenue = getSeries(labelSets.income);
      model.monthlyExpenses = getSeries(labelSets.expenses);
      
      // Try to get net income, or calculate as Revenue - Expenses
      const netIdx = findLineByLabel(pm, labelSets.net);
      if (netIdx !== null) {
        model.monthlyNet = monthCols.map(mc => getRowVal(sheets, pm, netIdx, mc.idx));
      } else {
        // Calculate: Net = Revenue - Expenses
        model.monthlyNet = model.monthlyRevenue.map((rev, i) => {
          const exp = model.monthlyExpenses[i] || 0;
          return n(rev) - n(exp);
        });
      }
      
      return model;
    };

    /* Override parseWorkbook to enhance monthly extraction */
    if (typeof parseWorkbook === 'function' && !window.__udmrMonthlyOverride) {
      window.__udmrMonthlyOverride = true;
      const baseParser = parseWorkbook;
      
      parseWorkbook = function(sheets) {
        let model = baseParser.call(this, sheets);
        
        // Apply enhanced monthly extraction
        if (model && (!model.months || model.months.length === 0 || 
                     !model.monthlyRevenue || model.monthlyRevenue.length === 0)) {
          model = extractMonthlyDataEnhanced(sheets, model);
        }
        
        return model;
      };
    }

    /* Recovery in analyze() if still missing */
    if (typeof analyze === 'function' && !window.__udmrMonthlyAnalyzeOverride) {
      window.__udmrMonthlyAnalyzeOverride = true;
      const baseAnalyze = analyze;
      
      window.analyze = function() {
        baseAnalyze.call(this);
        
        const md = state.model;
        if (md && state.sheets) {
          // Re-extract if monthly data still empty
          if (!md.months || md.months.length === 0 || !md.monthlyRevenue || md.monthlyRevenue.length === 0) {
            extractMonthlyDataEnhanced(state.sheets, md);
          }
        }
      };
    }
  }
})();
