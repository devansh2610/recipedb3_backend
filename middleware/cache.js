const store = new Map(); // key -> { expires, payload }

function cacheRoute(ttlMs = 60_000) {
  return function (req, res, next) {
    const key = req.method + " " + req.originalUrl;
    const hit = store.get(key);
    const now = Date.now();

    if (hit && hit.expires > now) {
      return res.json(hit.payload);
    }

    const origJson = res.json.bind(res);
    res.json = (body) => {
      store.set(key, { expires: now + ttlMs, payload: body });
      return origJson(body);
    };

    next();
  };
}

// Utility to purge cache, if ever needed
function clearCache() { store.clear(); }

module.exports = { cacheRoute, clearCache };
