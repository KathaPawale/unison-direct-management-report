/* Unison Direct Management Reporting — Groq client.
 * Uses the server-side GROQ_API_KEY configured in Vercel so AI works on every
 * device without exposing the secret to the browser. */
'use strict';

const GROQ_URL = '/api/groq';

async function groqConfigured(){
  try {
    const res = await fetch(GROQ_URL, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.configured;
  } catch (e) { return false; }
}

async function groqChat(messages, { maxTokens = 500, json = true, timeoutMs = 15000 } = {}){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: state.settings.groqModel || 'llama-3.3-70b-versatile',
        temperature: 0.2, max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}), messages
      })
    });
    if (!res.ok){
      let detail=''; try { const d=await res.json(); detail=d.error?.message || d.error || ''; } catch(e){}
      if (res.status === 503) throw new Error('NO_KEY');
      throw new Error('HTTP '+res.status+(detail?' — '+detail:''));
    }
    const data=await res.json();
    return data.choices?.[0]?.message?.content || '';
  } finally { clearTimeout(t); }
}

async function testGroqConnection(){
  const content=await groqChat([{role:'user',content:'Reply with the JSON {"ok":true}'}],{maxTokens:12,timeoutMs:10000});
  return content.length>0;
}

async function explainImpact({sheetName,label,colLabel,oldVal,newVal,steps,advisories,balance}){
  const payload={edited:{sheet:sheetName,line:label,column:colLabel||null,from:oldVal,to:newVal},automatic_adjustments:steps.slice(0,40).map(s=>({sheet:s.sheet,line:s.label,column:s.colLabel||null,from:s.before,to:s.after})),advisories,balance_check:balance?{assets:balance.assets,liabilities_and_equity:balance.liabEquity,difference:balance.diff,balanced:balance.balanced}:null};
  const content=await groqChat([
    {role:'system',content:'You are a financial reporting analyst inside a management-reporting tool (QuickBooks-style). The user edited one line of a financial statement and the tool has already computed the deterministic cascade of adjustments. Explain in plain, concise English (max ~120 words) which statements and lines are impacted and why, and flag anything that should be double-checked. Respond ONLY as JSON: {"explanation": string, "cautions": string[]}'},
    {role:'user',content:JSON.stringify(payload)}
  ]);
  try { const p=JSON.parse(content); return {explanation:String(p.explanation||''),cautions:Array.isArray(p.cautions)?p.cautions.map(String):[]}; }
  catch(e){ return {explanation:content,cautions:[]}; }
}
