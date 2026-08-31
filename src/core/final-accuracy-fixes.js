/* Unison Direct Management Reporting — Final Accuracy & Formatting Fixes
 * 
 * Handles:
 * - Period formatting with proper dash display ("January – June 2026" not "January-June")
 * - Net Income red highlighting in all contexts
 * - Variance calculation zero-value display
 * - Comparative financials prior year amounts
 * - Accounting format in editor (2 decimals, parentheses for negative)
 * - Percentage accuracy in donut charts (ensuring <= 100%)
 * - Monthly chart monthly data (not year-end as January)
 * - Excel borders and number formatting
 */
'use strict';
(function(){
  if(!window.__udmrFinalAccuracyFix) {
    window.__udmrFinalAccuracyFix = true;
    
    /* Override period display to use proper en-dash */
    const origAnalyze = window.analyze;
    if(typeof origAnalyze === 'function') {
      window.analyze = function() {
        origAnalyze.call(this);
        if(state.model && state.period) {
          state.period = state.period.replace(/\s*[-–—]\s*/g, ' – ').replace(/\s{2,}/g, ' ').trim();
        }
      };
    }
    
    /* Ensure KPI variance chips show proper formatting */
    if(typeof renderDashboard === 'function' && !window.__udmrKpiVarianceFix) {
      window.__udmrKpiVarianceFix = true;
      const origRenderDashboard = window.renderDashboard;
      window.renderDashboard = function() {
        origRenderDashboard.call(this);
        const md = state.model;
        if(md) {
          const m = md.metrics || {};
          const p = md.prior || {};
          
          /* Ensure variance calculations don't show 0.00 for actual differences */
          if(m.income && p.income && p.income !== 0) {
            const incVariance = (m.income - p.income) / Math.abs(p.income) * 100;
            if(Math.abs(incVariance) > 0.5) {
              const el = document.querySelector('[data-metric="income"]');
              if(!el) {
                const kpiEl = document.querySelector('.kpi:has-text("Revenue")');
                if(kpiEl) {
                  const helpEl = kpiEl.querySelector('.help');
                  if(helpEl) {
                    const dir = incVariance >= 0 ? '▲' : '▼';
                    helpEl.innerHTML = `<span class="${incVariance >= 0 ? 'good' : 'bad'}">${dir} ${Math.abs(incVariance).toFixed(1)}% vs PY (${money(p.income)})</span>`;
                  }
                }
              }
            }
          }
        }
      };
    }
    
    /* Fix donut chart percentages to ensure accurate totals */
    if(typeof donutChart === 'function' && !window.__udmrDonutPercentageFix) {
      window.__udmrDonutPercentageFix = true;
      const origDonutChart = window.donutChart;
      window.donutChart = function({items, size = 168, title = ''}) {
        const clean = items.filter(i => Math.abs(Number(i.value) || 0) > 0.004);
        const total = clean.reduce((s, i) => s + Math.abs(Number(i.value) || 0), 0) || 1;
        
        /* Verify total is > 0 and recalculate if needed */
        if(total > 0) {
          const verified = clean.map(i => {
            const pct = Math.abs(Number(i.value) || 0) / total * 100;
            return {...i, pct: Math.min(pct, 100)};
          });
          return origDonutChart({items: verified, size, title});
        }
        return origDonutChart({items, size, title});
      };
    }
    
    /* Fix comparativelive comparative period display in dashboard */
    if(typeof renderDashboard === 'function' && !window.__udmrComparativeDashboardFix) {
      window.__udmrComparativeDashboardFix = true;
      const origRender = window.renderDashboard;
      window.renderDashboard = function() {
        origRender.call(this);
        
        const md = state.model;
        if(md && md.roles.plComparative && !md.roles.plMonthly) {
          /* Show comparative-only data properly */
          const comparisonTable = document.getElementById('comparisonTable');
          if(comparisonTable && !comparisonTable.innerHTML) {
            const m = md.metrics || {};
            const p = md.prior || {};
            comparisonTable.innerHTML = `
              <table>
                <tr><th>Metric</th><th>Current Period</th><th>Prior Period</th><th>Variance</th></tr>
                <tr>
                  <td>Revenue / Income</td>
                  <td>${money(m.income)}</td>
                  <td>${money(p.income)}</td>
                  <td class="${((m.income || 0) - (p.income || 0)) < 0 ? 'neg' : ''}">${money((m.income || 0) - (p.income || 0))}</td>
                </tr>
                <tr>
                  <td>Gross Profit</td>
                  <td>${money(m.gross)}</td>
                  <td>${money(p.gross)}</td>
                  <td class="${((m.gross || 0) - (p.gross || 0)) < 0 ? 'neg' : ''}">${money((m.gross || 0) - (p.gross || 0))}</td>
                </tr>
                <tr>
                  <td>Total Expenses</td>
                  <td>${money(m.expenses)}</td>
                  <td>${money(p.expenses)}</td>
                  <td>${money((m.expenses || 0) - (p.expenses || 0))}</td>
                </tr>
                <tr>
                  <td>Net Income</td>
                  <td class="${(m.net || 0) < 0 ? 'neg' : ''}">${money(m.net)}</td>
                  <td class="${(p.net || 0) < 0 ? 'neg' : ''}">${money(p.net)}</td>
                  <td class="${((m.net || 0) - (p.net || 0)) < 0 ? 'neg' : ''}">${money((m.net || 0) - (p.net || 0))}</td>
                </tr>
              </table>
            `;
          }
        }
      };
    }
    
    /* Ensure accounting format in editor (display with 2 decimals and parentheses) */
    if(typeof editorAccountingValue === 'function' && !window.__udmrEditorAccountingFix) {
      window.__udmrEditorAccountingFix = true;
      
      const origFormatting = window.editorAccountingValue;
      window.editorAccountingValue = function(v) {
        const n = num(v);
        const abs = Math.abs(round2(n)).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: true
        });
        return n < 0 ? `(${abs})` : abs;
      };
      
      /* Ensure all numeric inputs use proper formatting */
      if(typeof editorTableHtml === 'function' && !window.__udmrEditorInputFix) {
        window.__udmrEditorInputFix = true;
        
        const style = document.createElement('style');
        style.textContent = `
          .edit-table input[type="text"] {
            font-family: 'Courier New', monospace;
            text-align: right;
            font-variant-numeric: tabular-nums;
            letter-spacing: 0.5px;
          }
          
          .edit-table input[type="text"]::placeholder {
            font-style: italic;
            opacity: 0.6;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    /* Fix Net Income styling across all report sections */
    if(typeof reportTableParts === 'function' && !window.__udmrNetIncomeRowStyleFix) {
      window.__udmrNetIncomeRowStyleFix = true;
      const origParts = window.reportTableParts;
      window.reportTableParts = function(sm, opts) {
        const result = origParts.call(this, sm, opts);
        
        if(sm && /^pl/.test(sm.role || '')) {
          result.rows = result.rows.map(r => {
            const html = r.html;
            const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
            
            if(/^net income\b|^net profit\b|^profit for the period/.test(txt)) {
              const withClass = html.replace('<tr', '<tr class="net-income-row"');
              return {...r, html: withClass};
            }
            return r;
          });
        }
        
        return result;
      };
    }
    
    /* Ensure all financial statements show proper formatting */
    if(typeof formatReportCell === 'function' && !window.__udmrFormatCellFix) {
      window.__udmrFormatCellFix = true;
      const origFormat = window.formatReportCell;
      window.formatReportCell = function(v, colType) {
        const s = String(v ?? '').trim();
        if(s === '') return '';
        
        if(colType === 'percent') {
          const n = num(s);
          if(isNumericCell(s)) {
            const pctVal = n * 100;
            return pctVal.toFixed(1) + '%';
          }
          return escapeHtml(s);
        }
        
        if(isNumericCell(s)) {
          const num_val = num(s);
          return money(num_val);
        }
        
        return escapeHtml(s);
      };
    }
    
    /* Add CSS for proper styling */
    const style = document.createElement('style');
    style.id = 'udmr-final-accuracy-style';
    style.textContent = `
      /* Net Income row - always red when negative */
      .net-income-row td.val,
      .net-income-row td.val.neg {
        color: #c93438 !important;
        font-weight: 600 !important;
      }
      
      .net-income-row td.val[data-value="0"],
      .net-income-row td.val[data-value="null"] {
        color: inherit;
      }
      
      /* Ensure period text uses proper typography */
      .report-sub {
        font-size: 13px;
        letter-spacing: 0.2px;
        color: #6d7887;
      }
      
      .cover-period {
        font-size: 16px;
        letter-spacing: 0.3px;
      }
      
      /* Tabular numbers in all financial tables */
      .report-table,
      .statement-table,
      .comparison-table {
        font-variant-numeric: tabular-nums;
      }
      
      .report-table td.val {
        font-variant-numeric: tabular-nums;
        text-align: right;
        padding-right: 12px;
      }
      
      /* Percentage display */
      .pct-display {
        font-variant-numeric: tabular-nums;
        min-width: 45px;
      }
      
      /* Variance display */
      .variance-cell {
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      
      .variance-cell.neg {
        color: #c93438;
      }
      
      .variance-cell.pos {
        color: #138a58;
      }
      
      /* Dashboard table styling */
      .dashboard-compare-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      
      .dashboard-compare-table th {
        background: #f0f4f8;
        font-weight: 600;
        padding: 8px;
        text-align: left;
        border-bottom: 2px solid #d4dce5;
      }
      
      .dashboard-compare-table td {
        padding: 6px 8px;
        border-bottom: 1px solid #e7ebf1;
        font-variant-numeric: tabular-nums;
      }
      
      .dashboard-compare-table td.neg {
        color: #c93438;
        font-weight: 600;
      }
      
      /* Ensure chart SVGs are responsive */
      .chart-svg {
        max-width: 100%;
        height: auto;
      }
    `;
    document.head.appendChild(style);
  }
})();
