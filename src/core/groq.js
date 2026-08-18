/* Unison Direct Management Reporting — Groq API client (browser-side)
 * The key lives only in this browser's localStorage and is sent only to
 * api.groq.com. Only the edited line + computed cascade are sent — never the
 * whole workbook. */
'use strict';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function groqChat(messages, { maxTokens = 500, json = true, timeoutMs = 15000 } = {}){
  const key = state.settings.groqKey && state.settings.groqKey.trim();
  if (!key) throw new Error('NO_KEY');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: state.settings.groqModel || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages
      })
    });
    if (!res.ok){
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (e) {}
      throw new Error('HTTP ' + res.status + (detail ? ' — ' + detail : ''));
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(t);
  }
}

async function testGroqConnection(){
  const content = await groqChat(
    [{ role: 'user', content: 'Reply with the JSON {"ok":true}' }],
    { maxTokens: 12, timeoutMs: 10000 }
  );
  return content.length > 0;
}

/* Build the impact-explanation request from a computeImpact() result. */
async function explainImpact({ sheetName, label, colLabel, oldVal, newVal, steps, advisories, balance }){
  const payload = {
    edited: { sheet: sheetName, line: label, column: colLabel || null,
              from: oldVal, to: newVal },
    automatic_adjustments: steps.slice(0, 40).map(s => ({
      sheet: s.sheet, line: s.label, column: s.colLabel || null,
      from: s.before, to: s.after
    })),
    advisories,
    balance_check: balance
      ? { assets: balance.assets, liabilities_and_equity: balance.liabEquity,
          difference: balance.diff, balanced: balance.balanced }
      : null
  };
  const content = await groqChat([
    { role: 'system', content:
      'You are a financial reporting analyst inside a management-reporting tool ' +
      '(QuickBooks-style). The user edited one line of a financial statement and the tool ' +
      'has already computed the deterministic cascade of adjustments. Explain in plain, ' +
      'concise English (max ~120 words) which statements and lines are impacted and why ' +
      '(e.g. an income line rolls up to Total Income, then Net Income, then Balance Sheet ' +
      'equity), and flag anything the numbers suggest should be double-checked. ' +
      'Respond ONLY as JSON: {"explanation": string, "cautions": string[]}' },
    { role: 'user', content: JSON.stringify(payload) }
  ]);
  try {
    const parsed = JSON.parse(content);
    return {
      explanation: String(parsed.explanation || ''),
      cautions: Array.isArray(parsed.cautions) ? parsed.cautions.map(String) : []
    };
  } catch (e) {
    return { explanation: content, cautions: [] };
  }
}
