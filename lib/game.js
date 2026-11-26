const kv = require('./kv');
const C = require('./content');

// chaves próprias: pode usar o MESMO banco da aula de API sem misturar nada
const PLAYERS = 'ia2:players', STATE = 'ia2:state', RANK = 'ia2:rank';
const MAX_PLAYERS = 80;

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[.!?,;:"'`()\[\]{}]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function matches(ans, groups) { return groups.some((g) => g.every((t) => ans.includes(norm(t)))); }
function timePts(elapsed, limit, max) { return Math.round(max * Math.max(0, 1 - elapsed / limit)); }

// ---------- a "IA" do treinador ----------
// Uma pista (fundo ou cor) vira ATALHO se, sozinha, acerta pelo menos 5 das 6 fotos de treino.
// O fundo é a pista "mais fácil" (vem primeiro). Só se as duas falharem a IA aprende a forma do Pokémon.
const TOLERANCIA = 1;
function treinar(cards) {
  const ex = cards.map((c) => ({ ...c, tipo: C.POKEMON[c.pk].tipo, cor: C.POKEMON[c.pk].cor }));
  const tipos = [...new Set(ex.map((e) => e.tipo))];
  const atalhos = {};
  const acertoTreino = {};
  if (tipos.length >= 2) {
    for (const f of ['fundo', 'cor']) {
      const m = {};
      for (const e of ex) { m[e[f]] = m[e[f]] || {}; m[e[f]][e.tipo] = (m[e[f]][e.tipo] || 0) + 1; }
      const mapa = {}; let ok = 0;
      for (const [v, cnt] of Object.entries(m)) { const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; mapa[v] = best[0]; ok += best[1]; }
      acertoTreino[f] = ok;
      if (Object.keys(m).length >= 2 && ex.length - ok <= TOLERANCIA) atalhos[f] = mapa;
    }
  }
  const prever = (c) => {
    const p = C.POKEMON[c.pk];
    for (const f of ['fundo', 'cor']) {
      const v = f === 'cor' ? p.cor : c.fundo;
      if (atalhos[f] && atalhos[f][v]) return { tipo: atalhos[f][v], por: f };
    }
    if (tipos.includes(p.tipo)) return { tipo: p.tipo, por: 'forma' };
    return { tipo: tipos[0] || '?', por: 'nunca-viu' };
  };
  const prova = C.TREINO.teste.map((t) => { const pr = prever(t); return { ...t, real: C.POKEMON[t.pk].tipo, palpite: pr.tipo, por: pr.por, ok: pr.tipo === C.POKEMON[t.pk].tipo }; });
  const regras = [];
  for (const f of ['fundo', 'cor']) if (atalhos[f]) for (const [v, t] of Object.entries(atalhos[f])) regras.push(`${f === 'cor' ? 'cor ' + v : 'fundo de ' + C.FUNDOS[v]} = ${t}`);
  return { acertos: prova.filter((x) => x.ok).length, total: prova.length, prova, atalhos: Object.keys(atalhos), regras, tipos, acertoTreino };
}

// ---------- estado da aula ----------
let _cache = { t: 0, v: null };
const DEFAULT = { stage: 'lobby', seq: 0, startedAt: null, deadline: null };
async function getState(force) {
  const now = Date.now();
  if (!force && _cache.v && now - _cache.t < 1000) return _cache.v;
  const raw = await kv.get(STATE);
  let v = { ...DEFAULT };
  if (raw) { try { v = { ...DEFAULT, ...JSON.parse(raw) }; } catch {} }
  _cache = { t: now, v };
  return v;
}
async function setStage(stage, durationMs) {
  const cur = await getState(true);
  const now = Date.now();
  const dur = durationMs !== undefined && durationMs !== null ? Number(durationMs) : (C.STAGE_TIMERS[stage] || 0);
  const next = { stage, seq: (cur.seq || 0) + 1, startedAt: now, deadline: dur > 0 ? now + dur : null };
  if (stage === 'closed' || stage === 'final') await snapshot();
  await kv.set(STATE, JSON.stringify(next));
  _cache = { t: Date.now(), v: next };
  return next;
}
async function extendDeadline(ms) {
  const cur = await getState(true);
  if (!cur.deadline) return cur;
  const next = { ...cur, deadline: cur.deadline + Number(ms), seq: (cur.seq || 0) + 1 };
  await kv.set(STATE, JSON.stringify(next));
  _cache = { t: Date.now(), v: next };
  return next;
}

// ---------- jogadores ----------
function newPlayer(id, nick) {
  return {
    id, nick, joinedAt: Date.now(), lastAt: Date.now(), total: 0,
    scores: { detetive: 0, pesquisa: 0, treino: 0, auditoria: 0, plano: 0 },
    detetive: { done: false, marks: null, olhou: null, regra: null },
    pesquisa: { answered: C.PESQUISA.questions.map(() => false), norteadora: '', at: 0 },
    treino: { tentativas: 0, melhor: 0, previu: false, done: false },
    auditoria: { idx: 0, sentAt: null },
    plano: { done: false, ids: [], frase: '', at: 0 },
  };
}
async function loadPlayer(id) { if (!id) return null; const raw = await kv.hget(PLAYERS, id); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } }
async function savePlayer(p) { p.total = Object.values(p.scores).reduce((a, b) => a + b, 0); p.lastAt = Date.now(); await kv.hset(PLAYERS, p.id, JSON.stringify(p)); }
async function allPlayers() { const h = await kv.hgetall(PLAYERS); const out = []; for (const v of Object.values(h)) { try { out.push(JSON.parse(v)); } catch {} } return out; }
function ranking(ps) { return [...ps].sort((a, b) => b.total - a.total || a.lastAt - b.lastAt); }
function isDone(p, stage) {
  if (stage === 'detetive') return p.detetive.done;
  if (stage === 'pesquisa') return p.pesquisa.answered.every(Boolean) && !!p.pesquisa.norteadora;
  if (stage === 'treino') return p.treino.done;
  if (stage === 'auditoria') return p.auditoria.idx >= C.AUDITORIA.casos.length;
  if (stage === 'plano') return p.plano.done;
  return false;
}

// ---------- instantâneo do ranking (tela de espera dos alunos) ----------
let _rank = { t: 0, v: null };
async function snapshot() {
  const s = ranking(await allPlayers());
  const pos = {}; s.forEach((p, i) => { pos[p.id] = [i + 1, p.total]; });
  const snap = { top: s.slice(0, 5).map((p) => ({ nick: p.nick, total: p.total })), pos, count: s.length, at: Date.now() };
  await kv.set(RANK, JSON.stringify(snap)); _rank = { t: Date.now(), v: snap }; return snap;
}
async function getSnapshot() {
  if (_rank.v && Date.now() - _rank.t < 2000) return _rank.v;
  const raw = await kv.get(RANK); let v = { top: [], pos: {}, count: 0, at: 0 };
  if (raw) { try { v = JSON.parse(raw); } catch {} }
  _rank = { t: Date.now(), v }; return v;
}
async function resetAll() { await kv.del(PLAYERS); await kv.del(RANK); _rank = { t: 0, v: null }; return setStage('lobby'); }

module.exports = { kv, C, norm, matches, timePts, treinar, getState, setStage, extendDeadline, newPlayer, loadPlayer, savePlayer, allPlayers, ranking, isDone, snapshot, getSnapshot, resetAll, MAX_PLAYERS };
