export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.GROQ_API_KEY;
  if (req.method === 'GET') {
    return res.status(200).json({ configured: Boolean(key) });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!key) return res.status(503).json({ error: 'Groq API key is not configured on Vercel.' });
  try {
    const body = req.body || {};
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: body.model || 'llama-3.3-70b-versatile',
        temperature: body.temperature ?? 0.2,
        max_tokens: body.max_tokens || 500,
        ...(body.response_format ? { response_format: body.response_format } : {}),
        messages: Array.isArray(body.messages) ? body.messages : []
      })
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Groq request failed' });
  }
}
