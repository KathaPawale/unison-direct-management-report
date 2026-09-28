/* Unison Direct Management Reporting — workbook parser
 *
 * parseWorkbook(sheets) → model
 *   roles:        { plMonthly, plComparative, plPercent, plClass, pl, bs, ar, ap, notes } → sheet name | null
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
  plClass: 'Profit and Loss (by Class)',
  pl: 'Profit and Loss',
  bs: 'Balance Sheet',
  bsComparative: 'Balance Sheet — Comparative',
  tb: 'Trial Balance',
  ar: 'A/R Aging',
  ap: 'A/P Aging',
  notes: 'Notes',
  summary: 'Summary',
  other: 'Supplementary'
};

/* Formula rows recomputed by rule rather than by summing a span (recompute.js). */
/* The bottom line of a P&L, for-profit, IFRS or non-profit ("Statement of Activities"): Net Income / Profit / Loss, Profit for
 * the period / year, Profit after tax, Net Surplus (Deficit), Change in Net Assets, Increase (Decrease) in Net Assets,
 * Excess (Deficiency) of Revenue over Expenses. */
const NET_LINE_RE = /^(net (income|profit|loss|income loss|profit loss|loss income|earnings|surplus|deficit|surplus deficit|deficit surplus)|(net )?(profit|loss|profit loss|loss profit|income|earnings) (for|of) the (period|year|month|quarter|financial year)|(net )?(profit|income|earnings|loss) after (tax|taxes|taxation|income tax)|(total )?change in (unrestricted )?net assets|(net )?(increase|decrease)( (increase|decrease))? in (unrestricted )?net assets|excess (deficiency )?of (revenues?|support and revenues?|revenues? and support|income) over expenses?( deficiency)?|surplus deficit|deficit surplus)$/;
/* The income total of a P&L, for-profit or non-profit ("Total Support and Revenue"). */
const INCOME_TOTAL_RE = /^total (for )?(income|revenues?|sales|support|support and revenues?|revenues? and support|revenues? support and gains|revenues? gains and other support|public support and revenues?|operating revenues?)$/;

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

/* Amount parser for any uploaded figure: numbers; "$1,234.56"; "(1,234.56)"; "-1,234"; "1,234.56-"; currency symbols
 * or codes before or after ("€1,234.56", "1,234.56 USD", "Rs. 1,234"); "1,234.56 CR" (credit = negative) / "DR";
 * Excel's accounting zero "$ -"; a leading apostrophe; "1e6"; European "1.234,56" and Indian "1,23,456" grouping.
 * Percent text, dates, codes and words → null. */
const _CURRENCY_TOKEN = /^(us\$|a\$|c\$|s\$|hk\$|nz\$|r\$|usd|eur|gbp|inr|aed|sar|cad|aud|nzd|sgd|chf|jpy|cny|zar|rs\.?|₹|€|£|¥|\$)/i;
function parseAmount(v){
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let t = cellText(v).replace(/^'/, '').replace(/[\u00a0\u2007\u2009\u202f]/g, ' ').replace(/\u2212/g, '-').trim();
  if (!t || /%\)?$/.test(t)) return null;
  /* Excel's accounting zero: a currency sign and a dash ("$ -", "USD -", "- $"). */
  if (/^((us|a|c|s|hk|nz|r)?\$|usd|eur|gbp|inr|aed|sar|cad|aud|nzd|sgd|chf|jpy|cny|zar|rs\.?|₹|€|£|¥)\s*-+$|^-+\s*((us)?\$|usd|eur|gbp|inr|₹|€|£|¥)$/i.test(t)) return 0;
  let neg = false;
  const crdr = t.match(/^(.*\d)\s*(cr|dr)\.?$/i);
  if (crdr){ t = crdr[1].trim(); if (/^cr/i.test(crdr[2])) neg = !neg; }
  if (/^\(.*\)$/.test(t)){ neg = !neg; t = t.slice(1, -1).trim(); }
  for (let i = 0; i < 4; i++){
    const before = t;
    if (/-$/.test(t) && t.length > 1){ neg = !neg; t = t.slice(0, -1).trim(); }
    if (/^-/.test(t) && t.length > 1){ neg = !neg; t = t.slice(1).trim(); }
    const lead = t.match(_CURRENCY_TOKEN);
    if (lead) t = t.slice(lead[0].length).trim();
    const trail = t.match(/\s*(usd|eur|gbp|inr|aed|sar|cad|aud|nzd|sgd|chf|jpy|cny|zar|₹|€|£|¥|\$)$/i);
    if (trail && t.length > trail[0].length) t = t.slice(0, -trail[0].length).trim();
    if (/^\(.*\)$/.test(t)){ neg = !neg; t = t.slice(1, -1).trim(); }
    if (t === before) break;
  }
  if (!t) return null;                                       // a lone "$" / "USD" is a heading, not a number
  t = t.replace(/\s/g, '');
  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(t)){ const n = parseFloat(t); return neg ? -n : n; }
  const commas = (t.match(/,/g) || []).length, dots = (t.match(/\./g) || []).length;
  if (commas && dots){
    if (t.lastIndexOf(',') > t.lastIndexOf('.')){             // European 1.234,56
      if (!/^\d{1,3}(\.\d{3})*,\d+$/.test(t)) return null;
      t = t.replace(/\./g, '').replace(',', '.');
    } else {                                                  // US 1,234.56 / Indian 1,23,456.00
      if (!/^\d{1,3}(,\d{2,3})*\.\d*$/.test(t)) return null;
      t = t.replace(/,/g, '');
    }
  } else if (commas){
    if (commas === 1 && /^\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.');   // decimal comma 1234,5
    else if (/^\d{1,3}(,\d{2,3})*$/.test(t)) t = t.replace(/,/g, '');      // 1,234 / 1,23,456
    else return null;
  } else if (dots > 1){
    if (!/^\d{1,3}(\.\d{3})+$/.test(t)) return null;                      // European 1.234.567
    t = t.replace(/\./g, '');
  }
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const n = parseFloat(t);
  return neg ? -n : n;
}

/* Row 52: sheet_to_json({raw:true}) drops Excel number formats, so a %-formatted column (0.75 shown
 * as 75%) would read as plain numbers and render as dollars. Rewrite those cells as percent text,
 * which the parser types as a percent column and parseAmount never counts as an amount. */
function keepPercentCells(ws, rows){
  const ref = String((ws && ws['!ref']) || 'A1').split(':')[0].match(/^([A-Z]+)(\d+)$/);
  const colNo = letters => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const r0 = ref ? +ref[2] - 1 : 0, c0 = ref ? colNo(ref[1]) : 0;
  for (const addr of Object.keys(ws || {})){
    const cell = ws[addr];
    const m = addr.match(/^([A-Z]+)(\d+)$/);
    if (!m || !cell || cell.t !== 'n' || !isFinite(cell.v) || !/%/.test(String(cell.z || cell.w || ''))) continue;
    const row = rows[+m[2] - 1 - r0], c = colNo(m[1]) - c0;
    if (row && row[c] === cell.v) row[c] = +(cell.v * 100).toFixed(6) + '%';
  }
  return rows;
}

/* Row 34 / Row 52: a numeric percent column has ONE scale, read from all of its values — every value
 * within ±1 → fractions (0.45 = 45%); any value beyond ±1 → whole percents (0.45 = 0.45%). Deciding
 * cell by cell turned small whole-percent lines (Bank Fees 0.45%) into 45%. */
function percentColumnIsFraction(sm, rows, idx){
  return sm.lines.every(line => {
    const v = (rows[line.r] || [])[idx];
    const n = isPercentText(v) ? null : parseAmount(v);
    return n === null || Math.abs(n) <= 1;
  });
}

/* A row of shares inside an amounts table ("Percentage of total" under an A/P aging summary). */
function isPercentRowLabel(label){
  return /^(percentage|percent|pct|%)\s*(of\s*)?(the\s*)?(grand\s*)?total$/i.test(cellText(label));
}

/* That row's scale: every value within ±1 → fractions (1 = 100%); otherwise whole percents. */
function percentRowIsFraction(row, idxs){
  return idxs.every(i => { const n = isPercentText(row[i]) ? null : parseAmount(row[i]); return n === null || Math.abs(n) <= 1; });
}

function isPercentText(v){
  return /^\(?-?\d[\d,]*(\.\d+)?\s*%\)?$/.test(cellText(v));
}

/* "12.5%" → 12.5, "(12.5%)" / "-12.5%" → -12.5 (percent units); null when not percent text. */
function parsePercentText(v){
  if (!isPercentText(v)) return null;
  const s = cellText(v);
  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  return /^\(|^-/.test(s) ? -n : n;
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
  /^(121|120) ?(\+|and over|or more|plus)( days?)?$/, /^> ?90$/, /^older$/, /^(91|90) ?(\+|and over|or more|plus)? ?older$/
];

/* Classify one header cell. Returns {kind, …} or null.
 * kinds: month | period | total | change | percent | bucket | amount | comment */
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
  /* Trial Balance: Debit / Credit amount columns; "Account Type" is a descriptive column, not part of the account name. */
  if (/^(debit|credit|dr|cr|debits|credits)$/.test(flat)) return { kind: 'amount' };
  if (/^(account )?type$/.test(flat)) return { kind: 'comment' };
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
    /* Row 54: a "P&L by Class" heading row — class / department / location names ending in a Total column.
     * The names are column headings when a Total heading sits in the same row over numbers. */
    const totalHead = row.some((v, c) => c > 0 && typeof v === 'string' && /^(grand )?total$/i.test(v.trim()) && _numericBelow(rows, r, c));
    for (let c = 0; c < row.length; c++){
      const v = row[c];
      if (cellText(v) === '') continue;
      if (serialCols.has(c)){ if (_numericBelow(rows, r, c)){ score += 3; periodish++; } continue; }
      const h = classifyHeader(v);
      if (!h){
        if (parseAmount(v) !== null) penalty += 2;
        else if (totalHead && c > 0 && _numericBelow(rows, r, c)){ score += 2; periodish++; }
        else if (firstText === null) firstText = normLabel(v);
        continue;
      }
      if (!_numericBelow(rows, r, c)) continue;
      if (h.kind === 'comment') continue;
      if (h.kind === 'month' || h.kind === 'bucket'){ score += 3; periodish++; }
      else if (h.kind === 'period'){ score += (h.sub === 'generic' ? 1 : 2); periodish++; }
      else if (h.kind === 'amount'){ score += 2; periodish++; }
      else score += 1;
    }
    if (firstText !== null && !LABEL_HEADER_WORDS.test(firstText) && periodish < 2) penalty += 2;
    score -= penalty;
    if (score > bestScore){ bestScore = score; best = r; }
  }
  if (bestScore < 1) return -1;
  /* A stacked QuickBooks heading ("Jan - Jul, 2026" over "Amount | % of Income"): the lower row names the columns. */
  const next = rows[best + 1] || [];
  if (!cellText(next[0]) && next.every(v => cellText(v) === '' || parseAmount(v) === null) &&
      next.some((v, c) => c > 0 && (classifyHeader(v) || {}).kind === 'percent' && _numericBelow(rows, best + 1, c))) return best + 1;
  return best;
}

/* The heading above a generic one ("Amount", blank) in a stacked two-row heading, e.g. "Jan - Jul, 2026". */
function _stackedHead(rows, headerRow, c){
  const cur = cellText((rows[headerRow] || [])[c]);
  if (headerRow < 1 || (cur && !/^(amount|amt|balance|value|\$)$/i.test(cur))) return null;
  const up = rows[headerRow - 1] || [];
  if (cellText(up[0])) return null;
  const h = classifyHeader(up[c]);
  return h && ['period', 'total', 'month'].includes(h.kind) ? up[c] : null;
}

/* An unlabelled column that holds each line as a share of income (0.2505 or 25.05 next to 144,320.77 of 576,101.75). */
function _shareOfIncomeColumn(rows, start, c, amountCol){
  const incRow = rows.slice(start).find(row => /^total (for )?(income|revenues?|sales)$/.test(labelKey(cellText((row || [])[0]))));
  const inc = incRow ? parseAmount(incRow[amountCol]) : null;
  if (!inc) return false;
  let hits = 0, seen = 0;
  for (let r = start; r < rows.length; r++){
    const a = parseAmount((rows[r] || [])[amountCol]), p = parseAmount((rows[r] || [])[c]);
    if (a === null || p === null) continue;
    seen++;
    const share = a / inc;
    if (Math.abs(p - share) < 0.0006 || Math.abs(p - share * 100) < 0.06) hits++;
  }
  return seen >= 3 && hits >= seen * 0.8;
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
  const headAt = c => _stackedHead(rows, headerRow, c) ?? header[c];
  for (let c = 0; c < width; c++) hdr[c] = serialBy.has(c) ? { kind: 'month', m: serialBy.get(c).m, y: serialBy.get(c).y } : classifyHeader(headAt(c));

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
    const headLabel = cellText(headAt(c));
    let col = { idx: c, type: 'value', label: headLabel };
    if (c > 0 && h && h.kind === 'comment' && (firstValue < 0 || c < firstValue)){
      col.type = 'comment'; col.empty = nText[c] === 0;
    } else if (firstValue < 0 ? c === 0 : c < firstValue){
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
        if (typeof headAt(c) === 'number') col.label = String(headAt(c)); }
    } else if (nPct[c] > nNum[c]) col.type = 'percent';
    else if (!headLabel && cols.length && cols[c - 1].type !== 'label' && cols[c - 1].type !== 'percent' &&
             _shareOfIncomeColumn(rows, start, c, c - 1)){ col.type = 'percent'; col.label = '% of Income'; }
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

  /* Bug 9: the workbook's own title block (client name, statement title, period / "As of" date)
   * sits above the column header. It is already shown in the section heading, so those rows are
   * tagged kind 'meta' and kept apart from the statement lines — never rendered as blank rows and
   * never seen by the calculations. */
  const metaLines = [];
  for (let r = 0; r < start; r++){
    const label = (rows[r] || []).map(cellText).filter(Boolean).join(' ');
    if (label && r !== headerRow) metaLines.push({ r, label, kind: 'meta' });
  }

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
    else if (FORMULA_ROWS.includes(labelKey(label)) || /^net (income|profit|loss|earnings)\b/.test(labelKey(label)) || NET_LINE_RE.test(labelKey(label))) kind = 'computed';
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
  return { lines, metaLines, byLabel, indentUnit, start };
}

function buildSheetModel(name, rows, role){
  const headerRow = findHeaderRow(rows);
  const cols = classifyColumns(rows, headerRow);
  const { lines, metaLines, byLabel, indentUnit, start } = buildLines(rows, headerRow, cols);
  return { name, role, headerRow, bodyStart: start, cols, lines, metaLines, byLabel, indentUnit,
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

/* ---------- statement fingerprints ---------- */

/* What an accountant looks for to tell the statements apart, whatever the tab or title says. Each term counts once;
 * anchor lines (a statement's own totals / bottom line) are required before content alone decides the type. */
const PL_TERMS = [/^(income|revenues?|sales|turnover|support|support and revenues?|revenues? and support|operating revenues?|trading income)$/,
  /(sales|revenues?|fees|commissions?|contributions|grants|donations|service income|consulting income|interest income|rental income)$/,
  /^(cost of (goods sold|sales|revenues?|services)|cogs|direct costs?)$/, /^gross (profit|margin)/, /^(operating )?expenses?$|^expenditures?$/,
  /(salaries|wages|payroll)/, /^rent( expense)?$|^rent or lease/, /utilities/, /(advertising|marketing)/, /(professional|legal|accounting) fees/,
  /^depreciation( expense| and amortization)?$/, /^interest expense$/, /income tax( expense)?$/, /^(net )?operating (income|profit|loss)$|^ebitda$/,
  /^other (income|expenses?)$/, /^net other income$/, /(insurance|office|travel|meals|bank (service )?charges|dues and subscriptions|repairs)/];
const PL_ANCHORS = [INCOME_TOTAL_RE, /^total (for )?(expenses?|expenditures?|operating expenses?)$/, /^gross (profit|margin)$/, NET_LINE_RE];
const BS_TERMS = [/^(current )?assets$/, /(checking|savings|cash|bank)/, /accounts receivable|^receivables?$|debtors/, /inventory|stock on hand/, /prepaid/,
  /^(fixed|non current|long term) assets$|property and equipment|equipment|vehicles|furniture|buildings?|^land$/, /accumulated depreciation/,
  /^(current )?liabilities$/, /accounts payable|^payables?$|creditors/, /accrued|payroll liabilities|sales tax payable/, /credit cards?|loan|notes? payable|mortgage|line of credit/,
  /^(long term|non current) liabilities$/, /^(equity|capital|net assets)$|stockholders|shareholders|owners? (equity|capital|draw|investment)|members equity|partners capital/,
  /retained earnings|opening balance equity|accumulated (surplus|deficit)/];
const BS_ANCHORS = [/^total (for )?assets$/, /^total (for )?liabilities( and (stockholders |shareholders |owners |members |partners )?(equity|capital|net assets))?$/,
  /^total (for )?(equity|net assets|capital|stockholders equity|shareholders equity)$/, /retained earnings/];
const CASH_FLOW_RE = /operating activities|investing activities|financing activities|^net (change|increase|decrease|increase decrease) in cash|^cash (at|at the) (beginning|end) of/;

function statementFingerprint(keys){
  const list = [...keys];
  const count = res => res.filter(re => list.some(k => re.test(k))).length;
  return { pl: count(PL_TERMS), plAnchors: count(PL_ANCHORS), bs: count(BS_TERMS), bsAnchors: count(BS_ANCHORS), cashFlow: list.some(k => CASH_FLOW_RE.test(k)) };
}

function detectRoles(sheets, sheetModels){
  const roles = { plMonthly: null, plComparative: null, plPercent: null, plClass: null, pl: null, bs: null, bsComparative: null, tb: null, ar: null, ap: null, notes: null, summary: null };
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
    const rawName = cellText(n);
    const plName = /^(pl|p&l|pnl|p\/l|profit ?(and|&) ?loss|income statement|is)$/i.test(rawName) || /profit and loss|profit loss|\bp and l\b|\bpl\b|\bp l\b|\bpnl\b|income statement|earnings statement|statement of (operations|income|earnings|comprehensive income|activities|revenues? and expenses?|support revenues? and expenses?|revenues? expenses and changes in net assets)|results of operations|trading (and profit and loss )?account|income and expense|operating statement|revenue and expense|revenues and expenditures?|income and expenditure|income summary/.test(text);
    /* "BS" / "Balance Sheet" is the Balance Sheet; only a name that says so ("BS_Comparative", "Balance Sheet Comp")
     * is the comparative one, whatever the tab order. */
    const bsTab = /^(bs|b\.?s\.?|balance ?sheet)(_|-|\s)*(comparative|comp)?$/i.test(rawName);
    const bsComparative = bsTab && /(comparative|comp)$/i.test(rawName.trim());
    const bsName = bsTab || /balance sheet|statement of financial (position|condition)|statement of (assets and liabilities|net assets|condition)|position statement|net worth statement|\bbs\b|\bb s\b/.test(text);
    /* Strict rule: a tab named TB / Trial Balance ("TB_July", "Trial Balance Summary") or a sheet titled "Trial Balance"
     * is the Trial Balance — whatever its columns. */
    const tbName = /^(tb|t\.?b\.?|trial ?balance)$/i.test(rawName) || /(^| )(tb|trial ?balance)( |$)/.test(nameT) ||
      (/(^| )trial balance( |$)/.test(_sheetText(rows, 6)) && !/profit and loss|balance sheet|income statement/.test(_sheetText(rows, 6)));
    /* Content decides whatever the tab or title says: the statement's own lines, the way an accountant reads it. */
    const fp = statementFingerprint(keys);
    const plContent = !fp.cashFlow && (((has(INCOME_TOTAL_RE) || has(/^gross profit$/)) && (has(/^net (income|profit|loss|ordinary income)/) || has(NET_LINE_RE))) ||
      (fp.plAnchors >= 1 && fp.pl >= 4 && fp.pl + fp.plAnchors >= 1.5 * (fp.bs + fp.bsAnchors)));
    const bsContent = !fp.cashFlow && ((has(/^total (for )?assets$/) && (has(/^total (for )?liabilities/) || has(/equity$/))) ||
      (fp.bsAnchors >= 1 && fp.bs >= 4 && fp.bs + fp.bsAnchors >= 1.5 * (fp.pl + fp.plAnchors)));
    /* A Trial Balance: Debit and Credit columns holding accounts of both statements (not a dated ledger). */
    const drCr = sm.cols.filter(c => /^(debit|credit|debits|credits|dr|cr)$/i.test(cellText(c.label))).length >= 2;
    const dated = sm.cols.some(c => /^(date|txn date|transaction date|posting date)$/i.test(cellText(c.label)));
    const tbContent = drCr && !dated && fp.pl >= 2 && fp.bs >= 2;
    const recv = /receivable|\ba r\b|\bar\b|customer|debtors?/.test(text), pay = /payable|\ba p\b|\bap\b|vendor|supplier|creditors?/.test(text);
    const agingName = /ag(e)?ing|aged/.test(text);
    const notes = /\bnotes?\b|comments?/.test(nameT) || /notes? to (the )?(financial statements?|accounts)/.test(title);
    /* "PL (% Income)" / "Profit and Loss % of Total Income": a P&L with a % of income column and one amount column
     * (a Total or a single period such as "Jan - Dec 2025"). A tab/title that says so counts even with more periods. */
    const pctCol = sm.cols.some(c => c.type === 'percent');
    /* Only the tab name, the title rows and the column headings count — never the statement body (a "12.5%" cell
     * followed by a "Total Income" line is not a "% of Total Income" title). */
    const headText = _sheetText(rows, sm.headerRow >= 0 ? sm.headerRow + 1 : 6);
    const pctName = /%|percent|pct/i.test(rawName) || /(%|percent(age)?) (of )?(total )?(income|revenues?|sales)|common size|vertical analysis/.test(normLabel(rawName) + ' ' + headText);
    /* Row 54: "P&L(Classwise)" / "Profit and Loss by Class" — one column per class / department / location plus Total. */
    const segCols = sm.cols.filter(c => c.type === 'value' && c.label).length;
    const className = /class ?wise|\bby (class|department|location|division|segment|project|site|branch)\b|\bclass(es)?\b|department ?wise|location ?wise/.test(text);
    const cls = !months && periods <= 1 && (className || (segCols >= 2 && sm.cols.some(c => c.type === 'rowTotal')));
    return { n, sm, months, buckets, periods, plName, bsName, bsComparative, tbName: tbName || tbContent, plContent, bsContent, recv, pay, agingName, notes, cls, pctName,
             pct: pctCol && ((months < 2 && periods <= 1) || pctName),
             detail: /detail|by customer|by vendor|transaction|ledger|journal|register/.test(text) || fp.cashFlow || dated };
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
    if (!free(x) || !x.tbName) continue;
    roles.tb = x.n;
  }
  /* A name that says Balance Sheet does not outweigh content that is plainly a P&L (and the other way round). */
  const bsCands = info.filter(x => free(x) && ((x.bsName && !x.plName && !(x.plContent && !x.bsContent)) || (x.bsContent && !x.plContent)));
  const primaryBs = bsCands.find(x => !x.bsComparative && x.periods < 2) || bsCands.find(x => !x.bsComparative) || bsCands[0];
  if (primaryBs) roles.bs = primaryBs.n;
  for (const x of bsCands){
    if (x.n !== roles.bs && !roles.bsComparative && (x.bsComparative || x.periods >= 2)) roles.bsComparative = x.n;
  }
  const plAll = info.filter(x => free(x) && !x.detail && (x.plName || x.plContent) && !(x.bsContent && !x.plContent));
  /* The main P&L roles go to amount sheets first, whatever the tab order; a % of Income or by-Class sheet is
   * the main P&L only when the workbook has no other P&L. */
  const plMain = plAll.filter(x => !x.pct && !x.cls);
  /* Strict rule: a sheet whose tab or title says "% of Income" is always PL (% Income), even when it is the only P&L
   * (the figures then come from it — see analyzeFinancials). */
  const pctNamed = x => x.pct && x.pctName && x.periods <= 1 && x.months < 2;   // one amount column + its % of Income
  const plCands = plMain.length ? plMain : plAll.filter(x => !x.pct).length ? plAll.filter(x => !x.pct) : plAll.filter(x => !pctNamed(x));
  for (const x of plCands){
    if (!free(x)) continue;
    if (x.periods >= 2 && !roles.plComparative){ roles.plComparative = x.n; continue; }
  }
  for (const x of plCands){
    if (x.months >= 2 && !roles.plMonthly){ roles.plMonthly = x.n; continue; }
  }
  for (const x of plCands){
    if (!free(x)) continue;
    if (!roles.pl && !roles.plMonthly && !roles.plComparative){ roles.pl = x.n; continue; }
    if (!roles.pl && x.periods >= 1 && !roles.plComparative){ roles.pl = x.n; continue; }
    /* A full-period P&L next to the monthly and comparative ones ("PL" beside "PL_MoM" / "PL_Comparative") is captured too. */
    if (!roles.pl && !x.months && x.periods <= 1){ roles.pl = x.n; continue; }
  }
  for (const x of plAll){
    if (free(x) && x.pct && !roles.plPercent && (roles.pl || roles.plMonthly || roles.plComparative || x.pctName)) roles.plPercent = x.n;
  }
  for (const x of plAll){
    if (free(x) && x.cls && !roles.plClass && (roles.pl || roles.plMonthly || roles.plComparative)) roles.plClass = x.n;
  }
  if (!roles.pl && !roles.plMonthly && !roles.plComparative){
    for (const [n, sm] of Object.entries(sheetModels)){
      if (roles.pl || roles.plMonthly || roles.plComparative) break;
      if (/^(pl|p&l|profit\s*(and|&)\s*loss|income\s*statement)$/i.test(n)){
        const hasMonths = sm.cols && sm.cols.some(c => /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(String(c.label || '')));
        roles[hasMonths ? 'plMonthly' : 'pl'] = n;
      }
    }
  }
  if (!roles.bs && !roles.bsComparative){
    for (const [n] of Object.entries(sheetModels)){
      if (roles.bs || roles.bsComparative) break;
      if (/^bs[\s_\-]*comparative$/i.test(n) || /^balance[\s_]*sheet[\s_\-]*(comparative|comp)$/i.test(n)){
        roles.bsComparative = n;
      } else if (/^(bs|b\.s\.|balance[\s_]*sheet)$/i.test(n)){
        roles.bs = n;
      }
    }
  }
  for (const x of info){
    if (free(x) && x.notes && !roles.notes){ roles.notes = x.n; }
  }
  /* Strict rule: a tab whose name says Trial Balance / TB or "% of Income" is never dropped — even when its content
   * did not look like a statement (no amount columns recognised). */
  for (const x of info){
    if (!free(x)) continue;
    if (!roles.tb && x.tbName) roles.tb = x.n;
    else if (!roles.plPercent && x.pctName && (x.plName || x.plContent)) roles.plPercent = x.n;
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
    if (['plMonthly', 'plComparative', 'pl', 'plPercent', 'plClass'].includes(sm.role)) continue;
    for (const l of sm.lines) if (l.kind === 'computed') l.kind = l.hasValues ? 'account' : 'section';
  }
  const model = { roles, sheetModels };
  return analyzeFinancials(model, sheets);
}
