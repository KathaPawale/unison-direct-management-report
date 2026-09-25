/* Unison Direct Management Reporting — financial analysis
 *
 * analyzeFinancials(model, sheets) fills the parsed model with every figure the
 * dashboard, report and exports use. This is the single source of truth: nothing
 * downstream re-derives or "fixes" these values.
 *
 * Formulas (as agreed in the UD Financial Format tracker):
 *   Current Assets %        = Total Current Assets / Total Assets × 100
 *   Fixed Assets %          = Total Fixed Assets (net) / Total Assets × 100
 *   Current Liabilities %   = Total Current Liabilities / Total Liabilities & Equity × 100
 *   Long-Term Liabilities % = Total Long-Term Liabilities / Total Liabilities & Equity × 100
 *   Equity %                = Total Equity / Total Liabilities & Equity × 100 (negative when equity is negative)
 *   Expense ratio           = Expense category / Total Expenses × 100
 */
'use strict';

const _T = names => [new RegExp('^total (for )?(' + names + ')$'), new RegExp('^(' + names + ') total$')];
const _S = names => [new RegExp('^(' + names + ')$')];

const FIN = {
  income:   { names: 'income|revenues?|sales|operating revenues?|net sales|sales revenue|revenue from operations|ordinary income|turnover' },
  cogs:     { names: 'cost of goods sold|cogs|cost of sales|cost of revenues?|costs? of services|direct costs?|cost of goods' },
  expenses: { names: 'expenses?|operating expenses?|general and administrative expenses?|overhead expenses?|total operating expenses' },
  otherIncome:   { names: 'other income|other revenues?|non operating income' },
  otherExpenses: { names: 'other expenses?|non operating expenses?' },
  assets:   { names: 'assets' },
  currentAssets: { names: 'current assets' },
  fixedAssets:   { names: 'fixed assets|net fixed assets|property plant and equipment|property and equipment|property plant equipment|ppe|long term assets|non current assets|noncurrent assets|capital assets' },
  otherAssets:   { names: 'other assets|other non current assets|other long term assets' },
  liabilities:   { names: 'liabilities' },
  currentLiabilities: { names: 'current liabilities' },
  longTermLiabilities: { names: 'long term liabilities|non current liabilities|noncurrent liabilities|long term debt|long term loans' },
  equity:   { names: 'equity|stockholders equity|shareholders equity|owners equity|owner equity|members equity|partners equity|partners capital|capital|net worth|shareholders funds' },
  totalLE:  { names: 'liabilities and (stockholders |shareholders |owners |owner |members |partners )?(equity|capital)|liabilities equity|liabilities and net worth' },
  bank:     { names: 'bank accounts|bank|banks|cash and cash equivalents|cash and bank|cash at bank|cash in bank|cash' },
  ar:       { names: 'accounts receivable|accounts receivable a r|a r|trade receivables|trade accounts receivable' },
  ap:       { names: 'accounts payable|accounts payable a p|a p|trade payables|trade accounts payable' }
};

/* ---------- low-level access ---------- */

function _prepLines(sm){
  for (const l of sm.lines) if (l.mkey === undefined) l.mkey = labelKey(l.label);
}

function periodSpec(sm, which){
  if (!sm) return null;
  const idx = t => { const c = sm.cols.find(x => x.type === t); return c ? c.idx : null; };
  if (which === 'prior'){ const p = idx('prior'); return p === null ? null : { idx: p }; }
  if (which === 'current'){
    const cur = idx('current'); if (cur !== null) return { idx: cur };
    const tot = idx('rowTotal'); if (tot !== null) return { idx: tot };
    const months = sm.cols.filter(c => c.type === 'month').map(c => c.idx);
    if (months.length) return { sum: months };
    const val = sm.cols.find(c => c.type === 'value'); return val ? { idx: val.idx } : null;
  }
  return null;
}

function _amount(sheets, sm, r, spec){
  if (!spec) return null;
  const row = (sheets[sm.name] || [])[r] || [];
  if (spec.idx !== undefined) return parseAmount(row[spec.idx]);
  let any = false, s = 0;
  for (const i of spec.sum){ const v = parseAmount(row[i]); if (v !== null){ any = true; s += v; } }
  return any ? s : null;
}

function _hasIndent(sm){ return sm.lines.some(l => l.indent > 0); }

/* Row span [from, to) of a group opened at openerIdx. */
function _span(sm, openerIdx){
  const o = sm.lines[openerIdx];
  if (o.totalIdx !== null) return { from: openerIdx + 1, to: o.totalIdx };
  let j = openerIdx + 1;
  if (_hasIndent(sm)){
    while (j < sm.lines.length && sm.lines[j].indent > o.indent && sm.lines[j].kind !== 'grandTotal') j++;
  } else {
    while (j < sm.lines.length && !['section', 'computed', 'grandTotal', 'total'].includes(sm.lines[j].kind)) j++;
  }
  return { from: openerIdx + 1, to: j };
}

/* Sum of posting (leaf/account) lines inside a group — the opener's own value included. */
function _leafSum(sheets, sm, openerIdx, spec, toOverride){
  const { from, to } = _span(sm, openerIdx);
  const end = toOverride ?? to;
  let s = 0, any = false;
  const o = sm.lines[openerIdx];
  if (o.kind === 'account'){ const v = _amount(sheets, sm, o.r, spec); if (v !== null){ s += v; any = true; } }
  for (let i = from; i < end; i++){
    const l = sm.lines[i];
    if (l.kind !== 'account') continue;
    const v = _amount(sheets, sm, l.r, spec);
    if (v !== null){ s += v; any = true; }
  }
  return any ? s : null;
}

function _find(sm, res, kinds, last = false){
  const hits = [];
  sm.lines.forEach((l, i) => { if ((!kinds || kinds.includes(l.kind)) && res.some(re => re.test(l.mkey))) hits.push(i); });
  if (!hits.length) return -1;
  return last ? hits[hits.length - 1] : hits[0];
}

/* Value of a statement total: explicit "Total X" line → group leaf sum → plain line. */
function _statementValue(sheets, sm, spec, key, { last = false, withinRows = null } = {}){
  if (!sm || !spec) return null;
  const names = FIN[key].names;
  const inRange = i => !withinRows || (sm.lines[i].r > withinRows[0] && sm.lines[i].r < withinRows[1]);
  const totals = _T(names);
  const tIdx = sm.lines.map((l, i) => i).filter(i => inRange(i) && ['total', 'grandTotal', 'computed', 'account'].includes(sm.lines[i].kind) && totals.some(re => re.test(sm.lines[i].mkey)));
  const ordered = last ? tIdx.reverse() : tIdx;
  for (const i of ordered){
    const v = _amount(sheets, sm, sm.lines[i].r, spec);
    if (v !== null) return v;
  }
  const secs = _S(names);
  for (let i = 0; i < sm.lines.length; i++){
    const l = sm.lines[i];
    if (!inRange(i) || !['section', 'account'].includes(l.kind) || !secs.some(re => re.test(l.mkey))) continue;
    if (l.totalIdx !== null){
      const v = _amount(sheets, sm, sm.lines[l.totalIdx].r, spec);
      if (v !== null) return v;
    }
    if (l.kind === 'section' || l.totalIdx !== null || (_hasIndent(sm) && sm.lines[i + 1] && sm.lines[i + 1].indent > l.indent)){
      const v = _leafSum(sheets, sm, i, spec);
      if (v !== null) return v;
    }
    if (l.kind === 'account'){
      const v = _amount(sheets, sm, l.r, spec);
      if (v !== null) return v;
    }
  }
  return null;
}

/* ---------- P&L ---------- */

function plFigures(sheets, sm, spec){
  if (!sm || !spec) return null;
  const v = (k, o) => _statementValue(sheets, sm, spec, k, o);
  const income = v('income');
  const cogs = v('cogs');
  const expenses = v('expenses');
  const otherIncome = v('otherIncome');
  const otherExpenses = v('otherExpenses');
  let gross = null;
  const gi = _find(sm, [/^gross (profit|margin)( loss)?$/]);
  if (gi >= 0) gross = _amount(sheets, sm, sm.lines[gi].r, spec);
  if (gross === null && income !== null) gross = income - (cogs || 0);
  let net = null;
  const ni = _find(sm, [/^net (income|profit|loss|income loss|profit loss|earnings|surplus|deficit)$/], null, true);
  if (ni >= 0) net = _amount(sheets, sm, sm.lines[ni].r, spec);
  if (net === null && income !== null)
    net = income - (cogs || 0) - (expenses || 0) + (otherIncome || 0) - (otherExpenses || 0);
  return { income, cogs, gross, expenses, otherIncome, otherExpenses, net };
}

/* Expense breakdown: top-level categories of the Expenses section, each valued as the sum of all
 * of its sub-ledgers (so every sub-ledger is counted under its parent exactly once).
 * Expense ratio = category / Total Expenses × 100, Total Expenses being the statement's own total. */
function expenseBreakdown(sheets, sm, spec, totalExpenses){
  if (!sm || !spec) return { items: [], total: 0 };
  const items = [];
  const hasIndent = _hasIndent(sm);
  let sectionTotal = null;
  for (const key of ['expenses']){
    const oi = _find(sm, _S(FIN[key].names), ['section', 'account']);
    if (oi < 0) continue;
    const { from, to } = _span(sm, oi);
    const sectionLeaf = _leafSum(sheets, sm, oi, spec, to);
    if (sectionLeaf !== null) sectionTotal = sectionLeaf;
    let i = from;
    while (i < to){
      const l = sm.lines[i];
      if (l.kind === 'account' || l.kind === 'section'){
        if (l.totalIdx !== null && l.totalIdx < to){
          const val = _leafSum(sheets, sm, i, spec);
          if (val !== null) items.push({ label: l.label, value: val });
          i = l.totalIdx + 1; continue;
        }
        if (hasIndent && sm.lines[i + 1] && i + 1 < to && sm.lines[i + 1].indent > l.indent){
          let j = i + 1;
          while (j < to && sm.lines[j].indent > l.indent) j++;
          const val = _leafSum(sheets, sm, i, spec, j);
          if (val !== null) items.push({ label: l.label, value: val });
          i = j; continue;
        }
        if (l.kind === 'account'){
          const val = _amount(sheets, sm, l.r, spec);
          if (val !== null) items.push({ label: l.label, value: val });
        }
      }
      i++;
    }
  }
  /* Fallback for statements without an Expenses section: accounts between Gross Profit and Total Expenses. */
  if (!items.length){
    const start = _find(sm, [/^gross (profit|margin)$/, ..._T(FIN.income.names)]);
    const end = _find(sm, _T(FIN.expenses.names));
    if (start >= 0 && end > start){
      for (let i = start + 1; i < end; i++){
        const l = sm.lines[i];
        if (l.kind !== 'account') continue;
        const val = _amount(sheets, sm, l.r, spec);
        if (val !== null) items.push({ label: l.label, value: val });
      }
    }
  }
  const merged = new Map();
  for (const it of items){
    const k = normLabel(it.label);
    if (merged.has(k)) merged.get(k).value += it.value; else merged.set(k, { ...it });
  }
  const list = [...merged.values()].filter(x => Math.abs(x.value) >= 0.005);
  list.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  /* Bug 4: every category is a share of the Expenses section itself — the leaf sum of its direct
   * children — never a separate "Total for Expenses" line that can exclude part of the section. */
  const itemSum = list.reduce((s, x) => s + x.value, 0);
  const total = sectionTotal !== null && Math.abs(sectionTotal) >= 0.005 ? sectionTotal : itemSum;
  let pctBase = Math.abs(total);
  list.forEach(x => { x.pct = pctBase >= 0.005 ? x.value / pctBase * 100 : 0; });
  /* Hard cap: a share above 100% can only come from credits / refunds (negative expense lines)
   * shrinking the net total. Shares then use total expense activity (the sum of the rows as absolute
   * values) so none exceeds 100%; `total` stays the real Total Expenses shown everywhere. */
  if (list.some(x => x.pct > 100 || x.pct < -100)){
    pctBase = list.reduce((s, x) => s + Math.abs(x.value), 0);
    list.forEach(x => { x.pct = pctBase ? x.value / pctBase * 100 : 0; });
  }
  return { items: list, total, pctBase };
}

/* ---------- Balance Sheet ---------- */

function bsFigures(sheets, sm, spec, basis){
  if (!sm || !spec) return null;
  const v = k => _statementValue(sheets, sm, spec, k);
  let assets = v('assets'), currentAssets = v('currentAssets'), fixedAssets = v('fixedAssets'), otherAssets = v('otherAssets');
  let liabilities = v('liabilities'), currentLiabilities = v('currentLiabilities'), longTermLiabilities = v('longTermLiabilities');
  let equity = v('equity'), totalLE = v('totalLE');

  if (liabilities === null && (currentLiabilities !== null || longTermLiabilities !== null))
    liabilities = (currentLiabilities || 0) + (longTermLiabilities || 0);
  if (longTermLiabilities === null && liabilities !== null && currentLiabilities !== null)
    longTermLiabilities = liabilities - currentLiabilities;
  if (currentLiabilities === null && liabilities !== null && longTermLiabilities !== null)
    currentLiabilities = liabilities - longTermLiabilities;
  if (currentLiabilities === null && liabilities !== null && longTermLiabilities === null){ currentLiabilities = liabilities; longTermLiabilities = 0; }
  if (totalLE === null && liabilities !== null && equity !== null) totalLE = liabilities + equity;
  if (equity === null && totalLE !== null && liabilities !== null) equity = totalLE - liabilities;
  if (assets === null && currentAssets !== null) assets = currentAssets + (fixedAssets || 0) + (otherAssets || 0);
  if (totalLE === null) totalLE = assets;
  if (fixedAssets === null && assets !== null && currentAssets !== null)
    fixedAssets = assets - currentAssets - (otherAssets || 0);
  if (currentAssets === null && assets !== null && fixedAssets !== null)
    currentAssets = assets - fixedAssets - (otherAssets || 0);

  const pctOf = (x, d) => (x === null || d === null || Math.abs(d) < 0.005) ? null : x / Math.abs(d) * 100;
  const pctOfSigned = (x, d) => (x === null || d === null || Math.abs(d) < 0.005) ? null : x / d * 100;
  /* Row 36: when the denominator is negative or zero, raw signed percentages can
   * exceed 100 percent, producing a donut that visually breaks. Rescale each slice
   * using the sum of absolute values so no item exceeds 100 percent. Negative values
   * keep their sign as a display flag. Tracker row 36: the same rescale applies to a positive
   * total whenever a raw share would exceed 100% (e.g. negative equity pushing Long-Term
   * Liabilities above 100% of Total L&E), so no share ever exceeds 100% and equity stays negative. */
  const rescaleForNegativeTotal = (items, total) => {
    if (!items || !items.length) return;
    const over100 = items.some(x => x.pct !== null && x.pct !== undefined && Math.abs(x.pct) > 100);
    if (!over100 && (total === null || total > 0)) return;
    const absTotal = items.reduce((s, x) => s + Math.abs(x.value), 0);
    if (absTotal < 0.005) return;
    items.forEach(x => { x.pct = (x.value / absTotal) * 100; });
  };
  const assetItems = [];
  if (assets !== null){
    if (currentAssets !== null) assetItems.push({ label: 'Current Assets', value: currentAssets });
    if (fixedAssets !== null) assetItems.push({ label: 'Fixed Assets', value: fixedAssets });
    if (otherAssets !== null) assetItems.push({ label: 'Other Assets', value: otherAssets });
    const resid = assets - assetItems.reduce((s, x) => s + x.value, 0);
    if (assetItems.length && Math.abs(resid) >= 0.5){
      const fx = assetItems.find(x => x.label === 'Fixed Assets');
      if (fx) fx.value += resid; else assetItems.push({ label: 'Fixed Assets', value: resid });
      if (fx) fixedAssets = fx.value; else fixedAssets = resid;
    }
    for (let i = assetItems.length - 1; i >= 0; i--) if (Math.abs(assetItems[i].value) < 0.005) assetItems.splice(i, 1);
    assetItems.forEach(x => { x.pct = pctOf(x.value, assets); });
    rescaleForNegativeTotal(assetItems, assets);
  }
  /* Bug 2: Liabilities Bifurcation is "share of total liabilities". Every row uses the same
   * denominator — the sum of the rows shown (current + long-term + other liabilities) — so the rows
   * always add up to exactly 100%, whatever equity or Total L&E are. */
  const liabilityRows = [];
  if (currentLiabilities !== null) liabilityRows.push({ label: 'Current Liabilities', value: currentLiabilities });
  if (longTermLiabilities !== null) liabilityRows.push({ label: 'Long-Term Liabilities', value: longTermLiabilities });
  const liabResid = liabilities !== null ? liabilities - (currentLiabilities || 0) - (longTermLiabilities || 0) : 0;
  if (Math.abs(liabResid) >= 0.5) liabilityRows.push({ label: 'Other Liabilities', value: liabResid });
  /* Row 14: Current and Long-Term Liabilities are both always listed ($0.00 when empty); with no
   * liabilities at all there is nothing to bifurcate, so no rows and no table. */
  if (liabilityRows.every(x => Math.abs(x.value) < 0.005)) liabilityRows.length = 0;
  const liabilitySumForPct = liabilityRows.reduce((s, x) => s + x.value, 0);
  liabilityRows.forEach(x => { x.pct = Math.abs(liabilitySumForPct) >= 0.005 ? x.value / liabilitySumForPct * 100 : null; });
  const leItems = [];
  if (totalLE !== null){
    if (currentLiabilities !== null) leItems.push({ label: 'Current Liabilities', value: currentLiabilities });
    if (longTermLiabilities !== null) leItems.push({ label: 'Long-Term Liabilities', value: longTermLiabilities });
    const liabResid = liabilities !== null ? liabilities - (currentLiabilities || 0) - (longTermLiabilities || 0) : 0;
    if (Math.abs(liabResid) >= 0.5) leItems.push({ label: 'Other Liabilities', value: liabResid });
    if (equity !== null) leItems.push({ label: 'Equity', value: equity });
    leItems.forEach(x => { x.pct = pctOf(x.value, totalLE); });
    rescaleForNegativeTotal(leItems, totalLE);
  }

  /* Cash / bank */
  let bank = v('bank');
  if (bank === null){
    const bankTot = _find(sm, [/^total\s+(for\s+)?bank\s+accounts?$/i], ['total']);
    if (bankTot >= 0){
      const a = _amount(sheets, sm, sm.lines[bankTot].r, spec);
      if (a !== null) bank = a;
    }
  }
  if (bank === null){
    const bankSec = _find(sm, [/^bank\s+accounts?$/i], ['section']);
    if (bankSec >= 0){
      const rng = _span(sm, bankSec);
      let s = 0, any = false;
      for (let i = rng.from; i < rng.to; i++){
        const l = sm.lines[i];
        if (l.kind !== 'account') continue;
        if (/receivable|undeposited|clearing|payable|loan|credit card|prepaid/.test(l.mkey)) continue;
        const a = _amount(sheets, sm, l.r, spec);
        if (a !== null){ s += a; any = true; }
      }
      if (any) bank = s;
    }
  }
  if (bank === null){
    const ca = _find(sm, _S(FIN.currentAssets.names), ['section', 'account']);
    const rng = ca >= 0 ? _span(sm, ca) : { from: 0, to: sm.lines.length };
    let s = 0, any = false;
    for (let i = rng.from; i < rng.to; i++){
      const l = sm.lines[i];
      if (l.kind !== 'account' || !/\b(checking|savings|bank|cash|money market|operating account|petty cash|wells fargo|chase|citibank|jpmorgan|bofa|bank of america)\b/.test(l.mkey) ||
          /receivable|undeposited|clearing|payable|loan|credit card/.test(l.mkey)) continue;
      const a = _amount(sheets, sm, l.r, spec); if (a !== null){ s += a; any = true; }
    }
    bank = any ? s : null;
  }

  /* A/R and A/P: only explicit Accounts Receivable / Payable lines of the Balance Sheet. */
  const explicit = key => {
    const tot = _find(sm, _T(FIN[key].names), ['total', 'account']);
    if (tot >= 0){ const a = _amount(sheets, sm, sm.lines[tot].r, spec); if (a !== null) return a; }
    const acc = _find(sm, _S(FIN[key].names), ['account', 'section']);
    if (acc >= 0){
      const l = sm.lines[acc];
      if (l.totalIdx !== null){ const a = _amount(sheets, sm, sm.lines[l.totalIdx].r, spec); if (a !== null) return a; }
      const a = l.kind === 'account' ? _amount(sheets, sm, l.r, spec) : _leafSum(sheets, sm, acc, spec);
      if (a !== null) return a;
    }
    return null;
  };
  const ar = explicit('ar'), ap = explicit('ap');

  return { assets, currentAssets, fixedAssets, otherAssets, liabilities, currentLiabilities, longTermLiabilities,
           equity, totalLE, bank, ar, ap, assetItems, leItems, liabilityRows };
}

/* ---------- aging ---------- */

/* QuickBooks "Aging Detail" reports list invoices/bills under bucket headings
 * ("Current", "1 - 30 days past due", "91 or more days past due") with a "Total for …" line
 * per bucket. The summary is rebuilt from those bucket totals (last amount on the line = open balance). */
const AGING_BUCKET_RX = /^(current|\d+\s*-\s*\d+( days?)?( past due)?|(over|more than|>)\s*\d+( days?)?( past due)?|\d+\s*(\+|or more|and over)( days?)?( past due)?)$/i;
function _agingFromDetail(sheets, sm){
  const rows = sheets[sm.name] || [];
  const buckets = []; let total = null;
  for (const row of rows){
    if (!row) continue;
    const texts = row.map(cellText).filter(Boolean);
    if (!texts.length) continue;
    const label = texts[0].replace(/\s+/g, ' ').trim();
    const nums = row.map(parseAmount).filter(v => v !== null);
    const m = label.match(/^total (for )?(.+)$/i);
    if (m && AGING_BUCKET_RX.test(m[2].trim()) && nums.length){
      buckets.push({ label: m[2].trim().replace(/ days? past due$/i, '').replace(/^current$/i, 'Current'), value: nums[nums.length - 1] });
    } else if (/^(grand )?total$/i.test(label) && nums.length){
      total = nums[nums.length - 1];
    }
  }
  if (!buckets.length) return null;
  if (total === null) total = buckets.reduce((a, b) => a + b.value, 0);
  return { buckets, total, fromDetail: true };
}

function agingSummary(sheets, sm){
  if (!sm) return null;
  _prepLines(sm);
  const buckets = sm.cols.filter(c => c.type === 'bucket');
  if (!buckets.length) return _agingFromDetail(sheets, sm);
  const totCol = sm.cols.find(c => c.type === 'rowTotal');
  const rows = sheets[sm.name] || [];
  let gl = [...sm.lines].reverse().find(l => l.kind === 'grandTotal');
  if (!gl) gl = [...sm.lines].reverse().find(l => l.kind === 'total' && l.openerIdx === null);
  let bucketVals, total;
  if (gl){
    const row = rows[gl.r] || [];
    bucketVals = buckets.map(b => ({ label: b.label, value: parseAmount(row[b.idx]) || 0 }));
    total = totCol ? parseAmount(row[totCol.idx]) : null;
  } else {
    bucketVals = buckets.map(b => ({ label: b.label, value: 0 }));
    total = 0;
    for (const l of sm.lines){
      if (l.kind !== 'account') continue;
      const row = rows[l.r] || [];
      buckets.forEach((b, i) => { bucketVals[i].value += parseAmount(row[b.idx]) || 0; });
      if (totCol) total += parseAmount(row[totCol.idx]) || 0;
    }
    if (!totCol) total = null;
  }
  if (total === null) total = bucketVals.reduce((s, b) => s + b.value, 0);
  return { buckets: bucketVals, total };
}

/* ---------- basis, client, period ---------- */

/* Bug 6: basis comes from text such as "Cash Basis", "Accrual Basis", "Basis: Cash",
 * "Basis of Preparation: Accrual" or "Reporting Basis: Cash", found in the first 15 or last 5 rows
 * of every sheet.
 * Currency notes ("Amounts in US Dollars ($)") are never read as a basis. A bare "Cash" cell is not
 * used — it is also the name of a Balance Sheet account. */
function detectBasis(sheets, roles){
  const score = { 'Cash': 0, 'Accrual': 0, 'Modified Cash': 0 };
  const statements = new Set([roles.bs, roles.plMonthly, roles.plComparative, roles.pl, roles.plPercent, roles.plClass].filter(Boolean));
  const LABEL = '(?:reporting\\s+)?basis(?:\\s+of\\s+(?:preparation|accounting))?\\s*[:\\-]?\\s*';
  const CASH = new RegExp('\\bcash\\s+basis\\b|\\b' + LABEL + 'cash\\b');
  const ACCRUAL = new RegExp('\\baccrual\\s+basis\\b|\\b' + LABEL + 'accrual\\b');
  const MODIFIED = new RegExp('\\bmodified\\s+cash\\s+basis\\b|\\b' + LABEL + 'modified\\s+cash\\b');
  for (const [name, rows] of Object.entries(sheets)){
    const w = statements.has(name) ? 3 : 1;
    const scan = rows.slice(0, 15).concat(rows.slice(-5));
    for (const row of scan){
      for (const v of row || []){
        if (typeof v !== 'string' || v.length > 200) continue;
        const s = v.toLowerCase();
        if (/amounts in us dollars|us dollars/.test(s)) continue;
        if (MODIFIED.test(s)) score['Modified Cash'] += w;   // shown as Cash Basis on the cover; A/R rules still treat it as its own basis
        else if (CASH.test(s)) score['Cash'] += w;
        else if (ACCRUAL.test(s)) score['Accrual'] += w;
      }
    }
  }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : null;
}

const STATEMENT_TITLE_RE = /^(profit (and|&) loss|p ?& ?l|income statement|statement of (operations|income|financial (position|condition)|cash flows?)|balance sheet|a\/?r aging|a\/?p aging|accounts (receivable|payable) aging|aged (receivables|payables)|notes? to|comparative|monthly|trial balance|general ledger|summary|detail)/i;

function _periodLike(t){
  const s = cellText(t);
  if (/^(for the|as of|as at|year ended|period ended|quarter ended|month ended|twelve months ended|fiscal year)/i.test(s)) return true;
  const h = classifyHeader(s);
  return !!(h && (h.kind === 'period' || h.kind === 'month') && h.sub !== 'generic');
}

function formatPeriodText(t){
  let s = cellText(t).replace(/\s+/g, ' ');
  if (!s) return s;
  if (!/\d[\/\-.]\d/.test(s))
    s = s.replace(/\s*(?:[-–—]|\bthrough\b|\bthru\b)\s*/gi, ' – ');
  return s;
}

/* The period line a worksheet states above its column headings ("As of July 31, 2026",
 * "For the 7 months ended July 31, 2026"), or '' when it has none. */
function sheetOwnPeriod(rows, sm){
  const top = Math.max(1, Math.min(sm && sm.headerRow >= 0 ? sm.headerRow : (sm ? sm.bodyStart : 6), 8));
  for (let i = 0; i < Math.min((rows || []).length, top); i++)
    for (const v of rows[i] || []){
      if (typeof v !== 'string') continue;
      const t = cellText(v);
      if (t && !isMetaText(t) && !STATEMENT_TITLE_RE.test(t) && parseAmount(t) === null && _periodLike(t)) return t;
    }
  return '';
}

function detectClientPeriod(sheets, model){
  const r = model.roles;
  /* The full-period statements speak for the report period first: a month-by-month sheet is often titled
   * "For the month ended …" even when it holds seven months. */
  const order = [r.plComparative, r.pl, r.plMonthly, r.plPercent, r.bs, r.ar, r.ap].filter(Boolean);
  let client = '', plPeriod = '', bsPeriod = '';
  for (const name of order){
    const rows = sheets[name] || [];
    const sm = model.sheetModels[name];
    const top = Math.max(1, Math.min(sm.headerRow >= 0 ? sm.headerRow : sm.bodyStart, 8));
    for (let i = 0; i < Math.min(rows.length, top); i++){
      for (const v of rows[i] || []){
        if (typeof v !== 'string') continue;
        const t = cellText(v);
        if (!t || isMetaText(t) || parseAmount(t) !== null) continue;
        if (STATEMENT_TITLE_RE.test(t)) continue;
        if (_periodLike(t)){
          if ([r.plMonthly, r.plComparative, r.pl, r.plPercent].includes(name)){ if (!plPeriod) plPeriod = t; }
          else if (name === r.bs){ if (!bsPeriod) bsPeriod = t; }
          continue;
        }
        if (!client && t.length <= 140 && !/^(total|account|distribution account|particulars|description)$/i.test(t)) client = t.replace(/[,\s]+$/, '');
      }
    }
  }
  if (!client){
    outer: for (const rows of Object.values(sheets)){
      for (const row of rows.slice(0, 12)){
        const s = (row || []).filter(v => typeof v === 'string').join(' ');
        const m = s.match(/([A-Z][A-Za-z0-9 .,&'-]{3,}(?:Inc\.?|LLC|L\.L\.C\.|Ltd\.?|Corp\.?|Corporation|Company|Co\.|LLP|PLLC|PC))/);
        if (m){ client = m[1].trim(); break outer; }
      }
    }
  }
  return { client: client || 'Client', plPeriod, bsPeriod };
}

/* ---------- notes ---------- */

function extractWorkbookNotes(sheets, model){
  const out = [];
  const seen = new Set();
  const push = line => { const k = normLabel(line); if (!k || seen.has(k)) return; seen.add(k); out.push(line); };
  const r = model.roles;
  const statementRoles = [['bs', 'Balance Sheet'], ['plMonthly', 'Profit and Loss'], ['plComparative', 'Profit and Loss'], ['pl', 'Profit and Loss']];

  /* 1. Dedicated notes sheets */
  for (const [name, rows] of Object.entries(sheets)){
    const sm = model.sheetModels[name];
    const isNotes = name === r.notes || (sm.role === 'other' && (/\bnotes?\b/i.test(name) ||
      rows.slice(0, 30).some(row => (row || []).some(v => typeof v === 'string' && /notes? to (the )?(financial statements?|accounts)/i.test(v)))));
    if (!isNotes) continue;
    for (const row of rows){
      const cells = (row || []).map(v => cellText(typeof v === 'number' ? (Number.isInteger(v) ? String(v) : money(v)) : v)).filter(Boolean);
      if (!cells.length) continue;
      const joined = cells.join(' — ');
      if (/^line item — notes?( — link)?$/i.test(joined)) continue;
      const cleaned = joined.replace(/#?'[^']*'![A-Z]{1,3}\d+(:[A-Z]{1,3}\d+)?/g, '').replace(/#?[A-Za-z0-9_.]+![A-Z]{1,3}\d+(:[A-Z]{1,3}\d+)?/g, '')
        .replace(/https?:\/\/\S+/g, '').replace(/(\s—\s*)+$/, '').trim();
      if (/^notes? to (the )?(financial statements?|accounts)$/i.test(cleaned)) continue;
      push(cleaned);
    }
  }

  /* 2. Reviewer / client comment columns inside the statements */
  for (const [role, title] of statementRoles){
    const name = r[role];
    if (!name) continue;
    const sm = model.sheetModels[name];
    const commentCols = sm.cols.filter(c => c.type === 'comment');
    if (!commentCols.length) continue;
    const rows = sheets[name] || [];
    const lines = [];
    for (const l of sm.lines){
      const row = rows[l.r] || [];
      const parts = commentCols.map(c => {
        const t = cellText(row[c.idx]);
        if (!t) return '';
        if (/^(status|person responsible|responsib)/i.test(c.label || '')) return (c.label ? c.label + ': ' : '') + t;
        return t;
      }).filter(Boolean);
      if (!parts.some(p => !/^(status|person responsible)/i.test(p))) continue;
      lines.push(l.label + ' — ' + [...new Set(parts)].join('; '));
    }
    if (lines.length){
      if (!seen.has(normLabel(title + ' comments'))){ push(title + ' comments'); }
      lines.forEach(push);
    }
  }
  return out.join('\n');
}

/* ---------- monthly and period series ---------- */

function _monthSeries(sheets, sm){
  if (!sm) return null;
  const months = sm.cols.filter(c => c.type === 'month' && !c.priorMonth);
  if (months.length < 2) return null;
  const sorted = months.every(m => m.key !== null) ? [...months].sort((a, b) => a.key - b.key) : months;
  const multiYear = new Set(sorted.map(m => m.year)).size > 1;
  const labels = sorted.map(m => ({
    label: m.label, short: multiYear && m.year ? m.short + ' ' + String(m.year).slice(2) : m.short,
    long: MONTH_FULL[m.m] + (m.year ? ' ' + m.year : ''), col: m.idx, m: m.m, year: m.year
  }));
  const series = labels.map(m => plFigures(sheets, sm, { idx: m.col }));
  return {
    months: labels,
    revenue: series.map(f => f.income ?? 0),
    net: series.map(f => f.net ?? 0),
    expenses: series.map(f => f.expenses ?? 0)
  };
}

function _periodSeries(sheets, sm, periodText){
  if (!sm) return [];
  const cols = sm.cols.filter(c => ['current', 'prior', 'history'].includes(c.type));
  if (!cols.length){
    /* Single-period (year-end) statement: one bar group for the whole period — never "January". */
    const spec = periodSpec(sm, 'current');
    if (!spec || sm.cols.some(c => c.type === 'month')) return [];
    const f = plFigures(sheets, sm, spec);
    return [{ label: periodText || 'Current Period', type: 'current', income: f.income ?? 0, net: f.net ?? 0, expenses: f.expenses ?? 0, gross: f.gross ?? 0 }];
  }
  const sorted = cols.every(c => c.key !== null && c.key !== undefined) ? [...cols].sort((a, b) => a.key - b.key) : cols.slice().reverse();
  return sorted.map(c => {
    const f = plFigures(sheets, sm, { idx: c.idx });
    const clean = String(c.label || '').replace(/\s*\((py|pp)\)\s*/ig, '').trim();
    const label = c.year ? (clean && /\d{4}/.test(clean) && clean.length <= 16 ? clean : String(c.year)) : (c.type === 'current' ? 'Current Period' : 'Prior Period');
    return { label, type: c.type, income: f.income ?? 0, net: f.net ?? 0, expenses: f.expenses ?? 0, gross: f.gross ?? 0 };
  });
}

/* ---------- entry ---------- */

function analyzeFinancials(model, sheets){
  const roles = model.roles;
  for (const sm of Object.values(model.sheetModels)) _prepLines(sm);
  const S = k => roles[k] ? model.sheetModels[roles[k]] : null;
  const plM = S('plMonthly'), plC = S('plComparative'), plG = S('pl'), bs = S('bs');
  /* A workbook whose only P&L is the "% of Income" statement takes its figures from it. */
  const plTotals = plC || plG || plM || S('plPercent');

  const basisDetected = detectBasis(sheets, roles);

  /* P&L current / prior */
  const curSpec = periodSpec(plTotals, 'current'), priSpec = periodSpec(plTotals, 'prior');
  const plCur = plFigures(sheets, plTotals, curSpec) || {};
  const plPri = priSpec ? plFigures(sheets, plTotals, priSpec) : null;

  /* Balance Sheet current / prior */
  const bsCurSpec = periodSpec(bs, 'current'), bsPriSpec = periodSpec(bs, 'prior');
  const bsCur = bsFigures(sheets, bs, bsCurSpec) || {};
  const bsPri = bsPriSpec ? bsFigures(sheets, bs, bsPriSpec) : null;

  /* Bug 5: "Cash Basis" anywhere in the workbook makes the whole workbook cash basis
   * ("Modified Cash Basis" does not count). A cash-basis client never shows A/R: no A/R figure,
   * no A/R aging, no A/R sheet in the exports and no Receivables & Payables block. */
  const workbookCashBasis = Object.values(sheets).some(rows => (rows || []).some(row => (row || []).some(v =>
    typeof v === 'string' && /cash\s*basis/i.test(v) && !/modified\s*cash\s*basis/i.test(v))));
  const cashBasis = workbookCashBasis || (/cash/i.test(basisDetected || '') && !/modified/i.test(basisDetected || ''));
  let suppressAR = false;
  if (cashBasis) suppressAR = true;
  /* Cash-basis clients have no payables unless the Balance Sheet itself carries them. */
  const suppressAP = cashBasis && (bsCur.ap === null || bsCur.ap === undefined);
  const arAging = suppressAR ? null : agingSummary(sheets, S('ar'));
  const apAging = suppressAP ? null : agingSummary(sheets, S('ap'));

  const pick = (a, b) => (a !== null && a !== undefined ? a : b);
  const metrics = {
    income: plCur.income ?? 0,
    cogs: plCur.cogs ?? null,
    gross: pick(plCur.gross, plCur.income) ?? 0,
    expenses: plCur.expenses ?? 0,
    otherIncome: plCur.otherIncome ?? null,
    otherExpenses: plCur.otherExpenses ?? null,
    net: plCur.net ?? 0,
    bank: bsCur.bank ?? null,
    ar: suppressAR ? null : pick(bsCur.ar, arAging ? arAging.total : null),
    ap: pick(bsCur.ap, (!cashBasis && apAging) ? apAging.total : null),
    assets: bsCur.assets ?? 0,
    currentAssets: bsCur.currentAssets ?? null,
    fixedAssets: bsCur.fixedAssets ?? null,
    liabilities: bsCur.liabilities ?? 0,
    currentLiabilities: bsCur.currentLiabilities ?? null,
    longTermLiabilities: bsCur.longTermLiabilities ?? null,
    equity: bsCur.equity ?? 0,
    totalLE: bsCur.totalLE ?? null
  };
  const prior = {
    income: plPri ? plPri.income : null,
    gross: plPri ? pick(plPri.gross, plPri.income) : null,
    expenses: plPri ? plPri.expenses : null,
    net: plPri ? plPri.net : null,
    bank: bsPri ? bsPri.bank : null,
    ar: bsPri ? bsPri.ar : null,
    ap: bsPri ? bsPri.ap : null,
    assets: bsPri ? bsPri.assets : null
  };
  const priorLabel = plTotals && priSpec ? (plTotals.cols.find(c => c.idx === priSpec.idx) || {}).label || 'Prior Year' : '';
  const currentLabel = plTotals && curSpec && curSpec.idx !== undefined ? (plTotals.cols.find(c => c.idx === curSpec.idx) || {}).label || 'Current Period' : 'Current Period';

  /* Monthly series — only from genuine month columns; a year-end file never lands in January. */
  const ms = _monthSeries(sheets, plM) || _monthSeries(sheets, plTotals);
  const months = ms ? ms.months : [];

  const exp = expenseBreakdown(sheets, plTotals, curSpec, plCur.expenses);

  const cp = detectClientPeriod(sheets, model);
  let period = cp.plPeriod;
  if (!period && months.length){
    const a = months[0], b = months[months.length - 1];
    period = a.year === b.year ? `${MONTH_FULL[a.m]} – ${MONTH_FULL[b.m]} ${b.year || ''}`.trim()
                               : `${a.long} – ${b.long}`;
  }
  if (!period && plTotals && curSpec && curSpec.idx !== undefined){
    const c = plTotals.cols.find(x => x.idx === curSpec.idx);
    if (c && c.sub === 'year' && c.year) period = `January – December ${c.year}`;
    else if (c && c.label && _periodLike(c.label)) period = c.label;
  }
  if (!period) period = cp.bsPeriod;

  const notesText = extractWorkbookNotes(sheets, model);

  return Object.assign(model, {
    months,
    monthlyRevenue: ms ? ms.revenue : [],
    monthlyNet: ms ? ms.net : [],
    monthlyExpenses: ms ? ms.expenses : [],
    periodSeries: _periodSeries(sheets, plTotals, formatPeriodText(period || '')),
    metrics, prior, priorLabel, currentLabel,
    hasPrior: !!plPri,
    expenseGroups: exp.items,
    expenseTotal: exp.total,
    expensePctBase: exp.pctBase ?? (exp.total !== null && exp.total !== undefined ? Math.abs(exp.total) : null),
    arAging, apAging, suppressAR, suppressAP,
    bsComposition: { assets: bsCur.assetItems || [], liabEquity: bsCur.leItems || [] },
    liabilityBifurcation: (bsCur.liabilityRows || []),
    basisDetected,
    client: cp.client,
    period: formatPeriodText(period || 'For the period ended'),
    bsAsOf: formatPeriodText(cp.bsPeriod || ''),
    importedNotes: notesText
  });
}
