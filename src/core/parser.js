/* Unison Direct Management Reporting — workbook parser
 *
 * parseWorkbook(sheets) → model
 *   roles:        { plMonthly, plComparative, plPercent, pl, bs, ar, ap } → sheet name (or null)
 *   sheetModels:  { sheetName: {name, role, headerRow, cols, lines, byLabel} }
 *   months:       [{ label:'Jan 2026', short:'Jan', col }]
 *   monthlyRevenue / monthlyNet / monthlyExpenses: number[]
 *   metrics, prior, expenseGroups, arAging, apAging, bsComposition, client, period
 *
 * Two statement layouts are supported:
 *  - QuickBooks exports (the Unison workflow): title rows 1-3, header row ~5,
 *    3-space indent hierarchy on P&L, flat "Section … Total for Section" pairs on
 *    the Balance Sheet, "Total X" / "Total for X" subtotal rows, bare TOTAL grand rows.
 *  - The original generic prototype format (single P&L/BS sheets) still parses via
 *    the same machinery; role detection simply finds fewer specific sheets.
 */
'use strict';

const ROLE_LABELS = {
  plMonthly: 'Profit and Loss (Monthly)',
  plComparative: 'Profit and Loss (Comparative)',
  plPercent: 'Profit and Loss (% of Income)',
  pl: 'Profit and Loss',
  bs: 'Balance Sheet',
  ar: 'A/R Aging',
  ap: 'A/P Aging',
  summary: 'Summary',
  other: 'Supplementary'
};

/* Formula rows recomputed by rule rather than by summing a span. */
const FORMULA_ROWS = ['gross profit', 'net operating income', 'net other income', 'net income'];

const MONTH_HEADER_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ ,]+\d{4}$/i;
const AGING_BUCKET_RE = /^(current|1\s*-\s*30|31\s*-\s*60|61\s*-\s*90|91\s+and\s+over)$/i;

function detectRoles(sheets){
  const roles = { plMonthly: null, plComparative: null, plPercent: null,
                  pl: null, bs: null, ar: null, ap: null, summary: null };
  const names = Object.keys(sheets);
  const norm = n => n.trim().toLowerCase();

  /* Pass 1 — sheet names, most specific first */
  for (const n of names){
    const t = norm(n);
    if (!roles.plMonthly     && /(profit.*loss|p&l|income statement).*month|month.*(profit.*loss|p&l)/.test(t)) { roles.plMonthly = n; continue; }
    if (!roles.plComparative && /(profit.*loss|p&l|income statement).*compar|compar.*(profit.*loss|p&l)/.test(t)) { roles.plComparative = n; continue; }
    if (!roles.plPercent     && /(profit.*loss|p&l).*%|%.*income/.test(t)) { roles.plPercent = n; continue; }
    if (!roles.bs && /balance sheet/.test(t)) { roles.bs = n; continue; }
    if (!roles.ar && /(^|[^a-z])a\/?r([^a-z]|$).*aging|accounts receivable.*aging|aging.*receivable/.test(t)) { roles.ar = n; continue; }
    if (!roles.ap && /(^|[^a-z])a\/?p([^a-z]|$).*aging|accounts payable.*aging|aging.*payable/.test(t)) { roles.ap = n; continue; }
    if (!roles.summary && /^summary$/.test(t)) { roles.summary = n; continue; }
  }
  /* Generic P&L only if no specific P&L claimed it */
  for (const n of names){
    const t = norm(n);
    if (Object.values(roles).includes(n)) continue;
    if (!roles.pl && !roles.plMonthly && /profit.*loss|p&l|income statement/.test(t)) roles.pl = n;
  }

  /* Pass 2 — content-based for anything unresolved */
  for (const n of names){
    if (Object.values(roles).includes(n)) continue;
    const rows = sheets[n] || [];
    const head = rows.slice(0, 9);
    const flat = head.map(r => (r || []).map(c => String(c ?? '').trim()));
    const hasBuckets = flat.some(r => r.filter(c => AGING_BUCKET_RE.test(c)).length >= 3);
    if (hasBuckets){
      const t = norm(n) + ' ' + flat.map(r => r.join(' ')).join(' ').toLowerCase();
      if (!roles.ar && /receivable/.test(t)) { roles.ar = n; continue; }
      if (!roles.ap && /payable/.test(t))    { roles.ap = n; continue; }
    }
    const monthCells = flat.reduce((m, r) => Math.max(m, r.filter(c => MONTH_HEADER_RE.test(c)).length), 0);
    if (!roles.plMonthly && monthCells >= 3) { roles.plMonthly = n; continue; }
    if (!roles.plComparative && flat.some(r => r.some(c => /\(PY\)/i.test(c)) && r.some(c => /^change$/i.test(c)))) { roles.plComparative = n; continue; }
    if (!roles.bs && flat.some(r => r.some(c => /^as of /i.test(c)))
        && flat.some(r => r.some(c => /^assets$/i.test(c)))) { roles.bs = n; }
  }
  return roles;
}

/* Header row: within the first 10 rows, the row with the most classifiable
 * header cells (months, aging buckets, periods, Total/Change/%). */
function findHeaderRow(rows){
  let best = -1, bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++){
    const r = rows[i] || [];
    let score = 0;
    for (let c = 1; c < r.length; c++){
      const v = String(r[c] ?? '').trim();
      if (!v) continue;
      if (MONTH_HEADER_RE.test(v)) score += 3;
      else if (AGING_BUCKET_RE.test(v)) score += 3;
      else if (/^as of /i.test(v) || /\(PY\)/i.test(v) || /^jan\s*-|^[a-z]{3}\s*-\s*[a-z]{3}/i.test(v)) score += 2;
      else if (/^(total|change|% of income)$/i.test(v)) score += 1;
    }
    if (score > bestScore){ bestScore = score; best = i; }
  }
  return bestScore >= 2 ? best : -1;
}

function classifyColumns(rows, headerRow){
  const cols = [];
  const width = Math.max(...rows.map(r => (r || []).length), 1);
  const header = headerRow >= 0 ? (rows[headerRow] || []) : [];
  let sawCurrentPeriod = false;
  for (let c = 0; c < width; c++){
    if (c === 0){ cols.push({ idx: 0, type: 'label', label: '' }); continue; }
    const v = String(header[c] ?? '').trim();
    let col = { idx: c, type: 'value', label: v };
    if (MONTH_HEADER_RE.test(v)){
      const m = v.match(/^([A-Za-z]+)[ ,]+(\d{4})$/);
      col.type = 'month';
      col.label = m[1].slice(0, 3) + ' ' + m[2];
      col.short = m[1].slice(0, 3);
      col.year = +m[2];
    } else if (AGING_BUCKET_RE.test(v)){
      col.type = 'bucket';
      col.label = v.toUpperCase();
    } else if (/^total$/i.test(v)){
      col.type = 'rowTotal'; col.label = 'Total';
    } else if (/\(PY\)|prior/i.test(v)){
      col.type = 'prior';
    } else if (/^change$/i.test(v)){
      col.type = 'change';
    } else if (/^% of income$/i.test(v)){
      col.type = 'percent';
    } else if (/^as of /i.test(v) || /^[A-Za-z]{3}\s*-\s*[A-Za-z]{3}/.test(v) || /^\d{4}$/.test(v)){
      col.type = sawCurrentPeriod ? 'prior' : 'current';
      if (!sawCurrentPeriod) sawCurrentPeriod = true;
    }
    cols.push(col);
  }
  /* No header at all (generic format): every non-label column is a plain value column */
  return cols;
}

/* Value columns an edit/recompute cascades across (everything numeric except derived ones) */
function valueColumns(cols){
  return cols.filter(c => ['month', 'bucket', 'current', 'prior', 'value', 'rowTotal'].includes(c.type))
             .map(c => c.idx);
}

function buildLines(rows, headerRow, cols){
  const lines = [];
  const start = headerRow >= 0 ? headerRow + 1 : 0;
  const valCols = cols.filter(c => c.type !== 'label').map(c => c.idx);
  let indentUnit = 0;

  for (let r = start; r < rows.length; r++){
    const row = rows[r] || [];
    const raw = String(row[0] ?? '');
    const label = raw.trim();
    const hasValues = valCols.some(c => String(row[c] ?? '').trim() !== '');
    if (!label && !hasValues) continue;          // fully blank
    if (!label) continue;                        // stray values with no label — not a line
    const leading = raw.match(/^ */)[0].length;
    if (leading > 0) indentUnit = indentUnit ? Math.min(indentUnit, leading) : leading;

    let kind = 'account', closes = null;
    const mTotal = label.match(/^total(?: for)?\s+(.+)$/i);
    if (mTotal){ kind = 'total'; closes = mTotal[1].trim(); }
    else if (/^total$/i.test(label)) { kind = 'grandTotal'; }
    else if (FORMULA_ROWS.includes(label.toLowerCase())) { kind = 'computed'; }
    else if (!hasValues) { kind = 'section'; }

    lines.push({ r, rawLabel: raw, label, leading, kind, closes,
                 hasValues, openerIdx: null, totalIdx: null });
  }

  for (const l of lines) l.indent = indentUnit ? Math.round(l.leading / indentUnit) : 0;

  /* Link each total row to its opener (nearest earlier line with matching label
   * that is not already closed). Grand TOTAL rows close the whole sheet. */
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < lines.length; i++){
    const l = lines[i];
    if (l.kind !== 'total') continue;
    for (let j = i - 1; j >= 0; j--){
      const o = lines[j];
      if (o.totalIdx === null && o.kind !== 'total' && o.kind !== 'grandTotal' &&
          norm(o.label) === norm(l.closes)){
        l.openerIdx = j; o.totalIdx = i;
        break;
      }
    }
  }

  const byLabel = {};
  for (let i = 0; i < lines.length; i++){
    const k = norm(lines[i].label);
    if (!(k in byLabel)) byLabel[k] = i;   // first occurrence wins
  }
  return { lines, byLabel, indentUnit };
}

function buildSheetModel(name, rows, role){
  const headerRow = findHeaderRow(rows);
  const cols = classifyColumns(rows, headerRow);
  const { lines, byLabel, indentUnit } = buildLines(rows, headerRow, cols);
  return { name, role, headerRow, cols, lines, byLabel, indentUnit };
}

/* Read a labelled line's value in a given column (raw sheet access). */
function lineValue(sheets, sm, lineIdx, col){
  if (lineIdx === null || lineIdx === undefined || lineIdx < 0) return null;
  const line = sm.lines[lineIdx];
  if (!line) return null;
  const row = (sheets[sm.name] || [])[line.r] || [];
  return num(row[col]);
}

function labelValue(sheets, sm, label, col){
  if (!sm) return null;
  const idx = sm.byLabel[label.toLowerCase()];
  return idx === undefined ? null : lineValue(sheets, sm, idx, col);
}

/* First column of a given type; null if absent. */
function colOfType(sm, type){
  const c = sm && sm.cols.find(c => c.type === type);
  return c ? c.idx : null;
}

/* Last numeric value in a labelled row (generic-format fallback, old findValue) */
function lastNumeric(sheets, sm, labelRe){
  if (!sm) return 0;
  const rows = sheets[sm.name] || [];
  for (const line of sm.lines){
    if (!labelRe.test(line.label)) continue;
    const row = rows[line.r] || [];
    for (let c = row.length - 1; c >= 1; c--){
      const v = String(row[c] ?? '').trim();
      if (v !== '' && isNumericCell(v)) return num(v);
    }
  }
  return 0;
}

function detectClientPeriod(sheets, sheetModels, roles){
  let client = '', period = '';
  const candidates = [roles.plMonthly, roles.plComparative, roles.pl, roles.bs]
    .filter(Boolean);
  for (const name of candidates){
    const rows = sheets[name] || [];
    for (let i = 0; i < Math.min(rows.length, 4); i++){
      const v = String((rows[i] || [])[0] ?? '').trim();
      if (!v) continue;
      if (!client && i === 0){ client = v.replace(/[,\s]+$/, ''); continue; }
      if (!period && /^(as of|for the|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(v)
          && !/balance sheet|profit|loss/i.test(v)){
        period = v;
      }
    }
    if (client && period) break;
  }
  /* Generic fallback: old regex behavior over first 12 rows of every sheet */
  if (!client){
    for (const rows of Object.values(sheets)){
      for (const row of rows.slice(0, 12)){
        const s = (row || []).join(' ');
        const m = s.match(/([A-Z][A-Za-z0-9 .,&'-]{3,}(?:Inc\.?|LLC|Ltd\.?|Services|Corp\.?))/);
        if (m){ client = m[1].trim().replace(/[,\s]+$/, ''); break; }
      }
      if (client) break;
    }
  }
  return { client: client || 'Client', period: period || 'For the period ended' };
}

/* Ordered alternatives for key P&L lines (QuickBooks first, generic fallbacks). */
const LABELS = {
  income:   ['total income', 'total revenue', 'revenue', 'sales', 'income'],
  gross:    ['gross profit'],
  expenses: ['total expenses', 'total operating expenses', 'operating expenses', 'expenses'],
  net:      ['net income', 'net profit', 'profit for the period']
};

/* First alternative that resolves to a line with numeric content. */
function findByLabels(sheets, sm, labels){
  if (!sm) return null;
  for (const lab of labels){
    const idx = sm.byLabel[lab];
    if (idx === undefined) continue;
    const line = sm.lines[idx];
    if (line.hasValues || line.kind === 'total' || line.kind === 'computed') return idx;
  }
  return null;
}

function parseWorkbook(sheets){
  const roles = detectRoles(sheets);
  const sheetModels = {};
  for (const [name, rows] of Object.entries(sheets)){
    let role = 'other';
    for (const [r, n] of Object.entries(roles)) if (n === name) role = r;
    sheetModels[name] = buildSheetModel(name, rows, role);
  }

  const M = key => roles[key] ? sheetModels[roles[key]] : null;
  const plM = M('plMonthly'), plC = M('plComparative'), plP = M('plPercent'),
        plG = M('pl'), bs = M('bs'), ar = M('ar'), ap = M('ap');
  const plMain = plM || plG || plC;      // preferred P&L for monthly series
  const plTotals = plC || plM || plG;    // preferred P&L for period totals

  /* Months from the monthly P&L header */
  let months = [];
  if (plM) months = plM.cols.filter(c => c.type === 'month')
                            .map(c => ({ label: c.label, short: c.short, col: c.idx }));

  const seriesFor = (sm, labels) => {
    if (!sm) return [];
    const idx = findByLabels(sheets, sm, labels);
    if (idx === null) return [];
    if (months.length && sm === plM)
      return months.map(m => lineValue(sheets, sm, idx, m.col) ?? 0);
    /* generic fallback: cols 1..12 of the labelled row */
    const row = (sheets[sm.name] || [])[sm.lines[idx].r] || [];
    return row.slice(1, 13).map(num);
  };

  const monthlyRevenue  = seriesFor(plMain, LABELS.income);
  const monthlyNet      = seriesFor(plMain, LABELS.net);
  const monthlyExpenses = seriesFor(plMain, LABELS.expenses);

  /* Period totals: comparative sheet current/prior columns when present */
  const curCol   = plTotals ? (colOfType(plTotals, 'current') ?? colOfType(plTotals, 'rowTotal')) : null;
  const priorCol = plTotals ? colOfType(plTotals, 'prior') : null;
  const plVal = (labels, col) => {
    const idx = findByLabels(sheets, plTotals, labels);
    if (idx === null) return 0;
    if (col !== null) return lineValue(sheets, plTotals, idx, col) ?? 0;
    /* generic format: last numeric cell of the row */
    const row = (sheets[plTotals.name] || [])[plTotals.lines[idx].r] || [];
    for (let c = row.length - 1; c >= 1; c--)
      if (String(row[c] ?? '').trim() !== '' && isNumericCell(row[c])) return num(row[c]);
    return 0;
  };

  const bsCur   = bs ? (colOfType(bs, 'current') ?? 1) : null;
  const bsPrior = bs ? colOfType(bs, 'prior') : null;
  const bsVal = (labelRe, col) => {
    if (!bs || col === null) return 0;
    for (const [k, i] of Object.entries(bs.byLabel))
      if (labelRe.test(k)) return lineValue(sheets, bs, i, col) ?? 0;
    return 0;
  };

  /* Aging grand totals: the bare TOTAL line, else last "total" line */
  const agingTotals = sm => {
    if (!sm) return null;
    const buckets = sm.cols.filter(c => c.type === 'bucket');
    const totCol = colOfType(sm, 'rowTotal');
    let gl = [...sm.lines].reverse().find(l => l.kind === 'grandTotal') ||
             [...sm.lines].reverse().find(l => l.kind === 'total');
    if (!gl) return null;
    const row = (sheets[sm.name] || [])[gl.r] || [];
    return {
      buckets: buckets.map(b => ({ label: b.label, value: num(row[b.idx]) })),
      total: totCol !== null ? num(row[totCol])
                             : buckets.reduce((s, b) => s + num(row[b.idx]), 0)
    };
  };
  const arAging = agingTotals(ar), apAging = agingTotals(ap);

  const metrics = {
    income:   plVal(LABELS.income, curCol),
    gross:    plVal(LABELS.gross, curCol) || plVal(LABELS.income, curCol),
    expenses: plVal(LABELS.expenses, curCol),
    net:      plVal(LABELS.net, curCol),
    bank:     bsVal(/^total for bank accounts$|^total bank/i, bsCur) || bsVal(/bank/i, bsCur),
    ar:       bsVal(/^total for accounts receivable$|^total accounts receivable/i, bsCur) || (arAging ? arAging.total : 0),
    ap:       bsVal(/^total for accounts payable$|^total accounts payable/i, bsCur)    || (apAging ? apAging.total : 0),
    assets:      bsVal(/^total for assets$|^total assets$/i, bsCur),
    liabilities: bsVal(/^total for liabilities$|^total liabilities$/i, bsCur),
    equity:      bsVal(/^total for equity$|^total equity$/i, bsCur)
  };

  const prior = {
    income:   priorCol !== null ? plVal(LABELS.income, priorCol) : null,
    gross:    priorCol !== null ? (plVal(LABELS.gross, priorCol) || plVal(LABELS.income, priorCol)) : null,
    expenses: priorCol !== null ? plVal(LABELS.expenses, priorCol) : null,
    net:      priorCol !== null ? plVal(LABELS.net, priorCol) : null,
    bank:     bsPrior !== null ? (bsVal(/^total for bank accounts$|^total bank/i, bsPrior) || bsVal(/bank/i, bsPrior)) : null,
    ar:       bsPrior !== null ? bsVal(/^total for accounts receivable$|^total accounts receivable/i, bsPrior) : null,
    ap:       bsPrior !== null ? bsVal(/^total for accounts payable$|^total accounts payable/i, bsPrior) : null,
    assets:   bsPrior !== null ? bsVal(/^total for assets$|^total assets$/i, bsPrior) : null
  };

  /* Expense breakdown: direct members of the Expenses group (totals or leaf
   * accounts), valued on the row-total / current column. */
  const expenseGroups = [];
  const expSm = plM || plC || plG;
  if (expSm){
    const vcol = colOfType(expSm, 'rowTotal') ?? colOfType(expSm, 'current') ?? 1;
    const expIdx = expSm.byLabel['expenses'];
    const expLine = expIdx !== undefined ? expSm.lines[expIdx] : null;
    if (expLine && expLine.totalIdx !== null){
      const endR = expSm.lines[expLine.totalIdx].r;
      let skipUntil = -1;
      for (let i = expIdx + 1; i < expSm.lines.length; i++){
        const l = expSm.lines[i];
        if (l.r >= endR) break;
        if (l.r <= skipUntil) continue;
        if (l.kind === 'section' || (l.kind === 'account' && l.totalIdx !== null)){
          /* group with its own total → use that total, skip its span */
          if (l.totalIdx !== null){
            const tl = expSm.lines[l.totalIdx];
            expenseGroups.push({ label: l.label, value: lineValue(sheets, expSm, l.totalIdx, vcol) ?? 0 });
            skipUntil = tl.r;
            continue;
          }
        }
        if (l.kind === 'account')
          expenseGroups.push({ label: l.label, value: lineValue(sheets, expSm, i, vcol) ?? 0 });
      }
    }
  }
  expenseGroups.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  /* Balance sheet composition: direct "Total for X" members of Assets and of
   * Liabilities and Equity. */
  const bsComposition = { assets: [], liabEquity: [] };
  if (bs && bsCur !== null){
    const groupsUnder = openerLabel => {
      const out = [];
      const oi = bs.byLabel[openerLabel];
      if (oi === undefined) return out;
      const opener = bs.lines[oi];
      if (opener.totalIdx === null) return out;
      const endR = bs.lines[opener.totalIdx].r;
      let skipUntil = -1;
      for (let i = oi + 1; i < bs.lines.length; i++){
        const l = bs.lines[i];
        if (l.r >= endR) break;
        if (l.r <= skipUntil) continue;
        if (l.totalIdx !== null){
          out.push({ label: l.label, value: lineValue(sheets, bs, l.totalIdx, bsCur) ?? 0 });
          skipUntil = bs.lines[l.totalIdx].r;
        } else if (l.kind === 'account'){
          out.push({ label: l.label, value: lineValue(sheets, bs, i, bsCur) ?? 0 });
        }
      }
      return out;
    };
    bsComposition.assets = groupsUnder('assets');
    const le = groupsUnder('liabilities and equity');
    bsComposition.liabEquity = le.length ? le :
      [...groupsUnder('liabilities'), ...groupsUnder('equity')];
  }

  const { client, period } = detectClientPeriod(sheets, sheetModels, roles);

  return { roles, sheetModels, months, monthlyRevenue, monthlyNet, monthlyExpenses,
           metrics, prior, expenseGroups, arAging, apAging, bsComposition,
           client, period };
}
