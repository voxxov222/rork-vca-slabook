import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const response = (data: unknown, status = 200): Response => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const cache = new Map<string, { at: number; data: unknown }>();
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return response({ error: 'Sign in for graded comparisons' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user) return response({ error: 'Sign in required' }, 401);
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const set = typeof body.set === 'string' ? body.set.trim() : '';
    if (!name || !set || name.length > 100 || set.length > 100) return response({ error: 'Invalid card details' }, 400);
    const cacheKey = `${name}:${set}`;
    const hit = cache.get(cacheKey); if (hit && Date.now() - hit.at < 300000) return response(hit.data);
    const budget = await client.rpc('vca_use_market_budget');
    if (budget.error || !budget.data) return response({ error: 'Comparison limit reached. Try again in a minute.' }, 429);
    const key = Deno.env.get('VITE_JUSTTCG_API_KEY');
    if (!key) return response({ data: [], unavailable: true });
    const slug = set.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-pokemon';
    const upstream = await fetch(`https://api.justtcg.com/v2/cards?game=pokemon&name=${encodeURIComponent(name)}&set=${encodeURIComponent(slug)}&graded=include`, { headers: { 'x-api-key': key }, signal: AbortSignal.timeout(12000) });
    if (!upstream.ok) return response({ error: 'Graded market provider unavailable' }, 503);
    const result = await upstream.json(); const safe = { data: Array.isArray(result.data) ? result.data.slice(0, 100) : [] };
    if (cache.size >= 100) cache.clear(); cache.set(cacheKey, { at: Date.now(), data: safe }); return response(safe);
  } catch { return response({ error: 'Could not retrieve graded comparisons' }, 503); }
});
