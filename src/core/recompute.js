/* Unison Direct Management Reporting — deterministic impact / recompute engine
 *
 * computeImpact(sheetName, r, c, oldVal, newVal)
 *   → { blocked, blockReason, steps:[{sheet,r,c,label,colLabel,before,after}],
 *       advisories:[string], balance:{assets,liabEquity,diff,balanced}|null }
 *
 * Pure preview — nothing is mutated. applyImpact(steps) writes the values back.
 *
 * The cascade:
 *   1. Every "Total (for) X" span that contains the edited row is re-summed
 *      (opener's own value + direct members) in the edited column.
 *   2. P&L formula rows recompute: Total Income → Gross Profit → Total Expenses
 *      → Net Operating Income → Net Other Income → Net Income.
 *   3. Row-total column (monthly sheets), Change column (comparative sheets)
 *      and % of Income column recompute for every touched row.
 *   4. Cross-statement: Δ P&L Net Income → Balance Sheet "Net Income" (Equity)
 *      → Total for Equity → Total for Liabilities and Equity.
 *      Δ aging grand total → BS A/R (1200) / A/P (2000) account line → its
 *      enclosing totals up to Total for Assets / Total for Liabilities.
 *   5. Balance check (Assets vs Liabilities and Equity) on the previewed values.
 */
'use strict';

function _key(sheet, r, c){ return sheet + ':' + r + ':' + c; }

/* Overlay-aware cell read */
function _val(overlay, sheet, r, c){
  const k = _key(sheet, r, c);
  if (overlay.has(k)) return overlay.get(k);
  const row = (state.sheets[sheet] || [])[r] || [];
  return num(row[c]);
}

function _colLabel(sm, c){
  const col = sm.cols.find(x => x.idx === c);
  return col ? (col.label || '') : '';
}

/* Record a change into overlay + steps if it actually changes the value. */
function _set(ctx, sm, lineIdx, c, after, force = false){
  const line = sm.lines[lineIdx];
  const before = _val(ctx.overlay, sm.name, line.r, c);
  after = round2(after);
  if (!force && Math.abs(after - before) < 0.005) return false;
  ctx.overlay.set(_key(sm.name, line.r, c), after);
  ctx.steps.push({ sheet: sm.name, r: line.r, c, label: line.label,
                   colLabel: _colLabel(sm, c), before, after });
  return true;
}

/* Sum of a span's direct members in column c: opener's own value + top-level
 * accounts + nested group totals. */
function _sumSpan(ctx, sm, openerIdx, c){
  const opener = sm.lines[openerIdx];
  const totalLine = sm.lines[opener.totalIdx];
  let sum = opener.hasValues ? _val(ctx.overlay, sm.name, opener.r, c) : 0;
  let skipUntil = -1;
  for (let i = openerIdx + 1; i < sm.lines.length; i++){
    const l = sm.lines[i];
    if (l.r >= totalLine.r) break;
    if (l.r <= skipUntil) continue;
    if (l.totalIdx !== null){
      sum += _val(ctx.overlay, sm.name, sm.lines[l.totalIdx].r, c);
      skipUntil = sm.lines[l.totalIdx].r;
    } else if (l.kind === 'account'){
      sum += _val(ctx.overlay, sm.name, l.r, c);
    }
  }
  return sum;
}

/* All spans (innermost → outermost) whose row range contains row r */
function _enclosingSpans(sm, r){
  const spans = [];
  for (let i = 0; i < sm.lines.length; i++){
    const l = sm.lines[i];
    if (l.totalIdx === null) continue;
    const endR = sm.lines[l.totalIdx].r;
    if (r > l.r && r < endR) spans.push({ openerIdx: i, endR });
    else if (r === l.r && l.hasValues) spans.push({ openerIdx: i, endR }); // parent account's own value
  }
  spans.sort((a, b) => (a.endR - sm.lines[a.openerIdx].r) - (b.endR - sm.lines[b.openerIdx].r));
  return spans;
}

function _lineIdxByLabel(sm, label){
  const i = sm.byLabel[label.toLowerCase()];
  return i === undefined ? null : i;
}

/* Recompute a sheet's grand TOTAL row (aging sheets) in column c. */
function _sumGrand(ctx, sm, grandIdx, c){
  const grand = sm.lines[grandIdx];
  let sum = 0, skipUntil = -1;
  for (let i = 0; i < sm.lines.length; i++){
    const l = sm.lines[i];
    if (l.r >= grand.r) break;
    if (l.r <= skipUntil) continue;
    if (l.totalIdx !== null){
      sum += _val(ctx.overlay, sm.name, sm.lines[l.totalIdx].r, c);
      skipUntil = sm.lines[l.totalIdx].r;
    } else if (l.kind === 'account'){
      sum += _val(ctx.overlay, sm.name, l.r, c);
    }
  }
  return sum;
}

/* ---------- P&L formula rows ----------
 * Lines are matched on their normalised label (account numbers removed, "&" → "and"), so QuickBooks
 * Online ("Total for Expenses"), QuickBooks Desktop ("Total Expense", "Net Ordinary Income") and
 * spreadsheet layouts ("Total Revenue", "Total Operating Expenses") all resolve.
 * The formulas are only applied when they reproduce the figures already printed in the uploaded
 * statement for that column; if the layout is not understood, nothing is recomputed and an advisory
 * is shown instead — a wrong automatic adjustment is never written. */
const _RX = {
  income:   /^total (for )?(income|revenues?|sales|operating revenues?|net sales|sales revenue|ordinary income)$|^(income|revenues?|sales) total$/,
  incomeSec:/^(income|revenues?|sales|operating revenues?|ordinary income)$/,
  cogs:     /^total (for )?(cost of goods sold|cogs|cost of sales|cost of revenues?|costs? of services|direct costs?)$/,
  cogsSec:  /^(cost of goods sold|cogs|cost of sales|cost of revenues?|costs? of services|direct costs?)$/,
  gross:    /^gross (profit|margin)$/,
  expenses: /^total (for )?(expenses?|operating expenses?|general and administrative expenses?|overhead expenses?)$|^(expenses?|operating expenses?) total$/,
  expSec:   /^(expenses?|operating expenses?|general and administrative expenses?|overhead expenses?)$/,
  noi:      /^net (operating|ordinary) (income|profit|loss)$/,
  oi:       /^total (for )?(other income|other revenues?|non operating income)$/,
  oiSec:    /^(other income|other revenues?|non operating income)$/,
  oe:       /^total (for )?(other expenses?|non operating expenses?)$/,
  oeSec:    /^(other expenses?|non operating expenses?)$/,
  nother:   /^net other (income|expenses?|income expense)$/,
  net:      /^net (income|profit|loss|income loss|earnings)$/
};
function _findLine(sm, rx, kinds){
  for (let i = 0; i < sm.lines.length; i++){
    const l = sm.lines[i];
    if (kinds && !kinds.includes(l.kind)) continue;
    if (rx.test(labelKey(l.label))) return i;
  }
  return null;
}
function _formulaPlan(sm){
  if (sm._formulaPlan !== undefined) return sm._formulaPlan;
  const T = ['total', 'grandTotal', 'computed'];
  const f = (rx, kinds) => _findLine(sm, rx, kinds);
  const plan = { income: f(_RX.income, T), cogs: f(_RX.cogs, T), gross: f(_RX.gross, T), expenses: f(_RX.expenses, T),
                 noi: f(_RX.noi, T), oi: f(_RX.oi, T), oe: f(_RX.oe, T), nother: f(_RX.nother, T), net: f(_RX.net, T) };
  /* A section that exists without a total line cannot be re-summed reliably. */
  const sec = rx => f(rx, ['section']) !== null;
  plan.ok = plan.income !== null && plan.net !== null &&
    !(plan.cogs === null && sec(_RX.cogsSec)) && !(plan.expenses === null && sec(_RX.expSec)) &&
    !(plan.oi === null && sec(_RX.oiSec)) && !(plan.oe === null && sec(_RX.oeSec));
  sm._formulaPlan = plan;
  return plan;
}
function _evalFormulas(plan, read){
  const g = k => plan[k] === null ? 0 : read(plan[k]);
  const gross = g('income') - g('cogs');
  const noi = gross - g('expenses');
  const nother = g('oi') - g('oe');
  return { gross, noi, nother, net: noi + nother };
}
function _recomputeFormulas(ctx, sm, c){
  const plan = _formulaPlan(sm);
  if (!plan.ok){ ctx.formulaWarn = true; return; }
  /* Self-check against the uploaded figures in this column */
  const fileRead = i => num(((state.sheets[sm.name] || [])[sm.lines[i].r] || [])[c]);
  const orig = _evalFormulas(plan, fileRead);
  for (const k of ['gross', 'noi', 'nother', 'net']){
    if (plan[k] === null) continue;
    if (Math.abs(fileRead(plan[k]) - orig[k]) > 0.011){ ctx.formulaWarn = true; return; }
  }
  const now = _evalFormulas(plan, i => _val(ctx.overlay, sm.name, sm.lines[i].r, c));
  for (const k of ['gross', 'noi', 'nother', 'net']) if (plan[k] !== null) _set(ctx, sm, plan[k], c, now[k]);
}

/* Row-derived columns (row Total / Change / %) for every row touched so far
 * plus the edited row. */
function _recomputeRowDerived(ctx, sm, extraRows = []){
  const touchedRows = new Set(
    ctx.steps.filter(s => s.sheet === sm.name).map(s => s.r)
  );
  if (sm.name === ctx.editedSheet) touchedRows.add(ctx.editedRow);
  for (const r of extraRows) touchedRows.add(r);
  const monthCols  = sm.cols.filter(x => x.type === 'month').map(x => x.idx);
  const bucketCols = sm.cols.filter(x => x.type === 'bucket').map(x => x.idx);
  const totCol = sm.cols.find(x => x.type === 'rowTotal');
  const curCol = sm.cols.find(x => x.type === 'current');
  const priCol = sm.cols.find(x => x.type === 'prior');
  const chgCol = sm.cols.find(x => x.type === 'change');
  for (const line of sm.lines){
    if (!touchedRows.has(line.r)) continue;
    const li = sm.lines.indexOf(line);
    if (totCol && (monthCols.length || bucketCols.length)){
      const parts = (monthCols.length ? monthCols : bucketCols)
        .map(c => _val(ctx.overlay, sm.name, line.r, c));
      _set(ctx, sm, li, totCol.idx, parts.reduce((a, b) => a + b, 0));
    }
    if (chgCol && curCol && priCol){
      const cur = _val(ctx.overlay, sm.name, line.r, curCol.idx);
      const pri = _val(ctx.overlay, sm.name, line.r, priCol.idx);
      _set(ctx, sm, li, chgCol.idx, cur - pri);
    }
  }
}

/* Cascade inside one sheet for one edited (or delta-applied) cell. */
function _cascadeCell(ctx, sm, lineIdx, c){
  for (const span of _enclosingSpans(sm, sm.lines[lineIdx].r)){
    const opener = sm.lines[span.openerIdx];
    _set(ctx, sm, opener.totalIdx, c, _sumSpan(ctx, sm, span.openerIdx, c));
  }
  const grandIdx = sm.lines.findIndex(l => l.kind === 'grandTotal');
  if (grandIdx >= 0 && sm.lines[lineIdx].r < sm.lines[grandIdx].r)
    _set(ctx, sm, grandIdx, c, _sumGrand(ctx, sm, grandIdx, c));
  const isPl = ['plMonthly', 'plComparative', 'pl'].includes(sm.role);
  if (isPl) _recomputeFormulas(ctx, sm, c);
}

function _bsValueCol(bs){
  const col = bs.cols.find(x => x.type === 'current') || bs.cols.find(x => x.type === 'rowTotal') ||
              bs.cols.find(x => x.type === 'value');
  return col ? col.idx : 1;
}

function _balanceCheck(ctx){
  const model = state.model;
  const bsName = model && model.roles.bs;
  if (!bsName) return null;
  const bs = model.sheetModels[bsName];
  const c = _bsValueCol(bs);
  const read = rx => {
    const i = _findLine(bs, rx);
    return i === null ? null : _val(ctx.overlay, bsName, bs.lines[i].r, c);
  };
  const assets = read(/^total (for )?assets$/);
  const le = read(/^total (for )?liabilities and (stockholders |shareholders |owners |owner |members |partners )?(equity|capital)$/);
  if (assets === null || le === null) return null;
  const diff = round2(assets - le);
  return { assets, liabEquity: le, diff, balanced: Math.abs(diff) < 0.01 };
}

/* BS line + column for cross-statement targets. */
function _bsTarget(labelRe){
  const model = state.model;
  const bsName = model && model.roles.bs;
  if (!bsName) return null;
  const bs = model.sheetModels[bsName];
  const c = _bsValueCol(bs);
  for (let i = 0; i < bs.lines.length; i++){
    const l = bs.lines[i];
    if (l.kind !== 'account' && l.kind !== 'computed') continue;
    if (labelRe.test(l.label)) return { bs, lineIdx: i, c };
  }
  return null;
}

function computeImpact(sheetName, r, c, oldVal, newVal){
  const model = state.model;
  const result = { blocked: false, blockReason: '', steps: [], advisories: [], balance: null };
  if (!model || !model.sheetModels[sheetName]) return result;
  const sm = model.sheetModels[sheetName];
  const lineIdx = sm.lines.findIndex(l => l.r === r);
  const ctx = { overlay: new Map(), steps: [], editedRow: r, editedSheet: sheetName };
  ctx.overlay.set(_key(sheetName, r, c), round2(num(newVal)));

  const line = lineIdx >= 0 ? sm.lines[lineIdx] : null;
  const colType = (sm.cols.find(x => x.idx === c) || {}).type;

  if (line && ['total', 'grandTotal', 'computed'].includes(line.kind)){
    result.blocked = true;
    result.blockReason =
      `“${line.label}” is a calculated ${line.kind === 'computed' ? 'figure' : 'subtotal'}. ` +
      'It is recomputed automatically from the underlying accounts, so a manual value here will not roll up. ' +
      'Edit the underlying account lines instead, or apply it as a manual override (no automatic adjustments).';
    return result;
  }
  if (colType === 'rowTotal' || colType === 'change' || colType === 'percent'){
    result.blocked = true;
    result.blockReason =
      'This column is derived from the other columns of the row (it is recalculated automatically). ' +
      'Edit the underlying monthly / period values instead, or apply it as a manual override.';
    return result;
  }
  if (!line){
    result.advisories.push('This row is not part of the detected statement structure; the edit will be saved without automatic adjustments.');
    return result;
  }

  /* 1-3. In-sheet cascade + derived columns */
  _cascadeCell(ctx, sm, lineIdx, c);
  _recomputeRowDerived(ctx, sm);
  /* Derived-column changes on subtotal rows: nothing further to cascade —
     row totals are outside the span columns. */

  /* 4. Cross-statement propagation (on the year-to-date basis) */
  const bsName = model.roles.bs;
  const isPl = ['plMonthly', 'plComparative', 'pl'].includes(sm.role);

  if (isPl && bsName && sheetName !== bsName){
    /* Δ Net Income measured on the sheet's YTD column: row Total for monthly,
       current-period column for comparative/generic. */
    const totCol = sm.cols.find(x => x.type === 'rowTotal');
    const curCol = sm.cols.find(x => x.type === 'current');
    const ytdCol = totCol ? totCol.idx : (curCol ? curCol.idx : c);
    const niIdx = _findLine(sm, _RX.net, ['total', 'grandTotal', 'computed']);
    if (niIdx !== null){
      const niLine = sm.lines[niIdx];
      const before = num(((state.sheets[sheetName] || [])[niLine.r] || [])[ytdCol]);
      const after = _val(ctx.overlay, sheetName, niLine.r, ytdCol);
      const delta = round2(after - before);
      if (Math.abs(delta) >= 0.005){
        const target = _bsTarget(/^net income$/i);
        if (target){
          const cur = _val(ctx.overlay, target.bs.name, target.bs.lines[target.lineIdx].r, target.c);
          _set(ctx, target.bs, target.lineIdx, target.c, cur + delta);
          _cascadeCell(ctx, target.bs, target.lineIdx, target.c);
        } else {
          result.advisories.push('The Balance Sheet has no “Net Income” line under Equity — update retained earnings/equity manually to keep the statements consistent.');
        }
      }
    }
    /* Sibling P&L views: the comparative sheet's current-period column is the
       same year-to-date basis, so a monthly edit syncs to it by label match.
       The reverse (comparative -> monthly) cannot be attributed to a month. */
    const compName = model.roles.plComparative;
    if (sm.role === 'plMonthly' && compName && compName !== sheetName){
      const comp = model.sheetModels[compName];
      const compCur = comp.cols.find(x => x.type === 'current');
      const lk = labelKey(line.label);
      const target = (() => { const i = comp.lines.findIndex(x => labelKey(x.label) === lk && x.kind === line.kind); return i < 0 ? null : i; })();
      const delta = round2(num(newVal) - num(oldVal));
      if (compCur && target !== null && Math.abs(delta) >= 0.005){
        const cur = _val(ctx.overlay, compName, comp.lines[target].r, compCur.idx);
        _set(ctx, comp, target, compCur.idx, cur + delta);
        _cascadeCell(ctx, comp, target, compCur.idx);
        _recomputeRowDerived(ctx, comp, [comp.lines[target].r]);
      } else if (compCur && target === null){
        result.advisories.push('No line named \u201C' + line.label + '\u201D was found on ' + compName +
          ' \u2014 update the comparative P&L manually to keep the views consistent.');
      }
    }
    if (sm.role === 'plComparative' && model.roles.plMonthly)
      result.advisories.push('The monthly P&L view cannot be adjusted automatically because the change cannot be attributed to a specific month \u2014 review ' + model.roles.plMonthly + ' manually.');
  }

  if ((sm.role === 'ar' || sm.role === 'ap') && bsName){
    const grandIdx = sm.lines.findIndex(l => l.kind === 'grandTotal');
    const totCol = sm.cols.find(x => x.type === 'rowTotal');
    if (grandIdx >= 0 && totCol){
      const gLine = sm.lines[grandIdx];
      const before = num(((state.sheets[sheetName] || [])[gLine.r] || [])[totCol.idx]);
      const after = _val(ctx.overlay, sheetName, gLine.r, totCol.idx);
      const delta = round2(after - before);
      if (Math.abs(delta) >= 0.005){
        const target = sm.role === 'ar'
          ? _bsTarget(/accounts receivable/i)
          : _bsTarget(/accounts payable/i);
        if (target){
          const cur = _val(ctx.overlay, target.bs.name, target.bs.lines[target.lineIdx].r, target.c);
          _set(ctx, target.bs, target.lineIdx, target.c, cur + delta);
          _cascadeCell(ctx, target.bs, target.lineIdx, target.c);
          result.advisories.push(
            (sm.role === 'ar' ? 'Accounts Receivable' : 'Accounts Payable') +
            ' on the Balance Sheet was adjusted to match the aging total. A one-sided change like this usually needs a matching entry (income/expense or offsetting account) — review the balance check below.');
        } else {
          result.advisories.push('No matching Accounts ' + (sm.role === 'ar' ? 'Receivable' : 'Payable') +
            ' line was found on the Balance Sheet — adjust it manually to keep the statements consistent.');
        }
      }
    }
  }

  if (ctx.formulaWarn)
    result.advisories.push('Gross Profit / Net Income on this sheet could not be recalculated automatically because its layout does not reproduce the uploaded totals — review those lines after applying the edit.');
  if (isPl && sm.cols.some(x => x.type === 'percent'))
    result.advisories.push('The percentage column on this sheet comes from the uploaded file and is not recalculated for this edit.');

  /* % of Income advisory */
  if (isPl && model.roles.plPercent && sheetName !== model.roles.plPercent)
    result.advisories.push('The “% of Income” view is recalculated from its own worksheet and may be stale after this change.');

  result.steps = ctx.steps;
  result.balance = _balanceCheck(ctx);
  return result;
}

/* Write the previewed steps into the raw sheets. The user's own cell is marked
 * `edited` by the caller; every cascaded cell is marked `adjusted`. */
function applyImpact(steps){
  for (const s of steps){
    const rows = state.sheets[s.sheet];
    if (!rows) continue;
    while (rows.length <= s.r) rows.push([]);
    rows[s.r][s.c] = s.after;
    state.adjusted.add(_key(s.sheet, s.r, s.c));
  }
}
