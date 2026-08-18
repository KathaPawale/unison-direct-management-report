/* Unison Direct Management Reporting — SVG chart builders
 * Pure functions returning SVG strings. Used by both the live dashboard and
 * the report pages (SVG rasterizes crisply through html2pdf). */
'use strict';

const CHART_COLORS = {
  blue:  '#2597d4',
  navy:  '#0b2f59',
  red:   '#c93438',
  green: '#138a58',
  amber: '#d49b00',
  purple:'#7454c9',
  teal:  '#0e8f8f',
  grey:  '#8a94a3',
  grid:  '#e7ebf1',
  axis:  '#aeb8c5',
  text:  '#6d7887'
};
const DONUT_PALETTE = ['#2597d4', '#0b2f59', '#7454c9', '#0e8f8f', '#d49b00', '#c93438', '#138a58', '#8a94a3'];

function _niceMax(v){
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/* Grouped vertical bars with a zero baseline (handles negatives).
 * series: [{name, color, values:[...]}], labels: [...] */
function svgGroupedBars({ series, labels, width = 760, height = 250, valueFmt = moneyShort }){
  const padL = 56, padR = 10, padT = 14, padB = 26;
  const W = width, H = height;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const all = series.flatMap(s => s.values.map(Number));
  const maxPos = _niceMax(Math.max(0, ...all));
  const maxNeg = _niceMax(Math.max(0, ...all.map(v => -v)));
  const span = maxPos + maxNeg || 1;
  const zeroY = padT + (maxPos / span) * plotH;
  const scale = plotH / span;
  const n = Math.max(labels.length, 1);
  const slot = plotW / n;
  const barW = Math.max(3, Math.min(26, (slot - 8) / Math.max(series.length, 1)));

  let out = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img">`;
  /* gridlines: zero + halves of each side */
  const gridVals = [maxPos, maxPos / 2, 0, -maxNeg / 2, -maxNeg].filter((v, i, a) => a.indexOf(v) === i);
  for (const gv of gridVals){
    const y = zeroY - gv * scale;
    if (y < padT - 1 || y > padT + plotH + 1) continue;
    const main = gv === 0;
    out += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="${main ? CHART_COLORS.axis : CHART_COLORS.grid}" stroke-width="${main ? 1.4 : 1}"/>`;
    out += `<text x="${padL - 6}" y="${(y + 3).toFixed(1)}" font-size="9" fill="${CHART_COLORS.text}" text-anchor="end">${escapeHtml(valueFmt(gv))}</text>`;
  }
  labels.forEach((lab, i) => {
    const x0 = padL + i * slot + (slot - barW * series.length) / 2;
    series.forEach((s, si) => {
      const v = Number(s.values[i] || 0);
      const h = Math.abs(v) * scale;
      const y = v >= 0 ? zeroY - h : zeroY;
      out += `<rect x="${(x0 + si * barW).toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 1.5).toFixed(1)}" height="${Math.max(h, v === 0 ? 0 : 1.5).toFixed(1)}" rx="1.5" fill="${s.color}"><title>${escapeHtml(s.name + ' — ' + lab + ': ' + money(v))}</title></rect>`;
    });
    out += `<text x="${(padL + i * slot + slot / 2).toFixed(1)}" y="${H - 8}" font-size="9.5" fill="${CHART_COLORS.text}" text-anchor="middle">${escapeHtml(lab)}</text>`;
  });
  out += '</svg>';
  return out;
}

/* Polyline trend (e.g. net margin %) */
function svgLineTrend({ values, labels, width = 760, height = 170, color = CHART_COLORS.purple, valueFmt = v => pct(v) }){
  const padL = 46, padR = 12, padT = 12, padB = 24;
  const W = width, H = height, plotW = W - padL - padR, plotH = H - padT - padB;
  const finite = values.map(v => (isFinite(v) ? Number(v) : 0));
  let lo = Math.min(0, ...finite), hi = Math.max(0, ...finite);
  if (hi === lo) hi = lo + 1;
  const y = v => padT + (hi - v) / (hi - lo) * plotH;
  const x = i => padL + (finite.length < 2 ? plotW / 2 : i * plotW / (finite.length - 1));
  let out = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img">`;
  for (const gv of [hi, (hi + lo) / 2, lo, 0].filter((v, i, a) => a.indexOf(v) === i)){
    out += `<line x1="${padL}" y1="${y(gv).toFixed(1)}" x2="${W - padR}" y2="${y(gv).toFixed(1)}" stroke="${gv === 0 ? CHART_COLORS.axis : CHART_COLORS.grid}" stroke-width="1"/>`;
    out += `<text x="${padL - 6}" y="${(y(gv) + 3).toFixed(1)}" font-size="9" fill="${CHART_COLORS.text}" text-anchor="end">${escapeHtml(valueFmt(gv))}</text>`;
  }
  const pts = finite.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  out += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  finite.forEach((v, i) => {
    out += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${color}"><title>${escapeHtml(labels[i] + ': ' + valueFmt(v))}</title></circle>`;
    out += `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="9.5" fill="${CHART_COLORS.text}" text-anchor="middle">${escapeHtml(labels[i])}</text>`;
  });
  out += '</svg>';
  return out;
}

/* Horizontal bars (e.g. expense breakdown). items: [{label, value}] */
function svgHBars({ items, width = 760, height = null, color = CHART_COLORS.blue, valueFmt = money, totalForPct = null }){
  const rowH = 26, padT = 6, padB = 6, labelW = 250, valueW = 118;
  const H = height || padT + padB + items.length * rowH;
  const W = width, barMaxW = W - labelW - valueW - 16;
  const max = Math.max(...items.map(i => Math.abs(Number(i.value) || 0)), 1);
  let out = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img">`;
  items.forEach((it, i) => {
    const v = Number(it.value) || 0;
    const yMid = padT + i * rowH + rowH / 2;
    const w = Math.max(2, Math.abs(v) / max * barMaxW);
    const lab = it.label.length > 38 ? it.label.slice(0, 37) + '…' : it.label;
    out += `<text x="${labelW - 8}" y="${(yMid + 3.5).toFixed(1)}" font-size="10.5" fill="#34445a" text-anchor="end">${escapeHtml(lab)}</text>`;
    out += `<rect x="${labelW}" y="${(yMid - 8).toFixed(1)}" width="${w.toFixed(1)}" height="16" rx="2.5" fill="${v < 0 ? CHART_COLORS.red : color}"><title>${escapeHtml(it.label + ': ' + money(v))}</title></rect>`;
    const pctTxt = totalForPct ? ' (' + pct(Math.abs(v) / Math.abs(totalForPct) * 100) + ')' : '';
    out += `<text x="${(labelW + w + 6).toFixed(1)}" y="${(yMid + 3.5).toFixed(1)}" font-size="10" fill="${CHART_COLORS.text}">${escapeHtml(valueFmt(v) + pctTxt)}</text>`;
  });
  out += '</svg>';
  return out;
}

/* Donut with side legend, returned as an HTML flex block containing the SVG. */
function donutChart({ items, size = 168, title = '' }){
  const clean = items.filter(i => Math.abs(Number(i.value) || 0) > 0.004);
  const total = clean.reduce((s, i) => s + Math.abs(Number(i.value) || 0), 0) || 1;
  const cx = size / 2, cy = size / 2, R = size / 2 - 4, r = R * 0.62;
  let a0 = -Math.PI / 2;
  let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img">`;
  const legend = [];
  clean.forEach((it, i) => {
    const frac = Math.abs(Number(it.value)) / total;
    const a1 = a0 + frac * Math.PI * 2;
    const color = DONUT_PALETTE[i % DONUT_PALETTE.length];
    const large = frac > 0.5 ? 1 : 0;
    if (frac >= 0.999){
      svg += `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="${color}" stroke-width="${R - r}"/>`;
    } else {
      const p = a => [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
      const q = a => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      const [x0, y0] = p(a0), [x1, y1] = p(a1), [x2, y2] = q(a1), [x3, y3] = q(a0);
      svg += `<path d="M${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${r},${r} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z" fill="${color}"><title>${escapeHtml(it.label + ': ' + money(it.value) + ' (' + pct(frac * 100) + ')')}</title></path>`;
    }
    legend.push(`<div class="donut-legend-item"><i style="background:${color}"></i><span>${escapeHtml(it.label)}</span><b>${escapeHtml(pct(frac * 100))}</b></div>`);
    a0 = a1;
  });
  svg += '</svg>';
  return `<div class="donut-block">${title ? `<div class="donut-title">${escapeHtml(title)}</div>` : ''}<div class="donut-flex">${svg}<div class="donut-legend">${legend.join('')}</div></div></div>`;
}

function chartLegend(series){
  return '<div class="chart-legend">' + series.map(s =>
    `<span><i style="background:${s.color}"></i>${escapeHtml(s.name)}</span>`).join('') + '</div>';
}
