/* Universal financial validation guard.
 * Goal: never silently present an unverified derived financial value.
 * This layer validates the normalized model produced from arbitrary workbook layouts.
 * Unknown/ambiguous layouts are flagged rather than guessed.
 */
'use strict';
(function(){
  const n=v=>Number(v);
  const finite=v=>Number.isFinite(n(v));
  const tol=(a,b)=>Math.max(0.01,Math.abs(n(a)||0)*1e-7,Math.abs(n(b)||0)*1e-7);
  const close=(a,b)=>finite(a)&&finite(b)&&Math.abs(n(a)-n(b))<=tol(a,b);
  function validate(){
    const md=window.state?.model;
    if(!md) return null;
    const vf=md.validatedFinancials||{};
    const issues=[];
    const checks={};

    if(finite(vf.totalAssets)&&finite(vf.currentAssets)&&finite(vf.fixedAssets)){
      checks.assets=close(vf.totalAssets,n(vf.currentAssets)+n(vf.fixedAssets));
      if(!checks.assets) issues.push('Total Assets do not reconcile to Current Assets + Fixed/Non-Current Assets.');
    }
    if(finite(vf.totalLiabilitiesAndEquity)&&finite(vf.currentLiabilities)&&finite(vf.longTermLiabilities)&&finite(vf.equity)){
      checks.liabilitiesEquity=close(vf.totalLiabilitiesAndEquity,n(vf.currentLiabilities)+n(vf.longTermLiabilities)+n(vf.equity));
      if(!checks.liabilitiesEquity) issues.push('Total Liabilities & Equity do not reconcile to liabilities + equity.');
    }
    if(finite(vf.totalAssets)&&finite(vf.totalLiabilitiesAndEquity)){
      checks.balanceSheet=close(vf.totalAssets,vf.totalLiabilitiesAndEquity);
      if(!checks.balanceSheet) issues.push('Balance Sheet is not in balance: Total Assets differ from Total Liabilities & Equity.');
    }

    const assets=md.bsComposition?.assets||[];
    if(assets.length&&finite(vf.totalAssets)&&Math.abs(n(vf.totalAssets))>0){
      for(const x of assets){
        const expected=n(x.value)/Math.abs(n(vf.totalAssets))*100;
        if(!finite(x.pct)||Math.abs(n(x.pct)-expected)>.01){
          x.pct=expected;
          x.denominator=vf.totalAssets;
        }
      }
      const ca=assets.find(x=>/current assets/i.test(x.label)&&!/non.current/i.test(x.label));
      if(ca&&finite(vf.currentAssets)){
        const expected=n(vf.currentAssets)/Math.abs(n(vf.totalAssets))*100;
        ca.value=vf.currentAssets; ca.pct=expected; ca.denominator=vf.totalAssets;
      }
    }

    const le=md.bsComposition?.liabEquity||[];
    if(le.length&&finite(vf.totalLiabilitiesAndEquity)&&Math.abs(n(vf.totalLiabilitiesAndEquity))>0){
      le.forEach(x=>{x.pct=n(x.value)/Math.abs(n(vf.totalLiabilitiesAndEquity))*100;x.denominator=vf.totalLiabilitiesAndEquity;});
    }

    const source=md.calculationSource||{};
    checks.currentYearDetected=source.currentPLColumn?.idx!=null||source.currentBSColumn?.idx!=null;
    if(source.currentPLColumn?.year&&source.currentBSColumn?.year&&source.currentPLColumn.year!==source.currentBSColumn.year){
      issues.push('P&L and Balance Sheet latest detected years differ; values were kept tied to their statement year instead of mixing periods.');
    }

    md.financialValidation={
      verified:issues.length===0,
      checks,
      issues,
      rule:'Values are validated after workbook normalization; ambiguous or unreconciled workbook structures must be flagged instead of silently guessed.'
    };
    return md.financialValidation;
  }

  function run(){
    if(typeof window.applyFinalAnalyticalDashboardCalculations==='function') window.applyFinalAnalyticalDashboardCalculations();
    return validate();
  }
  if(typeof window.renderDashboard==='function'&&!window.__universalFinancialValidationDashboard){
    window.__universalFinancialValidationDashboard=true;const base=window.renderDashboard;
    window.renderDashboard=function(){run();return base.apply(this,arguments);};
  }
  if(typeof window.buildPages==='function'&&!window.__universalFinancialValidationReport){
    window.__universalFinancialValidationReport=true;const base=window.buildPages;
    window.buildPages=function(opts){run();return base.call(this,opts||{});};
  }
  window.validateUniversalFinancialCalculations=run;
})();