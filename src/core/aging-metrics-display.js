/* Unison Direct Management Reporting — A/R and A/P Metrics Display Fix
 * 
 * Ensures A/R and A/P totals are displayed from:
 * 1. Parsed aging sheet totals
 * 2. Balance Sheet if available
 * 3. Calculated from direct aging data
 */
'use strict';
(function(){
  if(!window.__udmrAgingMetricsDisplayFix) {
    window.__udmrAgingMetricsDisplayFix = true;
    
    const n = v => Number.isFinite(Number(v)) ? Number(v) : (typeof num === 'function' ? num(v) : 0);
    const abs = v => Math.abs(n(v));
    
    /* Ensure metrics reflect aging data */
    const syncAgingMetrics = md => {
      if(!md) return;
      
      // A/R: prioritize aging sheet, fallback to BS
      if(md.arAging && abs(md.arAging.total) > 0.004) {
        if(abs(md.metrics.ar || 0) < 0.005) {
          md.metrics.ar = md.arAging.total;
        }
      }
      
      // A/P: prioritize aging sheet, fallback to BS
      if(md.apAging && abs(md.apAging.total) > 0.004) {
        if(abs(md.metrics.ap || 0) < 0.005) {
          md.metrics.ap = md.apAging.total;
        }
      }
      
      // Fallback: if no aging data but metrics exist, ensure they're visible
      if(abs(md.metrics.ar || 0) < 0.005 && abs(md.metrics.ap || 0) < 0.005) {
        // Check if this is just initialization - don't zero out if data exists
        const hasAgingData = (md.arAging?.total || 0) + (md.apAging?.total || 0) > 0;
        if(hasAgingData) {
          md.metrics.ar = md.arAging?.total || 0;
          md.metrics.ap = md.apAging?.total || 0;
        }
      }
    };
    
    /* Override analyze to sync aging metrics */
    if(typeof analyze === 'function' && !window.__udmrAnalyzeAgingSyncOverride) {
      window.__udmrAnalyzeAgingSyncOverride = true;
      const baseAnalyze = analyze;
      
      window.analyze = function() {
        baseAnalyze.call(this);
        const md = state.model;
        if(md) syncAgingMetrics(md);
      };
    }
    
    /* Enhanced dashboard rendering with aging display */
    if(typeof renderDashboard === 'function' && !window.__udmrAgingDisplayFix) {
      window.__udmrAgingDisplayFix = true;
      const baseRender = renderDashboard;
      
      renderDashboard = function() {
        const md = state.model;
        if(md) syncAgingMetrics(md);
        
        baseRender.call(this);
        
        // Ensure A/R and A/P values are visible in dashboard
        const kg = document.getElementById('kpiGrid');
        if(kg && md && md.metrics) {
          const kpis = kg.querySelectorAll('.kpi');
          const m = md.metrics;
          
          kpis.forEach(kpi => {
            const label = kpi.querySelector('small')?.textContent || '';
            if(label.includes('A/R')) {
              const valEl = kpi.querySelector('b');
              if(valEl && abs(m.ar || 0) > 0.004) {
                valEl.textContent = money(m.ar);
              }
            }
            if(label.includes('A/P')) {
              const valEl = kpi.querySelector('b');
              if(valEl && abs(m.ap || 0) > 0.004) {
                valEl.textContent = money(m.ap);
              }
            }
          });
        }
        
        // Show aging breakdown in dashboard if available
        const chartAging = document.getElementById('chartAging');
        if(chartAging && md && (md.arAging || md.apAging)) {
          const buckets = (md.arAging || md.apAging).buckets.map(b => b.label);
          const series = [];
          
          if(md.arAging && abs(md.arAging.total) > 0.004) {
            series.push({
              name: 'A/R ' + moneyShort(md.arAging.total),
              color: CHART_COLORS.blue,
              values: md.arAging.buckets.map(b => b.value)
            });
          }
          
          if(md.apAging && abs(md.apAging.total) > 0.004) {
            series.push({
              name: 'A/P ' + moneyShort(md.apAging.total),
              color: CHART_COLORS.amber,
              values: md.apAging.buckets.map(b => b.value)
            });
          }
          
          if(series.length > 0 && buckets.length > 0) {
            chartAging.innerHTML = '<h3>Receivables & Payables Aging</h3>' +
                                 chartLegend(series) +
                                 svgGroupedBars({series, labels: buckets, height: 200});
          }
        }
      };
    }
    
    /* Display aging details in statements view */
    if(typeof renderStatements === 'function' && !window.__udmrAgingStatementsDisplay) {
      window.__udmrAgingStatementsDisplay = true;
      const baseRender = renderStatements;
      
      renderStatements = function() {
        baseRender.call(this);
        
        const md = state.model;
        if(!md) return;
        
        // Display A/R aging if available
        const arView = document.getElementById('arView');
        if(arView && md.arAging && abs(md.arAging.total) > 0.004) {
          const summary = '<div style="padding:12px"><div style="font-weight:600;margin-bottom:10px">A/R Aging Summary</div>' +
                         '<table style="width:100%;border-collapse:collapse">' +
                         '<tr style="border-bottom:2px solid #ddd"><th style="text-align:left;padding:6px">Bucket</th><th style="text-align:right;padding:6px">Amount</th></tr>' +
                         md.arAging.buckets.map(b => 
                           `<tr style="border-bottom:1px solid #eee"><td style="padding:6px">${escapeHtml(b.label)}</td><td style="text-align:right;padding:6px">${money(b.value)}</td></tr>`
                         ).join('') +
                         `<tr style="border-top:2px solid #333;font-weight:600"><td style="padding:6px">Total</td><td style="text-align:right;padding:6px">${money(md.arAging.total)}</td></tr>` +
                         '</table></div>';
          arView.innerHTML = summary;
        }
        
        // Display A/P aging if available
        const apView = document.getElementById('apView');
        if(apView && md.apAging && abs(md.apAging.total) > 0.004) {
          const summary = '<div style="padding:12px"><div style="font-weight:600;margin-bottom:10px">A/P Aging Summary</div>' +
                         '<table style="width:100%;border-collapse:collapse">' +
                         '<tr style="border-bottom:2px solid #ddd"><th style="text-align:left;padding:6px">Bucket</th><th style="text-align:right;padding:6px">Amount</th></tr>' +
                         md.apAging.buckets.map(b =>
                           `<tr style="border-bottom:1px solid #eee"><td style="padding:6px">${escapeHtml(b.label)}</td><td style="text-align:right;padding:6px">${money(b.value)}</td></tr>`
                         ).join('') +
                         `<tr style="border-top:2px solid #333;font-weight:600"><td style="padding:6px">Total</td><td style="text-align:right;padding:6px">${money(md.apAging.total)}</td></tr>` +
                         '</table></div>';
          apView.innerHTML = summary;
        }
      };
    }
    
    /* Add CSS for aging display */
    if(!document.getElementById('udmr-aging-display-style')) {
      const style = document.createElement('style');
      style.id = 'udmr-aging-display-style';
      style.textContent = `
        .aging-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 8px;
        }
        
        .aging-table th {
          background: #f0f4f8;
          font-weight: 600;
          padding: 8px;
          text-align: left;
          border-bottom: 2px solid #d4dce5;
        }
        
        .aging-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #e7ebf1;
        }
        
        .aging-table td:last-child {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        
        .aging-total {
          font-weight: 600;
          background: #f9fafb;
          border-top: 2px solid #34445a;
        }
      `;
      document.head.appendChild(style);
    }
  }
})();
