// ── API Layer con caché en memoria ────────────────────────────────
const API = (() => {
  const _cache = {};

  async function get(params, cacheKey, ttlSec = 0) {
    if (cacheKey && _cache[cacheKey] && Date.now() < _cache[cacheKey].exp) {
      return _cache[cacheKey].data;
    }
    const url = GAS_URL + '?' + new URLSearchParams(params).toString();
    const res  = await fetch(url, { redirect: 'follow' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error en el servidor');
    if (cacheKey && ttlSec > 0) {
      _cache[cacheKey] = { data: json.data, exp: Date.now() + ttlSec * 1000 };
    }
    return json.data;
  }

  async function post(body) {
    const res  = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      redirect: 'follow'
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error en el servidor');
    return json.data;
  }

  function invalidate(key) { delete _cache[key]; }
  function invalidateAll()  { Object.keys(_cache).forEach(k => delete _cache[k]); }

  return { get, post, invalidate, invalidateAll };
})();
