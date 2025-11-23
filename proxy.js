import express from 'express';
import request from 'request';

const app = express();

// handle CORS preflight so browser can call the proxy
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// catch-all proxy handler (no path-to-regexp involved)
app.use((req, res) => {
  const url = 'https://api.liveavatar.com' + req.originalUrl;
  console.log('[PROXY]', req.method, '→', url);

  req.pipe(
    request({
      url,
      method: req.method,
      headers: {
        // keep incoming headers but override / force X-API-KEY on outgoing request
        ...req.headers,
        'X-API-KEY': process.env.HEYGEN_API_KEY || '',
        // remove host header to avoid mismatch (optional)
        host: undefined,
      },
      // If you want to forward query string automatically, request will do it from url
    })
    .on('error', (err) => {
      console.error('[PROXY ERROR]', err);
      try { res.status(502).json({ error: 'proxy_error', details: err.message }); }
      catch(e){ /* ignore */ }
    })
  ).pipe(res);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🔥 Proxy running on http://localhost:${PORT}`));
