// Debug endpoint to check environment variables
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for Anthropic API key
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const keyLength = process.env.ANTHROPIC_API_KEY?.length || 0;
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 10) || '';

  // Check all env vars that might be related
  const relatedEnvVars = Object.keys(process.env).filter(key =>
    key.toLowerCase().includes('anthropic') ||
    key.toLowerCase().includes('api') ||
    key.toLowerCase().includes('key')
  );

  return res.status(200).json({
    anthropic_key_exists: hasAnthropicKey,
    anthropic_key_length: keyLength,
    anthropic_key_prefix: keyPrefix,
    related_env_vars: relatedEnvVars,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV
  });
}
