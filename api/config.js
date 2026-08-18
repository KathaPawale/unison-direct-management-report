module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
  const projectId = process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID || '';

  if (!url || !publishableKey) {
    return res.status(503).json({ ok: false, error: 'Supabase environment variables are not configured.' });
  }

  return res.status(200).json({ ok: true, url, publishableKey, projectId });
};