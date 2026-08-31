/* Unison Direct Management Reporting — Monthly Data Debug & Enhanced Recovery
 * 
 * Diagnoses why monthly revenue/net income show $0.00 despite data existing
 * Handles "Total for Income", "Total for Expenses", and other format variations
 */
'use strict';
(function(){
  if(!window.__udmrMonthlyDebug) {
    window.__udmrMonthlyDebug = true;

    const n = v => Number.isFinite(Number(v)) ? Number(v) : (typeof num === 'function' ? num(v) : 0);
    const abs = v => Math.abs(n(v));

    /* Debug function - logs detailed extraction info */
    window.debugMonthlyExtraction = function() {
      console.log('=== MONTHLY DATA DEBUG ===');
      const md = state.model;
      if (!md) {
        console.log('No model loaded');
        return;
      }

      console.log('Model properties:');
      console.log('  months:', md.months);
      console.log('  monthlyRevenue:', md.monthlyRevenue);
      console.log('  monthlyNet:', md.monthlyNet);
      console.log('  monthlyExpenses:', md.monthlyExpenses);
      console.log('  roles.plMonthly:', md.roles.plMonthly);

      const pm = md.roles.plMonthly ? md.sheetModels[md.roles.plMonthly] : null;
      if (!pm) {
        console.log('No P&L Monthly sheet model found');
        return;
      }

      console.log('\nP&L Monthly Sheet Model:');
      console.log('  Sheet name:', pm.name);
      console.log('  Header row:', pm.headerRow);
      console.log('  Total columns:', pm.cols.length);
      console.log('  Total lines:', pm.lines.length);

      console.log('\nColumn types:');
      pm.cols.forEach((c, i) => {
        if (i <= 6 || c.type !== 'value') {
          console.log(`  Col ${c.idx}: type="${c.type}" label="${c.label}"`);
        }
      });

      console.log('\nFirst 15 rows (labels):');
      pm.lines.slice(0, 15).forEach(l => {
        console.log(`  Row ${l.r}: "${l.label}" (kind=${l.kind})`);
      });

      console.log('\nSearching for key rows:');
      const patterns = {
        'Total for Income': /total\s+for\s+income/i,
        'Total Income': /^total\s+income$/i,
        'Revenue': /^revenue$|^total revenue$/i,
        'Total for Expenses': /total\s+for\s+(operating\s+)?expenses/i,
        'Total Expenses': /^total\s+(operating\s+)?expenses$/i,
        'Net Income': /^net\s+(income|profit)/i,
        'Gross Profit': /^gross\s+profit$/i
      };

      for (const [name, pattern] of Object.entries(patterns)) {
        const found = pm.lines.find(l => pattern.test(l.label));
        console.log(`  ${name}: ${found ? `Row ${found.r} "${found.label}"` : 'NOT FOUND'}`);
      }

      console.log('\n=== END DEBUG ===');
    };

    /* Enhanced label matching for "Total for X" format */
    const findLineByLabelEnhanced = (sm, patterns) => {
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
      
      // Second: "Total for X" format handling
      for (const lab of labels) {
        if (typeof lab === 'string') {
          const word = String(lab).toLowerCase();
          // Try "Total for Income", "Total for Expenses", etc.
          const altFormat = `total for ${word}`;
          for (const [key, idx] of Object.entries(byLabel)) {
            if (key === altFormat) return idx;
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

    /* Get row value from sheet */
    const getRowVal = (sheets, sm, lineIdx, col) => {
      if (!sm || !sheets || lineIdx === null || col === null || !sm.lines[lineIdx]) return 0;
      const line = sm.lines[lineIdx];
      const row = (sheets[sm.name] || [])[line.r] || [];
      return n(row[col]);
    };

    /* Enhanced monthly extraction with all format support */
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

      // Get month columns (should already be detected)
      const monthCols = (pm.cols || [])
        .filter(c => c.idx > 0 && (c.type === 'month' || /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(String(c.label || '').slice(0, 3))))
        .sort((a, b) => a.idx - b.idx);

      if (monthCols.length === 0) {
        model.months = [];
        model.monthlyRevenue = [];
        model.monthlyNet = [];
        model.monthlyExpenses = [];
        return model;
      }

      // Enhanced label patterns that handle "Total for X" format
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
        ],
        gross: [
          'gross profit',
          /^gross\s+profit$/i
        ]
      };

      // Extract series using enhanced label matching
      const getSeries = (labels) => {
        const idx = findLineByLabelEnhanced(pm, labels);
        if (idx !== null) {
          return monthCols.map(mc => getRowVal(sheets, pm, idx, mc.idx));
        }
        return monthCols.map(() => 0);
      };

      model.months = monthCols.map(mc => ({
        label: mc.label,
        short: mc.short || String(mc.label).slice(0, 3),
        col: mc.idx,
        year: null
      }));

      // Extract series
      model.monthlyRevenue = getSeries(labelSets.income);
      model.monthlyExpenses = getSeries(labelSets.expenses);

      // Net Income: extracted or calculated
      const netIdx = findLineByLabelEnhanced(pm, labelSets.net);
      if (netIdx !== null) {
        model.monthlyNet = monthCols.map(mc => getRowVal(sheets, pm, netIdx, mc.idx));
      } else {
        // Calculate: Net = Revenue - Expenses
        model.monthlyNet = model.monthlyRevenue.map((rev, i) => {
          const exp = model.monthlyExpenses[i] || 0;
          return n(rev) - n(exp);
        });
      }

      console.log('Monthly extraction complete:', {
        months: model.months.length,
        revenue: model.monthlyRevenue.filter(v => abs(v) > 0.01).length,
        expenses: model.monthlyExpenses.filter(v => abs(v) > 0.01).length,
        net: model.monthlyNet.filter(v => abs(v) > 0.01).length
      });

      return model;
    };

    /* Override parseWorkbook */
    if (typeof parseWorkbook === 'function' && !window.__udmrMonthlyDebugOverride) {
      window.__udmrMonthlyDebugOverride = true;
      const baseParser = parseWorkbook;
      
      parseWorkbook = function(sheets) {
        let model = baseParser.call(this, sheets);
        
        // Apply enhanced extraction
        if (model && (!model.months || model.months.length === 0 || 
                     !model.monthlyRevenue || model.monthlyRevenue.length === 0)) {
          model = extractMonthlyDataEnhanced(sheets, model);
        }
        
        return model;
      };
    }

    /* Recovery in analyze() */
    if (typeof analyze === 'function' && !window.__udmrMonthlyDebugAnalyzeOverride) {
      window.__udmrMonthlyDebugAnalyzeOverride = true;
      const baseAnalyze = analyze;
      
      window.analyze = function() {
        baseAnalyze.call(this);
        
        const md = state.model;
        if (md && state.sheets) {
          if (!md.months || md.months.length === 0 || !md.monthlyRevenue || md.monthlyRevenue.length === 0) {
            console.log('Re-extracting monthly data in analyze...');
            extractMonthlyDataEnhanced(state.sheets, md);
          }
        }
      };
    }
  }
})();
