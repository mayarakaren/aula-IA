// Upstash Redis (REST) em produção; memória local só pra testes.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const REST = !!(URL_ && TOKEN);
const mem = globalThis.__AULA_MEM__ || (globalThis.__AULA_MEM__ = { str: new Map(), hash: new Map() });

async function rest(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis http ' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('redis: ' + j.error);
  return j.result;
}
function check() { if (!REST && process.env.VERCEL) throw new Error('Redis não configurado: conecte o Upstash Redis ao projeto na Vercel (Storage).'); }

async function get(k) { check(); if (REST) return rest(['GET', k]); return mem.str.has(k) ? mem.str.get(k) : null; }
async function set(k, v) { check(); if (REST) return rest(['SET', k, v]); mem.str.set(k, v); return 'OK'; }
async function del(k) { check(); if (REST) return rest(['DEL', k]); mem.str.delete(k); mem.hash.delete(k); return 1; }
async function hget(k, f) { check(); if (REST) return rest(['HGET', k, f]); const h = mem.hash.get(k); return h && h.has(f) ? h.get(f) : null; }
async function hset(k, f, v) { check(); if (REST) return rest(['HSET', k, f, v]); if (!mem.hash.has(k)) mem.hash.set(k, new Map()); mem.hash.get(k).set(f, v); return 1; }
async function hgetall(k) {
  check();
  if (REST) { const a = (await rest(['HGETALL', k])) || []; const o = {}; for (let i = 0; i < a.length; i += 2) o[a[i]] = a[i + 1]; return o; }
  const h = mem.hash.get(k); const o = {}; if (h) for (const [a, b] of h) o[a] = b; return o;
}
module.exports = { get, set, del, hget, hset, hgetall, REST };
