/* Unison Direct Management Reporting — Robust A/R and A/P Aging Sheet Parser
 * 
 * Handles various aging sheet formats:
 * - Customer-based aging reports (customer name, invoice, aging buckets)
 * - Consolidated aging summaries
 * - Different bucket names (0-30, Current, 31-60, 1-30, etc.)
 * - Various total row positions and naming
 */
'use strict';
(function(){
  if(!window.__udmrAgingSheetParserFix) {
    window.__udmrAgingSheetParserFix = true;
    
    const n = v => Number.isFinite(Number(v)) ? Number(v) : (typeof num === 'function' ? num(v) : 0);
    const abs = v => Math.abs(n(v));
    
    /* Detect if a sheet is an aging sheet and extract buckets + grand total */
    const parseAgingSheetFlexible = (sheets, sheetName) => {
      const rows = sheets[sheetName] || [];
      if(!rows || rows.length < 3) return null;
      
      // Scan for aging bucket headers (current, 0-30, 31-60, 61-90, 91+, etc.)
      const BUCKET_PATTERNS = [
        /^current$/i,
        /^0[\s-]*30/i,
        /^1[\s-]*30/i,
        /^31[\s-]*60/i,
        /^61[\s-]*90/i,
        /^91[\s-]*\+?over/i,
        /^over 90/i,
        /^120[\s-]*\+/i,
        /^aging/i
      ];
      
      // Find header row with aging buckets
      let headerRow = -1;
      let bucketCols = [];
      
      for(let r = 0; r < Math.min(rows.length, 20); r++) {
        const row = rows[r] || [];
        const potentialBuckets = [];
        
        for(let c = 0; c < Math.min(row.length, 15); c++) {
          const cell = String(row[c] || '').trim();
          for(const pattern of BUCKET_PATTERNS) {
            if(pattern.test(cell)) {
              potentialBuckets.push({col: c, label: cell});
              break;
            }
          }
        }
        
        // If we found 2+ bucket columns, this is likely the header row
        if(potentialBuckets.length >= 2) {
          headerRow = r;
          bucketCols = potentialBuckets;
          break;
        }
      }
      
      // If no aging buckets found, return null
      if(bucketCols.length === 0) return null;
      
      // Find the total/grand total value
      // Look for a row with "Total" and a large number
      let totalValue = 0;
      let totalRowFound = false;
      
      for(let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const firstCell = String(row[0] || '').toLowerCase();
        
        // Check if this row looks like a total row
        if(/^total|^grand total|^(sub)?total$/i.test(firstCell) || 
           /total/i.test(firstCell)) {
          // Sum the bucket columns for this row
          let rowTotal = 0;
          let hasValues = false;
          
          for(const bucket of bucketCols) {
            const val = n(row[bucket.col]);
            if(abs(val) > 0.004) hasValues = true;
            rowTotal += val;
          }
          
          if(hasValues && abs(rowTotal) > 0.004) {
            totalValue = rowTotal;
            totalRowFound = true;
            break;
          }
        }
      }
      
      // If no total row found with bucket values, try to find any large number in the sheet
      if(!totalRowFound) {
        for(let r = headerRow + 1; r < rows.length; r++) {
          const row = rows[r] || [];
          for(let c = 0; c < row.length; c++) {
            const val = n(row[c]);
            if(abs(val) > 100 && abs(val) > abs(totalValue)) {
              // Check if this looks like a total (in a total-adjacent cell or row with "Total")
              const rowLabel = String(row[0] || '').toLowerCase();
              if(/total/i.test(rowLabel) || /summary/i.test(rowLabel)) {
                totalValue = val;
              }
            }
          }
        }
      }
      
      // Build bucket data
      const buckets = bucketCols.map(b => ({
        label: b.label,
        col: b.col,
        value: 0
      }));
      
      // Extract bucket values from data rows
      for(let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const firstCell = String(row[0] || '').toLowerCase();
        
        // Skip total/summary rows for now (we'll sum buckets)
        if(/^total|^grand total|^summary/i.test(firstCell)) continue;
        
        // For each bucket, add values from this row
        for(const bucket of buckets) {
          bucket.value += n(row[bucket.col]);
        }
      }
      
      // If totalValue wasn't found, sum the buckets
      if(abs(totalValue) < 0.005) {
        totalValue = buckets.reduce((sum, b) => sum + b.value, 0);
      }
      
      return {
        buckets: buckets,
        total: totalValue,
        headerRow: headerRow,
        detected: true
      };
    };
    
    /* Scan all sheets to find and parse A/R and A/P sheets */
    const findAndParseAgingSheets = (sheets, model) => {
      if(!sheets || !model) return model;
      
      const AR_PATTERNS = [
        /^a\/?r/i,
        /accounts? receivable/i,
        /receivables aging/i,
        /customer aging/i,
        /aging receivable/i
      ];
      
      const AP_PATTERNS = [
        /^a\/?p/i,
        /accounts? payable/i,
        /payables aging/i,
        /vendor aging/i,
        /aging payable/i
      ];
      
      for(const [sheetName, sheetData] of Object.entries(sheets)) {
        if(!sheetData || sheetData.length === 0) continue;
        
        const sheetNameLower = sheetName.toLowerCase();
        
        // Try to parse as aging sheet
        const agingData = parseAgingSheetFlexible(sheets, sheetName);
        
        if(agingData && agingData.total > 0) {
          // Determine if it's A/R or A/P based on sheet name
          let isAR = false;
          let isAP = false;
          
          for(const pattern of AR_PATTERNS) {
            if(pattern.test(sheetNameLower)) {
              isAR = true;
              break;
            }
          }
          
          for(const pattern of AP_PATTERNS) {
            if(pattern.test(sheetNameLower)) {
              isAP = true;
              break;
            }
          }
          
          // Also check content for keywords
          if(!isAR && !isAP) {
            const allContent = sheetData.flat().join(' ').toLowerCase();
            if(/customer|receivable|invoice.*aging/i.test(allContent)) isAR = true;
            if(/vendor|supplier|payable|bill.*aging/i.test(allContent)) isAP = true;
          }
          
          // Update model with found aging data
          if(isAR) {
            model.roles.ar = sheetName;
            model.arAging = agingData;
            model.metrics.ar = agingData.total;
            
            if(!model.sheetModels[sheetName]) {
              model.sheetModels[sheetName] = {
                name: sheetName,
                role: 'ar',
                headerRow: agingData.headerRow,
                lines: [],
                cols: agingData.buckets.map((b, i) => ({
                  idx: b.col,
                  type: 'bucket',
                  label: b.label
                })),
                byLabel: {}
              };
            }
          }
          
          if(isAP) {
            model.roles.ap = sheetName;
            model.apAging = agingData;
            model.metrics.ap = agingData.total;
            
            if(!model.sheetModels[sheetName]) {
              model.sheetModels[sheetName] = {
                name: sheetName,
                role: 'ap',
                headerRow: agingData.headerRow,
                lines: [],
                cols: agingData.buckets.map((b, i) => ({
                  idx: b.col,
                  type: 'bucket',
                  label: b.label
                })),
                byLabel: {}
              };
            }
          }
        }
      }
      
      return model;
    };
    
    /* Override parseWorkbook to apply aging sheet detection */
    if(typeof parseWorkbook === 'function' && !window.__udmrAgingParserOverride) {
      window.__udmrAgingParserOverride = true;
      const baseParser = parseWorkbook;
      
      parseWorkbook = function(sheets) {
        let model = baseParser(sheets);
        
        // Apply aging sheet parsing
        model = findAndParseAgingSheets(sheets, model);
        
        return model;
      };
    }
    
    /* Enhance analyze function to extract aging data if model doesn't have it */
    if(typeof analyze === 'function' && !window.__udmrAgingDetectionOverride) {
      window.__udmrAgingDetectionOverride = true;
      const baseAnalyze = analyze;
      
      window.analyze = function() {
        baseAnalyze.call(this);
        
        // If we still don't have A/R or A/P data, try parsing sheets again
        const md = state.model;
        if(md && state.sheets) {
          if((!md.arAging || md.arAging.total === 0) && !md.roles.ar) {
            // Try to find A/R sheet
            for(const [name, data] of Object.entries(state.sheets)) {
              const aging = parseAgingSheetFlexible(state.sheets, name);
              if(aging && aging.total > 0 && /a\/?r|receivable/i.test(name.toLowerCase())) {
                md.arAging = aging;
                md.metrics.ar = aging.total;
                md.roles.ar = name;
                break;
              }
            }
          }
          
          if((!md.apAging || md.apAging.total === 0) && !md.roles.ap) {
            // Try to find A/P sheet
            for(const [name, data] of Object.entries(state.sheets)) {
              const aging = parseAgingSheetFlexible(state.sheets, name);
              if(aging && aging.total > 0 && /a\/?p|payable/i.test(name.toLowerCase())) {
                md.apAging = aging;
                md.metrics.ap = aging.total;
                md.roles.ap = name;
                break;
              }
            }
          }
        }
      };
    }
    
    /* Add diagnostic logging for debugging aging sheet detection */
    if(!window.__udmrAgingDiagnostics) {
      window.__udmrAgingDiagnostics = true;
      
      window.debugAgingSheets = function() {
        const md = state.model;
        console.log('=== A/R and A/P Aging Sheet Diagnostics ===');
        console.log('A/R Aging:', md?.arAging);
        console.log('A/R Role:', md?.roles?.ar);
        console.log('A/R Metric:', md?.metrics?.ar);
        console.log('A/P Aging:', md?.apAging);
        console.log('A/P Role:', md?.roles?.ap);
        console.log('A/P Metric:', md?.metrics?.ap);
        console.log('All sheets:', Object.keys(state.sheets || {}));
      };
    }
  }
})();
