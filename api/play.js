const G = require('../lib/game');
const C = G.C;
const send = (res, code, obj) => res.status(code).json(obj);

const card = (c) => ({ ...c, nome: C.POKEMON[c.pk].nome });
const STAGE_OF = { detetive_submit: 'detetive', pesquisa_answer: 'pesquisa', pesquisa_norteadora: 'pesquisa', treino_train: 'treino', treino_done: 'treino', plano_submit: 'plano' };
// dados de cada nível do treinador
function treinoData(p, nivel) {
  const T = nivel === 2 ? C.TREINO2 : C.TREINO; const st = nivel === 2 ? p.treino.n2 : p.treino;
  return { nivel, escolher: T.escolher, maxTentativas: T.maxTentativas, pool: T.pool.map((c) => ({ ...card(c), tipo: C.POKEMON[c.pk].tipo, cor: C.POKEMON[c.pk].cor })), teste: T.teste.map((c) => ({ ...card(c), cor: C.POKEMON[c.pk].cor })), tentativas: st.tentativas, melhor: st.melhor };
}
function treinoPts(p) {
  const P = C.POINTS, t = p.treino, n1 = C.TREINO.teste.length, n2 = C.TREINO2.teste.length;
  let pts = t.melhor * P.treinoAcerto + (t.melhor === n1 ? P.treinoPerfeito : 0) + (t.previu ? P.treinoPrevisao : 0);
  if (t.n2) pts += t.n2.melhor * P.treino2Acerto + (t.n2.melhor === n2 ? P.treino2Perfeito : 0) + (t.n2.previu ? P.treino2Previsao : 0);
  return pts;
}
// quem fecha o nível 1 com tempo sobrando ganha o nível 2
function liberaNivel2(p, st, now) {
  if (!p.treino.n2 && st.deadline && st.deadline - now >= C.TREINO2.minRestanteMs) p.treino.n2 = { tentativas: 0, melhor: 0, previu: false, done: false };
  return !!(p.treino.n2 && !p.treino.n2.done);
}
const clean = (t, max) => String(t || '').trim().replace(/\s+/g, ' ').slice(0, max);

async function join(res, body) {
  const nick = String(body.nick || '').trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} _.\-!?]{2,24}$/u.test(nick)) return send(res, 400, { error: 'Use de 2 a 24 caracteres (letras, números, espaço).' });
  const ps = await G.allPlayers();
  if (ps.length >= G.MAX_PLAYERS) return send(res, 400, { error: 'Sala cheia.' });
  if (ps.some((p) => G.norm(p.nick) === G.norm(nick))) return send(res, 400, { error: 'Esse apelido já está em uso. Escolha outro!' });
  const id = require('crypto').randomBytes(8).toString('hex');
  await G.savePlayer(G.newPlayer(id, nick));
  return send(res, 200, { id, nick });
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const action = String(body.action || '');
    if (action === 'join') return await join(res, body);

    const p = await G.loadPlayer(body.id);
    if (!p) return send(res, 401, { error: 'unknown_player' });

    const expected = action === 'enter' ? body.stage : STAGE_OF[action] || (action.startsWith('audit_') ? 'auditoria' : null);
    let st = await G.getState();
    if (expected && st.stage !== expected) st = await G.getState(true); // outra cópia do servidor pode estar 1s atrasada
    const now = Date.now();
    const remainingMs = st.deadline ? Math.max(0, st.deadline - now) : null;
    const elapsed = now - (st.startedAt || now);
    const limit = st.deadline && st.startedAt ? st.deadline - st.startedAt : 180000;
    const need = (stage) => {
      if (st.stage !== stage) { send(res, 409, { error: 'closed', stage: st.stage }); return false; }
      if (st.deadline && now > st.deadline + 2000) { send(res, 409, { error: 'closed', stage: st.stage, timeup: true }); return false; }
      return true;
    };

    // ---------- entrar numa etapa ----------
    if (action === 'enter') {
      const stage = body.stage;
      if (!need(stage)) return;
      const base = { done: G.isDone(p, stage), points: p.scores[stage] || 0, remainingMs };
      if (stage === 'detetive') return send(res, 200, { ...base, fotos: C.DETETIVE.fotos.map((f) => ({ id: f.id, tom: f.tom, lesao: f.lesao, regua: f.regua, ia: f.ia, conf: f.conf, real: f.real })), regras: C.DETETIVE.regras });
      if (stage === 'pesquisa') return send(res, 200, { ...base, citacao: C.PESQUISA.citacao, url: C.PESQUISA.url, site: C.PESQUISA.site, prompts: C.PESQUISA.questions.map((q) => ({ prompt: q.prompt, onde: q.onde, busca: q.busca, dica: q.dica })), answered: p.pesquisa.answered, norteadora: C.PESQUISA.norteadora, minNorteadora: C.PESQUISA.minNorteadora, enviou: !!p.pesquisa.norteadora });
      if (stage === 'treino') return send(res, 200, { ...base, ...treinoData(p, p.treino.done && p.treino.n2 ? 2 : 1) });
      if (stage === 'auditoria') return send(res, 200, { ...base, total: C.AUDITORIA.casos.length, idx: p.auditoria.idx });
      if (stage === 'plano') return send(res, 200, { ...base, escolher: C.PLANO.escolher, minFrase: C.PLANO.minFrase, pergunta: C.PLANO.pergunta, opcoes: C.PLANO.opcoes.map((o) => ({ id: o.id, text: o.text })) });
      return send(res, 400, { error: 'stage' });
    }

    // ---------- 1) Detetive de dados ----------
    if (action === 'detetive_submit') {
      if (!need('detetive')) return;
      if (p.detetive.done) return send(res, 200, { already: true, points: p.scores.detetive });
      const F = C.DETETIVE.fotos;
      const marks = Array.isArray(body.marks) ? body.marks.slice(0, F.length) : [];
      const olhou = Array.isArray(body.olhou) ? body.olhou.slice(0, F.length) : [];
      const regra = Number(body.regra);
      if (marks.length !== F.length || marks.some((m) => typeof m !== 'boolean')) return send(res, 400, { error: 'Diga se a IA acertou ou errou em todas as fotos.' });
      if (olhou.length !== F.length || olhou.some((o) => o !== 'lesao' && o !== 'fora')) return send(res, 400, { error: 'Marque onde a IA olhou em todas as fotos.' });
      if (!(regra >= 0 && regra < C.DETETIVE.regras.length)) return send(res, 400, { error: 'Escolha a regra que a IA aprendeu.' });
      const certo = F.map((f) => f.ia === f.real);
      const marcasOk = marks.filter((m, i) => m === certo[i]).length;
      const olhouOk = olhou.filter((o, i) => o === F[i].olhou).length;
      const regraOk = regra === C.DETETIVE.regraCerta;
      const pts = marcasOk * C.POINTS.detMarca + olhouOk * C.POINTS.detOlhou + (regraOk ? C.POINTS.detRegra + G.timePts(elapsed, limit, C.POINTS.detTime) : 0);
      p.detetive = { done: true, marks, olhou, regra }; p.scores.detetive = pts;
      await G.savePlayer(p);
      return send(res, 200, { points: pts, marcasOk, olhouOk, total: F.length, certo, olhouCerto: F.map((f) => f.olhou), regraOk, regraCerta: C.DETETIVE.regraCerta });
    }

    // ---------- 3) Pesquisa ----------
    if (action === 'pesquisa_answer') {
      if (!need('pesquisa')) return;
      const qi = Number(body.qi); const q = C.PESQUISA.questions[qi];
      if (!q) return send(res, 400, { error: 'qi' });
      if (p.pesquisa.answered[qi]) return send(res, 200, { correct: true, already: true });
      const ans = G.norm(body.text);
      if (!(ans.length > 0 && G.matches(ans, q.accept))) return send(res, 200, { correct: false, dica: q.dica });
      const pts = C.POINTS.pesquisaBase + G.timePts(elapsed, limit, C.POINTS.pesquisaTime);
      p.pesquisa.answered[qi] = true; p.scores.pesquisa += pts;
      await G.savePlayer(p);
      return send(res, 200, { correct: true, points: pts });
    }
    if (action === 'pesquisa_norteadora') {
      if (!need('pesquisa')) return;
      if (p.pesquisa.norteadora) return send(res, 200, { already: true });
      const t = clean(body.text, 400);
      if (t.length < C.PESQUISA.minNorteadora) return send(res, 400, { error: `Escreva pelo menos ${C.PESQUISA.minNorteadora} caracteres.` });
      p.pesquisa.norteadora = t; p.pesquisa.at = now; p.scores.pesquisa += C.POINTS.norteadora;
      await G.savePlayer(p);
      return send(res, 200, { ok: true, points: C.POINTS.norteadora });
    }

    // ---------- 4) Treinador ----------
    if (action === 'treino_train') {
      if (!need('treino')) return;
      const nivel = Number(body.nivel) === 2 ? 2 : 1;
      const T = nivel === 2 ? C.TREINO2 : C.TREINO;
      const t = nivel === 2 ? p.treino.n2 : p.treino;
      if (!t) return send(res, 400, { error: 'O nível 2 não está liberado.' });
      if (t.done) return send(res, 200, { already: true, done: true });
      if (nivel === 1 && p.treino.done) return send(res, 200, { already: true, done: true });
      const ids = [...new Set(Array.isArray(body.ids) ? body.ids : [])];
      const cards = T.pool.filter((c) => ids.includes(c.id));
      if (cards.length !== T.escolher) return send(res, 400, { error: `Escolha exatamente ${T.escolher} fotos de treino.` });
      const prev = Number(body.previsao);
      if (!(prev >= 0 && prev <= T.teste.length)) return send(res, 400, { error: 'Antes de treinar, preveja quantas a IA vai acertar.' });
      const r = G.treinar(cards, T.teste);
      t.tentativas += 1;
      if (r.acertos > t.melhor) t.melhor = r.acertos;
      const previuAgora = prev === r.acertos;
      if (previuAgora) t.previu = true;
      if (r.acertos === T.teste.length || t.tentativas >= T.maxTentativas) t.done = true;
      const nivel2 = nivel === 1 && t.done ? liberaNivel2(p, st, now) : false;
      p.scores.treino = treinoPts(p);
      await G.savePlayer(p);
      return send(res, 200, { ...r, nivel, prova: r.prova.map((x) => ({ ...card(x), real: x.real, palpite: x.palpite, por: x.por, ok: x.ok })), previsao: prev, previuAgora, points: p.scores.treino, melhor: t.melhor, tentativas: t.tentativas, maxTentativas: T.maxTentativas, done: t.done, nivel2 });
    }
    if (action === 'treino_done') {
      if (!need('treino')) return;
      let nivel2 = false;
      if (Number(body.nivel) === 2) { if (p.treino.n2) p.treino.n2.done = true; }
      else if (!p.treino.done) { p.treino.done = true; nivel2 = liberaNivel2(p, st, now); }
      await G.savePlayer(p);
      return send(res, 200, { done: true, nivel2, points: p.scores.treino });
    }

    // ---------- 5) Auditoria relâmpago ----------
    if (action === 'audit_next' || action === 'audit_answer') {
      if (!need('auditoria')) return;
      const items = C.AUDITORIA.casos; const s = p.auditoria;
      if (action === 'audit_next') {
        if (s.idx >= items.length) return send(res, 200, { done: true, points: p.scores.auditoria });
        if (!s.sentAt || now - s.sentAt > C.AUDITORIA.limitMs + 2000) { s.sentAt = now; await G.savePlayer(p); }
        const it = items[s.idx];
        return send(res, 200, { index: s.idx, total: items.length, q: it.text, opts: C.AUDITORIA.options, bonus: !!it.bonus, limitMs: C.AUDITORIA.limitMs, remainingMs: Math.max(0, C.AUDITORIA.limitMs - (now - s.sentAt)) });
      }
      if (!s.sentAt || s.idx >= items.length) return send(res, 409, { error: 'no_question' });
      const it = items[s.idx]; const el = now - s.sentAt; const choice = Number(body.choice);
      const inTime = el <= C.AUDITORIA.limitMs + 1500; const correct = inTime && choice === it.correct;
      let pts = correct ? C.POINTS.auditBase + G.timePts(el, C.AUDITORIA.limitMs, C.POINTS.auditTime) : 0;
      if (correct && it.bonus) pts *= 2;
      s.idx += 1; s.sentAt = null; p.scores.auditoria += pts;
      await G.savePlayer(p);
      return send(res, 200, { correct, correctIndex: it.correct, points: pts, why: it.why, timedOut: !inTime, done: s.idx >= items.length });
    }

    // ---------- 6) Plano de dados ----------
    if (action === 'plano_submit') {
      if (!need('plano')) return;
      if (p.plano.done) return send(res, 200, { already: true, points: p.scores.plano });
      const valid = new Set(C.PLANO.opcoes.map((o) => o.id));
      const ids = [...new Set(Array.isArray(body.ids) ? body.ids : [])].filter((x) => valid.has(x));
      if (ids.length !== C.PLANO.escolher) return send(res, 400, { error: `Escolha exatamente ${C.PLANO.escolher} ações.` });
      const frase = clean(body.frase, 220);
      const boas = ids.filter((x) => C.PLANO.opcoes.find((o) => o.id === x).boa).length;
      const pts = boas * C.POINTS.planoBoa + (frase.length >= C.PLANO.minFrase ? C.POINTS.planoFrase : 0);
      p.plano = { done: true, ids, frase, at: now }; p.scores.plano = pts;
      await G.savePlayer(p);
      return send(res, 200, { points: pts, boas, feedback: C.PLANO.opcoes.map((o) => ({ id: o.id, boa: o.boa, escolhida: ids.includes(o.id), por: o.boa ? null : o.por })) });
    }

    // ---------- ranking e final ----------
    if (action === 'ranking') {
      const snap = await G.getSnapshot();
      const me = snap.pos[p.id] ? { rank: snap.pos[p.id][0], total: snap.pos[p.id][1] } : null;
      return send(res, 200, { top: snap.top, count: snap.count, me, myTotal: p.total });
    }
    if (action === 'final') {
      const all = G.ranking(await G.allPlayers());
      return send(res, 200, { total: p.total, rank: all.findIndex((x) => x.id === p.id) + 1, count: all.length, scores: p.scores });
    }
    if (action === 'me') return send(res, 200, { nick: p.nick, total: p.total });
    return send(res, 400, { error: 'action' });
  } catch (e) { return send(res, 500, { error: String(e.message || e) }); }
};
