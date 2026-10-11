// NEXORA API: a small Cloudflare Worker that keeps your Anthropic API key secret.
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...h } });
const hits = new Map();

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || ''), 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed.includes(origin)) return json({ error: 'Origin not allowed.', code: 'forbidden' }, 403, cors);

    // Basic per-IP limit. It is per Worker instance, so also add a Cloudflare rate-limiting rule (see NEXORA-SETUP.md).
    const ip = req.headers.get('CF-Connecting-IP') || 'unknown', now = Date.now();
    if (hits.size > 2000) hits.clear();
    const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
    if (recent.length >= Number(env.RATE_PER_MIN || 20)) return json({ error: 'Too many requests. Wait a minute and try again.', code: 'rate_limit' }, 429, cors);
    recent.push(now); hits.set(ip, recent);

    const models = (env.MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const configured = Boolean(env.ANTHROPIC_API_KEY) && models.length > 0;
    const path = new URL(req.url).pathname;

    if (req.method === 'GET' && path === '/api/models') return json({ configured, models: configured ? models : [] }, 200, cors);
    if (req.method !== 'POST' || path !== '/api/chat') return json({ error: 'Not found.' }, 404, cors);
    if (!configured) return json({ error: 'Server is missing its API key or model list.', code: 'not_configured' }, 503, cors);

    if (Number(req.headers.get('Content-Length') || 0) > 200000) return json({ error: 'Request too large.' }, 413, cors);
    let body; try { body = await req.json(); } catch { return json({ error: 'Invalid JSON.' }, 400, cors); }
    const msgs = body && body.messages;
    const okMsgs = Array.isArray(msgs) && msgs.length >= 1 && msgs.length <= 40 &&
      msgs.every((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() && m.content.length <= 8000) &&
      msgs[0].role === 'user' && msgs[msgs.length - 1].role === 'user' &&
      msgs.reduce((n, m) => n + m.content.length, 0) <= 60000;
    if (!okMsgs) return json({ error: 'Invalid or too long messages.' }, 400, cors);
    const system = typeof body.system === 'string' ? body.system.slice(0, 4000) : '';
    const model = models.includes(body.model) ? body.model : models[0];

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), Number(env.TIMEOUT_MS || 60000));
    let up;
    try {
      up = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: Number(env.MAX_TOKENS || 2048), stream: true, system, messages: msgs.map((m) => ({ role: m.role, content: m.content })) }),
      });
    } catch {
      return json({ error: 'The AI provider did not respond in time.', code: 'timeout' }, 504, cors);
    } finally { clearTimeout(timer); }

    if (!up.ok) {
      if (up.status === 429) return json({ error: 'The AI provider is rate limiting requests. Try again shortly.', code: 'rate_limit' }, 429, cors);
      return json({ error: 'The AI provider returned an error. Check the Worker logs.', code: 'provider_error' }, 502, cors);
    }
    return new Response(up.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', ...cors } });
  },
};
