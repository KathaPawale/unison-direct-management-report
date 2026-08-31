/* Unison Direct Management Reporting — Zero Value Recovery & Diagnostic
 * 
 * Detects and recovers zero values in:
 * - Net Income (try to calculate from Income - Expenses)
 * - A/R and A/P totals (pull from aging sheets if BS unavailable)
 * - Monthly data (ensure proper extraction from period columns)
 */
'use strict';
(function(){
  if(!window.__udmrZeroValueRecoveryFix) {
    window.__udmrZeroValueRecoveryFix = true;
    
    const n = v => Number.isFinite(Number(v)) ? Number(v) : (typeof num === 'function' ? num(v) : 0);
    const abs = v => Math.abs(n(v));
    
    /* Recovery logic for zero metrics */
    const recoverZeroMetrics = md => {
      if(!md) return;
      
      const m = md.metrics || {};
      const p = md.prior || {};
      
      // If Net Income is zero but we have income and expenses, calculate it
      if(abs(m.net) < 0.005 && (abs(m.income) > 0.004 || abs(m.expenses) > 0.004)) {
        m.net = (m.income || 0) - (m.expenses || 0);
      }
      
      // If Gross is zero but we have income, use income as fallback
      if(abs(m.gross) < 0.005 && abs(m.income) > 0.004) {
        m.gross = m.income;
      }
      
      // If A/R is zero but we have aging, use aging total
      if(abs(m.ar) < 0.005 && md.arAging && abs(md.arAging.total) > 0.004) {
        m.ar = md.arAging.total;
      }
      
      // If A/P is zero but we have aging, use aging total
      if(abs(m.ap) < 0.005 && md.apAging && abs(md.apAging.total) > 0.004) {
        m.ap = md.apAging.total;
      }
      
      // Apply same recovery to prior period
      if(p.net !== null && abs(p.net) < 0.005 && (abs(p.income) > 0.004 || abs(p.expenses) > 0.004)) {
        p.net = (p.income || 0) - (p.expenses || 0);
      }
      
      if(p.gross !== null && abs(p.gross) < 0.005 && abs(p.income) > 0.004) {
        p.gross = p.income;
      }
    };
    
    /* Recovery logic for empty monthly data */
    const recoverMonthlyData = md => {
      if(!md) return;
      
      // If all monthly revenue is zero but we have yearly data, show yearly
      const hasMonthlyData = (md.monthlyRevenue || []).some(v => abs(v) > 0.004);
      const hasYearlyData = (md.yearlyFinancials || []).some(y => abs(y.income) > 0.004);
      
      if(!hasMonthlyData && hasYearlyData && md.monthlyRevenue) {
        // Don't override - just flag that monthly data is missing
        md._monthlyDataMissing = true;
      }
      
      // Ensure monthlyRevenue, monthlyNet, monthlyExpenses exist as arrays
      if(!Array.isArray(md.monthlyRevenue)) md.monthlyRevenue = [];
      if(!Array.isArray(md.monthlyNet)) md.monthlyNet = [];
      if(!Array.isArray(md.monthlyExpenses)) md.monthlyExpenses = [];
      
      // If we have months defined but no data, fill with zeros
      if((md.months || []).length > 0 && md.monthlyRevenue.length === 0) {
        md.monthlyRevenue = md.months.map(() => 0);
        md.monthlyNet = md.months.map(() => 0);
        md.monthlyExpenses = md.months.map(() => 0);
      }
    };
    
    /* Override analyze to apply recovery after parsing */
    if(typeof analyze === 'function' && !window.__udmrAnalyzeRecoveryOverride) {
      window.__udmrAnalyzeRecoveryOverride = true;
      const baseAnalyze = analyze;
      
      window.analyze = function() {
        baseAnalyze.call(this);
        
        const md = state.model;
        if(md) {
          recoverZeroMetrics(md);
          recoverMonthlyData(md);
        }
      };
    }
    
    /* Enhance renderDashboard to show data from multiple sources */
    if(typeof renderDashboard === 'function' && !window.__udmrEnhancedDashboardRender) {
      window.__udmrEnhancedDashboardRender = true;
      const baseRender = renderDashboard;
      
      renderDashboard = function() {
        const md = state.model;
        if(md) {
          // One more recovery pass before rendering
          recoverZeroMetrics(md);
          recoverMonthlyData(md);
          
          // If monthly revenue is still all zeros, try to populate from metrics
          if(md.monthlyRevenue && md.monthlyRevenue.every(v => abs(v) < 0.005) && 
             md.months && md.months.length === 1 && abs(md.metrics.income) > 0.004) {
            md.monthlyRevenue = [md.metrics.income];
            md.monthlyNet = [md.metrics.net];
            md.monthlyExpenses = [md.metrics.expenses];
          }
        }
        
        return baseRender.call(this);
      };
    }
    
    /* Fix KPI grid to show correct values */
    if(typeof renderDashboard === 'function' && !window.__udmrKpiGridFix) {
      window.__udmrKpiGridFix = true;
      
      const interceptRender = function() {
        const md = state.model;
        if(!md) return;
        
        const m = md.metrics || {};
        const kg = document.getElementById('kpiGrid');
        
        if(kg && kg.innerHTML) {
          // Check if KPIs are showing as $0.00 when they shouldn't
          const kpis = [
            ['Revenue / Income', m.income, m.income],
            ['Gross Profit', m.gross, m.gross],
            ['Net Income', m.net, m.net],
            ['Cash / Bank', m.bank, m.bank],
            ['A/R Total', m.ar, m.ar],
            ['A/P Total', m.ap, m.ap]
          ];
          
          // Rebuild KPI grid if values are available
          if(kpis.some(([_, v, __]) => abs(v) > 0.004)) {
            const p = md.prior || {};
            const chip = (cur, pri) => {
              if(pri === null || pri === undefined || pri === 0) return '—';
              const d = (cur - pri) / Math.abs(pri) * 100;
              return `<span class="${d >= 0 ? 'good' : 'bad'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}% vs PY (${money(pri)})</span>`;
            };
            
            const grossMargin = m.income ? m.gross / m.income * 100 : 0;
            const netMargin = m.income ? m.net / m.income * 100 : 0;
            
            const kpiBuild = [
              ['Revenue / Income', m.income, chip(m.income, p.income)],
              ['Gross Profit', m.gross, pct(grossMargin) + ' gross margin'],
              ['Net Income', m.net, (m.net < 0 ? 'Net loss · ' : '') + chip(m.net, p.net)],
              ['Cash / Bank', m.bank, chip(m.bank, p.bank)],
              ['A/R Total', m.ar, chip(m.ar, p.ar)],
              ['A/P Total', m.ap, chip(m.ap, p.ap)]
            ];
            
            kg.innerHTML = kpiBuild.map(([l, v, sub]) =>
              `<div class="kpi"><small>${l}</small><b class="${v < 0 ? 'neg' : ''}">${money(v)}</b><span class="help">${sub}</span></div>`).join('');
          }
        }
      };
      
      // Patch renderDashboard to run fix after base render
      const origRender = window.renderDashboard;
      window.renderDashboard = function() {
        origRender.call(this);
        setTimeout(interceptRender, 50); // Run after DOM updates
      };
    }
    
    /* Add CSS for better visibility of recovered values */
    if(!document.getElementById('udmr-zero-recovery-style')) {
      const style = document.createElement('style');
      style.id = 'udmr-zero-recovery-style';
      style.textContent = `
        .kpi b {
          font-variant-numeric: tabular-nums;
          min-width: 80px;
          display: inline-block;
        }
        
        .kpi small {
          opacity: 0.7;
          font-size: 11px;
        }
        
        .kpi .help {
          font-size: 11px;
          color: #6d7887;
          margin-top: 2px;
          min-height: 16px;
        }
        
        /* Monthly chart fallback styling */
        .chart-sub {
          font-size: 12px;
          font-weight: 500;
          margin-top: 10px;
          margin-bottom: 8px;
          color: #34445a;
        }
      `;
      document.head.appendChild(style);
    }
  }
})();
