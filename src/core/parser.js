/* Unison Direct Management Reporting — workbook parser
 *
 * parseWorkbook(sheets) → model
 *   roles:        { plMonthly, plComparative, plPercent, pl, bs, ar, ap, notes } → sheet name | null
 *   sheetModels:  { sheetName: {name, role, headerRow, cols, lines, byLabel, labelCols, titleRows} }
 *   …plus the analysis produced by analyzeFinancials() in financials.js.
 *
 * Supported layouts (all detected from the workbook itself — nothing is company-specific):
 *  - QuickBooks Online exports: title rows, one header row, "Total for X" / "Total X" rows.
 *  - QuickBooks Desktop exports: account hierarchy spread across several leading label
 *    columns, blank spacer columns between amounts, "Jan 25" style month headers,
 *    "Dec 31, 25" balance-sheet dates, "$ Change" / "% Change" columns.
 *  - Spreadsheet-built statements: numeric year headers (2023, 2024), reviewer comment
 *    columns, Excel date-serial month headers, "X Total" rows.
 *
 * Column types: label | month | rowTotal | current | prior | history | change | percent |
 *               bucket | value | comment
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
  notes: 'Notes',
  summary: 'Summary',
  other: 'Supplementary'
};

/* Formula rows recomputed by rule rather than by summing a span (recompute.js). */
const FORMULA_ROWS = ['gross profit', 'net operating income', 'net other income', 'net income',
  'net ordinary income', 'net profit', 'net loss', 'net income loss'];

const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const MON = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

/* ---------- cell helpers ---------- */

function cellText(v){
  if (v === null || v === undefined) return '';
  return String(v).replace(/\u00a0/g, ' ').trim();
}

function normLabel(v){
  return cellText(v).toLowerCase()
    .replace(/&/g, ' and ').replace(/['’`]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/* Label key used for matching statement lines: account numbers removed
 * ("Total 6010 · Payroll Expenses" → "total payroll expenses"). */
function labelKey(v){
  return normLabel(v).replace(/\b\d{3,}(?: \d+)*\b/g, ' ').replace(/\s+/g, ' ').trim();
}

/* Amount parser: numbers, "$1,234.56", "(1,234.56)", "-1,234", "1,234.56-". Percent → null. */
function parseAmount(v){
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = cellText(v);
  if (!s || /%\)?$/.test(s)) return null;
  let t = s, neg = false;
  if (/^\(.*\)$/.test(t)){ neg = true; t = t.slice(1, -1).trim(); }
  if (/-$/.test(t)){ neg = !neg; t = t.slice(0, -1).trim(); }
  t = t.replace(/^(usd|us\$)\s*/i, '');
  if (/^-/.test(t)){ neg = !neg; t = t.slice(1).trim(); }
  t = t.replace(/^\$/, '').replace(/[\s,]/g, '');
  if (/^-/.test(t)){ neg = !neg; t = t.slice(1); }
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const n = parseFloat(t);
  return neg ? -n : n;
}

function isPercentText(v){
  return /^\(?-?\d[\d,]*(\.\d+)?\s*%\)?$/.test(cellText(v));
}

function monthNo(tok){ return MONTH_ABBR.indexOf(String(tok || '').toLowerCase().slice(0, 3)); }
function fullYear(y){ y = +y; return y < 100 ? 2000 + y : y; }

/* Parse a single date string → {y,m,d} or null. US ordering for numeric dates. */
function parseDateText(s){
  s = cellText(s).toLowerCase().replace(/\s+/g, ' ');
  let m;
  if ((m = s.match(new RegExp('^' + MON + '\\.? (\\d{1,2})(?:st|nd|rd|th)?,? (\\d{2}|\\d{4})$'))))
    return { y: fullYear(m[3]), m: monthNo(m[1]), d: +m[2] };
  if ((m = s.match(new RegExp('^(\\d{1,2})[ \\-]' + MON + '\\.?[ \\-,]+(\\d{2}|\\d{4})$'))))
    return { y: fullYear(m[3]), m: monthNo(m[2]), d: +m[1] };
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/)))
    return { y: fullYear(m[3]), m: +m[1] - 1, d: +m[2] };
  if ((m = s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/)))
    return { y: +m[1], m: +m[2] - 1, d: +m[3] };
  if ((m = s.match(new RegExp('^' + MON + '\\.?[ ,\\-\\/\']*(\\d{2}|\\d{4})$'))))
    return { y: fullYear(m[2]), m: monthNo(m[1]), d: null };
  return null;
}

function excelSerialToDate(v){
  const d = new Date(Math.round((v - 25569) * 86400000));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

const AGING_BUCKET_RES = [
  /^current$/, /^not due$/, /^(0|1) ?(-|to) ?30( days?)?( past due)?$/, /^31 ?(-|to) ?60( days?)?( past due)?$/,
  /^61 ?(-|to) ?90( days?)?( past due)?$/, /^91 ?(-|to) ?120( days?)?( past due)?$/,
  /^(91|90) ?(\+|and over|or more|plus)( days?)?( past due)?$/, /^(over|more than|>) ?(90|120)( days?)?$/,
  /^(121|120) ?(\+|and over|or more|plus)( days?)?$/, /^> ?90$/
];

/* Classify one header cell. Returns {kind, …} or null.
 * kinds: month | period | total | change | percent | bucket | comment */
function classifyHeader(v){
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number'){
    if (Number.isInteger(v) && v >= 1990 && v <= 2100) return { kind: 'period', sub: 'year', y: v, m: 11, key: v * 12 + 11, prior: false };
    return null;       // Excel date serials are handled per-row in _serialMonthRow
  }
  const raw = cellText(v);
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/\s+/g, ' ');
  const prior = /\(py\)|\(pp\)|\bprior\b|\bprevious\b|\blast year\b|\bpy\b/.test(s);
  const t = s.replace(/\((py|pp)\)/g, '').replace(/\b(prior year|previous year|prior period|py)\b/g, '').trim();
  const flat = t.replace(/[^a-z0-9%+>]+/g, ' ').trim();

  if (/^(grand )?total$/.test(flat)) return { kind: 'total' };
  if (/%|\bpercent|\bpct\b/.test(t)) return { kind: 'percent' };
  if (/^(\$ ?)?(change|variance|difference|diff|inc dec|increase decrease|movement)$/.test(flat)) return { kind: 'change' };
  const tb = t.replace(/\s+/g, ' ').replace(/\bdays?\b|\bpast due\b/g, '').trim();
  if (AGING_BUCKET_RES.some(re => re.test(tb) || re.test(flat))) return { kind: 'bucket', label: raw };
  if (/comment|remark|\bnotes?\b|status|responsib|explanation|reviewer|query|queries|action|reference|\blink\b/.test(flat)) return { kind: 'comment' };

  let m;
  /* Single month: "Jan 2025", "January 2025", "Jan 25", "Jan-25", "2025-01", "01/2025" */
  if ((m = t.match(new RegExp('^' + MON + '\\.?[ ,\\-\\/\']*(\\d{4}|\\d{2})$'))))
    return { kind: 'month', m: monthNo(m[1]), y: fullYear(m[2]), prior };
  if ((m = t.match(/^(\d{4})[\-\/](\d{1,2})$/)) && +m[2] >= 1 && +m[2] <= 12)
    return { kind: 'month', m: +m[2] - 1, y: +m[1], prior };
  if ((m = t.match(/^(\d{1,2})[\-\/](\d{4})$/)) && +m[1] >= 1 && +m[1] <= 12)
    return { kind: 'month', m: +m[1] - 1, y: +m[2], prior };
  if ((m = t.match(new RegExp('^' + MON + '\\.?$'))))
    return { kind: 'month', m: monthNo(m[1]), y: null, prior };

  /* Ranges: "Jan - Dec 2025", "Jan 1 - Jan 31, 2025", "January through December 2025", "1/1/2025 - 12/31/2025" */
  const parts = t.split(/\s*(?:-|–|—|\bto\b|\bthrough\b|\bthru\b)\s*/).filter(Boolean);
  if (parts.length === 2){
    let endD = parseDateText(parts[1]);
    let a = parts[0], startM = -1, startY = null;
    const ms = a.match(new RegExp('^' + MON));
    if (ms) startM = monthNo(ms[1]);
    const sd = parseDateText(a);
    if (sd){ startM = sd.m; startY = sd.y; }
    if (!endD){
      /* "Jan 1-31, 2025" or "Jan - Dec 2025" where the year only sits on the end part */
      const e2 = parts[1].match(new RegExp('^(?:' + MON + '\\.? ?)?(\\d{1,2})?,? ?(\\d{4}|\\d{2})$'));
      if (e2 && (e2[1] || startM >= 0)) endD = { y: fullYear(e2[3]), m: e2[1] ? monthNo(e2[1]) : startM, d: e2[2] ? +e2[2] : null };
    }
    if (endD && startM >= 0){
      const y0 = startY || endD.y;
      if (startM === endD.m && y0 === endD.y) return { kind: 'month', m: endD.m, y: endD.y, prior };
      return { kind: 'period', sub: 'range', y: endD.y, m: endD.m, key: endD.y * 12 + endD.m, prior };
    }
  }
  /* "As of Dec 31, 2025", "Dec 31, 25", "12/31/2025" */
  const asOf = t.replace(/^(as of|as at|as on|balance as of|balance at)\s+/, '');
  const d = parseDateText(asOf);
  if (d && d.d !== null) return { kind: 'period', sub: 'asOf', y: d.y, m: d.m, key: d.y * 12 + d.m, prior };
  /* Years: "2025", "FY2025", "FY 25", "2025 YTD", "Year 2025", "Actual 2025" */
  if ((m = flat.match(/^(?:fy|year|ytd|cy|actual|audited|unaudited)? ?((?:19|20)\d{2})(?: (?:ytd|actual|total|audited|unaudited))?$/)))
    return { kind: 'period', sub: 'year', y: +m[1], m: 11, key: +m[1] * 12 + 11, prior };
  if ((m = flat.match(/^fy ?(\d{2})$/)))
    return { kind: 'period', sub: 'year', y: fullYear(m[1]), m: 11, key: fullYear(m[1]) * 12 + 11, prior };
  if (/^(current (period|year)|this year|cy|amount|balance|actual|ytd|usd|\$|amount usd)$/.test(flat))
    return { kind: 'period', sub: 'generic', y: null, m: null, key: null, prior };
  if (prior && !flat) return { kind: 'period', sub: 'generic', y: null, m: null, key: null, prior: true };
  return null;
}

/* A header row made of Excel date serials (month starts/ends) → [{c, m, y}] or null. */
function _serialMonthRow(row){
  const cells = [];
  (row || []).forEach((v, c) => {
    if (typeof v === 'number' && Number.isInteger(v) && v > 25000 && v < 75000) cells.push({ c, v });
  });
  if (cells.length < 2) return null;
  for (let i = 1; i < cells.length; i++){
    const gap = cells[i].v - cells[i - 1].v;
    if (gap < 27 || gap > 32) return null;
  }
  return cells.map(x => { const d = excelSerialToDate(x.v); return { c: x.c, m: d.m, y: d.y }; });
}

/* ---------- structure detection ---------- */

const LABEL_HEADER_WORDS = /^(account|accounts|distribution account|particulars|description|name|line item|item|customer|vendor|supplier|category|details?|gl account|account name|)$/;

function _numericBelow(rows, r, c, look = 60){
  let hits = 0;
  for (let rr = r + 1; rr < Math.min(rows.length, r + 1 + look); rr++){
    const v = (rows[rr] || [])[c];
    if (parseAmount(v) !== null || isPercentText(v)) { if (++hits >= 1) return true; }
  }
  return false;
}

function findHeaderRow(rows){
  let best = -1, bestScore = 0;
  const maxR = Math.min(rows.length, 30);
  for (let r = 0; r < maxR; r++){
    const row = rows[r] || [];
    if (best >= 0 && row.some(v => /^total\b/i.test(cellText(v)))) break;   // statement body has started
    let score = 0, periodish = 0, penalty = 0;
    const serial = _serialMonthRow(row);
    const serialCols = new Set(serial ? serial.map(x => x.c) : []);
    let firstText = null;
    for (let c = 0; c < row.length; c++){
      const v = row[c];
      if (cellText(v) === '') continue;
      if (serialCols.has(c)){ if (_numericBelow(rows, r, c)){ score += 3; periodish++; } continue; }
      const h = classifyHeader(v);
      if (!h){
        if (parseAmount(v) !== null) penalty += 2;
        else if (firstText === null) firstText = normLabel(v);
        continue;
      }
      if (!_numericBelow(rows, r, c)) continue;
      if (h.kind === 'comment') continue;
      if (h.kind === 'month' || h.kind === 'bucket'){ score += 3; periodish++; }
      else if (h.kind === 'period'){ score += (h.sub === 'generic' ? 1 : 2); periodish++; }
      else score += 1;
    }
    if (firstText !== null && !LABEL_HEADER_WORDS.test(firstText) && periodish < 2) penalty += 2;
    score -= penalty;
    if (score > bestScore){ bestScore = score; best = r; }
  }
  return bestScore >= 1 ? best : -1;
}

/* Lines that are report metadata rather than statement content. */
function isMetaText(s){
  const t = normLabel(s);
  return /^(cash|accrual|modified cash) basis\b/.test(t) || /\bbasis (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t) ||
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday) \w+ \d/.test(t) || /gmt ?[+-]?\d/.test(t);
}

function classifyColumns(rows, headerRow){
  const width = Math.max(0, ...rows.map(r => (r || []).length));
  const start = headerRow >= 0 ? headerRow + 1 : 0;
  const header = headerRow >= 0 ? (rows[headerRow] || []) : [];
  const nNum = Array(width).fill(0), nText = Array(width).fill(0), nPct = Array(width).fill(0), nCode = Array(width).fill(0);
  for (let r = start; r < rows.length; r++){
    const row = rows[r] || [];
    for (let c = 0; c < width; c++){
      const v = row[c];
      if (cellText(v) === '') continue;
      if (isPercentText(v)) nPct[c]++;
      else if (parseAmount(v) !== null){ nNum[c]++; if (/^\d{3,6}([.\-]\d{1,3})?$/.test(cellText(v))) nCode[c]++; }
      else if (!isMetaText(v)) nText[c]++;
    }
  }
  const serial = headerRow >= 0 ? _serialMonthRow(header) : null;
  const serialBy = new Map((serial || []).map(x => [x.c, x]));
  const hdr = [];
  for (let c = 0; c < width; c++) hdr[c] = serialBy.has(c) ? { kind: 'month', m: serialBy.get(c).m, y: serialBy.get(c).y } : classifyHeader(header[c]);

  const isValue = c => {
    const h = hdr[c];
    if (h && h.kind === 'comment') return false;
    if (nNum[c] + nPct[c] === 0) return false;
    if (h && h.kind !== 'comment') return true;
    return nNum[c] + nPct[c] >= Math.max(1, nText[c]);
  };
  const d0Adjacent = c => { for (let d = c + 1; d < Math.min(width, c + 3); d++) if (nText[d] >= 3) return true; return false; };
  let firstValue = -1;
  for (let c = 1; c < width; c++){
    if (!isValue(c)) continue;
    /* An integer account-code column followed by the label text is part of the label. */
    let nextValue = width;
    for (let d = c + 1; d < width; d++) if (isValue(d)){ nextValue = d; break; }
    let labelTextAfter = false;
    for (let d = c + 1; d < nextValue; d++) if (nText[d] >= 3 && nText[d] > nNum[d]) labelTextAfter = true;
    if (labelTextAfter && !hdr[c] && nCode[c] === nNum[c] && d0Adjacent(c)) continue;
    firstValue = c; break;
  }
  const cols = [];
  for (let c = 0; c < width; c++){
    const h = hdr[c];
    const headLabel = cellText(header[c]);
    let col = { idx: c, type: 'value', label: headLabel };
    if (firstValue < 0 ? c === 0 : c < firstValue){
      col.type = 'label';
      if (nText[c] === 0 && nNum[c] === 0) col.empty = true;
    } else if (!isValue(c)){
      col.type = nText[c] > 0 || (h && h.kind === 'comment') ? 'comment' : 'spacer';
      col.empty = nText[c] === 0;
    } else if (h){
      if (h.kind === 'month'){
        col.type = 'month'; col.m = h.m; col.year = h.y;
        col.short = MONTH_ABBR[h.m].replace(/^./, x => x.toUpperCase());
        col.label = col.short + (h.y ? ' ' + h.y : '');
        col.key = h.y ? h.y * 12 + h.m : null;
        if (h.prior) col.priorMonth = true;
      } else if (h.kind === 'total') { col.type = 'rowTotal'; col.label = 'Total'; }
      else if (h.kind === 'change') col.type = 'change';
      else if (h.kind === 'percent') col.type = 'percent';
      else if (h.kind === 'bucket') { col.type = 'bucket'; col.label = /^current$/i.test(headLabel) ? 'Current' : headLabel; }
      else if (h.kind === 'period'){ col.type = 'period'; col.key = h.key; col.year = h.y; col.prior = h.prior; col.sub = h.sub;
        if (typeof header[c] === 'number') col.label = String(header[c]); }
    } else if (nPct[c] > nNum[c]) col.type = 'percent';
    cols.push(col);
  }

  /* Current / prior / history among period columns. */
  const periods = cols.filter(c => c.type === 'period');
  if (periods.length){
    const nonPrior = periods.filter(c => !c.prior);
    let current = null;
    if (nonPrior.length){
      const dated = nonPrior.filter(c => c.key !== null);
      current = dated.length ? dated.reduce((a, b) => (b.key > a.key ? b : a)) : nonPrior[0];
    } else current = periods[0];
    current.type = 'current';
    const rest = periods.filter(c => c !== current);
    const flagged = rest.filter(c => c.prior);
    let prior = null;
    if (flagged.length) prior = flagged.reduce((a, b) => ((b.key ?? -1) > (a.key ?? -1) ? b : a));
    else {
      const earlier = rest.filter(c => c.key !== null && current.key !== null && c.key < current.key);
      if (earlier.length) prior = earlier.reduce((a, b) => (b.key > a.key ? b : a));
      else if (rest.length && current.key === null) prior = rest[0];
    }
    if (prior) prior.type = 'prior';
    rest.filter(c => c !== prior).forEach(c => { c.type = 'history'; });
  }
  /* Percent columns detected by content keep type percent; plain values stay 'value'.
   * A sheet with only one unlabelled value column uses it as the current period. */
  const valueTyped = cols.filter(c => !['label', 'comment', 'spacer'].includes(c.type));
  if (!cols.some(c => ['current', 'month', 'rowTotal', 'bucket'].includes(c.type))){
    const plain = valueTyped.filter(c => c.type === 'value');
    if (plain.length) plain[0].type = 'current';
  }
  return cols;
}

/* Value columns an edit/recompute cascades across (everything numeric except derived ones) */
function valueColumns(cols){
  return cols.filter(c => ['month', 'bucket', 'current', 'prior', 'history', 'value', 'rowTotal'].includes(c.type))
             .map(c => c.idx);
}

/* Columns shown in statement tables (numbers only, no reviewer comments / spacer columns). */
function displayColumns(sm){
  return sm.cols.filter(c => !['label', 'comment', 'spacer'].includes(c.type));
}

function _titleRowCount(rows, headerRow){
  if (headerRow >= 0) return headerRow + 1;
  let n = 0;
  for (let r = 0; r < Math.min(rows.length, 6); r++){
    const cells = (rows[r] || []).map(cellText).filter(Boolean);
    if (!cells.length){ if (n) n = r + 1; continue; }
    if (cells.length === 1 && parseAmount(cells[0]) === null && !/^total/i.test(cells[0])) n = r + 1;
    else break;
  }
  return n;
}

function buildLines(rows, headerRow, cols){
  const lines = [];
  const labelCols = cols.filter(c => c.type === 'label').map(c => c.idx);
  const valCols = cols.filter(c => !['label', 'comment', 'spacer'].includes(c.type)).map(c => c.idx);
  const start = _titleRowCount(rows, headerRow);
  let indentUnit = 0;

  for (let r = start; r < rows.length; r++){
    const row = rows[r] || [];
    let label = '', raw = '', level = 0, code = '';
    for (let i = 0; i < labelCols.length; i++){
      const v = row[labelCols[i]];
      const t = cellText(v);
      if (!t) continue;
      if (parseAmount(v) !== null && /^\d{3,}([.\-]\d+)?$/.test(t) && !label){ code = t; continue; }
      if (!label){ label = t; raw = String(v); level = i; }
      else label += ' ' + t;
    }
    if (code && label) label = code + ' ' + label;
    else if (code && !label){ label = code; raw = code; }
    const hasValues = valCols.some(c => parseAmount(row[c]) !== null || isPercentText(row[c]));
    if (!label) continue;                        // stray values with no label — not a line
    if (isMetaText(label) && !hasValues) continue;
    const leading = raw.match(/^ */)[0].length;
    if (leading > 0) indentUnit = indentUnit ? Math.min(indentUnit, leading) : leading;

    const key = normLabel(label);
    let kind = 'account', closes = null;
    const mTotal = label.match(/^total(?:\s+for)?\s+(.+)$/i) || null;
    const mTotal2 = !mTotal && label.match(/^(.+?)\s*[-:]?\s+total$/i);
    if (/^(grand\s+)?total$/i.test(label) || /^report total$/i.test(label)) kind = 'grandTotal';
    else if (mTotal){ kind = 'total'; closes = mTotal[1].trim(); }
    else if (mTotal2 && !/^(net|gross)\b/i.test(label)){ kind = 'total'; closes = mTotal2[1].trim(); }
    else if (FORMULA_ROWS.includes(labelKey(label)) || /^net (income|profit|loss|earnings)\b/.test(labelKey(label))) kind = 'computed';
    else if (!hasValues) kind = 'section';

    lines.push({ r, rawLabel: raw, label, key, level, leading, kind, closes,
                 hasValues, openerIdx: null, totalIdx: null });
  }

  for (const l of lines) l.indent = l.level + (indentUnit ? Math.round(l.leading / indentUnit) : 0);

  /* Link each total row to its opener (nearest earlier unmatched line with the same label). */
  for (let i = 0; i < lines.length; i++){
    const l = lines[i];
    if (l.kind !== 'total') continue;
    const want = normLabel(l.closes), wantKey = labelKey(l.closes);
    let found = -1;
    for (let pass = 0; pass < 2 && found < 0; pass++){
      for (let j = i - 1; j >= 0; j--){
        const o = lines[j];
        if (o.totalIdx !== null || o.kind === 'total' || o.kind === 'grandTotal') continue;
        if (pass === 0 ? o.key === want : (wantKey && labelKey(o.label) === wantKey)){ found = j; break; }
      }
    }
    if (found >= 0){ l.openerIdx = found; lines[found].totalIdx = i; }
  }

  const byLabel = {};
  for (let i = 0; i < lines.length; i++){
    const k = lines[i].label.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!(k in byLabel)) byLabel[k] = i;   // first occurrence wins
  }
  return { lines, byLabel, indentUnit, start };
}

function buildSheetModel(name, rows, role){
  const headerRow = findHeaderRow(rows);
  const cols = classifyColumns(rows, headerRow);
  const { lines, byLabel, indentUnit, start } = buildLines(rows, headerRow, cols);
  return { name, role, headerRow, bodyStart: start, cols, lines, byLabel, indentUnit,
           labelCols: cols.filter(c => c.type === 'label').map(c => c.idx) };
}

/* ---------- role detection ---------- */

function _sheetText(rows, maxRows){
  let out = '';
  for (let r = 0; r < Math.min(rows.length, maxRows); r++)
    for (const v of rows[r] || []) if (typeof v === 'string' && v.trim()) out += ' ' + v;
  return normLabel(out);
}

function _titleText(rows){ return _sheetText(rows, 8); }

function _allLabelKeys(rows){
  const set = new Set();
  for (const row of rows) for (const v of (row || []).slice(0, 8)) if (typeof v === 'string' && v.trim()) set.add(labelKey(v));
  return set;
}

function detectRoles(sheets, sheetModels){
  const roles = { plMonthly: null, plComparative: null, plPercent: null, pl: null, bs: null, ar: null, ap: null, notes: null, summary: null };
  const names = Object.keys(sheets);
  const info = names.map(n => {
    const rows = sheets[n] || [];
    const sm = sheetModels[n];
    const nameT = normLabel(n), title = _titleText(rows);
    const keys = _allLabelKeys(rows.slice(0, 600));
    const has = re => [...keys].some(k => re.test(k));
    const months = sm.cols.filter(c => c.type === 'month').length;
    const buckets = sm.cols.filter(c => c.type === 'bucket').length;
    const periods = sm.cols.filter(c => ['current', 'prior', 'history'].includes(c.type)).length;
    const text = nameT + ' ' + title;
    const plName = /profit and loss|profit loss|\bp and l\b|\bpl\b|\bp l\b|income statement|statement of (operations|income|comprehensive income)|income and expense|operating statement|revenue and expense/.test(text);
    const bsName = /balance sheet|statement of financial (position|condition)|\bbs\b/.test(text);
    const plContent = (has(/^total (for )?(income|revenues?|sales)$/) || has(/^gross profit$/)) && has(/^net (income|profit|loss|ordinary income)/);
    const bsContent = has(/^total (for )?assets$/) && (has(/^total (for )?liabilities/) || has(/equity$/));
    const recv = /receivable|\ba r\b|\bar\b|customer/.test(text), pay = /payable|\ba p\b|\bap\b|vendor|supplier/.test(text);
    const agingName = /ag(e)?ing|aged/.test(text);
    const notes = /\bnotes?\b|comments?/.test(nameT) || /notes? to (the )?(financial statements?|accounts)/.test(title);
    return { n, sm, months, buckets, periods, plName, bsName, plContent, bsContent, recv, pay, agingName, notes,
             pct: sm.cols.some(c => c.type === 'percent') && !periods && !months, detail: /detail|by class|by customer|by vendor|transaction/.test(text) };
  });
  const free = x => !Object.values(roles).includes(x.n);

  for (const x of info){
    if (!free(x)) continue;
    if ((x.buckets >= 2 || x.agingName) && (x.recv || x.pay) && !x.plContent && !x.bsContent){
      if (x.recv && !x.pay && !roles.ar){ roles.ar = x.n; continue; }
      if (x.pay && !x.recv && !roles.ap){ roles.ap = x.n; continue; }
      if (x.recv && x.pay){ if (/receivable|\ba r\b|\bar\b/.test(normLabel(x.n)) && !roles.ar){ roles.ar = x.n; continue; }
                           if (!roles.ap){ roles.ap = x.n; continue; } }
    }
  }
  for (const x of info){
    if (!free(x) || roles.bs) continue;
    if ((x.bsName && !x.plName) || (x.bsContent && !x.plContent)){ roles.bs = x.n; }
  }
  const plCands = info.filter(x => free(x) && !x.detail && (x.plName || x.plContent) && !(x.bsContent && !x.plContent));
  for (const x of plCands){
    if (x.months >= 2 && !roles.plMonthly){ roles.plMonthly = x.n; continue; }
  }
  for (const x of plCands){
    if (!free(x)) continue;
    if (x.periods >= 2 && !roles.plComparative){ roles.plComparative = x.n; continue; }
  }
  for (const x of plCands){
    if (!free(x)) continue;
    if (x.pct && !roles.plPercent && (roles.pl || roles.plMonthly || roles.plComparative)){ roles.plPercent = x.n; continue; }
    if (!roles.pl && !roles.plMonthly && !roles.plComparative){ roles.pl = x.n; continue; }
    if (!roles.pl && x.periods >= 1 && !roles.plComparative){ roles.pl = x.n; continue; }
  }
  for (const x of info){
    if (free(x) && x.notes && !roles.notes){ roles.notes = x.n; }
  }
  return roles;
}

/* ---------- legacy helpers kept for recompute.js ---------- */

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

function colOfType(sm, type){
  const c = sm && sm.cols.find(c => c.type === type);
  return c ? c.idx : null;
}

/* ---------- entry point ---------- */

function parseWorkbook(sheets){
  const sheetModels = {};
  for (const [name, rows] of Object.entries(sheets)){
    try { sheetModels[name] = buildSheetModel(name, rows || [], 'other'); }
    catch (e){
      console.error('Sheet could not be modelled:', name, e);
      sheetModels[name] = { name, role: 'other', headerRow: -1, bodyStart: 0, cols: [{ idx: 0, type: 'label', label: '' }], lines: [], byLabel: {}, indentUnit: 0, labelCols: [0] };
    }
  }
  const roles = detectRoles(sheets, sheetModels);
  for (const [r, n] of Object.entries(roles)) if (n && sheetModels[n]) sheetModels[n].role = r;
  /* "Net Income" inside a Balance Sheet's equity section is an ordinary posting line, not a P&L formula row. */
  for (const sm of Object.values(sheetModels)){
    if (['plMonthly', 'plComparative', 'pl', 'plPercent'].includes(sm.role)) continue;
    for (const l of sm.lines) if (l.kind === 'computed') l.kind = l.hasValues ? 'account' : 'section';
  }
  const model = { roles, sheetModels };
  return analyzeFinancials(model, sheets);
}
