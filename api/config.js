// Only Supabase's public browser key may be returned from this endpoint.
module.exports = function config(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const url = process.env.SUPABASE_URL;
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  let valid = false;
  try {
    const parsed = new URL(url);
    valid = parsed.protocol === 'https:' && !parsed.username && !parsed.password;
    if (publicKey?.startsWith('sb_secret_')) valid = false;
    if (publicKey?.split('.').length === 3) {
      const claims = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString());
      if (claims.role !== 'anon') valid = false;
    } else if (!publicKey?.startsWith('sb_publishable_')) valid = false;
  } catch { valid = false; }
  return res.status(200).json(valid ? { enabled: true, url: url.replace(/\/$/, ''), publicKey } : { enabled: false });
};
